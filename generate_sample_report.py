#!/usr/bin/env python3
"""
Generate a sample PDF report with mock data for the CheckMyRental landing page.
This creates a professional demo report showing what clients will receive.
Uses stock photos downloaded from free image sources.
"""

import os
import sys
import urllib.request
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
import tempfile

# Output path
OUTPUT_DIR = Path('./workspace/outputs')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_PHOTOS_DIR = Path('./workspace/sample_photos')
SAMPLE_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

# Sample property data
SAMPLE_PROPERTY = {
    'address': '1234 Palm Harbor Drive, Tampa, FL 33601',
    'client': 'Sample Property Management',
    'date': datetime.now().strftime('%B %d, %Y')
}

# Stock photo URLs - realistic inspection-style photos showing wear, damage, and real property conditions
# Using Unsplash and Pexels for royalty-free images
STOCK_PHOTOS = {
    # Realistic rental property rooms (not staged/professional)
    'living_room': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',  # Real apartment living room
    'bedroom': 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80',  # Basic bedroom
    'bedroom2': 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80',  # Simple guest room
    'exterior': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',  # Regular house exterior
    'patio': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',  # Backyard patio

    # Kitchen and bathroom - realistic wear
    'kitchen': 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&q=80',  # Older style kitchen
    'bathroom': 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800&q=80',  # Basic bathroom
    'bathroom_old': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80',  # Older bathroom
    'kitchen_old': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',  # Basic kitchen

    # HVAC and mechanical - real equipment
    'hvac': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80',  # AC unit
    'hvac_filter': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80',  # HVAC equipment

    # Other areas - realistic conditions
    'garage': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',  # Garage interior
    'laundry': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',  # Laundry area
    'dining': 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80',  # Basic dining area
    'hallway': 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80',  # Hallway
    'closet': 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=800&q=80',  # Closet
    'window': 'https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=800&q=80',  # Window view

    # Damage and wear specific
    'wall_damage': 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',  # Wall with wear
    'floor_wear': 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',  # Floor condition
}

