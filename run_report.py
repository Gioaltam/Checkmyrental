#!/usr/bin/env python3
"""
Run Report Module - Core functionality for inspection report generation from ZIP files
This module handles the complete workflow of processing property inspection photos:
1. Extract photos from ZIP files
2. Analyze each photo using AI vision
3. Generate comprehensive HTML and PDF reports
4. Register reports with the portal system
"""

import os
import sys

# Fix Windows console encoding issues with Unicode
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import json
import secrets
import sqlite3
import zipfile
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from PIL import Image
# Enable HEIC/HEIF support (Apple's image format)
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # HEIC support not available
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import inch

# Import vision analysis module
try:
    from vision import describe_image
except ImportError:
    print("Warning: vision.py not found, using placeholder analysis")
    def describe_image(path):
        return "Image analysis not available"

# Import tenant action items module
try:
    from tenant_actions import (
        parse_issues_from_vision_results,
        generate_action_items_page,
        extract_location
    )
    ACTION_ITEMS_AVAILABLE = True
except ImportError:
    ACTION_ITEMS_AVAILABLE = False
    print("Warning: tenant_actions.py not found, action items page will be skipped")
    def extract_location(analysis):
        import re
        match = re.search(r'Location:\s*(.+?)(?:\n|$)', analysis, re.IGNORECASE)
        return match.group(1).strip() if match else "Unknown"

# Directory Configuration
WORKSPACE = Path(os.environ.get('WORKSPACE_DIR', './workspace'))
OUTPUTS_DIR = WORKSPACE / 'outputs'
INCOMING_DIR = WORKSPACE / 'incoming'
DB_PATH = WORKSPACE / 'inspection_portal.db'

# Ensure directories exist
for dir_path in [WORKSPACE, OUTPUTS_DIR, INCOMING_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Portal configuration
PORTAL_EXTERNAL_BASE_URL = os.environ.get("PORTAL_EXTERNAL_BASE_URL", "http://localhost:8000").rstrip("/")

def ensure_dir(path: Path) -> Path:
    """Ensure directory exists and return the path"""
    path.mkdir(parents=True, exist_ok=True)
    return path

# ============== Database Functions ==============

def db_init():
    """Initialize database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Create tables if they don't exist
    cur.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cur.execute('''
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            address TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')
    
    cur.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            property_id INTEGER,
            web_dir TEXT,
            pdf_path TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (property_id) REFERENCES properties(id)
        )
    ''')
    
    cur.execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            token TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            report_id TEXT,
            expires_at TEXT NOT NULL,
            revoked INTEGER DEFAULT 0,
            payload_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES reports(id)
        )
    ''')
    
    conn.commit()
    conn.close()

def db_connect():
    """Connect to database with row factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def db_upsert_client(conn: sqlite3.Connection, name: str, email: str = "") -> int:
    """Insert or update client and return client ID"""
    cur = conn.cursor()
    
    # Check if client exists
    cur.execute("SELECT id FROM clients WHERE name = ? AND email = ?", (name, email))
    row = cur.fetchone()
    
    if row:
        return row['id']
    
    # Insert new client
    cur.execute("INSERT INTO clients (name, email) VALUES (?, ?)", (name, email))
    conn.commit()
    return cur.lastrowid

def db_upsert_property(conn: sqlite3.Connection, client_id: int, address: str) -> int:
    """Insert or update property and return property ID"""
    cur = conn.cursor()
    
    # Check if property exists
    cur.execute("SELECT id FROM properties WHERE client_id = ? AND address = ?", (client_id, address))
    row = cur.fetchone()
    
    if row:
        return row['id']
    
    # Insert new property
    cur.execute("INSERT INTO properties (client_id, address) VALUES (?, ?)", (client_id, address))
    conn.commit()
    return cur.lastrowid

def db_insert_report(conn: sqlite3.Connection, report_id: str, property_id: int, web_dir: str, pdf_path: str) -> str:
    """Insert report and return report ID"""
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO reports (id, property_id, web_dir, pdf_path) VALUES (?, ?, ?, ?)",
        (report_id, property_id, web_dir, pdf_path)
    )
    conn.commit()
    return report_id

def db_create_token(conn: sqlite3.Connection, kind: str, ttl_hours: int, 
                   report_id: Optional[str] = None, payload_json: Optional[str] = None) -> str:
    """Create access token with expiration"""
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(hours=ttl_hours)).isoformat() + 'Z'
    
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO tokens (token, kind, report_id, expires_at, payload_json) VALUES (?, ?, ?, ?, ?)",
        (token, kind, report_id, expires_at, payload_json)
    )
    conn.commit()
    return token

def now_iso() -> str:
    """Return current time in ISO format"""
    return datetime.utcnow().isoformat() + 'Z'

# ============== Image Processing Functions ==============

def extract_zip(zip_path: Path) -> Path:
    """Extract ZIP file to temporary directory and return path to photos"""
    extract_dir = Path(tempfile.mkdtemp(prefix="inspection_"))
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(extract_dir)
    
    # Check for common photo directory names
    for subdir_name in ['photos', 'images', 'Pictures']:
        subdir = extract_dir / subdir_name
        if subdir.exists() and subdir.is_dir():
            return subdir
    
    # Return root extraction dir if no subdirectory found
    return extract_dir

