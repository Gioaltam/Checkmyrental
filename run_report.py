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
        generate_action_items_page
    )
    ACTION_ITEMS_AVAILABLE = True
except ImportError:
    ACTION_ITEMS_AVAILABLE = False
    print("Warning: tenant_actions.py not found, action items page will be skipped")

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

def generate_pdf(address: str, images: List[Path], out_pdf: Path, vision_results: Optional[Dict[str, str]] = None, client_name: str = "") -> None:
    """Generate executive-quality PDF report with sophisticated design

    Args:
        address: Property address
        images: List of image paths
        out_pdf: Output PDF path
        vision_results: Vision analysis results
        client_name: Client name for report
    """
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
    
    # Thin accent line at top
    c.setFillColor(accent_color)
    c.rect(0, height - 3, width, 3, fill=1, stroke=0)
    
    # Logo symbol only (centered at top) - larger and more prominent
    logo_x = width / 2 - 30
    logo_y = height - 120
    
    # Draw sophisticated logo mark
    # Outer circle for elegance
    c.setStrokeColor(primary_color)
    c.setLineWidth(2)
    c.circle(logo_x + 30, logo_y + 30, 35, fill=0, stroke=1)
    
    # House shape (rotated square) - refined design
    c.saveState()
    c.translate(logo_x + 30, logo_y + 30)
    c.rotate(45)
    c.setFillColor(primary_color)
    c.rect(-18, -18, 36, 36, fill=1, stroke=0)
    c.restoreState()
    
    # Window grid - more sophisticated
    c.setFillColor(HexColor('#ffffff'))
    window_size = 7
    c.rect(logo_x + 23, logo_y + 23, window_size, window_size, fill=1)
    c.rect(logo_x + 31, logo_y + 23, window_size, window_size, fill=1)
    c.rect(logo_x + 23, logo_y + 31, window_size, window_size, fill=1)
    c.rect(logo_x + 31, logo_y + 31, window_size, window_size, fill=1)
    
    # Checkmark badge - positioned elegantly
    c.setFillColor(accent_color)
    c.circle(logo_x + 45, logo_y + 15, 10, fill=1, stroke=0)
    c.setStrokeColor(HexColor('#ffffff'))
    c.setLineWidth(3)
    c.line(logo_x + 40, logo_y + 15, logo_x + 43, logo_y + 12)
    c.line(logo_x + 43, logo_y + 12, logo_x + 50, logo_y + 19)
    
    # MAIN TITLE - Centered and elegant
    c.setFont("Helvetica", 14)
    c.setFillColor(text_secondary)
    title_text = "PROPERTY INSPECTION"
    title_width = c.stringWidth(title_text, "Helvetica", 14)
    c.drawString((width - title_width) / 2, height - 200, title_text)
    
    c.setFont("Helvetica-Bold", 32)
    c.setFillColor(text_primary)
    report_text = "REPORT"
    report_width = c.stringWidth(report_text, "Helvetica-Bold", 32)
    c.drawString((width - report_width) / 2, height - 235, report_text)
    
    # Decorative line under title
    line_width = 100
    c.setStrokeColor(gold_accent)
    c.setLineWidth(2)
    c.line((width - line_width) / 2, height - 250, (width + line_width) / 2, height - 250)
    
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
    
    # Date
    c.setFont("Helvetica", 10)
    c.setFillColor(text_light)
    c.drawString(right_x, info_y, "INSPECTION DATE")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(text_primary)
    c.drawString(right_x, info_y - 22, datetime.now().strftime('%B %d, %Y'))
    
    # Client name if provided
    if client_name:
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
    
    # Photo count with icon
    c.setFont("Helvetica", 11)
    c.setFillColor(text_secondary)
    stats_text = f"This report contains {len(images)} detailed inspection photographs with professional analysis"
    stats_width = c.stringWidth(stats_text, "Helvetica", 11)
    c.drawString((width - stats_width) / 2, stats_y + 18, stats_text)
    
    # Professional footer - minimal and elegant
    c.setFont("Helvetica", 8)
    c.setFillColor(text_light)
    c.drawString(card_margin, 40, "Confidential Property Inspection Report")
    c.drawRightString(width - card_margin, 40, f"Generated {datetime.now().strftime('%Y-%m-%d')}")
    
    c.showPage()
    
    # Add each image with analysis
    for i, img_path in enumerate(images, 1):
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
            c.drawString(55, height - 22, f"Photo {i} of {len(images)}")
            
            # Property address (right aligned)
            c.setFont("Helvetica", 8)
            c.drawRightString(width - 35, height - 22, address[:45])
            
            # Add compressed image
            img = ImageReader(compressed_path)
            img_width, img_height = img.getSize()
            
            # Calculate scaling to fit on page - LARGER images for impact
            max_width = width - 80  # Less margin = bigger image
            max_height = 480  # Much more room for the photo
            scale = min(max_width / img_width, max_height / img_height, 1.0)
            
            draw_width = img_width * scale
            draw_height = img_height * scale
            
            # Center image horizontally
            x = (width - draw_width) / 2
            y = height - draw_height - 50
            
            # Image frame with shadow effect
            c.setFillColor(HexColor('#e0e0e0'))
            c.rect(x - 2, y - 2, draw_width + 4, draw_height + 4, fill=1, stroke=0)
            
            # White border around image
            c.setFillColor(HexColor('#ffffff'))
            c.setStrokeColor(HexColor('#d0d0d0'))
            c.setLineWidth(1)
            c.rect(x - 5, y - 5, draw_width + 10, draw_height + 10, fill=1, stroke=1)
            
            # Draw image
            c.drawImage(img, x, y, draw_width, draw_height, preserveAspectRatio=True)
            
            # Clean up temp file
            os.unlink(compressed_path)
            
            # Add analysis text below image with improved styling
            if vision_results:
                # Try to find the analysis with different path formats
                analysis = None
                img_path_str = str(img_path)

                # Check exact match first
                if img_path_str in vision_results:
                    analysis = vision_results[img_path_str]
                else:
                    # Try matching by filename
                    for key, value in vision_results.items():
                        if Path(key).name == img_path.name:
                            analysis = value
                            break

                # Calculate text box position with more spacing from image
                text_box_top = y - 35  # More gap between image and text
                text_margin = 45  # Left/right margins

                # Check if there are no issues/repairs needed - skip description if so
                no_issues_phrases = ['no repairs needed', 'no issues', 'no damage', 'good condition',
                                     'no action needed', 'no repairs necessary', 'nothing to report']
                has_issues = True
                if analysis:
                    analysis_lower = analysis.lower()
                    # Check if "no repairs needed" or similar appears AND there's no actual issues listed
                    if any(phrase in analysis_lower for phrase in no_issues_phrases):
                        # Also check there are no bullet points with actual issues
                        issue_lines = [l for l in analysis.split('\n') if l.strip().startswith('-')
                                      and not any(phrase in l.lower() for phrase in no_issues_phrases)]
                        if not issue_lines:
                            has_issues = False

                if not analysis:
                    # No analysis found - just skip, no need for a note
                    pass
                elif not has_issues:
                    # No issues found - add a simple "No issues" badge instead of full description
                    c.setFillColor(HexColor('#10b981'))  # Green color
                    badge_width = 100
                    badge_x = (width - badge_width) / 2
                    c.roundRect(badge_x, text_box_top - 10, badge_width, 25, 12, fill=1, stroke=0)
                    c.setFillColor(HexColor('#ffffff'))
                    c.setFont("Helvetica-Bold", 10)
                    c.drawCentredString(width / 2, text_box_top - 2, "NO ISSUES")
                else:
                    # Draw a subtle background box for the analysis
                    box_height = text_box_top - 50  # Height of remaining space
                    c.setFillColor(HexColor('#f8f9fa'))
                    c.roundRect(text_margin - 10, 45, width - (2 * text_margin) + 20, text_box_top - 40, 6, fill=1, stroke=0)

                    # Add a left accent bar
                    c.setFillColor(accent_color)
                    c.rect(text_margin - 10, 45, 4, text_box_top - 40, fill=1, stroke=0)

                    # Starting Y position for text (inside the box with padding)
                    text_y = text_box_top - 15

                    # Write analysis with improved typography
                    lines = analysis.split('\n')
                    for line in lines:
                        if text_y < 65:  # Start new page if running out of room
                            c.setFont("Helvetica", 9)
                            c.setFillColor(text_secondary)
                            c.drawString(width - 100, 30, f"Page {c.getPageNumber()}")
                            c.showPage()
                            # Draw header on continued page
                            c.setFillColor(primary_color)
                            c.setFont("Helvetica-Bold", 14)
                            c.drawString(text_margin, height - 50, f"Photo {i} Analysis (continued)")
                            c.setStrokeColor(accent_color)
                            c.setLineWidth(2)
                            c.line(text_margin, height - 55, width - text_margin, height - 55)
                            text_y = height - 80

                        # Handle section headers with color coding (skip What I See/Observations)
                        line_stripped = line.strip()
                        # Skip "What I See" and "Observations" sections entirely
                        if any(skip in line_stripped for skip in ['What I See:', 'Observations:']):
                            continue

                        # Check if line contains a section header (with or without content after it)
                        section_headers = ['Location:', 'Issues to Address:', 'Recommended Action:',
                                         'Potential Issues:', 'Recommendations:']
                        found_header = None
                        header_content = None
                        for header in section_headers:
                            if header in line_stripped:
                                found_header = header
                                # Check if there's content after the header on the same line
                                parts = line_stripped.split(header, 1)
                                if len(parts) > 1 and parts[1].strip():
                                    header_content = parts[1].strip()
                                break

                        if found_header:
                            # Add extra space before new sections (except first)
                            if text_y < text_box_top - 20:
                                text_y -= 8
                            if 'Issues' in found_header:
                                c.setFillColor(accent_color)
                            else:
                                c.setFillColor(primary_color)
                            c.setFont("Helvetica-Bold", 12)
                            c.drawString(text_margin, text_y, found_header.upper())
                            text_y -= 20

                            # If there's content on the same line as the header, render it as a bullet with priority
                            if header_content:
                                # Check for priority tags in header content too
                                hc_priority_color = accent_color
                                hc_priority_label = None
                                hc_text = header_content
                                if '[IMMEDIATE]' in hc_text:
                                    hc_priority_color = HexColor('#dc2626')
                                    hc_priority_label = 'IMMEDIATE'
                                    hc_text = hc_text.replace('[IMMEDIATE]', '').strip()
                                elif '[SOON]' in hc_text:
                                    hc_priority_color = HexColor('#f59e0b')
                                    hc_priority_label = 'SOON'
                                    hc_text = hc_text.replace('[SOON]', '').strip()
                                elif '[COSMETIC]' in hc_text:
                                    hc_priority_color = HexColor('#6b7280')
                                    hc_priority_label = 'COSMETIC'
                                    hc_text = hc_text.replace('[COSMETIC]', '').strip()

                                c.setFillColor(hc_priority_color)
                                c.circle(text_margin + 5, text_y + 3, 3, fill=1, stroke=0)

                                hc_text_start = text_margin + 15
                                if hc_priority_label:
                                    c.setFont("Helvetica-Bold", 8)
                                    c.drawString(hc_text_start, text_y + 1, hc_priority_label)
                                    hc_label_width = c.stringWidth(hc_priority_label, "Helvetica-Bold", 8)
                                    hc_text_start = hc_text_start + hc_label_width + 8

                                c.setFillColor(HexColor('#374151'))
                                c.setFont("Helvetica", 11)
                                # Wrap long lines
                                hc_max_chars = 60 if hc_priority_label else 70
                                if len(hc_text) > hc_max_chars:
                                    words = hc_text.split()
                                    current_line = ""
                                    first_line = True
                                    for word in words:
                                        test_line = current_line + " " + word if current_line else word
                                        line_limit = hc_max_chars if first_line else 70
                                        if len(test_line) > line_limit:
                                            c.drawString(hc_text_start if first_line else text_margin + 15, text_y, current_line)
                                            text_y -= 18
                                            current_line = word
                                            first_line = False
                                        else:
                                            current_line = test_line
                                    if current_line:
                                        c.drawString(hc_text_start if first_line else text_margin + 15, text_y, current_line)
                                        text_y -= 18
                                else:
                                    c.drawString(hc_text_start, text_y, hc_text)
                                    text_y -= 18
                            c.setFillColor(HexColor('#374151'))
                            c.setFont("Helvetica", 11)

                        elif line.strip().startswith('-'):
                            # Bullet points with better formatting and priority color-coding
                            text = line.strip()[1:].strip()  # Remove the dash

                            # Check for priority tags and set colors accordingly
                            priority_color = accent_color  # Default
                            priority_label = None
                            if '[IMMEDIATE]' in text:
                                priority_color = HexColor('#dc2626')  # Red for urgent
                                priority_label = 'IMMEDIATE'
                                text = text.replace('[IMMEDIATE]', '').strip()
                            elif '[SOON]' in text:
                                priority_color = HexColor('#f59e0b')  # Orange/amber for soon
                                priority_label = 'SOON'
                                text = text.replace('[SOON]', '').strip()
                            elif '[COSMETIC]' in text:
                                priority_color = HexColor('#6b7280')  # Gray for cosmetic
                                priority_label = 'COSMETIC'
                                text = text.replace('[COSMETIC]', '').strip()

                            # Draw colored bullet dot
                            c.setFillColor(priority_color)
                            c.circle(text_margin + 5, text_y + 3, 3, fill=1, stroke=0)  # Slightly larger dot

                            # Draw priority label if present
                            text_start = text_margin + 15
                            if priority_label:
                                c.setFont("Helvetica-Bold", 8)
                                c.drawString(text_start, text_y + 1, priority_label)
                                label_width = c.stringWidth(priority_label, "Helvetica-Bold", 8)
                                text_start = text_start + label_width + 8

                            c.setFillColor(HexColor('#374151'))
                            c.setFont("Helvetica", 11)
                            # Wrap long lines (adjust for priority label width)
                            max_chars = 60 if priority_label else 70
                            if len(text) > max_chars:
                                words = text.split()
                                current_line = ""
                                first_line = True
                                for word in words:
                                    test_line = current_line + " " + word if current_line else word
                                    line_limit = max_chars if first_line else 70
                                    if len(test_line) > line_limit:
                                        c.drawString(text_start if first_line else text_margin + 15, text_y, current_line)
                                        text_y -= 18
                                        current_line = word
                                        first_line = False
                                    else:
                                        current_line = test_line
                                if current_line:
                                    c.drawString(text_start if first_line else text_margin + 15, text_y, current_line)
                                    text_y -= 18
                            else:
                                c.drawString(text_start, text_y, text)
                                text_y -= 18
                        elif line.strip():
                            # Regular text - still style it nicely
                            c.setFillColor(HexColor('#374151'))
                            c.setFont("Helvetica", 11)
                            text = line.strip()
                            # Wrap long lines
                            if len(text) > 75:
                                words = text.split()
                                current_line = ""
                                for word in words:
                                    test_line = current_line + " " + word if current_line else word
                                    if len(test_line) > 75:
                                        c.drawString(text_margin, text_y, current_line)
                                        text_y -= 18
                                        current_line = word
                                    else:
                                        current_line = test_line
                                if current_line:
                                    c.drawString(text_margin, text_y, current_line)
                                    text_y -= 18
                            else:
                                c.drawString(text_margin, text_y, text)
                                text_y -= 18
            
            # Page number
            c.setFont("Helvetica", 8)
            c.drawString(width / 2 - 20, 30, f"Page {c.getPageNumber()}")
            
            c.showPage()
            
        except Exception as e:
            print(f"ERROR adding {img_path.name} to PDF: {e}")
            import traceback
            traceback.print_exc()
            continue

    # === ACTION ITEMS PAGE ===
    if ACTION_ITEMS_AVAILABLE and vision_results:
        try:
            # Parse issues from vision results (separates tenant vs owner)
            issues = parse_issues_from_vision_results(vision_results)
            tenant_count = len(issues.get('tenant', []))
            owner_count = len(issues.get('owner', []))

            if tenant_count > 0 or owner_count > 0:
                generate_action_items_page(c, issues, width, height)
                c.showPage()
                print(f"Action items page added ({tenant_count} tenant, {owner_count} owner items)")
            else:
                print("No action items found - skipping action items page")
        except Exception as e:
            print(f"Warning: Could not generate action items page: {e}")
            import traceback
            traceback.print_exc()

    c.save()
    print(f"PDF generated: {out_pdf}")

def build_reports(source_path: Path, client_name: str, property_address: str, gallery_name: str = None) -> Dict[str, Any]:
    """
    Main function to build inspection reports from source (ZIP or directory)
    Returns artifacts dictionary with path to generated PDF

    Args:
        source_path: Path to ZIP file or directory containing photos
        client_name: Client/inspector name
        property_address: Property address
        gallery_name: Optional gallery name
    """
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
            generate_pdf(property_address, images, pdf_path, vision_results, client_name)
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

    args = parser.parse_args()

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
        artifacts = build_reports(source, args.client, property_address)
        print("\nReport generation complete!")
        print(f"PDF saved to: {artifacts['pdf_path']}")

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()