# Extended mock inspection data (20+ photos)
SAMPLE_PHOTOS = [
    {
        'name': 'Living Room - Overview',
        'photo_key': 'living_room',
        'analysis': {
            'location': 'Main Living Area - First Floor',
            'issues': [],
            'recommendation': 'No repairs needed. Standard wear consistent with occupancy.'
        }
    },
    {
        'name': 'Living Room - Windows',
        'photo_key': 'window',
        'analysis': {
            'location': 'Living Room Windows - First Floor',
            'issues': [],
            'recommendation': 'Windows in good condition. Screens intact.'
        }
    },
    {
        'name': 'Kitchen - Overview',
        'photo_key': 'kitchen',
        'analysis': {
            'location': 'Kitchen - First Floor',
            'issues': [
                'Minor grout discoloration near sink area',
                'Small scratch on refrigerator door (cosmetic only)'
            ],
            'recommendation': 'Consider professional grout cleaning at next turnover. Refrigerator scratch is cosmetic and does not affect function.'
        }
    },
    {
        'name': 'Kitchen - Appliances',
        'photo_key': 'kitchen',
        'analysis': {
            'location': 'Kitchen Appliances - First Floor',
            'issues': [],
            'recommendation': 'All appliances tested and functioning properly. Recommend tenant continue regular cleaning of oven interior.'
        }
    },
    {
        'name': 'Dining Area',
        'photo_key': 'dining',
        'analysis': {
            'location': 'Dining Area - First Floor',
            'issues': [],
            'recommendation': 'No issues found. Flooring and walls in excellent condition.'
        }
    },
    {
        'name': 'Master Bedroom',
        'photo_key': 'bedroom',
        'analysis': {
            'location': 'Master Bedroom - Second Floor',
            'issues': [],
            'recommendation': 'Room in excellent condition. Carpet shows normal wear patterns only.'
        }
    },
    {
        'name': 'Master Bedroom - Closet',
        'photo_key': 'closet',
        'analysis': {
            'location': 'Master Bedroom Closet - Second Floor',
            'issues': [],
            'recommendation': 'Closet organizers intact. Sliding doors operating smoothly.'
        }
    },
    {
        'name': 'Master Bathroom',
        'photo_key': 'bathroom',
        'analysis': {
            'location': 'Master Bathroom - Second Floor',
            'issues': [
                'Caulking around tub showing wear and minor separation',
                'Slow drain in bathtub - may need cleaning'
            ],
            'recommendation': 'Schedule re-caulking around tub to prevent water damage. Have drain professionally cleaned or use enzyme drain cleaner.'
        }
    },
    {
        'name': 'Master Bathroom - Vanity',
        'photo_key': 'bathroom',
        'analysis': {
            'location': 'Master Bathroom Vanity - Second Floor',
            'issues': [],
            'recommendation': 'Vanity and sink in good condition. No leaks detected under cabinet.'
        }
    },
    {
        'name': 'Bedroom 2',
        'photo_key': 'bedroom2',
        'analysis': {
            'location': 'Second Bedroom - Second Floor',
            'issues': [],
            'recommendation': 'No repairs needed. Room in excellent condition.'
        }
    },
    {
        'name': 'Bedroom 2 - Windows',
        'photo_key': 'window',
        'analysis': {
            'location': 'Second Bedroom Windows - Second Floor',
            'issues': [],
            'recommendation': 'Windows open and lock correctly. Smoke detector present and tested.'
        }
    },
    {
        'name': 'Hallway - Upstairs',
        'photo_key': 'hallway',
        'analysis': {
            'location': 'Upstairs Hallway',
            'issues': [
                'Minor scuff marks on wall near bedroom doors'
            ],
            'recommendation': 'Touch-up paint recommended at next turnover. Normal wear from daily use.'
        }
    },
    {
        'name': 'Hall Bathroom',
        'photo_key': 'bathroom',
        'analysis': {
            'location': 'Hall Bathroom - Second Floor',
            'issues': [],
            'recommendation': 'Bathroom in good condition. All fixtures functioning properly.'
        }
    },
    {
        'name': 'HVAC Filter',
        'photo_key': 'hvac',
        'analysis': {
            'location': 'HVAC System - Utility Closet',
            'issues': [
                'Air filter is dirty and due for replacement',
                'Filter size: 20x25x1'
            ],
            'recommendation': 'Replace air filter immediately. Recommend tenant reminder for monthly filter checks. Dirty filters reduce efficiency and can damage the system.'
        }
    },
    {
        'name': 'HVAC Unit',
        'photo_key': 'hvac',
        'analysis': {
            'location': 'HVAC Exterior Unit',
            'issues': [],
            'recommendation': 'Unit exterior clean. No debris blocking airflow. Last service date verified.'
        }
    },
    {
        'name': 'Laundry Room',
        'photo_key': 'laundry',
        'analysis': {
            'location': 'Laundry Room - First Floor',
            'issues': [],
            'recommendation': 'Washer and dryer connections secure. No water leaks detected. Dryer vent clear.'
        }
    },
    {
        'name': 'Garage Interior',
        'photo_key': 'garage',
        'analysis': {
            'location': 'Attached Garage',
            'issues': [
                'Garage door opener making slight noise - may need lubrication'
            ],
            'recommendation': 'Apply garage door lubricant to rollers and hinges. Schedule professional inspection if noise persists.'
        }
    },
    {
        'name': 'Exterior - Front',
        'photo_key': 'exterior',
        'analysis': {
            'location': 'Front Exterior',
            'issues': [],
            'recommendation': 'No issues found. Property exterior well-maintained. Landscaping acceptable.'
        }
    },
    {
        'name': 'Exterior - Back Patio',
        'photo_key': 'patio',
        'analysis': {
            'location': 'Rear Patio Area',
            'issues': [],
            'recommendation': 'Patio in good condition. No cracks in concrete. Outdoor fixtures working.'
        }
    },
    {
        'name': 'Exterior - Siding',
        'photo_key': 'exterior',
        'analysis': {
            'location': 'Exterior Siding - All Sides',
            'issues': [],
            'recommendation': 'Siding intact with no damage. Gutters attached and aligned properly.'
        }
    },
]


