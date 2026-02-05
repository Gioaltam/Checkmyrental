#!/usr/bin/env python3
"""
Generate VistaPrint-ready business card PNG for CheckMyRental
Specifications:
- Standard US business card: 3.5 x 2 inches with 0.125" bleed = 3.75 x 2.25 inches
- Output at 300 DPI for print quality
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# 300 DPI for print quality
DPI = 300

# Card dimensions in pixels (3.75" x 2.25" at 300 DPI)
CARD_WIDTH = int(3.75 * DPI)   # 1125 pixels
CARD_HEIGHT = int(2.25 * DPI)  # 675 pixels

# Brand colors (RGB)
BRAND_BLACK = (0, 0, 0)
BRAND_NAVY = (44, 62, 80)
BRAND_RED = (231, 76, 60)
BRAND_WHITE = (255, 255, 255)

# Text colors
TEXT_DARK = (26, 26, 26)
TEXT_MEDIUM = (74, 74, 74)
TEXT_LIGHT = (136, 150, 171)
ACCENT_LINE = (229, 231, 235)


def draw_geometric_pattern(draw, width, height):
    """Draw subtle repeating diamond pattern across the card"""
    pattern_color = (245, 245, 245)  # Very light gray - barely visible
    diamond_size = int(0.12 * DPI)   # Small diamonds
    spacing = int(0.22 * DPI)        # Space between diamonds

    for x in range(-spacing, width + spacing, spacing):
        for y in range(-spacing, height + spacing, spacing):
            # Offset every other row for visual interest
            offset = spacing // 2 if (y // spacing) % 2 else 0
            cx, cy = x + offset, y

            # Draw rotated square (diamond)
            half = diamond_size // 2
            points = [
                (cx, cy - half),  # top
                (cx + half, cy),  # right
                (cx, cy + half),  # bottom
                (cx - half, cy),  # left
            ]
            draw.polygon(points, fill=pattern_color)


def draw_logo(draw, cx, cy, size, watermark=False):
    """Draw the CheckMyRental logo at specified position and size"""

    # Colors for watermark vs normal
    if watermark:
        bg_color = (240, 240, 240)
        house_color = (224, 224, 224)
        pane_color = BRAND_WHITE
        badge_color = (252, 232, 232)
        check_color = BRAND_WHITE
    else:
        bg_color = BRAND_BLACK
        house_color = BRAND_NAVY
        pane_color = BRAND_WHITE
        badge_color = BRAND_RED
        check_color = BRAND_WHITE

    scale = size / 512
    radius = size / 2

    # Background circle
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=bg_color)

    # Navy blue rotated square (house) - diamond shape
    half_side = 140 * scale
    diagonal = half_side * math.sqrt(2)

    diamond_points = [
        (cx, cy - diagonal),           # top
        (cx + diagonal, cy),           # right
        (cx, cy + diagonal),           # bottom
        (cx - diagonal, cy),           # left
    ]
    draw.polygon(diamond_points, fill=house_color)

    # White window panes (4 squares in 2x2 grid, rotated 45 degrees)
    pane_size = 46 * scale
    pane_half_diag = pane_size * math.sqrt(2) / 2
    cos45 = math.sqrt(2) / 2

    pane_positions_orig = [(-33, -33), (33, -33), (-33, 33), (33, 33)]
    for ox, oy in pane_positions_orig:
        rx = (ox * cos45 - oy * cos45) * scale
        ry = (ox * cos45 + oy * cos45) * scale
        pcx, pcy = cx + rx, cy + ry
        pane_points = [
            (pcx, pcy - pane_half_diag),
            (pcx + pane_half_diag, pcy),
            (pcx, pcy + pane_half_diag),
            (pcx - pane_half_diag, pcy),
        ]
        draw.polygon(pane_points, fill=pane_color)

    # Red circle badge - bottom right
    badge_offset_x = (358 - 256) * scale
    badge_offset_y = (358 - 256) * scale
    badge_radius = 85 * scale
    badge_cx = cx + badge_offset_x
    badge_cy = cy + badge_offset_y

    draw.ellipse([badge_cx - badge_radius, badge_cy - badge_radius,
                  badge_cx + badge_radius, badge_cy + badge_radius], fill=badge_color)

    # White checkmark - draw with circles at endpoints and joint for smooth appearance
    stroke_width = int(18 * scale)
    radius = stroke_width // 2

    def transform_point(px, py):
        return (cx + (px - 256) * scale, cy + (py - 256) * scale)

    p1 = transform_point(315, 358)  # start of short leg
    p2 = transform_point(345, 388)  # corner (bottom)
    p3 = transform_point(405, 328)  # end of long leg

    # Draw the two line segments
    draw.line([p1, p2], fill=check_color, width=stroke_width)
    draw.line([p2, p3], fill=check_color, width=stroke_width)

    # Draw circles at all three points to create rounded caps and smooth joint
    for p in [p1, p2, p3]:
        draw.ellipse([p[0] - radius, p[1] - radius, p[0] + radius, p[1] + radius], fill=check_color)


def get_font(bold=False, size=12):
    """Get a font, falling back to default if not available"""
    # Try common system fonts
    font_names = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]

    bold_names = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]

    names = bold_names if bold else font_names

    for name in names:
        try:
            if name.endswith('.ttc'):
                # For .ttc files, index 0 is regular, index 1 is often bold
                idx = 1 if bold else 0
                return ImageFont.truetype(name, size, index=idx)
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue

    # Fallback to default
    return ImageFont.load_default()


def create_front(filename):
    """Create the front of the business card as PNG"""

    # Create image with white background
    img = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), BRAND_WHITE)
    draw = ImageDraw.Draw(img)

    # Draw subtle geometric pattern
    draw_geometric_pattern(draw, CARD_WIDTH, CARD_HEIGHT)

    # Elegant thin navy line at bottom (extends to bleed)
    line_height = int(0.06 * DPI)
    draw.rectangle([0, CARD_HEIGHT - line_height, CARD_WIDTH, CARD_HEIGHT], fill=BRAND_NAVY)

    # Center of card
    center_x = CARD_WIDTH / 2
    center_y = CARD_HEIGHT / 2

    # Draw logo
    logo_size = int(0.88 * DPI)
    draw_logo(draw, center_x, center_y - int(0.32 * DPI), logo_size)

    # Company name - "CheckMy" in dark, "Rental" in red
    font_name = get_font(bold=True, size=int(20 * DPI / 72))

    part1 = "CheckMy"
    part2 = "Rental"

    bbox1 = draw.textbbox((0, 0), part1, font=font_name)
    bbox2 = draw.textbbox((0, 0), part2, font=font_name)
    width1 = bbox1[2] - bbox1[0]
    width2 = bbox2[2] - bbox2[0]
    total_width = width1 + width2

    start_x = center_x - total_width / 2
    y_name = center_y + int(0.38 * DPI)

    draw.text((start_x, y_name), part1, fill=TEXT_DARK, font=font_name)
    draw.text((start_x + width1, y_name), part2, fill=BRAND_RED, font=font_name)

    # Tagline - larger and darker for print visibility
    font_tagline = get_font(bold=False, size=int(10 * DPI / 72))
    tagline = "Quarterly Property Inspection Services"
    bbox = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_width = bbox[2] - bbox[0]
    y_tagline = center_y + int(0.72 * DPI)
    draw.text((center_x - tagline_width / 2, y_tagline), tagline, fill=TEXT_MEDIUM, font=font_tagline)

    img.save(filename, 'PNG', dpi=(DPI, DPI))
    print(f"Created: {filename}")


def create_back(filename):
    """Create the back of the business card as PNG"""

    # Create image with white background
    img = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), BRAND_WHITE)
    draw = ImageDraw.Draw(img)

    # Draw subtle geometric pattern
    draw_geometric_pattern(draw, CARD_WIDTH, CARD_HEIGHT)

    # Elegant thin navy line at top (extends to bleed)
    line_height = int(0.06 * DPI)
    draw.rectangle([0, 0, CARD_WIDTH, line_height], fill=BRAND_NAVY)

    # Margins
    left_margin = int(0.25 * DPI)
    right_margin = CARD_WIDTH - int(0.25 * DPI)

    # Fonts - increased sizes for print visibility
    font_name = get_font(bold=True, size=int(14 * DPI / 72))
    font_title = get_font(bold=False, size=int(10 * DPI / 72))
    font_label = get_font(bold=False, size=int(8 * DPI / 72))
    font_contact = get_font(bold=False, size=int(10 * DPI / 72))
    font_service = get_font(bold=False, size=int(9 * DPI / 72))

    # Vertical content alignment
    y_pos = int(0.45 * DPI)

    # Name
    draw.text((left_margin, y_pos), "Giovanni Gomes", fill=TEXT_DARK, font=font_name)

    # Title
    y_pos += int(0.2 * DPI)
    draw.text((left_margin, y_pos), "Founder", fill=TEXT_MEDIUM, font=font_title)

    # Subtle divider
    y_pos += int(0.16 * DPI)
    draw.line([left_margin, y_pos, left_margin + int(1.0 * DPI), y_pos], fill=ACCENT_LINE, width=1)

    # Bold font for labels
    font_label_bold = get_font(bold=True, size=int(8 * DPI / 72))

    # Website with tag
    y_pos += int(0.13 * DPI)
    draw.text((left_margin, y_pos), "WEB", fill=BRAND_NAVY, font=font_label_bold)
    y_pos += int(0.11 * DPI)
    draw.text((left_margin, y_pos), "checkmyrental.io", fill=BRAND_RED, font=font_contact)

    # Email with tag
    y_pos += int(0.17 * DPI)
    draw.text((left_margin, y_pos), "EMAIL", fill=BRAND_NAVY, font=font_label_bold)
    y_pos += int(0.11 * DPI)
    draw.text((left_margin, y_pos), "info@checkmyrental.io", fill=TEXT_MEDIUM, font=font_contact)

    # Phone with tag
    y_pos += int(0.17 * DPI)
    draw.text((left_margin, y_pos), "PHONE", fill=BRAND_NAVY, font=font_label_bold)
    y_pos += int(0.11 * DPI)
    draw.text((left_margin, y_pos), "(813) 252-0524", fill=TEXT_MEDIUM, font=font_contact)

    # Service area
    y_pos += int(0.22 * DPI)
    font_service_bold = get_font(bold=True, size=int(9 * DPI / 72))
    draw.text((left_margin, y_pos), "Serving Pinellas & Hillsborough County", fill=BRAND_NAVY, font=font_service_bold)

    # Right column - Services list
    right_col_x = CARD_WIDTH // 2 + int(0.15 * DPI)
    font_services_label = get_font(bold=True, size=int(10 * DPI / 72))
    font_services_item = get_font(bold=False, size=int(10 * DPI / 72))

    right_y = int(0.95 * DPI)
    draw.text((right_col_x, right_y), "SERVICES", fill=BRAND_NAVY, font=font_services_label)

    services = [
        "Move-In / Move-Out",
        "Quarterly Inspections",
        "Annual Inspections",
    ]

    right_y += int(0.18 * DPI)
    for service in services:
        # Draw red bullet point
        bullet_x = right_col_x
        draw.ellipse([bullet_x, right_y + int(0.03 * DPI), bullet_x + int(0.04 * DPI), right_y + int(0.07 * DPI)], fill=BRAND_RED)
        draw.text((right_col_x + int(0.08 * DPI), right_y), service, fill=TEXT_MEDIUM, font=font_services_item)
        right_y += int(0.14 * DPI)

    # Watermark logo - top right
    logo_size = int(0.65 * DPI)
    logo_x = right_margin - logo_size/2 - int(0.05 * DPI)
    logo_y = int(0.55 * DPI)
    draw_logo(draw, logo_x, logo_y, logo_size, watermark=True)

    # Locally Owned & Operated - bottom right
    font_local = get_font(bold=False, size=int(8 * DPI / 72))
    local_text = "Locally Owned & Operated"
    bbox = draw.textbbox((0, 0), local_text, font=font_local)
    local_width = bbox[2] - bbox[0]
    draw.text((right_margin - local_width, CARD_HEIGHT - int(0.2 * DPI)), local_text, fill=TEXT_MEDIUM, font=font_local)

    img.save(filename, 'PNG', dpi=(DPI, DPI))
    print(f"Created: {filename}")


if __name__ == "__main__":
    output_dir = "/Users/gio_altam/Documents/Checkmyrental"

    # Create separate front and back for VistaPrint (PNG format)
    create_front(os.path.join(output_dir, "business_card_front.png"))
    create_back(os.path.join(output_dir, "business_card_back.png"))

    print("\n✓ Business cards created!")
    print(f"  - business_card_front.png (upload as FRONT)")
    print(f"  - business_card_back.png (upload as BACK)")
    print(f"\nSpecifications:")
    print(f"  - Size: 3.75\" x 2.25\" (3.5\" x 2\" with 0.125\" bleed)")
    print(f"  - Resolution: 300 DPI ({CARD_WIDTH} x {CARD_HEIGHT} pixels)")
    print(f"  - Ready for VistaPrint upload")
