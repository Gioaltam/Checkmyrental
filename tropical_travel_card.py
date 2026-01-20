#!/usr/bin/env python3
"""
Tropical Travel Network Business Card - Redesigned
Keeps original tropical sunset gradient with improved layout
"""

from PIL import Image, ImageDraw, ImageFont
import os
import urllib.request

# 300 DPI for print quality
DPI = 300

# Card dimensions in pixels (3.75" x 2.25" at 300 DPI with bleed)
CARD_WIDTH = int(3.75 * DPI)   # 1125 pixels
CARD_HEIGHT = int(2.25 * DPI)  # 675 pixels

# Corner radius for rounded corners
CORNER_RADIUS = int(0.12 * DPI)

# Original tropical gradient colors
COLOR_TOP = (126, 148, 120)      # Sage green / teal
COLOR_MID = (178, 155, 110)      # Golden tan
COLOR_BOTTOM = (165, 100, 65)    # Burnt orange / rust

# Text colors
TEXT_DARK = (45, 35, 25)         # Dark brown for main text
TEXT_MEDIUM = (65, 50, 35)       # Medium brown


def download_josefin_sans():
    """Download Josefin Sans font if not already present"""
    font_dir = "/Users/gio_altam/Documents/Checkmyrental/fonts"
    os.makedirs(font_dir, exist_ok=True)

    fonts = {
        "JosefinSans-Regular.ttf": "https://github.com/googlefonts/josefinsans/raw/main/fonts/ttf/JosefinSans-Regular.ttf",
        "JosefinSans-Bold.ttf": "https://github.com/googlefonts/josefinsans/raw/main/fonts/ttf/JosefinSans-Bold.ttf",
        "JosefinSans-SemiBold.ttf": "https://github.com/googlefonts/josefinsans/raw/main/fonts/ttf/JosefinSans-SemiBold.ttf",
        "JosefinSans-Light.ttf": "https://github.com/googlefonts/josefinsans/raw/main/fonts/ttf/JosefinSans-Light.ttf",
        "JosefinSans-Italic.ttf": "https://github.com/googlefonts/josefinsans/raw/main/fonts/ttf/JosefinSans-Italic.ttf",
        "JosefinSans-LightItalic.ttf": "https://github.com/googlefonts/josefinsans/raw/main/fonts/ttf/JosefinSans-LightItalic.ttf",
    }

    for filename, url in fonts.items():
        filepath = os.path.join(font_dir, filename)
        if not os.path.exists(filepath):
            print(f"Downloading {filename}...")
            try:
                urllib.request.urlretrieve(url, filepath)
            except Exception as e:
                print(f"Could not download {filename}: {e}")

    return font_dir


def get_font(weight="regular", size=12):
    """Get Josefin Sans font with specified weight"""
    font_dir = "/Users/gio_altam/Documents/Checkmyrental/fonts"

    weight_map = {
        "light": "JosefinSans-Light.ttf",
        "regular": "JosefinSans-Regular.ttf",
        "semibold": "JosefinSans-SemiBold.ttf",
        "bold": "JosefinSans-Bold.ttf",
        "italic": "JosefinSans-Italic.ttf",
        "light-italic": "JosefinSans-LightItalic.ttf",
    }

    font_file = weight_map.get(weight, "JosefinSans-Regular.ttf")
    font_path = os.path.join(font_dir, font_file)

    try:
        return ImageFont.truetype(font_path, size)
    except (OSError, IOError):
        return ImageFont.load_default()


def interpolate_color(color1, color2, t):
    """Interpolate between two RGB colors"""
    return tuple(int(c1 + (c2 - c1) * t) for c1, c2 in zip(color1, color2))


def create_tropical_gradient(width, height):
    """Create the tropical sunset gradient"""
    img = Image.new('RGB', (width, height))
    pixels = img.load()

    for y in range(height):
        t = y / height

        if t < 0.5:
            # Top half: green to tan
            local_t = t * 2
            color = interpolate_color(COLOR_TOP, COLOR_MID, local_t)
        else:
            # Bottom half: tan to orange
            local_t = (t - 0.5) * 2
            color = interpolate_color(COLOR_MID, COLOR_BOTTOM, local_t)

        for x in range(width):
            pixels[x, y] = color

    return img


