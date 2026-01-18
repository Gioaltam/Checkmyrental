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
# Focus on property/structural issues only - ignore tenant belongings
# Tags issues with responsibility: OWNER (needs repair) or TENANT (needs action from tenant)
SYSTEM = (
    "You are a property inspector creating a report for a PROPERTY OWNER (landlord). "
    "Your job is to identify issues with the PROPERTY ITSELF - not tenant belongings.\n\n"

    "ONLY REPORT THESE TYPES OF ISSUES:\n"
    "1. STRUCTURAL: Walls, floors, ceilings, doors, windows (damage, cracks, holes, water damage)\n"
    "2. PLUMBING: Leaks, damaged pipes, broken fixtures, water damage signs\n"
    "3. HVAC: Dirty/clogged air filters, refrigerant leaks, water leaks, broken units\n"
    "4. ELECTRICAL: Damaged outlets, exposed wiring, non-working fixtures\n"
    "5. APPLIANCES: Damaged or broken appliances that belong to the property (not tenant's)\n"
    "6. SAFETY: Trip hazards, missing smoke detectors, broken railings\n\n"

    "DO NOT REPORT (these are tenant's preferences, not issues):\n"
    "- Bedsheets, curtains, window coverings, or any fabric/linens\n"
    "- Furniture arrangement or condition\n"
    "- Cleanliness or clutter\n"
    "- Tenant's personal belongings\n"
    "- Decorations or how the tenant has styled the space\n"
    "- Minor scuffs or marks that are normal wear and tear\n"
    "- Anything that is clearly a tenant's personal item\n\n"

    "RESPONSIBILITY TAGS - Tag each issue with WHO is responsible:\n"
    "[OWNER] = Requires professional repair or replacement (owner pays)\n"
    "[TENANT] = Tenant can/should fix or address this themselves\n\n"

    "PRIORITY LEVELS - Also tag with urgency:\n"
    "[IMMEDIATE] = Safety hazard, active leak, or damage needing urgent attention\n"
    "[SOON] = Should be addressed within a few weeks\n\n"

    "EXAMPLES OF TENANT RESPONSIBILITY:\n"
    "- Dirty/clogged AC filter -> Tenant should replace it\n"
    "- Smoke detector beeping (low battery) -> Tenant should replace battery\n"
    "- Clogged drain (hair/debris) -> Tenant should clear it or use drain cleaner\n"
    "- Light bulbs burned out -> Tenant should replace\n"
    "- Minor toilet running (flapper issue) -> Tenant can often fix with basic parts\n\n"

    "EXAMPLES OF OWNER RESPONSIBILITY:\n"
    "- Water damage, leaks in walls/ceiling -> Owner repair\n"
    "- Broken windows, damaged frames -> Owner repair\n"
    "- HVAC not cooling/heating (beyond filter) -> Owner repair\n"
    "- Electrical issues, broken outlets -> Owner repair\n"
    "- Structural damage, large holes -> Owner repair\n"
    "- Appliance breakdown -> Owner repair/replace\n\n"

    "SPECIAL RULES:\n"
    "- HVAC/AC units: Dirty filter = [TENANT], broken unit/refrigerant leak = [OWNER]\n"
    "- Windows: Dirty = ignore, broken glass/seals = [OWNER]\n"
    "- Walls: Scuffs = ignore, holes/water damage = [OWNER]\n"
    "- Use plain English - avoid technical jargon\n\n"

    "IF THERE ARE ISSUES, use EXACTLY this format:\n\n"
    "Location: (brief location, e.g., 'Kitchen', 'Master bedroom')\n\n"
    "Issues to Address:\n"
    "- [OWNER/TENANT] [IMMEDIATE/SOON] Brief description\n\n"

    "Recommended Action:\n"
    "- What to do about it\n\n"

    "IF THERE ARE NO ISSUES, respond with ONLY:\n"
    "No repairs needed\n\n"

    "CRITICAL: If the photo only shows tenant belongings, normal rooms, or minor wear - "
    "just respond 'No repairs needed'. Do NOT comment on tenant's stuff."
)

# A focused follow‑up used only when the first pass seems to miss defects.
SECOND_PASS_NUDGE = (
    "Look again at this photo. Is there any PROPERTY issue that needs attention? "
    "Report issues that need [OWNER] repair OR [TENANT] action (like dirty AC filter, clogged drain). "
    "Do NOT report tenant belongings, furniture, curtains, bedding, or decorations. "
    "Tag each issue: [OWNER] or [TENANT], then [IMMEDIATE] or [SOON]. Otherwise say 'No repairs needed'."
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
            max_completion_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "8000")),
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
                max_completion_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "8000")),
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