def download_stock_photos():
    """Download stock photos if not already cached"""
    print("Checking for stock photos...")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    for key, url in STOCK_PHOTOS.items():
        photo_path = SAMPLE_PHOTOS_DIR / f"{key}.jpg"
        if photo_path.exists():
            print(f"  {key}: cached")
            continue

        print(f"  Downloading {key}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response:
                with open(photo_path, 'wb') as f:
                    f.write(response.read())
            print(f"  {key}: downloaded")
        except Exception as e:
            print(f"  {key}: failed ({e}), will use placeholder")
            # Create a placeholder if download fails
            create_placeholder_image(key, photo_path)

    print("Stock photos ready.\n")


def create_placeholder_image(name: str, output_path: Path, size=(800, 600)):
    """Create a placeholder image if stock photo download fails"""
    # Color based on room type
    colors = {
        'living_room': '#e8d5b7',
        'kitchen': '#d4e5f7',
        'bathroom': '#e5f0e5',
        'bedroom': '#f0e6f5',
        'bedroom2': '#e6f0f5',
        'exterior': '#d5e8d5',
        'hvac': '#f5e6d3',
        'garage': '#e0e0e0',
        'laundry': '#e8e8f0',
        'dining': '#f5f0e5',
        'hallway': '#f0f0f0',
        'closet': '#f5f5f5',
        'patio': '#e5f5e5',
        'window': '#f0f8ff',
    }

    color = colors.get(name, '#e0e0e0')

    img = Image.new('RGB', size, color)
    draw = ImageDraw.Draw(img)

    # Add gradient effect
    for i in range(size[1]):
        alpha = int(30 * (i / size[1]))
        r = max(0, int(color[1:3], 16) - alpha)
        g = max(0, int(color[3:5], 16) - alpha)
        b = max(0, int(color[5:7], 16) - alpha)
        draw.line([(0, i), (size[0], i)], fill=(r, g, b))

    # Add room name
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    except:
        font = ImageFont.load_default()

    text = name.replace('_', ' ').title()
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    x = (size[0] - text_width) // 2
    y = size[1] // 2 - 30

    draw.text((x+2, y+2), text, fill='#666666', font=font)
    draw.text((x, y), text, fill='#333333', font=font)

    img.save(output_path, 'JPEG', quality=85)


def get_photo_path(photo_key: str) -> Path:
    """Get path to a stock photo, with fallback to placeholder"""
    photo_path = SAMPLE_PHOTOS_DIR / f"{photo_key}.jpg"
    if photo_path.exists():
        return photo_path

    # Create placeholder as fallback
    create_placeholder_image(photo_key, photo_path)
    return photo_path


def add_issue_indicators(photo_path: Path, issues: list) -> Path:
    """Add visual issue indicators (red circles) to photos that have issues"""
    if not issues:
        return photo_path

    # Open image
    img = Image.open(photo_path)
    draw = ImageDraw.Draw(img)

    # Add red circle indicators at random positions to simulate marked issues
    import random
    random.seed(hash(str(photo_path)))  # Consistent placement per photo

    width, height = img.size
    num_indicators = min(len(issues), 3)

    for i in range(num_indicators):
        # Position indicators in different areas of the image
        if i == 0:
            x = int(width * random.uniform(0.2, 0.4))
            y = int(height * random.uniform(0.3, 0.5))
        elif i == 1:
            x = int(width * random.uniform(0.5, 0.7))
            y = int(height * random.uniform(0.4, 0.6))
        else:
            x = int(width * random.uniform(0.3, 0.6))
            y = int(height * random.uniform(0.6, 0.8))

        # Draw red circle indicator
        radius = 25
        draw.ellipse(
            [x - radius, y - radius, x + radius, y + radius],
            outline='#e74c3c',
            width=4
        )

        # Add number label
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        except:
            font = ImageFont.load_default()

        label = str(i + 1)
        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # White background for number
        draw.ellipse(
            [x - 12, y - radius - 25, x + 12, y - radius - 1],
            fill='#e74c3c'
        )
        draw.text(
            (x - text_width // 2, y - radius - 22),
            label,
            fill='white',
            font=font
        )

    # Save modified image to temp file
    temp_path = SAMPLE_PHOTOS_DIR / f"{photo_path.stem}_marked.jpg"
    img.save(temp_path, 'JPEG', quality=85)
    return temp_path


def generate_sample_pdf():
    """Generate a complete sample PDF report with stock photos"""

    # Download stock photos first
    download_stock_photos()

    pdf_path = OUTPUT_DIR / 'Sample_Inspection_Report.pdf'

    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    width, height = letter

    # Color palette
    primary_color = HexColor('#1a1a2e')
    accent_color = HexColor('#e74c3c')
    text_primary = HexColor('#2c3e50')
    text_secondary = HexColor('#7f8c8d')
    text_light = HexColor('#95a5a6')
    bg_light = HexColor('#f8f9fa')
    bg_accent = HexColor('#ecf0f1')
    gold_accent = HexColor('#d4af37')

    # ============ COVER PAGE ============
    c.setFillColor(HexColor('#ffffff'))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Top section with subtle gray background
    c.setFillColor(bg_accent)
    c.rect(0, height - 180, width, 180, fill=1, stroke=0)

    # Thin accent line at top
    c.setFillColor(accent_color)
    c.rect(0, height - 3, width, 3, fill=1, stroke=0)

    # Logo
    logo_x = width / 2 - 30
    logo_y = height - 120

    c.setStrokeColor(primary_color)
    c.setLineWidth(2)
    c.circle(logo_x + 30, logo_y + 30, 35, fill=0, stroke=1)

    c.saveState()
    c.translate(logo_x + 30, logo_y + 30)
    c.rotate(45)
    c.setFillColor(primary_color)
    c.rect(-18, -18, 36, 36, fill=1, stroke=0)
    c.restoreState()

    c.setFillColor(HexColor('#ffffff'))
    window_size = 7
    c.rect(logo_x + 23, logo_y + 23, window_size, window_size, fill=1)
    c.rect(logo_x + 31, logo_y + 23, window_size, window_size, fill=1)
    c.rect(logo_x + 23, logo_y + 31, window_size, window_size, fill=1)
    c.rect(logo_x + 31, logo_y + 31, window_size, window_size, fill=1)

    c.setFillColor(accent_color)
    c.circle(logo_x + 45, logo_y + 15, 10, fill=1, stroke=0)
    c.setStrokeColor(HexColor('#ffffff'))
    c.setLineWidth(3)
    c.line(logo_x + 40, logo_y + 15, logo_x + 43, logo_y + 12)
    c.line(logo_x + 43, logo_y + 12, logo_x + 50, logo_y + 19)

    # Title
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

    # Decorative line
    line_width = 100
    c.setStrokeColor(gold_accent)
    c.setLineWidth(2)
    c.line((width - line_width) / 2, height - 250, (width + line_width) / 2, height - 250)

    # Property card
    card_y = height - 480
    card_height = 180
    card_margin = 60

    c.setFillColor(HexColor('#e8e8e8'))
    c.roundRect(card_margin + 2, card_y - 2, width - (2 * card_margin), card_height, 8, fill=1, stroke=0)

    c.setFillColor(HexColor('#ffffff'))
    c.setStrokeColor(HexColor('#e0e0e0'))
    c.setLineWidth(1)
    c.roundRect(card_margin, card_y, width - (2 * card_margin), card_height, 8, fill=1, stroke=1)

    info_x = card_margin + 30
    info_y = card_y + card_height - 40

    c.setFont("Helvetica", 10)
    c.setFillColor(text_light)
    c.drawString(info_x, info_y, "PROPERTY ADDRESS")

    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(text_primary)
    c.drawString(info_x, info_y - 25, SAMPLE_PROPERTY['address'])

    separator_x = width / 2
    c.setStrokeColor(HexColor('#e0e0e0'))
    c.setLineWidth(1)
    c.line(separator_x, card_y + 20, separator_x, card_y + card_height - 20)

    right_x = separator_x + 30

    c.setFont("Helvetica", 10)
    c.setFillColor(text_light)
    c.drawString(right_x, info_y, "INSPECTION DATE")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(text_primary)
    c.drawString(right_x, info_y - 22, SAMPLE_PROPERTY['date'])

    c.setFont("Helvetica", 10)
    c.setFillColor(text_light)
    c.drawString(right_x, info_y - 50, "PREPARED FOR")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(text_primary)
    c.drawString(right_x, info_y - 72, SAMPLE_PROPERTY['client'])

    # Stats box
    stats_y = card_y - 60
    c.setFillColor(bg_accent)
    c.roundRect(card_margin, stats_y, width - (2 * card_margin), 45, 8, fill=1, stroke=0)

    c.setFont("Helvetica", 11)
    c.setFillColor(text_secondary)
    stats_text = f"This report contains {len(SAMPLE_PHOTOS)} detailed inspection photographs with professional analysis"
    stats_width = c.stringWidth(stats_text, "Helvetica", 11)
    c.drawString((width - stats_width) / 2, stats_y + 18, stats_text)

    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(text_light)
    c.drawString(card_margin, 40, "Confidential Property Inspection Report")
    c.drawRightString(width - card_margin, 40, f"Generated {datetime.now().strftime('%Y-%m-%d')}")

    # Sample watermark badge
    c.setFillColor(accent_color)
    c.roundRect(width - 150, height - 80, 120, 30, 5, fill=1, stroke=0)
    c.setFillColor(HexColor('#ffffff'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(width - 135, height - 70, "SAMPLE")

    c.showPage()

    # ============ PHOTO PAGES ============
    total_photos = len(SAMPLE_PHOTOS)

    for i, photo_data in enumerate(SAMPLE_PHOTOS, 1):
        print(f"  Adding photo {i}/{total_photos}: {photo_data['name']}")

        # Get photo path
        photo_path = get_photo_path(photo_data['photo_key'])

        # Add issue markers to photos that have issues
        analysis = photo_data['analysis']
        if analysis.get('issues'):
            photo_path = add_issue_indicators(photo_path, analysis['issues'])

        try:
            # Page header
            c.setStrokeColor(accent_color)
            c.setLineWidth(2)
            c.line(0, height - 30, width, height - 30)

            # Mini logo
            logo_size = 12
            c.saveState()
            c.translate(35, height - 18)
            c.rotate(45)
            c.setFillColor(primary_color)
            c.rect(-logo_size/2, -logo_size/2, logo_size, logo_size, fill=1, stroke=0)
            c.restoreState()

            c.setFillColor(HexColor('#ffffff'))
            c.rect(32, height - 21, 3, 3, fill=1)
            c.rect(36, height - 21, 3, 3, fill=1)

            c.setFillColor(accent_color)
            c.circle(42, height - 22, 3, fill=1, stroke=0)

            c.setFont("Helvetica", 9)
            c.setFillColor(text_secondary)
            c.drawString(55, height - 22, f"Photo {i} of {total_photos}")

            c.setFont("Helvetica", 8)
            c.drawRightString(width - 35, height - 22, SAMPLE_PROPERTY['address'][:45])

            # Load and add image
            img = ImageReader(str(photo_path))
            img_width, img_height = img.getSize()

            max_width = width - 80
            max_height = 350
            scale = min(max_width / img_width, max_height / img_height, 1.0)

            draw_width = img_width * scale
            draw_height = img_height * scale

            x = (width - draw_width) / 2
            y = height - draw_height - 50

            # Image shadow
            c.setFillColor(HexColor('#e0e0e0'))
            c.rect(x - 2, y - 2, draw_width + 4, draw_height + 4, fill=1, stroke=0)

            # White border
            c.setFillColor(HexColor('#ffffff'))
            c.setStrokeColor(HexColor('#d0d0d0'))
            c.setLineWidth(1)
            c.rect(x - 5, y - 5, draw_width + 10, draw_height + 10, fill=1, stroke=1)

            # Draw image
            c.drawImage(img, x, y, draw_width, draw_height, preserveAspectRatio=True)

            # Photo title below image
            c.setFont("Helvetica-Bold", 14)
            c.setFillColor(text_primary)
            c.drawCentredString(width / 2, y - 25, photo_data['name'])

            # Analysis section
            analysis = photo_data['analysis']
            text_box_top = y - 50
            text_margin = 45

            has_issues = len(analysis.get('issues', [])) > 0

            if not has_issues:
                # No issues badge
                c.setFillColor(HexColor('#10b981'))
                badge_width = 100
                badge_x = (width - badge_width) / 2
                c.roundRect(badge_x, text_box_top - 10, badge_width, 25, 12, fill=1, stroke=0)
                c.setFillColor(HexColor('#ffffff'))
                c.setFont("Helvetica-Bold", 10)
                c.drawCentredString(width / 2, text_box_top - 2, "NO ISSUES")
            else:
                # Analysis box
                box_height = text_box_top - 45
                c.setFillColor(HexColor('#f8f9fa'))
                c.roundRect(text_margin - 10, 45, width - (2 * text_margin) + 20, box_height, 6, fill=1, stroke=0)

                c.setFillColor(accent_color)
                c.rect(text_margin - 10, 45, 4, box_height, fill=1, stroke=0)

                text_y = text_box_top - 15

                # Location
                c.setFillColor(primary_color)
                c.setFont("Helvetica-Bold", 12)
                c.drawString(text_margin, text_y, "LOCATION:")
                text_y -= 20
                c.setFillColor(HexColor('#374151'))
                c.setFont("Helvetica", 11)
                c.drawString(text_margin + 15, text_y, analysis['location'])
                text_y -= 25

                # Issues
                if analysis.get('issues'):
                    c.setFillColor(accent_color)
                    c.setFont("Helvetica-Bold", 12)
                    c.drawString(text_margin, text_y, "ISSUES TO ADDRESS:")
                    text_y -= 20

                    for issue in analysis['issues']:
                        c.setFillColor(accent_color)
                        c.circle(text_margin + 5, text_y + 3, 2, fill=1, stroke=0)
                        c.setFillColor(HexColor('#374151'))
                        c.setFont("Helvetica", 11)

                        # Word wrap for long issues
                        if len(issue) > 65:
                            words = issue.split()
                            current_line = ""
                            for word in words:
                                test_line = current_line + " " + word if current_line else word
                                if len(test_line) > 65:
                                    c.drawString(text_margin + 15, text_y, current_line)
                                    text_y -= 16
                                    current_line = word
                                else:
                                    current_line = test_line
                            if current_line:
                                c.drawString(text_margin + 15, text_y, current_line)
                                text_y -= 16
                        else:
                            c.drawString(text_margin + 15, text_y, issue)
                            text_y -= 16

                    text_y -= 8

                # Recommendation
                c.setFillColor(primary_color)
                c.setFont("Helvetica-Bold", 12)
                c.drawString(text_margin, text_y, "RECOMMENDED ACTION:")
                text_y -= 20
                c.setFillColor(HexColor('#374151'))
                c.setFont("Helvetica", 11)

                # Word wrap recommendation
                rec = analysis['recommendation']
                words = rec.split()
                current_line = ""
                for word in words:
                    test_line = current_line + " " + word if current_line else word
                    if len(test_line) > 65:
                        c.drawString(text_margin + 15, text_y, current_line)
                        text_y -= 16
                        current_line = word
                    else:
                        current_line = test_line
                if current_line:
                    c.drawString(text_margin + 15, text_y, current_line)

            # Page number
            c.setFont("Helvetica", 8)
            c.setFillColor(text_secondary)
            c.drawCentredString(width / 2, 30, f"Page {i + 1}")

            c.showPage()

        except Exception as e:
            print(f"    Error adding {photo_data['name']}: {e}")
            continue

    c.save()

    # Copy to public folder
    public_path = Path('./public/Sample_Inspection_Report.pdf')
    import shutil
    shutil.copy(pdf_path, public_path)

    print(f"\nSample PDF generated: {pdf_path}")
    print(f"Copied to: {public_path}")
    print(f"Total pages: {len(SAMPLE_PHOTOS) + 1}")
    print(f"File size: {pdf_path.stat().st_size / 1024:.1f} KB")

    return pdf_path


if __name__ == "__main__":
    generate_sample_pdf()
