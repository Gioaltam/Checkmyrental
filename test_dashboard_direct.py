"""
Test dashboard endpoint directly to find the error
"""
import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'backend')

from backend.app.database import get_db
from sqlalchemy.orm import Session
from backend.app.portal_models import PortalClient
from backend.app.models import Report
import jwt
from backend.app.portal_security import PORTAL_JWT_SECRET, ALGO

# Test with JS2024001 token
print("Testing dashboard logic directly...")
print("=" * 60)

# Get database session
from backend.app.database import SessionLocal
db = SessionLocal()

try:
    # First, check what portal clients exist
    all_clients = db.query(PortalClient).all()
    print(f"Portal clients in database: {len(all_clients)}")
    for client in all_clients:
        print(f"  ID: {client.id}, Name: {client.full_name}, Email: {client.email}")

    portal_token = "JS2024001"
    print(f"\nTesting with token: {portal_token}")

    # Check for JS2024001 (Juliana's token)
    portal_client = None
    if portal_token == "JS2024001":
        # This is Juliana's token, map to portal_client id 2
        portal_client = db.query(PortalClient).filter(PortalClient.id == 2).first()
        if portal_client:
            print(f"✅ Found portal client: {portal_client.full_name}")
        else:
            print("❌ Portal client with id=2 not found")

    if portal_client:
        # Get reports
        all_reports = db.query(Report).filter(
            Report.portal_client_id == portal_client.id
        ).all()

        print(f"Found {len(all_reports)} reports")

        # Check properties_data
        if portal_client.properties_data:
            print(f"Properties data exists: {portal_client.properties_data[:100]}...")
        else:
            print("No properties data")

        # Build response
        import json
        property_data = []

        if portal_client.properties_data:
            try:
                properties_json = json.loads(portal_client.properties_data) if isinstance(portal_client.properties_data, str) else portal_client.properties_data
                print(f"Parsed {len(properties_json)} properties")

                for prop in properties_json:
                    print(f"  Property: {prop.get('address')}")

            except Exception as e:
                print(f"Error parsing properties: {e}")

        print("\n✅ Dashboard data structure would be:")
        print({
            "owner": portal_client.full_name,
            "email": portal_client.email,
            "properties": len(property_data),
            "total_reports": len(all_reports)
        })

except Exception as e:
    import traceback
    print(f"\n❌ ERROR: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
finally:
    db.close()