def add_rounded_corners(img, radius):
    """Add rounded corners to the image"""
    mask = Image.new('L', img.size, 255)
    draw = ImageDraw.Draw(mask)

    draw.rectangle([0, 0, radius, radius], fill=0)
    draw.ellipse([0, 0, radius * 2, radius * 2], fill=255)

    draw.rectangle([img.width - radius, 0, img.width, radius], fill=0)
    draw.ellipse([img.width - radius * 2, 0, img.width, radius * 2], fill=255)

    draw.rectangle([0, img.height - radius, radius, img.height], fill=0)
    draw.ellipse([0, img.height - radius * 2, radius * 2, img.height], fill=255)

    draw.rectangle([img.width - radius, img.height - radius, img.width, img.height], fill=0)
    draw.ellipse([img.width - radius * 2, img.height - radius * 2, img.width, img.height], fill=255)

    img.putalpha(mask)
    return img


def draw_decorative_line(draw, x1, y, x2, color, width=2):
    """Draw a decorative horizontal line"""
    draw.line([(x1, y), (x2, y)], fill=color, width=width)


def draw_vertical_line(draw, x, y1, y2, color, width=2):
    """Draw a decorative vertical line"""
    draw.line([(x, y1), (x, y2)], fill=color, width=width)


def create_front(filename):
    """Create the front of the business card"""

    # Create gradient background
    img = create_tropical_gradient(CARD_WIDTH, CARD_HEIGHT)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_title = get_font("bold", int(16 * DPI / 72))
    font_subtitle = get_font("light-italic", int(11 * DPI / 72))

    # Center positioning
    center_x = CARD_WIDTH // 2
    center_y = CARD_HEIGHT // 2

    # Decorative top line
    line_width = int(1.5 * DPI)
    line_y = int(0.4 * DPI)
    draw_decorative_line(draw, center_x - line_width // 2, line_y,
                         center_x + line_width // 2, TEXT_DARK, 2)

    # Company name - TROPICAL TRAVEL NETWORK
    title = "TROPICAL TRAVEL NETWORK"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    title_width = bbox[2] - bbox[0]
    title_height = bbox[3] - bbox[1]

    title_y = center_y - int(0.1 * DPI)
    draw.text((center_x - title_width // 2, title_y), title, fill=TEXT_DARK, font=font_title)

    # Subtitle
    subtitle = "Transferências de valores para o Brasil"
    bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
    subtitle_width = bbox[2] - bbox[0]

    subtitle_y = title_y + title_height + int(0.15 * DPI)
    draw.text((center_x - subtitle_width // 2, subtitle_y), subtitle, fill=TEXT_MEDIUM, font=font_subtitle)

    # Decorative bottom line
    bottom_line_y = CARD_HEIGHT - int(0.4 * DPI)
    draw_decorative_line(draw, center_x - line_width // 2, bottom_line_y,
                         center_x + line_width // 2, TEXT_DARK, 2)

    # Add rounded corners
    img = add_rounded_corners(img, CORNER_RADIUS)

    img.save(filename, 'PNG', dpi=(DPI, DPI))
    print(f"Created: {filename}")


def create_back(filename):
    """Create the back of the business card - same gradient as front"""

    # Create gradient background (same as front)
    img = create_tropical_gradient(CARD_WIDTH, CARD_HEIGHT)
    draw = ImageDraw.Draw(img)

    # Fonts - larger sizes to fill the space better
    font_item = get_font("regular", int(11 * DPI / 72))
    font_phone = get_font("bold", int(18 * DPI / 72))
    font_tagline = get_font("light-italic", int(11 * DPI / 72))

    # Center positioning
    center_x = CARD_WIDTH // 2
    center_y = CARD_HEIGHT // 2

    # Decorative vertical lines on the sides - full height
    line_margin = int(0.25 * DPI)
    line_top = int(0.25 * DPI)
    line_bottom = CARD_HEIGHT - int(0.25 * DPI)

    # Left vertical line
    draw_vertical_line(draw, line_margin, line_top, line_bottom, TEXT_DARK, 2)
    # Right vertical line
    draw_vertical_line(draw, CARD_WIDTH - line_margin, line_top, line_bottom, TEXT_DARK, 2)

    # Checklist items - centered, starting higher
    checklist = [
        "Cotação atual do câmbio",
        "Cadastro fácil e rápido",
        "Liberação imediata",
        "Seguro e confiável",
    ]

    y_pos = int(0.28 * DPI)
    line_spacing = int(0.19 * DPI)

    # Find the widest item to set a fixed left position for all checkmarks
    check_size = int(0.09 * DPI)
    max_text_width = 0
    for item in checklist:
        text_bbox = draw.textbbox((0, 0), item, font=font_item)
        text_width = text_bbox[2] - text_bbox[0]
        if text_width > max_text_width:
            max_text_width = text_width

    # Calculate fixed x position for checkmarks (based on widest item)
    total_width = check_size + int(0.1 * DPI) + max_text_width
    fixed_check_x = center_x - total_width // 2

    for item in checklist:
        # Draw checkmark at fixed x position
        check_y = y_pos + int(0.02 * DPI)

        draw.line(
            [(fixed_check_x, check_y + check_size * 0.5),
             (fixed_check_x + check_size * 0.4, check_y + check_size)],
            fill=TEXT_DARK, width=3
        )
        draw.line(
            [(fixed_check_x + check_size * 0.4, check_y + check_size),
             (fixed_check_x + check_size, check_y)],
            fill=TEXT_DARK, width=3
        )

        # Item text at fixed position after checkmark
        text_x = fixed_check_x + check_size + int(0.1 * DPI)
        draw.text((text_x, y_pos), item, fill=TEXT_DARK, font=font_item)

        y_pos += line_spacing

    # Phone number - centered with more space above
    y_pos += int(0.12 * DPI)
    phone_text = "727 301 0612"
    bbox = draw.textbbox((0, 0), phone_text, font=font_phone)
    phone_width = bbox[2] - bbox[0]
    draw.text((center_x - phone_width // 2, y_pos), phone_text, fill=TEXT_DARK, font=font_phone)

    # Tagline at bottom - centered
    tagline1 = "Conectando você ao Brasil"
    tagline2 = "com confiança"

    bbox1 = draw.textbbox((0, 0), tagline1, font=font_tagline)
    tagline1_width = bbox1[2] - bbox1[0]

    bbox2 = draw.textbbox((0, 0), tagline2, font=font_tagline)
    tagline2_width = bbox2[2] - bbox2[0]

    # Position tagline at bottom with proper spacing
    tagline_y = CARD_HEIGHT - int(0.55 * DPI)
    draw.text((center_x - tagline1_width // 2, tagline_y), tagline1, fill=TEXT_MEDIUM, font=font_tagline)
    draw.text((center_x - tagline2_width // 2, tagline_y + int(0.16 * DPI)), tagline2, fill=TEXT_MEDIUM, font=font_tagline)

    # Add rounded corners
    img = add_rounded_corners(img, CORNER_RADIUS)

    img.save(filename, 'PNG', dpi=(DPI, DPI))
    print(f"Created: {filename}")


if __name__ == "__main__":
    output_dir = "/Users/gio_altam/Documents/Checkmyrental"

    # Download fonts if needed
    download_josefin_sans()

    # Create front and back
    create_front(os.path.join(output_dir, "tropical_card_front.png"))
    create_back(os.path.join(output_dir, "tropical_card_back.png"))

    print("\n✓ Tropical Travel Network cards created!")
    print(f"  - tropical_card_front.png")
    print(f"  - tropical_card_back.png")
    print(f"\nSpecifications:")
    print(f"  - Size: 3.75\" x 2.25\" (3.5\" x 2\" with 0.125\" bleed)")
    print(f"  - Resolution: 300 DPI ({CARD_WIDTH} x {CARD_HEIGHT} pixels)")