def collect_images(photos_dir: Path) -> List[Path]:
    """Collect all image files from directory"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif'}
    images = []
    
    for file_path in photos_dir.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            images.append(file_path)
    
    # Sort by name for consistent ordering
    images.sort(key=lambda p: p.name.lower())
    return images

def normalize_location(location: str) -> str:
    """
    Normalize location strings for consistent grouping.
    Maps granular sub-locations to their parent room category.
    """
    location = location.strip().title()

    # Step 1: Exact synonym mapping
    synonyms = {
        'Master Bedroom': 'Main Bedroom',
        'Master Bath': 'Main Bathroom',
        'Master Bathroom': 'Main Bathroom',
        'Half Bath': 'Half Bathroom',
        'Powder Room': 'Half Bathroom',
        'Family Room': 'Living Room',
        'Laundry': 'Laundry Room',
        'Den': 'Office',
        'Study': 'Office',
        'Front Yard': 'Exterior',
        'Back Yard': 'Exterior',
        'Backyard': 'Exterior',
        'Yard': 'Exterior',
        'Driveway': 'Exterior',
        'Carport': 'Garage',
        'Deck': 'Patio',
        'Balcony': 'Patio',
    }

    for key, canonical in synonyms.items():
        if location.lower() == key.lower():
            return canonical

    # Step 2: Canonical room categories
    canonical_rooms = [
        'Kitchen', 'Living Room', 'Dining Room',
        'Main Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bedroom',
        'Main Bathroom', 'Bathroom', 'Half Bathroom',
        'Laundry Room', 'Garage', 'Exterior',
        'Patio', 'Porch', 'Attic', 'Basement',
        'Hallway', 'Closet', 'Office', 'Unknown'
    ]

    for room in canonical_rooms:
        if location.lower() == room.lower():
            return room

    # Step 3: Keyword-based consolidation for granular locations
    location_lower = location.lower()

    # Bathroom consolidation (preserve Half/Main distinction)
    if 'half bath' in location_lower or 'powder' in location_lower:
        return 'Half Bathroom'
    if 'main bath' in location_lower or 'master bath' in location_lower:
        return 'Main Bathroom'
    if 'bathroom' in location_lower or 'bath ' in location_lower or location_lower.endswith(' bath'):
        return 'Bathroom'

    # Kitchen consolidation
    if 'kitchen' in location_lower:
        return 'Kitchen'

    # Living Room consolidation
    if 'living' in location_lower or 'family room' in location_lower:
        return 'Living Room'

    # Bedroom consolidation
    if 'main bed' in location_lower or 'master bed' in location_lower:
        return 'Main Bedroom'
    if 'bedroom 2' in location_lower or 'second bed' in location_lower:
        return 'Bedroom 2'
    if 'bedroom 3' in location_lower or 'third bed' in location_lower:
        return 'Bedroom 3'
    if 'bedroom' in location_lower or 'bed room' in location_lower:
        return 'Bedroom'

    # Dining consolidation
    if 'dining' in location_lower:
        return 'Dining Room'

    # Garage consolidation
    if 'garage' in location_lower or 'carport' in location_lower:
        return 'Garage'

    # Exterior consolidation
    if any(word in location_lower for word in ['exterior', 'outside', 'outdoor', 'yard', 'driveway', 'sidewalk', 'roof', 'gutter', 'siding', 'fence']):
        return 'Exterior'

    # Patio/Porch consolidation
    if any(word in location_lower for word in ['patio', 'deck', 'balcony']):
        return 'Patio'
    if 'porch' in location_lower:
        return 'Porch'

    # Laundry consolidation
    if 'laundry' in location_lower or 'utility room' in location_lower:
        return 'Laundry Room'

    # Hallway consolidation
    if any(word in location_lower for word in ['hall', 'corridor', 'foyer', 'entry']):
        return 'Hallway'

    # Closet consolidation
    if 'closet' in location_lower or 'storage' in location_lower:
        return 'Closet'

    # Attic/Basement
    if 'attic' in location_lower:
        return 'Attic'
    if 'basement' in location_lower:
        return 'Basement'

    # Office consolidation
    if any(word in location_lower for word in ['office', 'den', 'study']):
        return 'Office'

    # Map Unknown to Other
    if location_lower == 'unknown' or not location.strip():
        return 'Other'

    # If nothing matches, return as-is
    return location


def group_images_by_location(images: List[Path], vision_results: Optional[Dict[str, str]] = None) -> List[Tuple[str, List[Path]]]:
    """
    Group images by their location extracted from vision results.

    Returns a list of (location_name, [image_paths]) tuples, ordered
    alphabetically with "Unknown" last.
    Falls back to a single group if no vision_results provided.
    """
    if not vision_results:
        return [("All Photos", images)]

    groups: Dict[str, List[Path]] = {}

    for img_path in images:
        img_path_str = str(img_path)
        analysis = None

        # Match by full path or by filename
        if img_path_str in vision_results:
            analysis = vision_results[img_path_str]
        else:
            for key, value in vision_results.items():
                if Path(key).name == img_path.name:
                    analysis = value
                    break

        if analysis:
            raw_location = extract_location(analysis)
            location = normalize_location(raw_location)
        else:
            location = "Other"

        if location not in groups:
            groups[location] = []
        groups[location].append(img_path)

    # Sort alphabetically, "Other" goes last
    sorted_locations = sorted(
        groups.keys(),
        key=lambda loc: (loc == "Other", loc.lower())
    )

    return [(loc, groups[loc]) for loc in sorted_locations]


def calculate_page_layout(grouped_images: List[Tuple[str, List[Path]]], has_action_items: bool) -> List[Tuple[str, int, int]]:
    """
    Pre-calculate starting page number for each location section.

    Returns: [(location_name, photo_count, starting_page_number), ...]
    """
    current_page = 1  # Cover
    if has_action_items:
        current_page += 1  # Action items
    current_page += 1  # TOC

    sections = []
    for location_name, location_images in grouped_images:
        current_page += 1  # Section divider page
        section_start = current_page
        sections.append((location_name, len(location_images), section_start))
        current_page += len(location_images)  # One page per photo (minimum)

    return sections


def analyze_images(images: List[Path]) -> Dict[str, str]:
    """Analyze all images using vision AI with concurrent processing"""
    import concurrent.futures
    import threading
    
    results = {}
    total = len(images)
    
    # Get concurrency setting from environment (default 8 for fast batch processing)
    max_workers = int(os.getenv('ANALYSIS_CONCURRENCY', '8'))
    
    print(f"Starting analysis of {total} images (concurrency={max_workers})...")
    
    # Thread-safe counter for progress
    counter_lock = threading.Lock()
    counter = [0]
    
    def analyze_one(img_path: Path) -> Tuple[str, str]:
        """Analyze a single image and return path and result"""
        with counter_lock:
            counter[0] += 1
            current = counter[0]
        
        print(f"[{current}/{total}] Analyzing {img_path.name}...")
        try:
            analysis = describe_image(img_path)
            return str(img_path), analysis
        except Exception as e:
            print(f"  Error analyzing {img_path.name}: {e}")
            return str(img_path), f"Analysis failed: {str(e)}"
    
    # Process images concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        futures = [executor.submit(analyze_one, img) for img in images]
        
        # Collect results as they complete
        for future in concurrent.futures.as_completed(futures):
            try:
                path, analysis = future.result()
                results[path] = analysis
            except Exception as e:
                print(f"  Unexpected error: {e}")
    
    return results

# ============== PDF Report Generation ==============

def generate_table_of_contents(c, sections: List[Tuple[str, int, int]], width: float, height: float, has_action_items: bool) -> None:
    """Generate table of contents page listing all location sections."""
    from reportlab.lib.colors import HexColor

    primary_color = HexColor('#1a1a2e')
    accent_color = HexColor('#e74c3c')
    text_primary = HexColor('#2c3e50')
    text_secondary = HexColor('#7f8c8d')
    text_light = HexColor('#95a5a6')
    gold_accent = HexColor('#d4af37')

    # Header bar
    c.setStrokeColor(accent_color)
    c.setLineWidth(2)
    c.line(0, height - 30, width, height - 30)

    # Title
    c.setFont("Helvetica", 12)
    c.setFillColor(text_secondary)
    subtitle = "INSPECTION REPORT"
    c.drawCentredString(width / 2, height - 70, subtitle)

    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(text_primary)
    c.drawCentredString(width / 2, height - 100, "TABLE OF CONTENTS")

    # Gold underline
    line_width = 80
    c.setStrokeColor(gold_accent)
    c.setLineWidth(2)
    c.line((width - line_width) / 2, height - 115, (width + line_width) / 2, height - 115)

    # Content entries
    margin = 60
    entry_y = height - 160
    line_height = 35

    # Static entries
    c.setFont("Helvetica", 11)
    c.setFillColor(text_primary)
    c.drawString(margin, entry_y, "Cover Page")
    c.drawRightString(width - margin, entry_y, "1")
    entry_y -= line_height * 0.7

    if has_action_items:
        c.drawString(margin, entry_y, "Action Items")
        c.drawRightString(width - margin, entry_y, "2")
        entry_y -= line_height * 0.7

    # Separator
    entry_y -= 10
    c.setStrokeColor(HexColor('#e0e0e0'))
    c.setLineWidth(0.5)
    c.line(margin, entry_y, width - margin, entry_y)
    entry_y -= 20

    # Section label
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(accent_color)
    c.drawString(margin, entry_y, "INSPECTION SECTIONS")
    entry_y -= line_height

    # Location sections
    for location_name, photo_count, page_num in sections:
        if entry_y < 80:
            break

        # Location name
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(text_primary)
        display_name = location_name[:40]
        c.drawString(margin + 10, entry_y, display_name)

        # Photo count
        c.setFont("Helvetica", 9)
        c.setFillColor(text_secondary)
        count_text = f"({photo_count} photo{'s' if photo_count != 1 else ''})"
        name_width = c.stringWidth(display_name, "Helvetica-Bold", 12)
        c.drawString(margin + 10 + name_width + 8, entry_y + 1, count_text)

        # Dotted leader line
        count_width = c.stringWidth(count_text, "Helvetica", 9)
        leader_start = margin + 10 + name_width + 8 + count_width + 5
        leader_end = width - margin - 25
        if leader_start < leader_end:
            c.setStrokeColor(text_light)
            c.setLineWidth(0.5)
            c.setDash(1, 3)
            c.line(leader_start, entry_y + 3, leader_end, entry_y + 3)
            c.setDash()

        # Page number
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(text_primary)
        c.drawRightString(width - margin, entry_y, str(page_num))

        entry_y -= line_height

    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(text_light)
    c.drawString(margin, 30, datetime.now().strftime('%Y-%m-%d'))
    c.drawCentredString(width / 2, 30, f"Page {c.getPageNumber()}")


def generate_section_divider(c, location_name: str, photo_count: int, width: float, height: float, section_number: int, total_sections: int) -> None:
    """Generate a section divider page for a location group."""
    from reportlab.lib.colors import HexColor

    primary_color = HexColor('#1a1a2e')
    accent_color = HexColor('#e74c3c')
    text_primary = HexColor('#2c3e50')
    text_secondary = HexColor('#7f8c8d')
    gold_accent = HexColor('#d4af37')
    bg_accent = HexColor('#ecf0f1')

    # Background
    c.setFillColor(HexColor('#ffffff'))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Top accent bar
    c.setFillColor(accent_color)
    c.rect(0, height - 3, width, 3, fill=1, stroke=0)

    # Section number badge
    badge_y = height * 0.65
    c.setFillColor(bg_accent)
    c.circle(width / 2, badge_y, 40, fill=1, stroke=0)
    c.setStrokeColor(gold_accent)
    c.setLineWidth(2)
    c.circle(width / 2, badge_y, 40, fill=0, stroke=1)

    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(primary_color)
    c.drawCentredString(width / 2, badge_y - 8, str(section_number))

    # Location name
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(text_primary)
    c.drawCentredString(width / 2, height * 0.50, location_name.upper()[:40])

    # Gold decorative line
    line_width = 100
    line_y = height * 0.47
    c.setStrokeColor(gold_accent)
    c.setLineWidth(1.5)
    c.line((width - line_width) / 2, line_y, (width + line_width) / 2, line_y)

    # Photo count subtitle
    c.setFont("Helvetica", 14)
    c.setFillColor(text_secondary)
    photo_text = f"{photo_count} photo{'s' if photo_count != 1 else ''} in this section"
    c.drawCentredString(width / 2, height * 0.42, photo_text)

    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(text_secondary)
    c.drawCentredString(width / 2, 30, f"Section {section_number} of {total_sections}")


def generate_pdf(address: str, images: List[Path], out_pdf: Path, vision_results: Optional[Dict[str, str]] = None, client_name: str = "", inspection_type: str = "Quarterly", inspector_notes: List[Dict] = None) -> None:
    """Generate executive-quality PDF report with sophisticated design

    Args:
        address: Property address
        images: List of image paths
        out_pdf: Output PDF path
        vision_results: Vision analysis results
        client_name: Client name for report
        inspection_type: Type of inspection
        inspector_notes: List of inspector notes
    """
    if inspector_notes is None:
        inspector_notes = []
    from PIL import Image as PILImage, ImageOps
    from reportlab.lib.colors import HexColor

    c = canvas.Canvas(str(out_pdf), pagesize=letter)
    width, height = letter
    
    # Executive color palette - sophisticated and professional
    primary_color = HexColor('#1a1a2e')      # Deep navy
    accent_color = HexColor('#e74c3c')       # Signature red
    text_primary = HexColor('#2c3e50')       # Dark blue-gray
    text_secondary = HexColor('#7f8c8d')     # Medium gray
    text_light = HexColor('#95a5a6')         # Light gray
    bg_light = HexColor('#f8f9fa')           # Very light gray
    bg_accent = HexColor('#ecf0f1')          # Light accent
    gold_accent = HexColor('#d4af37')        # Executive gold
    
    # EXECUTIVE COVER PAGE DESIGN

    # Subtle gradient background effect using overlapping rectangles
    c.setFillColor(HexColor('#ffffff'))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Top section with subtle gray background
    c.setFillColor(bg_accent)
    c.rect(0, height - 180, width, 180, fill=1, stroke=0)

    # Subtle diagonal lines pattern in header (very faint)
    c.saveState()
    c.setStrokeColor(HexColor('#dcdcdc'))
    c.setLineWidth(0.5)
    for i in range(-5, 25):
        c.line(i * 35, height - 180, i * 35 + 180, height)
    c.restoreState()

    # Thin accent line at top
    c.setFillColor(accent_color)
    c.rect(0, height - 3, width, 3, fill=1, stroke=0)

    # Corner accents - top left
    c.setFillColor(gold_accent)
    c.rect(20, height - 25, 30, 2, fill=1, stroke=0)
    c.rect(20, height - 25, 2, 20, fill=1, stroke=0)

    # Corner accents - top right
    c.rect(width - 50, height - 25, 30, 2, fill=1, stroke=0)
    c.rect(width - 22, height - 25, 2, 20, fill=1, stroke=0)

    # Logo symbol only (centered at top) - larger and more prominent
    logo_x = width / 2 - 30
    logo_y = height - 120

    # Draw sophisticated logo mark
    # Shadow behind outer circle for depth
    c.setFillColor(HexColor('#d0d0d0'))
    c.circle(logo_x + 32, logo_y + 28, 36, fill=1, stroke=0)

    # Gold outer ring for elegance
    c.setStrokeColor(gold_accent)
    c.setLineWidth(1.5)
    c.circle(logo_x + 30, logo_y + 30, 38, fill=0, stroke=1)

    # Main outer circle
    c.setStrokeColor(primary_color)
    c.setLineWidth(2)
    c.circle(logo_x + 30, logo_y + 30, 35, fill=0, stroke=1)

    # House shape (rotated square) - refined design
    c.saveState()
    c.translate(logo_x + 30, logo_y + 30)
    c.rotate(45)
    c.setFillColor(primary_color)
    c.rect(-18, -18, 36, 36, fill=1, stroke=0)

    # Window grid - drawn in rotated coordinate system (like SVG logo)
    c.setFillColor(HexColor('#ffffff'))
    window_size = 7
    gap = 1.5
    # 2x2 grid centered at origin
    c.rect(-window_size - gap/2, -window_size - gap/2, window_size, window_size, fill=1)  # top-left
    c.rect(gap/2, -window_size - gap/2, window_size, window_size, fill=1)  # top-right
    c.rect(-window_size - gap/2, gap/2, window_size, window_size, fill=1)  # bottom-left
    c.rect(gap/2, gap/2, window_size, window_size, fill=1)  # bottom-right
    c.restoreState()

    # Checkmark badge shadow
    c.setFillColor(HexColor('#c0392b'))
    c.circle(logo_x + 47, logo_y + 13, 12, fill=1, stroke=0)

    # Checkmark badge
    c.setFillColor(accent_color)
    c.circle(logo_x + 45, logo_y + 15, 12, fill=1, stroke=0)

    # Checkmark - drawn as a filled polygon shape (not stroked lines)
    # This avoids line clipping issues entirely
    cx, cy = logo_x + 45, logo_y + 15  # badge center
    # Draw checkmark as a thick path using a polygon
    from reportlab.graphics.shapes import Polygon
    from reportlab.graphics import renderPDF
    from reportlab.graphics.shapes import Drawing, Polygon as PolygonShape

    # Create checkmark path points (outline of the check shape)
    # Thickness of 3 pixels, small checkmark centered in badge
    t = 1.5  # half-thickness
    # Outer points of checkmark shape
    p = c.beginPath()
    # Start at left point top
    p.moveTo(cx - 6, cy + 2 + t)
    # Go to middle point (bottom of V) - outer edge
    p.lineTo(cx - 2, cy - 2 + t)
    # Go to right point top - outer edge
    p.lineTo(cx + 6, cy + 5 + t)
    # Right point bottom
    p.lineTo(cx + 6, cy + 5 - t)
    # Back to middle point - inner edge
    p.lineTo(cx - 2, cy - 2 - t)
    # Left point bottom
    p.lineTo(cx - 6, cy + 2 - t)
    p.close()

    c.setFillColor(HexColor('#ffffff'))
    c.drawPath(p, fill=1, stroke=0)

    # MAIN TITLE - Centered and elegant with letter-spacing
    c.setFont("Helvetica", 12)
    c.setFillColor(text_secondary)
    title_text = "P R O P E R T Y   I N S P E C T I O N"
    title_width = c.stringWidth(title_text, "Helvetica", 12)
    c.drawString((width - title_width) / 2, height - 200, title_text)

    # Larger main title with subtle shadow effect
    c.setFont("Helvetica-Bold", 38)
    c.setFillColor(HexColor('#e0e0e0'))  # Shadow
    report_text = "REPORT"
    report_width = c.stringWidth(report_text, "Helvetica-Bold", 38)
    c.drawString((width - report_width) / 2 + 1, height - 236, report_text)
    c.setFillColor(text_primary)  # Main text
    c.drawString((width - report_width) / 2, height - 235, report_text)

    # Decorative line under title with diamond endpoints
    line_width = 100
    c.setStrokeColor(gold_accent)
    c.setLineWidth(1.5)
    c.line((width - line_width) / 2, height - 255, (width + line_width) / 2, height - 255)

    # Left diamond
    c.setFillColor(gold_accent)
    c.saveState()
    c.translate((width - line_width) / 2, height - 255)
    c.rotate(45)
    c.rect(-3, -3, 6, 6, fill=1, stroke=0)
    c.restoreState()

    # Right diamond
    c.saveState()
    c.translate((width + line_width) / 2, height - 255)
    c.rotate(45)
    c.rect(-3, -3, 6, 6, fill=1, stroke=0)
    c.restoreState()

    # Inspection Type Badge
    badge_text = inspection_type.upper() + " INSPECTION"
    badge_width = c.stringWidth(badge_text, "Helvetica-Bold", 10) + 30
    badge_x = (width - badge_width) / 2
    badge_y = height - 285

    # Badge background
    c.setFillColor(accent_color)
    c.roundRect(badge_x, badge_y, badge_width, 22, 11, fill=1, stroke=0)

    # Badge text
    c.setFillColor(HexColor('#ffffff'))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width / 2, badge_y + 7, badge_text)

    # Property Information Card - elevated design
    card_y = height - 480
    card_height = 180
    card_margin = 60
    
    # Card shadow effect
    c.setFillColor(HexColor('#e8e8e8'))
    c.roundRect(card_margin + 2, card_y - 2, width - (2 * card_margin), card_height, 8, fill=1, stroke=0)
    
    # Main card
    c.setFillColor(HexColor('#ffffff'))
    c.setStrokeColor(HexColor('#e0e0e0'))
    c.setLineWidth(1)
    c.roundRect(card_margin, card_y, width - (2 * card_margin), card_height, 8, fill=1, stroke=1)
    
    # Property Address Section
    info_x = card_margin + 30
    info_y = card_y + card_height - 40

    # Location pin icon
    c.setFillColor(accent_color)
    c.circle(info_x - 15, info_y + 4, 4, fill=1, stroke=0)
    c.setFillColor(HexColor('#ffffff'))
    c.circle(info_x - 15, info_y + 5, 1.5, fill=1, stroke=0)

    c.setFont("Helvetica", 10)
    c.setFillColor(text_light)
    c.drawString(info_x, info_y, "PROPERTY ADDRESS")

    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(text_primary)
    c.drawString(info_x, info_y - 25, address[:50])  # Truncate if too long
    if len(address) > 50:
        c.setFont("Helvetica-Bold", 16)
        c.drawString(info_x, info_y - 45, address[50:100])

    # Vertical separator
    c.setStrokeColor(HexColor('#e0e0e0'))
    c.setLineWidth(1)
    separator_x = width / 2
    c.line(separator_x, card_y + 20, separator_x, card_y + card_height - 20)

    # Right side information
    right_x = separator_x + 30

    # Calendar icon for date
    c.setStrokeColor(accent_color)
    c.setLineWidth(1)
    c.rect(right_x - 18, info_y, 10, 10, fill=0, stroke=1)
    c.setFillColor(accent_color)
    c.rect(right_x - 18, info_y + 8, 10, 3, fill=1, stroke=0)

    # Date
    c.setFont("Helvetica", 10)
    c.setFillColor(text_light)
    c.drawString(right_x, info_y, "INSPECTION DATE")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(text_primary)
    c.drawString(right_x, info_y - 22, datetime.now().strftime('%B %d, %Y'))

    # Client name if provided
    if client_name:
        # Person icon
        c.setFillColor(accent_color)
        c.circle(right_x - 13, info_y - 43, 4, fill=1, stroke=0)
        c.ellipse(right_x - 20, info_y - 58, right_x - 6, info_y - 50, fill=1, stroke=0)

        c.setFont("Helvetica", 10)
        c.setFillColor(text_light)
        c.drawString(right_x, info_y - 50, "PREPARED FOR")
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(text_primary)
        c.drawString(right_x, info_y - 72, client_name[:30])
    
    # Statistics box at bottom
    stats_y = card_y - 60
    c.setFillColor(bg_accent)
    c.roundRect(card_margin, stats_y, width - (2 * card_margin), 45, 8, fill=1, stroke=0)

    # Camera icon for photo count
    cam_x = card_margin + 25
    cam_y = stats_y + 15
    c.setFillColor(text_secondary)
    c.roundRect(cam_x, cam_y, 14, 10, 2, fill=1, stroke=0)
    c.circle(cam_x + 7, cam_y + 5, 3, fill=0, stroke=1)
    c.setStrokeColor(text_secondary)
    c.setLineWidth(1)

    # Photo count with icon
    c.setFont("Helvetica", 11)
    c.setFillColor(text_secondary)
    stats_text = f"This report contains {len(images)} detailed inspection photographs with professional analysis"
    stats_width = c.stringWidth(stats_text, "Helvetica", 11)
    c.drawString((width - stats_width) / 2 + 10, stats_y + 18, stats_text)

    # Executive Summary - Issues found
    if vision_results and ACTION_ITEMS_AVAILABLE:
        issues = parse_issues_from_vision_results(vision_results)
        tenant_count = len(issues.get('tenant', []))
        owner_count = len(issues.get('owner', []))
        total_issues = tenant_count + owner_count

        summary_y = stats_y - 45

        if total_issues == 0:
            # Green "No Issues" indicator
            c.setFillColor(HexColor('#10b981'))
            summary_text = "NO ACTION ITEMS IDENTIFIED"
        else:
            # Show issue count
            c.setFillColor(accent_color)
            summary_text = f"{total_issues} ACTION ITEM{'S' if total_issues != 1 else ''} IDENTIFIED"

        c.setFont("Helvetica-Bold", 12)
        summary_width = c.stringWidth(summary_text, "Helvetica-Bold", 12)
        c.drawString((width - summary_width) / 2, summary_y, summary_text)

        # Show breakdown if there are issues
        if total_issues > 0:
            c.setFont("Helvetica", 10)
            c.setFillColor(text_secondary)
            breakdown = f"({tenant_count} tenant | {owner_count} owner)"
            breakdown_width = c.stringWidth(breakdown, "Helvetica", 10)
            c.drawString((width - breakdown_width) / 2, summary_y - 18, breakdown)

    # Bottom corner accents
    c.setFillColor(gold_accent)
    c.rect(20, 55, 30, 2, fill=1, stroke=0)
    c.rect(20, 55, 2, 20, fill=1, stroke=0)
    c.rect(width - 50, 55, 30, 2, fill=1, stroke=0)
    c.rect(width - 22, 55, 2, 20, fill=1, stroke=0)

    # Professional footer - minimal and elegant
    c.setFont("Helvetica", 8)
    c.setFillColor(text_light)
    c.drawString(card_margin, 40, "Confidential Property Inspection Report")
    c.drawRightString(width - card_margin, 40, datetime.now().strftime('%Y-%m-%d'))
    
    c.showPage()

    # === ACTION ITEMS PAGE (2nd page, after cover) ===
    has_action_items_page = False
    print(f"[DEBUG] ACTION_ITEMS_AVAILABLE={ACTION_ITEMS_AVAILABLE}, inspector_notes count={len(inspector_notes)}")
    if inspector_notes:
        print(f"[DEBUG] Inspector notes: {inspector_notes}")
    if ACTION_ITEMS_AVAILABLE:
        try:
            # Parse issues from vision results (separates tenant vs owner)
            issues = parse_issues_from_vision_results(vision_results) if vision_results else {'tenant': [], 'owner': []}
            tenant_count = len(issues.get('tenant', []))
            owner_count = len(issues.get('owner', []))
            notes_count = len(inspector_notes)

            if tenant_count > 0 or owner_count > 0 or notes_count > 0:
                generate_action_items_page(c, issues, width, height, inspector_notes)
                c.showPage()
                has_action_items_page = True
                print(f"Action items page added ({tenant_count} tenant, {owner_count} owner items, {notes_count} inspector notes)")
            else:
                print("No action items found - skipping action items page")
        except Exception as e:
            print(f"Warning: Could not generate action items page: {e}")
            import traceback
            traceback.print_exc()

    # === GROUP IMAGES BY LOCATION ===
    grouped_images = group_images_by_location(images, vision_results)
    use_grouping = vision_results and len(grouped_images) > 1

    if use_grouping:
        toc_sections = calculate_page_layout(grouped_images, has_action_items_page)
        generate_table_of_contents(c, toc_sections, width, height, has_action_items_page)
        c.showPage()
        print(f"Table of contents added ({len(grouped_images)} sections)")

        # Build flat ordered image list with section break markers
        ordered_images = []
        section_breaks = {}  # Maps 0-based photo index to section info
        photo_idx = 0
        for section_idx, (section_name, section_images) in enumerate(grouped_images, 1):
            section_breaks[photo_idx] = (section_name, len(section_images), section_idx, len(grouped_images))
            ordered_images.extend(section_images)
            photo_idx += len(section_images)
        print(f"  Sections: {', '.join(name + f' ({count})' for name, count, _, _ in section_breaks.values())}")
    else:
        ordered_images = list(images)
        section_breaks = {}

    total_photos = len(ordered_images)
    current_section_name = ""

    # Add each image with analysis
    for i, img_path in enumerate(ordered_images, 1):
        # Insert section divider before first photo in each group
        if (i - 1) in section_breaks:
            sec_name, sec_count, sec_idx, sec_total = section_breaks[i - 1]
            current_section_name = sec_name
            generate_section_divider(c, sec_name, sec_count, width, height, sec_idx, sec_total)
            c.showPage()

        try:
            # Compress image for smaller PDF size
            with PILImage.open(img_path) as pil_img:
                # IMPORTANT: Auto-rotate image based on EXIF orientation
                # This ensures the image appears upright in the PDF
                try:
                    # Use ImageOps.exif_transpose to automatically handle EXIF orientation
                    pil_img = ImageOps.exif_transpose(pil_img)
                except Exception:
                    # If EXIF handling fails, try manual rotation based on orientation tag
                    try:
                        exif = pil_img._getexif()
                        if exif:
                            orientation = exif.get(0x0112)  # Orientation tag
                            if orientation:
                                rotations = {
                                    3: PILImage.Transpose.ROTATE_180,
                                    6: PILImage.Transpose.ROTATE_270,
                                    8: PILImage.Transpose.ROTATE_90
                                }
                                if orientation in rotations:
                                    pil_img = pil_img.transpose(rotations[orientation])
                    except (AttributeError, KeyError):
                        pass  # No EXIF data or orientation info
                
                # Convert to RGB if necessary (after rotation)
                if pil_img.mode in ('RGBA', 'P'):
                    pil_img = pil_img.convert('RGB')

                # Compress images for email-friendly PDF size (max 720px, 50% quality)
                # This keeps reports under 5MB for easy email delivery
                max_dim = max(pil_img.size)
                if max_dim > 720:
                    scale = 720 / max_dim
                    new_size = (int(pil_img.width * scale), int(pil_img.height * scale))
                    pil_img = pil_img.resize(new_size, PILImage.Resampling.LANCZOS)

                # Save to temporary JPEG with higher compression for smaller file size
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                    pil_img.save(tmp.name, 'JPEG', quality=50, optimize=True)
                    compressed_path = tmp.name
            
            # EXECUTIVE PAGE HEADER - Minimal and sophisticated
            # Thin top border
            c.setStrokeColor(accent_color)
            c.setLineWidth(2)
            c.line(0, height - 30, width, height - 30)
            
            # Small logo mark (left side)
            logo_size = 12
            c.saveState()
            c.translate(35, height - 18)
            c.rotate(45)
            c.setFillColor(primary_color)
            c.rect(-logo_size/2, -logo_size/2, logo_size, logo_size, fill=1, stroke=0)
            c.restoreState()
            
            # Mini window
            c.setFillColor(HexColor('#ffffff'))
            c.rect(32, height - 21, 3, 3, fill=1)
            c.rect(36, height - 21, 3, 3, fill=1)
            
            # Check badge
            c.setFillColor(accent_color)
            c.circle(42, height - 22, 3, fill=1, stroke=0)
            
            # Page information - clean typography
            c.setFont("Helvetica", 9)
            c.setFillColor(text_secondary)
            if use_grouping and current_section_name:
                c.drawString(55, height - 22, f"Photo {i} of {total_photos} \u2014 {current_section_name}")
            else:
                c.drawString(55, height - 22, f"Photo {i} of {total_photos}")
            
            # Property address (right aligned)
            c.setFont("Helvetica", 8)
            c.drawRightString(width - 35, height - 22, address[:45])
            
            # Get image dimensions
            img = ImageReader(compressed_path)
            img_width, img_height = img.getSize()

            # Layout constants
            left_margin = 30
            right_margin = 30
            column_gap = 20
            header_height = 50  # Space for top header
            footer_height = 50  # Space for bottom footer

            # Get analysis text FIRST to determine layout
            analysis = None
            if vision_results:
                img_path_str = str(img_path)
                if img_path_str in vision_results:
                    analysis = vision_results[img_path_str]
                else:
                    for key, value in vision_results.items():
                        if Path(key).name == img_path.name:
                            analysis = value
                            break

            # Check if there are no issues
            no_issues_phrases = ['no repairs needed', 'no issues', 'no damage', 'good condition',
                                 'no action needed', 'no repairs necessary', 'nothing to report']
            has_issues = True
            if analysis:
                analysis_lower = analysis.lower()
                if any(phrase in analysis_lower for phrase in no_issues_phrases):
                    issue_lines = [l for l in analysis.split('\n') if l.strip().startswith('-')
                                  and not any(phrase in l.lower() for phrase in no_issues_phrases)]
                    if not issue_lines:
                        has_issues = False

            if not analysis or not has_issues:
                # === NO ISSUES LAYOUT ===
                # Photo at top (centered, full width available), "NO ISSUES" badge at bottom

                # Calculate photo sizing for full-width layout
                usable_width = width - left_margin - right_margin
                photo_max_height = height - header_height - footer_height - 100  # Leave room for badge

                scale = min(usable_width / img_width, photo_max_height / img_height, 1.0)
                draw_width = img_width * scale
                draw_height = img_height * scale

                # Center photo horizontally, position at top
                photo_x = (width - draw_width) / 2
                photo_y = height - header_height - 20 - draw_height

                # Image frame with shadow effect
                c.setFillColor(HexColor('#e0e0e0'))
                c.rect(photo_x - 2, photo_y - 2, draw_width + 4, draw_height + 4, fill=1, stroke=0)

                # White border around image
                c.setFillColor(HexColor('#ffffff'))
                c.setStrokeColor(HexColor('#d0d0d0'))
                c.setLineWidth(1)
                c.rect(photo_x - 5, photo_y - 5, draw_width + 10, draw_height + 10, fill=1, stroke=1)

                # Draw image
                c.drawImage(img, photo_x, photo_y, draw_width, draw_height, preserveAspectRatio=True)

                # Clean up temp file
                os.unlink(compressed_path)

                # "NO ISSUES" badge centered below the photo
                badge_y = photo_y - 50
                badge_width = 140
                badge_x = (width - badge_width) / 2
                c.setFillColor(HexColor('#10b981'))
                c.roundRect(badge_x, badge_y, badge_width, 35, 14, fill=1, stroke=0)
                c.setFillColor(HexColor('#ffffff'))
                c.setFont("Helvetica-Bold", 14)
                c.drawCentredString(width / 2, badge_y + 12, "NO ISSUES")

            else:
                # === SIDE-BY-SIDE LAYOUT (for photos WITH issues) ===
                # Left side: Photo (55% of width)
                # Right side: Analysis text (45% of width)

                # Calculate column widths
                usable_width = width - left_margin - right_margin - column_gap
                photo_col_width = usable_width * 0.55
                text_col_width = usable_width * 0.45

                # Photo column boundaries
                photo_x = left_margin
                photo_max_height = height - header_height - footer_height - 20

                # Calculate photo scaling to fit in left column
                scale = min(photo_col_width / img_width, photo_max_height / img_height, 1.0)
                draw_width = img_width * scale
                draw_height = img_height * scale

                # Align photo top with text start position
                text_start_y = height - header_height - 20
                photo_y = text_start_y - draw_height  # photo_y is bottom edge, so subtract height

                # Image frame with shadow effect
                c.setFillColor(HexColor('#e0e0e0'))
                c.rect(photo_x - 2, photo_y - 2, draw_width + 4, draw_height + 4, fill=1, stroke=0)

                # White border around image
                c.setFillColor(HexColor('#ffffff'))
                c.setStrokeColor(HexColor('#d0d0d0'))
                c.setLineWidth(1)
                c.rect(photo_x - 5, photo_y - 5, draw_width + 10, draw_height + 10, fill=1, stroke=1)

                # Draw image
                c.drawImage(img, photo_x, photo_y, draw_width, draw_height, preserveAspectRatio=True)

                # Clean up temp file
                os.unlink(compressed_path)

                # === TEXT COLUMN (right side) ===
                text_col_x = left_margin + photo_col_width + column_gap
                text_col_right = text_col_x + text_col_width
                text_y = height - header_height - 20  # Start below header
                text_bottom = footer_height + 10  # Don't go below footer
                # Draw subtle background for text area
                c.setFillColor(HexColor('#f8f9fa'))
                c.roundRect(text_col_x - 5, text_bottom, text_col_width + 10, text_y - text_bottom + 10, 6, fill=1, stroke=0)

                # Left accent bar for text area
                c.setFillColor(accent_color)
                c.rect(text_col_x - 5, text_bottom, 3, text_y - text_bottom + 10, fill=1, stroke=0)

                # Calculate max characters per line based on column width (approx 6pt per char at 10pt font)
                max_chars_per_line = int(text_col_width / 6)

                # Write analysis text
                lines = analysis.split('\n')
                for line in lines:
                    if text_y < text_bottom:
                        # Need continuation page - create new page with full-width text
                        c.setFont("Helvetica", 8)
                        c.setFillColor(text_light)
                        c.drawString(card_margin, 30, datetime.now().strftime('%Y-%m-%d'))
                        c.setFillColor(text_secondary)
                        c.drawString(width - 100, 30, f"Page {c.getPageNumber()}")
                        c.showPage()

                        # Header on continued page
                        c.setFillColor(primary_color)
                        c.setFont("Helvetica-Bold", 14)
                        c.drawString(45, height - 50, f"Photo {i} Analysis (continued)")
                        c.setStrokeColor(accent_color)
                        c.setLineWidth(2)
                        c.line(45, height - 55, width - 45, height - 55)

                        # On continuation page, use full width for text
                        text_col_x = 45
                        text_col_width = width - 90
                        max_chars_per_line = int(text_col_width / 6)
                        text_y = height - 80
                        text_bottom = 50

                    line_stripped = line.strip()

                    # Skip certain sections
                    if any(skip in line_stripped for skip in ['What I See:', 'Observations:']):
                        continue

                    # Section headers
                    section_headers = ['Location:', 'Issues to Address:', 'Recommended Action:',
                                     'Potential Issues:', 'Recommendations:', 'What To Do:']
                    found_header = None
                    header_content = None
                    for header in section_headers:
                        if header in line_stripped:
                            found_header = header
                            parts = line_stripped.split(header, 1)
                            if len(parts) > 1 and parts[1].strip():
                                header_content = parts[1].strip()
                            break

                    if found_header:
                        if text_y < height - header_height - 30:
                            text_y -= 6
                        if 'Issues' in found_header:
                            c.setFillColor(accent_color)
                        else:
                            c.setFillColor(primary_color)
                        c.setFont("Helvetica-Bold", 10)
                        c.drawString(text_col_x, text_y, found_header.upper())
                        text_y -= 16

                        if header_content:
                            c.setFillColor(HexColor('#374151'))
                            c.setFont("Helvetica", 9)
                            # Wrap header content
                            if len(header_content) > max_chars_per_line:
                                words = header_content.split()
                                current_line = ""
                                for word in words:
                                    test_line = current_line + " " + word if current_line else word
                                    if len(test_line) > max_chars_per_line:
                                        c.drawString(text_col_x + 10, text_y, current_line)
                                        text_y -= 14
                                        current_line = word
                                    else:
                                        current_line = test_line
                                if current_line:
                                    c.drawString(text_col_x + 10, text_y, current_line)
                                    text_y -= 14
                            else:
                                c.drawString(text_col_x + 10, text_y, header_content)
                                text_y -= 14

                    elif line.strip().startswith('-'):
                        text = line.strip()[1:].strip()

                        # Check for priority/responsibility tags
                        priority_color = accent_color
                        priority_label = None

                        # Handle new format tags
                        for tag, color, label in [
                            ('[FIX NOW]', HexColor('#dc2626'), 'FIX NOW'),
                            ('[FIX SOON]', HexColor('#f59e0b'), 'FIX SOON'),
                            ('[IMMEDIATE]', HexColor('#dc2626'), 'URGENT'),
                            ('[SOON]', HexColor('#f59e0b'), 'SOON'),
                            ('[OWNER]', HexColor('#10b981'), 'OWNER'),
                            ('[TENANT]', HexColor('#3b82f6'), 'TENANT'),
                        ]:
                            if tag in text:
                                if 'FIX' in tag or 'IMMEDIATE' in tag or 'SOON' == tag:
                                    priority_color = color
                                    priority_label = label
                                text = text.replace(tag, '').strip()

                        # Draw bullet
                        c.setFillColor(priority_color)
                        c.circle(text_col_x + 4, text_y + 2, 2.5, fill=1, stroke=0)

                        text_start_x = text_col_x + 12
                        if priority_label:
                            c.setFont("Helvetica-Bold", 7)
                            c.drawString(text_start_x, text_y, priority_label)
                            label_w = c.stringWidth(priority_label, "Helvetica-Bold", 7)
                            text_start_x += label_w + 4

                        c.setFillColor(HexColor('#374151'))
                        c.setFont("Helvetica", 9)

                        # Wrap bullet text
                        adjusted_max = max_chars_per_line - 5
                        if len(text) > adjusted_max:
                            words = text.split()
                            current_line = ""
                            first_line = True
                            for word in words:
                                test_line = current_line + " " + word if current_line else word
                                if len(test_line) > adjusted_max:
                                    c.drawString(text_start_x if first_line else text_col_x + 12, text_y, current_line)
                                    text_y -= 14
                                    current_line = word
                                    first_line = False
                                else:
                                    current_line = test_line
                            if current_line:
                                c.drawString(text_start_x if first_line else text_col_x + 12, text_y, current_line)
                                text_y -= 14
                        else:
                            c.drawString(text_start_x, text_y, text)
                            text_y -= 14

                    elif line.strip():
                        c.setFillColor(HexColor('#374151'))
                        c.setFont("Helvetica", 9)
                        text = line.strip()

                        if len(text) > max_chars_per_line:
                            words = text.split()
                            current_line = ""
                            for word in words:
                                test_line = current_line + " " + word if current_line else word
                                if len(test_line) > max_chars_per_line:
                                    c.drawString(text_col_x, text_y, current_line)
                                    text_y -= 14
                                    current_line = word
                                else:
                                    current_line = test_line
                            if current_line:
                                c.drawString(text_col_x, text_y, current_line)
                                text_y -= 14
                        else:
                            c.drawString(text_col_x, text_y, text)
                            text_y -= 14
            
            # Page number and timestamp
            c.setFont("Helvetica", 8)
            c.setFillColor(text_light)
            c.drawString(card_margin, 30, datetime.now().strftime('%Y-%m-%d'))
            c.drawString(width / 2 - 20, 30, f"Page {c.getPageNumber()}")

            c.showPage()
            
        except Exception as e:
            print(f"ERROR adding {img_path.name} to PDF: {e}")
            import traceback
            traceback.print_exc()
            continue

    c.save()
    print(f"PDF generated: {out_pdf}")

def build_reports(source_path: Path, client_name: str, property_address: str, gallery_name: str = None, inspection_type: str = "Quarterly", inspector_notes: List[Dict] = None) -> Dict[str, Any]:
    """
    Main function to build inspection reports from source (ZIP or directory)
    Returns artifacts dictionary with path to generated PDF

    Args:
        source_path: Path to ZIP file or directory containing photos
        client_name: Client/inspector name
        property_address: Property address
        gallery_name: Optional gallery name
        inspection_type: Type of inspection (Quarterly, Move-In, Move-Out, Annual)
        inspector_notes: List of inspector notes (text, responsibility, priority)
    """
    if inspector_notes is None:
        inspector_notes = []

    if inspector_notes:
        print(f"[DEBUG] Received {len(inspector_notes)} inspector notes")

    try:
        print(f"\n{'='*60}")
        print(f"Building report for: {property_address}")
        print(f"Client: {client_name}")
        print(f"{'='*60}\n")
    except UnicodeEncodeError:
        print("\n" + "="*60)
        print("Building report...")
        print("="*60 + "\n")

    # Extract if ZIP, otherwise use as directory
    if source_path.suffix.lower() == '.zip':
        photos_dir = extract_zip(source_path)
        cleanup_needed = True
    else:
        photos_dir = source_path
        cleanup_needed = False

    try:
        # Collect and analyze images
        images = collect_images(photos_dir)
        if not images:
            raise ValueError(f"No images found in {photos_dir}")

        print(f"Found {len(images)} images to process")

        # Analyze images with vision AI
        vision_results = analyze_images(images)

        # Generate report ID
        report_id = secrets.token_hex(16)
        print(f"\nREPORT_ID={report_id}")

        # Create PDF filename from property address
        safe_address = property_address.replace(' ', '_').replace(',', '').replace('.', '')
        safe_address = ''.join(c if c.isalnum() or c in '_-' else '_' for c in safe_address)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        pdf_filename = f"{safe_address}_{timestamp}.pdf"
        pdf_path = OUTPUTS_DIR / pdf_filename

        # Generate PDF report directly in outputs folder
        try:
            generate_pdf(property_address, images, pdf_path, vision_results, client_name, inspection_type, inspector_notes)
            print(f"\nPDF report saved: {pdf_path}")
        except Exception as e:
            print(f"ERROR generating PDF: {e}")
            import traceback
            traceback.print_exc()
            raise

        return {
            'report_id': report_id,
            'pdf_path': str(pdf_path),
            'client_name': client_name,
            'property_address': property_address
        }

    finally:
        # Clean up temporary extraction directory
        if cleanup_needed and photos_dir.exists():
            try:
                shutil.rmtree(photos_dir)
            except Exception as e:
                print(f"Warning: Could not clean up temp directory: {e}")

# ============== CLI Interface ==============

def main():
    """Command-line interface for running reports"""
    import argparse

    parser = argparse.ArgumentParser(description='Generate inspection report from photos')
    parser.add_argument('--zip', type=str, help='Path to ZIP file containing photos')
    parser.add_argument('--dir', type=str, help='Path to directory containing photos')
    parser.add_argument('--client', type=str, default='Property Owner', help='Client/Inspector name')
    parser.add_argument('--property', type=str, default='Property Address', help='Property address')
    parser.add_argument('--type', type=str, default='Quarterly',
                        help='Inspection type (Quarterly, Move-In, Move-Out, Annual)')
    parser.add_argument('--notes', type=str, default='[]',
                        help='JSON array of inspector notes')

    args = parser.parse_args()

    # Parse inspector notes
    print(f"[DEBUG run_report] Raw --notes arg: {args.notes}")
    try:
        inspector_notes = json.loads(args.notes)
        print(f"[DEBUG run_report] Parsed {len(inspector_notes)} inspector notes: {inspector_notes}")
    except json.JSONDecodeError as e:
        print(f"[DEBUG run_report] JSON parse error: {e}")
        inspector_notes = []

    # Determine source
    if args.zip:
        source = Path(args.zip)
        if not source.exists():
            print(f"Error: ZIP file not found: {source}")
            sys.exit(1)
    elif args.dir:
        source = Path(args.dir)
        if not source.exists():
            print(f"Error: Directory not found: {source}")
            sys.exit(1)
    else:
        print("Error: Please specify --zip or --dir")
        parser.print_help()
        sys.exit(1)

    # Extract property address from filename if not provided
    property_address = args.property
    if property_address == 'Property Address' or not property_address:
        # Use the source filename (without extension) as the property address
        filename = source.stem
        property_address = filename.replace('_', ' ').replace('-', ' ')
        property_address = ' '.join(property_address.split())
        print(f"Using filename as property address: {property_address}")

    try:
        # Generate PDF report only
        artifacts = build_reports(source, args.client, property_address, inspection_type=args.type,
                                  inspector_notes=inspector_notes)
        print("\nReport generation complete!")
        print(f"PDF saved to: {artifacts['pdf_path']}")

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()