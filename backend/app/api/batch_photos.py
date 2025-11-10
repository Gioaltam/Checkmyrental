"""Batch photo analysis endpoint - returns all photo severities for a property"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
from urllib.parse import unquote
import json
from typing import List, Dict, Any

router = APIRouter()

@router.get("/property/{property_address}/severities")
def get_all_photo_severities(property_address: str) -> Dict[str, Any]:
    """
    Get all photo severities for a property at once
    Returns a mapping of photo filenames to their severity levels
    """
    from ..lib.paths import find_latest_report_dir_by_address

    address = unquote(property_address)
    report_dir = find_latest_report_dir_by_address(address)

    if not report_dir:
        raise HTTPException(
            status_code=404,
            detail=f"No report found for property: {address}"
        )

    json_path = report_dir / "web" / "report.json"

    if not json_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Report JSON not found"
        )

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)

        # Extract severity for each photo
        severities = {}
        for item in report_data.get("items", []):
            image_url = item.get("image_url", "")
            severity = item.get("severity", "unknown")
            location = item.get("location", "Unknown Location")

            if image_url:
                # Extract just the filename
                filename = image_url.split("/")[-1]
                severities[filename] = {
                    "severity": severity,
                    "location": location,
                    "has_critical": severity == "critical",
                    "has_important": severity == "important",
                    "observations_count": len(item.get("observations", [])),
                    "issues_count": len(item.get("potential_issues", []))
                }

        # Calculate summary stats
        total_photos = len(severities)
        critical_count = sum(1 for s in severities.values() if s["severity"] == "critical")
        important_count = sum(1 for s in severities.values() if s["severity"] == "important")
        minor_count = sum(1 for s in severities.values() if s["severity"] == "minor")

        return {
            "property_address": address,
            "report_id": report_data.get("report_id"),
            "total_photos": total_photos,
            "critical_count": critical_count,
            "important_count": important_count,
            "minor_count": minor_count,
            "severities": severities
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Invalid report JSON format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading report: {str(e)}"
        )
