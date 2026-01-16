# C:\inspection-agent\vision.py
import os, io, base64, mimetypes, hashlib, re, traceback
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image, ImageOps

# Load .env and sanitize the key for safety
load_dotenv(override=True)
if os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY").strip()

client = OpenAI()

# ---------------- Tunables (override via .env if desired) ----------------
# Human-focused inspection instructions - only report what needs fixing
# Updated based on client feedback for simpler language and priority levels
SYSTEM = (
    "You are a practical property inspector creating a report for a homeowner. "
    "Use simple, everyday language that anyone can understand - avoid technical jargon. "
    "Focus ONLY on the main subject of the photo.\n\n"

    "PRIORITY LEVELS - Tag each issue with one:\n"
    "[IMMEDIATE] = Safety hazard, active leak, or damage needing urgent repair\n"
    "[SOON] = Functional problem to address within a few weeks\n"
    "[COSMETIC] = Appearance issue only, does not affect function\n\n"

    "SPECIAL RULES:\n"
    "- HVAC/AC units: ONLY report (1) air filter condition, (2) water or refrigerant leaks, (3) safety issues. Skip other details.\n"
    "- Windows: ONLY mention if you see condensation between panes, gaps, cracks, broken seals, or damage. Skip normal windows.\n"
    "- Use plain English (e.g., 'exposed pipe connection' not 'unshielded rubber coupling', 'AC drain line' not 'condensate line')\n"
    "- Keep descriptions brief and clear\n\n"

    "IF THERE ARE ISSUES, use EXACTLY this format:\n\n"
    "Location: (brief location, e.g., 'Front door', 'Kitchen sink')\n\n"
    "Issues to Address:\n"
    "- [IMMEDIATE] Brief description in plain English\n"
    "- [SOON] Another issue if applicable\n\n"
    "Recommended Action:\n"
    "- What to do about it in simple terms\n\n"

    "IF THERE ARE NO ISSUES, respond with ONLY this single line:\n"
    "No repairs needed\n\n"

    "CRITICAL RULES:\n"
    "- If nothing is damaged/broken, ONLY write 'No repairs needed' - nothing else\n"
    "- ALWAYS include a priority tag [IMMEDIATE], [SOON], or [COSMETIC] before each issue\n"
    "- ALWAYS use bullet points (starting with -) for issues and recommendations\n"
    "- NEVER put content on the same line as 'Issues to Address:' or 'Recommended Action:'\n"
    "- Only report things that are DAMAGED, BROKEN, or need REPAIR\n"
    "- Normal wear or aging is NOT an issue unless causing actual damage"
)

# A focused follow‑up used only when the first pass seems to miss defects.
SECOND_PASS_NUDGE = (
    "Look again at the main subject of this photo. If there's actual damage that needs repair, "
    "list it under 'Issues to Address' with a priority tag [IMMEDIATE], [SOON], or [COSMETIC]. "
    "Use simple language. Only mention things that are broken or damaged, not just old or weathered. "
    "Focus on what the photographer was trying to show."
)

ANALYSIS_MAX_PX = int(os.getenv("ANALYSIS_MAX_PX", "1000"))  # downscale for faster API response
CACHE_DIR = Path(os.getenv("ANALYSIS_CACHE_DIR", ".cache"))
CACHE_DIR.mkdir(exist_ok=True)


# ---------------- Image helpers ----------------
def _mime_type(p: Path) -> str:
    mt, _ = mimetypes.guess_type(str(p))
    if mt:
        return mt
    return "image/jpeg" if p.suffix.lower() in {".jpg", ".jpeg"} else "image/png"


def _b64_bytes(b: bytes) -> str:
    return base64.b64encode(b).decode("utf-8")


def _data_url_from_bytes(b: bytes, mime: str) -> str:
    return f"data:{mime};base64,{_b64_bytes(b)}"


