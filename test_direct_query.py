"""
Test the database query directly
"""
import sys
import os
sys.path.insert(0, 'backend')

from app.database import SessionLocal
from app.models import Report
from app.portal_models import PortalClient

print("Testing direct database query...")

db = SessionLocal()

try:
    # Test 1: Can we query PortalClient?
    print("\n1. Testing PortalClient query:")
    portal_client = db.query(PortalClient).filter(PortalClient.id == 2).first()
    if portal_client:
        print(f"   Found: {portal_client.full_name}")
    else:
        print("   Not found")

    # Test 2: Can we query Report with portal_client_id?
    print("\n2. Testing Report query with portal_client_id:")
    try:
        reports = db.query(Report).filter(Report.portal_client_id == 2).all()
        print(f"   Found {len(reports)} reports")

        # Test if we can access the columns
        for report in reports[:1]:
            print(f"   Report ID: {report.id}")
            print(f"   Portal Client ID: {report.portal_client_id}")
            print(f"   Property Name: {report.property_name}")
    except Exception as e:
        print(f"   ERROR: {e}")
        print("   This is the exact error happening in the API")

finally:
    db.close()

print("\nIf error above mentions 'no such column', the database needs migration")
print("If no error, the issue is elsewhere in the API code")