"""Photo-specific report viewer"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pathlib import Path
import json
import sqlite3
from urllib.parse import unquote

router = APIRouter()

@router.get("/{report_id}/{photo_filename}/json")
def get_photo_analysis_json(report_id: str, photo_filename: str):
    """Get individual photo analysis as JSON from existing report data"""
    try:
        # Import path utilities
        from ..lib.paths import outputs_root

        outputs_dir = outputs_root()

        # The report_id is now the directory name like "904 marshal st_20251009_203310"
        # Find the specific report directory
        report_dir = outputs_dir / report_id

        if not report_dir.exists():
            # Try URL decoding the report_id in case it was encoded
            from urllib.parse import unquote
            report_id_decoded = unquote(report_id)
            report_dir = outputs_dir / report_id_decoded

            if not report_dir.exists():
                return {
                    "error": f"Report directory not found: {report_id}",
                    "severity": "error",
                    "observations": ["Report directory not found"],
                    "potential_issues": [],
                    "recommendations": []
                }

        # Load the report.json for this specific report
        json_path = report_dir / "web" / "report.json"

        if not json_path.exists():
            return {
                "error": "Report JSON not found",
                "severity": "error",
                "observations": ["Report data file not found"],
                "potential_issues": [],
                "recommendations": []
            }

        # Read the report data
        with open(json_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)

        # Look for the specific photo in this report's items
        for item in report_data.get("items", []):
            image_url = item.get("image_url", "")

            # The image_url in report.json is like "photos/photo_001.jpg"
            # and photo_filename is like "photo_001.jpg"
            if image_url.endswith(photo_filename) or photo_filename in image_url:
                # Found the matching analysis!
                return {
                    "location": item.get("location", "Unknown Location"),
                    "severity": item.get("severity", "informational"),
                    "observations": item.get("observations", []),
                    "potential_issues": item.get("potential_issues", []),
                    "recommendations": item.get("recommendations", [])
                }

        # If no exact match found, return an error
        return {
            "error": f"Analysis not found for photo {photo_filename} in report {report_id}",
            "severity": "error",
            "observations": ["Photo analysis not found in this report"],
            "potential_issues": [],
            "recommendations": []
        }
        
    except Exception as e:
        print(f"Error getting photo analysis JSON: {e}")
        return {"error": str(e)}

@router.get("/{report_id}/{photo_filename}")
def get_photo_analysis(report_id: str, photo_filename: str):
    """Get individual photo analysis from report"""
    try:
        # Get report from database - check multiple possible locations
        possible_paths = [
            Path("workspace/inspection_portal.db"),
            Path("../workspace/inspection_portal.db"),
            Path("backend/inspection_portal.db"),
            Path("inspection_portal.db"),
            Path("app.db")
        ]

        db_path = None
        for path in possible_paths:
            if path.exists():
                db_path = path
                break

        if not db_path:
            # Default to app.db in backend folder
            db_path = Path("app.db")

        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        
        cur.execute("SELECT web_dir FROM reports WHERE id = ?", (report_id,))
        row = cur.fetchone()
        conn.close()
        
        if not row:
            return HTMLResponse(content="<h1>404: Report not found</h1>", status_code=404)
        
        web_dir = row[0]
        
        # Load JSON report
        json_path = Path("..") / web_dir.replace("\\", "/") / "report.json"
        
        if not json_path.exists():
            return HTMLResponse(content="<h1>404: Report JSON not found</h1>", status_code=404)
        
        with open(json_path, 'r') as f:
            report_data = json.load(f)
        
        # Find the specific item for this photo
        item = None
        print(f"[HTML] Looking for photo: {photo_filename}")
        
        for report_item in report_data.get("items", []):
            image_url = report_item.get("image_url", "")
            print(f"[HTML] Checking against: {image_url}")
            
            # Try different matching strategies
            if (image_url == photo_filename or 
                image_url.endswith(photo_filename) or 
                photo_filename in image_url or
                photo_filename.split('.')[0] in image_url):
                print(f"[HTML] Found match for {photo_filename}")
                item = report_item
                break
        
        if not item and report_data.get("items"):
            # Use first item as fallback
            print(f"[HTML] No match found, using first item as fallback")
            item = report_data["items"][0]
        
        if not item:
            return HTMLResponse(content=f"<h1>404: Analysis not found for {photo_filename}</h1>", status_code=404)
        
        # Generate HTML for just this one item
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Inspection Analysis - {item.get('location', 'Unknown Location')}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #f5f5f5;
                }}
                .photo-container {{
                    background: white;
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .photo-container img {{
                    width: 100%;
                    height: auto;
                    border-radius: 4px;
                    display: block;
                }}
                .header {{
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .item {{
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .severity {{
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-weight: 500;
                    font-size: 14px;
                    text-transform: uppercase;
                    margin-bottom: 15px;
                }}
                .severity-critical {{ background: #fee; color: #c00; }}
                .severity-important {{ background: #ffeaa7; color: #d63031; }}
                .severity-minor {{ background: #fff3cd; color: #856404; }}
                .severity-informational {{ background: #d1ecf1; color: #0c5460; }}
                h2 {{
                    color: #2c3e50;
                    border-bottom: 2px solid #ecf0f1;
                    padding-bottom: 10px;
                    margin: 20px 0 15px 0;
                }}
                h3 {{
                    color: #34495e;
                    margin: 15px 0 10px 0;
                }}
                ul {{
                    margin: 10px 0;
                    padding-left: 25px;
                }}
                li {{
                    margin: 5px 0;
                }}
                .photo-info {{
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 15px;
                    font-size: 14px;
                    color: #6c757d;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Inspection Analysis</h1>
                <div class="photo-info">
                    <strong>Property:</strong> {report_data.get('property_address', 'Unknown')}<br>
                    <strong>Date:</strong> {report_data.get('inspection_date', 'Unknown')}
                </div>
            </div>
            
            <div class="photo-container">
                <img src="/api/photos/image/{report_id}/{photo_filename}" alt="Inspection photo: {photo_filename}" />
            </div>
            
            <div class="item">
                <span class="severity severity-{item.get('severity', 'informational')}">{item.get('severity', 'informational')}</span>
                <h2>{item.get('location', 'Unknown Location')}</h2>
                
                <h3>Observations</h3>
                <ul>
                    {"".join(f'<li>{obs}</li>' for obs in item.get('observations', []))}
                </ul>
                
                <h3>Potential Issues</h3>
                <ul>
                    {"".join(f'<li>{issue}</li>' for issue in item.get('potential_issues', []))}
                </ul>
                
                <h3>Recommendations</h3>
                <ul>
                    {"".join(f'<li>{rec}</li>' for rec in item.get('recommendations', []))}
                </ul>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        print(f"Error generating photo report HTML: {e}")
        import traceback
        traceback.print_exc()
        return HTMLResponse(content=f"<h1>Error generating report</h1><p>{str(e)}</p>", status_code=500)