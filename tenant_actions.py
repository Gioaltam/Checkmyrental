"""
Tenant Action Items Module - Parse vision results and generate action items page

Extracts issues tagged with [TENANT] responsibility from vision analysis
and creates a summary page for the property owner to share with their tenant.
"""

import re
from typing import Dict, List, Tuple
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor


# ============================================================================
# ISSUE PARSING
# ============================================================================

def extract_location(analysis: str) -> str:
    """Extract location from vision analysis text."""
    match = re.search(r'Location:\s*(.+?)(?:\n|$)', analysis, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return "Unknown"


def parse_issues_from_vision_results(vision_results: Dict[str, str]) -> Dict[str, List[Dict]]:
    """
    Parse vision analysis results and extract categorized issues.
    Separates issues by responsibility: TENANT vs OWNER.

    Returns dict with 'tenant' and 'owner' lists of issues.
    Each issue: {
        'description': str,
        'location': str,
        'priority': str,  # IMMEDIATE or SOON
        'action': str,    # Recommended action if found
    }
    """
    tenant_issues = []
    owner_issues = []

    for image_path, analysis in vision_results.items():
        if not analysis:
            continue

        # Skip if no repairs needed
        analysis_lower = analysis.lower()
        if 'no repairs needed' in analysis_lower or 'no issues' in analysis_lower:
            continue

        # Extract location for this image
        location = extract_location(analysis)

        # Extract recommended action if present
        action_match = re.search(r'Recommended Action:\s*\n?-?\s*(.+?)(?=\n\n|\Z)', analysis, re.IGNORECASE | re.DOTALL)
        default_action = action_match.group(1).strip() if action_match else ""

        # Pattern: "- [OWNER/TENANT] [IMMEDIATE/SOON] description"
        # Handle various formats the AI might use
        issue_patterns = [
            # Full format: [TENANT] [SOON] description
            re.compile(r'-\s*\[(TENANT|OWNER)\]\s*\[(IMMEDIATE|SOON)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
            # Alternative: [SOON] [TENANT] description
            re.compile(r'-\s*\[(IMMEDIATE|SOON)\]\s*\[(TENANT|OWNER)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
            # Legacy format without responsibility (assume OWNER)
            re.compile(r'-\s*\[(IMMEDIATE|SOON)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
        ]

        for pattern in issue_patterns:
            for match in pattern.finditer(analysis):
                groups = match.groups()

                if len(groups) == 3:
                    # Full format with both tags
                    if groups[0].upper() in ('TENANT', 'OWNER'):
                        responsibility = groups[0].upper()
                        priority = groups[1].upper()
                        description = groups[2].strip()
                    else:
                        priority = groups[0].upper()
                        responsibility = groups[1].upper()
                        description = groups[2].strip()
                elif len(groups) == 2:
                    # Legacy format - assume OWNER responsibility
                    priority = groups[0].upper()
                    description = groups[1].strip()
                    responsibility = 'OWNER'
                else:
                    continue

                issue = {
                    'description': description,
                    'location': location,
                    'priority': priority,
                    'action': default_action,
                }

                if responsibility == 'TENANT':
                    tenant_issues.append(issue)
                else:
                    owner_issues.append(issue)

    return {
        'tenant': tenant_issues,
        'owner': owner_issues,
    }


def wrap_text(text: str, max_width: float, font_name: str, font_size: int, c: canvas.Canvas) -> list:
    """
    Wrap text to fit within max_width. Returns list of lines.
    """
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip()
        if c.stringWidth(test_line, font_name, font_size) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines if lines else [text]


def get_tenant_action_suggestion(description: str) -> str:
    """
    Generate a suggested action for common tenant issues.
    Returns a helpful suggestion based on keywords in the description.
    """
    desc_lower = description.lower()

    # AC/HVAC filter
    if 'filter' in desc_lower and ('dirty' in desc_lower or 'clogged' in desc_lower or 'replace' in desc_lower):
        return "Please replace the AC filter with a new one (available at hardware stores)"

    # Smoke detector
    if 'smoke detector' in desc_lower or 'smoke alarm' in desc_lower:
        if 'battery' in desc_lower or 'beep' in desc_lower:
            return "Please replace the smoke detector battery"
        return "Please check/test the smoke detector"

    # CO detector
    if 'carbon monoxide' in desc_lower or 'co detector' in desc_lower:
        return "Please replace the CO detector battery or check the unit"

    # Drain issues
    if 'drain' in desc_lower and ('clog' in desc_lower or 'slow' in desc_lower):
        return "Please clear the drain using a plunger or drain cleaner"

    # Light bulbs
    if 'light' in desc_lower and ('bulb' in desc_lower or 'burned' in desc_lower or 'out' in desc_lower):
        return "Please replace the burned out light bulb"

    # Toilet running
    if 'toilet' in desc_lower and ('running' in desc_lower or 'flapper' in desc_lower):
        return "Please check the toilet flapper and adjust/replace if needed"

    # General cleaning
    if 'clean' in desc_lower:
        return "Please clean this area"

    return "Please address this issue"


# ============================================================================
# PDF PAGE RENDERING
# ============================================================================

def generate_action_items_page(c: canvas.Canvas, issues: Dict[str, List[Dict]], width: float, height: float) -> None:
    """
    Generate the Tenant Action Items page using ReportLab.
    Shows items the owner should request from the tenant.
    """
    # Executive color palette
    primary_color = HexColor('#1a1a2e')
    accent_color = HexColor('#e74c3c')
    text_primary = HexColor('#2c3e50')
    text_secondary = HexColor('#7f8c8d')
    text_light = HexColor('#95a5a6')
    bg_light = HexColor('#f8f9fa')
    bg_accent = HexColor('#ecf0f1')
    gold_accent = HexColor('#d4af37')

    # Priority colors
    priority_colors = {
        'IMMEDIATE': HexColor('#dc2626'),
        'SOON': HexColor('#f59e0b'),
    }

    # Section colors
    tenant_color = HexColor('#3b82f6')  # Blue for tenant
    owner_color = HexColor('#10b981')   # Green for owner

    card_margin = 45

    # === HEADER ===
    c.setStrokeColor(accent_color)
    c.setLineWidth(2)
    c.line(0, height - 30, width, height - 30)

    # Small logo mark
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

    # Page title
    c.setFont("Helvetica", 12)
    c.setFillColor(text_secondary)
    title_text = "INSPECTION SUMMARY"
    title_width = c.stringWidth(title_text, "Helvetica", 12)
    c.drawString((width - title_width) / 2, height - 70, title_text)

    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(text_primary)
    stat_text = "ACTION ITEMS"
    stat_width = c.stringWidth(stat_text, "Helvetica-Bold", 26)
    c.drawString((width - stat_width) / 2, height - 98, stat_text)

    # Decorative line
    line_width = 80
    c.setStrokeColor(gold_accent)
    c.setLineWidth(2)
    c.line((width - line_width) / 2, height - 112, (width + line_width) / 2, height - 112)

    tenant_issues = issues.get('tenant', [])
    owner_issues = issues.get('owner', [])

    current_y = height - 145

    # === TENANT ACTIONS SECTION ===
    if tenant_issues:
        # Section header
        c.setFillColor(tenant_color)
        c.roundRect(card_margin, current_y - 5, width - 2*card_margin, 28, 4, fill=1, stroke=0)

        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(HexColor('#ffffff'))
        c.drawString(card_margin + 12, current_y + 5, f"TENANT ACTION ITEMS ({len(tenant_issues)})")

        c.setFont("Helvetica", 9)
        c.drawRightString(width - card_margin - 12, current_y + 5, "Items to discuss with your tenant")

        current_y -= 40

        # List tenant issues with text wrapping
        for i, issue in enumerate(tenant_issues[:6]):  # Limit to 6 items
            if current_y < 200:
                break

            priority = issue.get('priority', 'SOON')
            desc = issue.get('description', '')
            action = get_tenant_action_suggestion(desc)
            location = issue.get('location', 'Unknown').upper()

            # Calculate available width for text (leave room for margins and priority badge)
            text_width = width - 2*card_margin - 24  # 12px padding each side

            # Wrap description and action text
            desc_lines = wrap_text(desc, text_width, "Helvetica", 9, c)
            action_lines = wrap_text(f"→ {action}", text_width, "Helvetica-Oblique", 8, c)

            # Calculate dynamic card height based on content
            line_height = 14
            card_height = 25 + (len(desc_lines) * line_height) + (len(action_lines) * 12)

            # Issue card background
            c.setFillColor(bg_light)
            c.roundRect(card_margin, current_y - card_height + 15, width - 2*card_margin, card_height, 4, fill=1, stroke=0)

            # Priority indicator bar on left
            c.setFillColor(priority_colors.get(priority, text_secondary))
            c.roundRect(card_margin, current_y - card_height + 15, 4, card_height, 2, fill=1, stroke=0)

            # Location header
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(text_secondary)
            c.drawString(card_margin + 12, current_y + 5, location)

            # Priority badge
            c.setFont("Helvetica-Bold", 7)
            c.setFillColor(priority_colors.get(priority, text_secondary))
            c.drawRightString(width - card_margin - 10, current_y + 5, f"[{priority}]")

            # Issue description - wrapped lines
            c.setFont("Helvetica", 9)
            c.setFillColor(text_primary)
            desc_y = current_y - 10
            for line in desc_lines:
                c.drawString(card_margin + 12, desc_y, line)
                desc_y -= line_height

            # Suggested action - wrapped lines
            c.setFont("Helvetica-Oblique", 8)
            c.setFillColor(tenant_color)
            action_y = desc_y - 2
            for line in action_lines:
                c.drawString(card_margin + 12, action_y, line)
                action_y -= 12

            current_y -= card_height + 8

        current_y -= 15

    # === OWNER REPAIRS SECTION ===
    if owner_issues:
        # Section header
        c.setFillColor(owner_color)
        c.roundRect(card_margin, current_y - 5, width - 2*card_margin, 28, 4, fill=1, stroke=0)

        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(HexColor('#ffffff'))
        c.drawString(card_margin + 12, current_y + 5, f"OWNER REPAIRS NEEDED ({len(owner_issues)})")

        c.setFont("Helvetica", 9)
        c.drawRightString(width - card_margin - 12, current_y + 5, "Items requiring professional repair")

        current_y -= 40

        # List owner issues - stacked layout with text wrapping
        for i, issue in enumerate(owner_issues[:5]):  # Limit to 5 items
            if current_y < 120:
                break

            priority = issue.get('priority', 'SOON')
            loc = issue.get('location', 'Unknown').upper()
            desc = issue.get('description', '')

            # Calculate available width for text
            text_width = width - 2*card_margin - 24

            # Wrap description text
            desc_lines = wrap_text(desc, text_width, "Helvetica", 9, c)

            # Calculate dynamic card height based on content
            line_height = 14
            card_height = 25 + (len(desc_lines) * line_height)

            # Issue card background
            c.setFillColor(bg_light)
            c.roundRect(card_margin, current_y - card_height + 15, width - 2*card_margin, card_height, 4, fill=1, stroke=0)

            # Priority indicator bar on left
            c.setFillColor(priority_colors.get(priority, text_secondary))
            c.roundRect(card_margin, current_y - card_height + 15, 4, card_height, 2, fill=1, stroke=0)

            # Location header line
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(text_secondary)
            c.drawString(card_margin + 12, current_y + 5, loc)

            # Priority badge on same line as location, but at the end
            c.setFont("Helvetica-Bold", 7)
            c.setFillColor(priority_colors.get(priority, text_secondary))
            c.drawRightString(width - card_margin - 10, current_y + 5, f"[{priority}]")

            # Description - wrapped lines below location
            c.setFont("Helvetica", 9)
            c.setFillColor(text_primary)
            desc_y = current_y - 10
            for line in desc_lines:
                c.drawString(card_margin + 12, desc_y, line)
                desc_y -= line_height

            current_y -= card_height + 8

    # === NO ISSUES MESSAGE ===
    if not tenant_issues and not owner_issues:
        c.setFont("Helvetica", 14)
        c.setFillColor(text_secondary)
        c.drawCentredString(width / 2, height / 2, "No action items identified in this inspection.")

    # === FOOTER NOTE ===
    c.setFont("Helvetica", 7)
    c.setFillColor(text_light)
    c.drawString(card_margin, 50, "This summary is provided to help facilitate communication between property owner and tenant.")
    c.drawString(card_margin, 40, "Tenant action items are suggestions based on typical lease responsibilities. Please refer to your lease agreement.")

    # Page number
    c.setFont("Helvetica", 8)
    c.setFillColor(text_secondary)
    c.drawCentredString(width / 2, 25, f"Page {c.getPageNumber()}")