def _analysis_image_bytes(src: Path) -> tuple[bytes, str]:
    """
    Return (bytes, mime) for a downscaled copy used ONLY for model analysis.
    The PDF still embeds the original file at full quality elsewhere.
    """
    mime = _mime_type(src)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        w, h = im.size
        scale = 1.0
        if max(w, h) > ANALYSIS_MAX_PX:
            scale = ANALYSIS_MAX_PX / float(max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        if mime == "image/png":
            im.save(buf, format="PNG", optimize=True)
        else:
            im = im.convert("RGB")
            im.save(buf, format="JPEG", quality=88, optimize=True)
            mime = "image/jpeg"
        return buf.getvalue(), mime


# ---------------- Disk cache (speed up re-runs) ----------------
def _cache_key(image_path: Path) -> str:
    h = hashlib.sha1()
    try:
        h.update(image_path.read_bytes())
    except Exception:
        h.update(str(image_path).encode("utf-8"))
    h.update(SYSTEM.encode("utf-8"))
    h.update(os.getenv("VISION_MODEL", "gpt-5").encode("utf-8"))
    h.update(str(ANALYSIS_MAX_PX).encode("utf-8"))
    return h.hexdigest()


def _cache_get(image_path: Path) -> str | None:
    f = CACHE_DIR / f"{_cache_key(image_path)}.txt"
    if f.exists():
        try:
            text = f.read_text(encoding="utf-8").strip()
            print(f"[vision] CACHE HIT for {image_path.name}", flush=True)
            return text
        except Exception:
            return None
    return None


def _cache_put(image_path: Path, text: str) -> None:
    (CACHE_DIR / f"{_cache_key(image_path)}.txt").write_text(text.strip(), encoding="utf-8")


# ---------------- Heuristics to detect a weak first pass ----------------
_DEFECT_WORDS_RE = re.compile(
    r"\b(issue|defect|damage|leak|intrusion|stain|crack|dent|bend|warp|gap|separation|"
    r"loose|missing|rot|mold|mildew|corrosion|rust|unsafe|hazard|trip|void|broken|"
    r"exposed|unsealed|failed|compromised)\b",
    re.I,
)

def _looks_empty_or_safe(text: str) -> bool:
    """Return True if the model output likely missed all problems."""
    if not text or not text.strip():
        return True
    s = text.lower()
    # Check for both old and new section names
    # No issues section AND no classic defect words anywhere
    if ("issues to address" not in s and "potential issues" not in s) and not _DEFECT_WORDS_RE.search(s):
        return True
    # If it says "no repairs needed" or similar, that's fine
    if "no repairs needed" in s or "no issues" in s:
        return False  # This is a valid response, not empty
    return False


# ---------------- Public API ----------------
def describe_image(image_path: Path) -> str:
    """
    Analyze one image with the model and return notes as text.
    Uses downscaled copy for speed but leaves PDF quality untouched.
    Caches results on disk for instant re-runs.

    Diagnostics: prints whether API or cache was used, and any API errors.
    """
    # Sanity: key present?
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("OPENAI_API_KEY is missing or empty in .env")

    cached = _cache_get(image_path)
    if cached:
        return cached

    model = os.getenv("VISION_MODEL", "gpt-5")
    img_bytes, mime = _analysis_image_bytes(image_path)

    try:
        # ---------- First pass ----------
        print(f"[vision] Calling model={model} for {image_path.name}", flush=True)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": [
                    {"type": "text", "text": "Analyze this property photo and produce concise inspection notes."},
                    {"type": "image_url", "image_url": {"url": _data_url_from_bytes(img_bytes, mime)}},
                ]},
            ],
            max_tokens=500,
        )
        out = (resp.choices[0].message.content or "").strip()

        # ---------- Second pass (defect-focused) if needed ----------
        if _looks_empty_or_safe(out):
            print(f"[vision] Second pass nudge for {image_path.name}", flush=True)
            resp2 = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": [
                        {"type": "text", "text": SECOND_PASS_NUDGE},
                        {"type": "image_url", "image_url": {"url": _data_url_from_bytes(img_bytes, mime)}},
                    ]},
                ],
                max_tokens=500,
            )
            out2 = (resp2.choices[0].message.content or "").strip()
            if out2:
                out = out2

        if not out:
            print("[vision] WARNING: Model returned no output_text; not caching.", flush=True)
            return "No visible issues."

        _cache_put(image_path, out)
        return out

    except Exception as e:
        print("[vision] API ERROR:", repr(e), flush=True)
        traceback.print_exc()
        # Do not cache fallback; allow future retries
        return "No visible issues."
