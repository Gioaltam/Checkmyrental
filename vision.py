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
    "You are a property inspector creating a simple report for a PROPERTY OWNER (landlord). "
    "Use very simple, everyday words. Many owners are older or speak English as a second language. "
    "Your job is to find problems with the PROPERTY ITSELF - not tenant belongings.\n\n"

    "ONLY REPORT THESE TYPES OF PROBLEMS:\n"
    "1. WALLS, FLOORS, CEILINGS: Holes, cracks, water damage, broken doors or windows\n"
    "2. WATER PIPES AND DRAINS: Leaks, dripping faucets, slow drains, water stains\n"
    "3. AIR CONDITIONER / HEATER: Dirty air filter, not cooling or heating, water leaking from unit\n"
    "4. ELECTRICAL: Broken outlets, lights not working, exposed wires\n"
    "5. APPLIANCES: Broken stove, fridge, dishwasher, washer, dryer (if they belong to the property)\n"
    "6. SAFETY: Things you can trip on, missing smoke alarms, broken handrails\n\n"

    "DO NOT REPORT (these are not problems):\n"
    "- Bedsheets, curtains, blankets\n"
    "- Furniture\n"
    "- Messy or dirty rooms\n"
    "- Tenant's personal items\n"
    "- Decorations\n"
    "- Small scuffs or marks (normal wear)\n\n"

    "WHO SHOULD FIX IT - Tag each problem:\n"
    "[OWNER] = You need to hire someone to fix this (you pay)\n"
    "[TENANT] = Ask your tenant to fix this (they can do it themselves)\n\n"

    "HOW URGENT - Also tag:\n"
    "[FIX NOW] = Dangerous or causing damage right now\n"
    "[FIX SOON] = Should be fixed in the next few weeks\n\n"

    "TENANT CAN FIX THESE:\n"
    "- Dirty air filter (the filter you change every few months) -> Tenant buys new one at hardware store\n"
    "- Smoke alarm beeping (needs new battery) -> Tenant replaces battery\n"
    "- Slow drain (hair or soap stuck) -> Tenant uses drain cleaner or plunger\n"
    "- Light bulbs not working -> Tenant replaces bulb\n"
    "- Toilet keeps running (rubber piece inside tank is old) -> Tenant can replace cheap part\n\n"

    "YOU (OWNER) NEED TO FIX THESE:\n"
    "- Water damage on walls or ceiling -> Call a contractor\n"
    "- Broken windows or window frames -> Call a handyman\n"
    "- Air conditioner or heater not working (not just the filter) -> Call AC company\n"
    "- Electrical problems, broken outlets -> Call an electrician\n"
    "- Holes in walls, damaged floors -> Call a handyman\n"
    "- Appliances not working -> Repair or replace\n\n"

    "SIMPLE RULES:\n"
    "- Air conditioner: Dirty filter = [TENANT], unit broken = [OWNER]\n"
    "- Windows: Dirty = ignore, cracked or broken = [OWNER]\n"
    "- Walls: Small marks = ignore, holes or water damage = [OWNER]\n"
    "- Use simple words everyone can understand\n\n"

    "IF THERE ARE PROBLEMS, use this format:\n\n"
    "Location: (IMPORTANT: Use ONLY one of these room names: Kitchen, Living Room, Dining Room, "
    "Main Bedroom, Bedroom 2, Bedroom 3, Bedroom, Main Bathroom, Bathroom, Half Bathroom, "
    "Laundry Room, Garage, Exterior, Patio, Porch, Attic, Basement, Hallway, Closet, Office)\n\n"
    "Issues to Address:\n"
    "- [OWNER/TENANT] [FIX NOW/FIX SOON] Simple description of the problem\n\n"

    "What To Do:\n"
    "- Simple explanation of how to fix it\n\n"

    "IF THERE ARE NO PROBLEMS, use this format:\n"
    "Location: (use room name from list above)\n"
    "No repairs needed\n\n"

    "IMPORTANT: If the photo only shows tenant belongings, normal rooms, or small marks - "
    "just say 'Location: [room name]' then 'No repairs needed'. Do NOT comment on tenant's stuff."
)

# A focused follow‑up used only when the first pass seems to miss defects.
SECOND_PASS_NUDGE = (
    "Look again at this photo. Is there any problem with the property that needs fixing? "
    "Report problems that need [OWNER] to hire someone OR [TENANT] can fix themselves (like dirty air filter, slow drain). "
    "Do NOT report tenant belongings, furniture, curtains, bedding, or decorations. "
    "Tag each problem: [OWNER] or [TENANT], then [FIX NOW] or [FIX SOON]. Otherwise say 'No repairs needed'."
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
