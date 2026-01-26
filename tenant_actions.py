"""
Tenant Action Items Module - Parse vision results and generate action items page

Extracts issues tagged with [TENANT] responsibility from vision analysis
and creates a summary page for the property owner to share with their tenant.
"""

import re
from datetime import datetime
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
    return "Other"


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

        # Pattern: "- [OWNER/TENANT] [FIX NOW/FIX SOON] description"
        # Handle various formats the AI might use, including legacy IMMEDIATE/SOON
        issue_patterns = [
            # New format: [TENANT] [FIX NOW] or [FIX SOON] description
            re.compile(r'-\s*\[(TENANT|OWNER)\]\s*\[(FIX NOW|FIX SOON)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
            # Alternative: [FIX NOW] [TENANT] description
            re.compile(r'-\s*\[(FIX NOW|FIX SOON)\]\s*\[(TENANT|OWNER)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
            # Legacy format: [TENANT] [IMMEDIATE/SOON] description
            re.compile(r'-\s*\[(TENANT|OWNER)\]\s*\[(IMMEDIATE|SOON)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
            # Legacy alternative: [IMMEDIATE/SOON] [TENANT] description
            re.compile(r'-\s*\[(IMMEDIATE|SOON)\]\s*\[(TENANT|OWNER)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
            # Legacy format without responsibility (assume OWNER)
            re.compile(r'-\s*\[(IMMEDIATE|SOON|FIX NOW|FIX SOON)\]\s*(.+?)(?=\n|$)', re.IGNORECASE),
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

                # Normalize priority to new simpler format
                if priority in ('IMMEDIATE', 'FIX NOW'):
                    priority = 'FIX NOW'
                else:
                    priority = 'FIX SOON'

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
    Returns a helpful suggestion using simple language.
    """
    desc_lower = description.lower()

    # Air filter
    if 'filter' in desc_lower and ('dirty' in desc_lower or 'clogged' in desc_lower or 'replace' in desc_lower or 'air' in desc_lower):
        return "Buy a new air filter at any hardware store (like Home Depot) and put it in"

    # Smoke alarm
    if 'smoke' in desc_lower and ('detector' in desc_lower or 'alarm' in desc_lower):
        if 'battery' in desc_lower or 'beep' in desc_lower:
            return "Put a new battery in the smoke alarm to stop the beeping"
        return "Press the test button on the smoke alarm to make sure it works"

    # Carbon monoxide alarm
    if 'carbon monoxide' in desc_lower or 'co detector' in desc_lower or 'co alarm' in desc_lower:
        return "Put a new battery in the carbon monoxide alarm"

    # Slow or clogged drain
    if 'drain' in desc_lower and ('clog' in desc_lower or 'slow' in desc_lower):
        return "Pour drain cleaner down the drain, or use a plunger to clear it"

    # Light bulbs
    if 'light' in desc_lower and ('bulb' in desc_lower or 'burned' in desc_lower or 'out' in desc_lower or 'not working' in desc_lower):
        return "Buy a new light bulb and replace the old one"

    # Toilet keeps running
    if 'toilet' in desc_lower and ('running' in desc_lower or 'flapper' in desc_lower or 'keeps' in desc_lower or 'rubber' in desc_lower):
        return "The rubber piece inside the toilet tank needs to be replaced (cheap part at hardware store)"

    # General cleaning
    if 'clean' in desc_lower or 'dirty' in desc_lower:
        return "Please clean this area"

    return "Please take care of this"


# ============================================================================
# PDF PAGE RENDERING
# ============================================================================

def generate_action_items_page(c: canvas.Canvas, issues: Dict[str, List[Dict]], width: float, height: float, inspector_notes: List[Dict] = None) -> None:
    """
    Generate the Tenant Action Items page using ReportLab.
    Shows items the owner should request from the tenant.

    Args:
        c: ReportLab canvas
        issues: Dict with 'tenant' and 'owner' lists of issues
        width: Page width
        height: Page height
        inspector_notes: List of inspector notes (text, responsibility, priority)
    """
    if inspector_notes is None:
        inspector_notes = []

    print(f"[DEBUG tenant_actions] Received {len(inspector_notes)} inspector notes")
    print(f"[DEBUG tenant_actions] Issues before merge - tenant: {len(issues.get('tenant', []))}, owner: {len(issues.get('owner', []))}")

    # Merge inspector notes into issues
    for note in inspector_notes:
        print(f"[DEBUG tenant_actions] Processing note: {note}")
        issue = {
            'description': note.get('text', ''),
            'location': 'Inspector Note',  # Special location marker
            'priority': note.get('priority', 'FIX SOON'),
            'action': '',
            'is_inspector_note': True,  # Flag for special rendering
        }
        responsibility = note.get('responsibility', 'OWNER')
        if responsibility == 'TENANT':
            issues.setdefault('tenant', []).append(issue)
            print(f"[DEBUG tenant_actions] Added note to TENANT list")
        else:
            issues.setdefault('owner', []).append(issue)
            print(f"[DEBUG tenant_actions] Added note to OWNER list")

    print(f"[DEBUG tenant_actions] Issues after merge - tenant: {len(issues.get('tenant', []))}, owner: {len(issues.get('owner', []))}")

    # Executive color palette
    primary_color = HexColor('#1a1a2e')
    accent_color = HexColor('#e74c3c')
    text_primary = HexColor('#2c3e50')
    text_secondary = HexColor('#7f8c8d')
    text_light = HexColor('#95a5a6')
    bg_light = HexColor('#f8f9fa')
    bg_accent = HexColor('#ecf0f1')
    gold_accent = HexColor('#d4af37')

    # Priority colors (supports both old and new format)
    priority_colors = {
        'FIX NOW': HexColor('#dc2626'),
        'FIX SOON': HexColor('#f59e0b'),
        'IMMEDIATE': HexColor('#dc2626'),  # Legacy support
        'SOON': HexColor('#f59e0b'),        # Legacy support
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

    # Page title - simple language
    c.setFont("Helvetica", 12)
    c.setFillColor(text_secondary)
    title_text = "WHAT NEEDS TO BE FIXED"
    title_width = c.stringWidth(title_text, "Helvetica", 12)
    c.drawString((width - title_width) / 2, height - 70, title_text)

    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(text_primary)
    stat_text = "TO-DO LIST"
    stat_width = c.stringWidth(stat_text, "Helvetica-Bold", 26)
    c.drawString((width - stat_width) / 2, height - 98, stat_text)

    # Decorative line
    line_width = 80
    c.setStrokeColor(gold_accent)
    c.setLineWidth(2)
    c.line((width - line_width) / 2, height - 112, (width + line_width) / 2, height - 112)

    tenant_issues = issues.get('tenant', [])
    owner_issues = issues.get('owner', [])

    print(f"[DEBUG tenant_actions] Ready to render - tenant_issues: {len(tenant_issues)}, owner_issues: {len(owner_issues)}")
    if owner_issues:
        for idx, issue in enumerate(owner_issues):
            print(f"[DEBUG tenant_actions] Owner issue {idx}: {issue.get('description', 'NO DESC')[:50]}...")

    current_y = height - 145

    # === TENANT ACTIONS SECTION ===
    if tenant_issues:
        # Section header - simple language
        c.setFillColor(tenant_color)
        c.roundRect(card_margin, current_y - 5, width - 2*card_margin, 28, 4, fill=1, stroke=0)

        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(HexColor('#ffffff'))
        c.drawString(card_margin + 12, current_y + 5, f"ASK YOUR TENANT TO DO THESE ({len(tenant_issues)})")

        c.setFont("Helvetica", 9)
        c.drawRightString(width - card_margin - 12, current_y + 5, "Your tenant can fix these themselves")

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

            # Location header with optional Inspector Note badge
            c.setFont("Helvetica-Bold", 8)
            if issue.get('is_inspector_note'):
                # Draw Inspector Note badge
                c.setFillColor(HexColor('#8b5cf6'))  # Purple for inspector notes
                c.drawString(card_margin + 12, current_y + 5, "INSPECTOR NOTE")
            else:
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
        c.drawString(card_margin + 12, current_y + 5, f"YOU NEED TO FIX THESE ({len(owner_issues)})")

        c.setFont("Helvetica", 9)
        c.drawRightString(width - card_margin - 12, current_y + 5, "Hire someone to do these repairs")

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

            # Location header line with optional Inspector Note badge
            c.setFont("Helvetica-Bold", 8)
            if issue.get('is_inspector_note'):
                # Draw Inspector Note badge
                c.setFillColor(HexColor('#8b5cf6'))  # Purple for inspector notes
                c.drawString(card_margin + 12, current_y + 5, "INSPECTOR NOTE")
            else:
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
        c.drawCentredString(width / 2, height / 2, "Good news! Nothing needs to be fixed right now.")

    # === FOOTER NOTE ===
    c.setFont("Helvetica", 7)
    c.setFillColor(text_light)
    c.drawString(card_margin, 50, "This list helps you talk to your tenant about what needs to be done.")
    c.drawString(card_margin, 40, "Check your lease to see what your tenant should pay for vs. what you should pay for.")

    # Page number and timestamp
    c.setFont("Helvetica", 8)
    c.setFillColor(text_light)
    c.drawString(card_margin, 25, datetime.now().strftime('%Y-%m-%d'))
    c.setFillColor(text_secondary)
    c.drawCentredString(width / 2, 25, f"Page {c.getPageNumber()}")
