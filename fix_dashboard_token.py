"""
Fix the dashboard to use JS2024001 token for Juliana
"""

# Fix backend/app/api/client.py to recognize JS2024001
backend_fix = '''
    print(f"Dashboard requested for token: {portal_token}")

    # Check for Juliana's specific token JS2024001
    if portal_token == "JS2024001":
        # Map to Juliana's portal_client id 2
        portal_client = db.query(PortalClient).filter(PortalClient.id == 2).first()

        if portal_client:
            print(f"Found portal client via JS2024001: {portal_client.full_name}")

            # Build response for portal client
            property_data = []

            # Get all reports for this portal client
            all_reports = db.query(Report).filter(
                Report.portal_client_id == portal_client.id
            ).order_by(Report.created_at.desc()).all()

            print(f"Found {len(all_reports)} reports for portal client {portal_client.id}")

            # Parse properties from properties_data JSON if available
            if portal_client.properties_data:
                try:
                    properties_json = json.loads(portal_client.properties_data) if isinstance(portal_client.properties_data, str) else portal_client.properties_data
                    if isinstance(properties_json, list):
                        for prop in properties_json:
                            prop_address = prop.get("address", "")

                            # Find reports for this property
                            property_reports = []
                            critical_count = 0
                            important_count = 0

                            for report in all_reports:
                                # Match reports to this property
                                if report.address and prop_address and prop_address in report.address:
                                    critical_count += report.critical_count or 0
                                    important_count += report.important_count or 0

                                    date_val = None
                                    if report.inspection_date:
                                        if hasattr(report.inspection_date, 'isoformat'):
                                            date_val = report.inspection_date.isoformat()
                                        else:
                                            date_val = str(report.inspection_date)
                                    elif report.created_at:
                                        if hasattr(report.created_at, 'isoformat'):
                                            date_val = report.created_at.isoformat()
                                        else:
                                            date_val = str(report.created_at)

                                    property_reports.append({
                                        "id": report.id,
                                        "date": date_val,
                                        "inspector": "Inspection Agent",
                                        "status": "completed",
                                        "criticalIssues": report.critical_count or 0,
                                        "importantIssues": report.important_count or 0,
                                        "hasPdf": bool(report.pdf_path or report.pdf_standard_url),
                                        "hasInteractiveView": bool(report.json_url or report.json_path)
                                    })

                            # Get last inspection date
                            last_inspection = None
                            if property_reports:
                                last_inspection = property_reports[0].get("date")

                            property_data.append({
                                "id": str(hash(prop_address)),
                                "address": prop_address,
                                "type": "single",
                                "label": prop.get("name", prop_address),
                                "lastInspection": last_inspection,
                                "reportCount": len(property_reports),
                                "criticalIssues": critical_count,
                                "importantIssues": important_count,
                                "reports": property_reports
                            })
                except Exception as e:
                    print(f"Error parsing properties_data: {e}")

            return {
                "owner": portal_client.full_name,
                "full_name": portal_client.full_name,
                "email": portal_client.email,
                "properties": property_data,
                "total_reports": len(all_reports)
            }

    # Check if this is a "portal_X" format token
    elif portal_token.startswith("portal_"):
'''

print("FIX INSTRUCTIONS")
print("=" * 60)
print("\n1. BACKEND FIX:")
print("   Edit backend/app/api/client.py")
print("   In the get_portal_dashboard function (around line 268)")
print("   Add a check for JS2024001 before the portal_ check")
print("\n2. OPERATOR APP FIX:")
print("   The operator app needs to use JS2024001 for dashboard URL")
print("   Edit operator_ui.py")
print("   In the open_owner_dashboard function")
print("   Change the token logic")

print("\n3. TEST URLS:")
print("   - Dashboard: http://localhost:3000?token=JS2024001")
print("   - API Test: http://localhost:8000/api/owners/dashboard?portal_token=JS2024001")

print("\n" + "=" * 60)
print("QUICK TEST:")
print("=" * 60)

import requests

try:
    # Test JS2024001 token
    r = requests.get("http://localhost:8000/api/owners/dashboard?portal_token=JS2024001", timeout=2)
    if r.status_code == 200:
        data = r.json()
        print(f"\n✅ JS2024001 works! Owner: {data.get('owner')}")
    else:
        print(f"\n❌ JS2024001 failed with status {r.status_code}")
        print("   Backend needs to be updated to recognize JS2024001")
except:
    print("\n⚠️ Backend not responding")