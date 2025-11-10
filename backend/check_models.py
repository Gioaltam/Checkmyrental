"""
Check if the models are correctly defined
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import Report
from sqlalchemy import inspect

print("Checking Report model definition...")
print("\nReport model columns:")

# Check what columns the model thinks it has
for column in Report.__table__.columns:
    print(f"  - {column.name}: {column.type}")

# Check for the specific columns we need
if hasattr(Report, 'portal_client_id'):
    print("\n✓ Report model HAS portal_client_id attribute")
else:
    print("\n✗ Report model MISSING portal_client_id attribute")

if hasattr(Report, 'property_name'):
    print("✓ Report model HAS property_name attribute")
else:
    print("✗ Report model MISSING property_name attribute")

print("\n" + "="*60)
print("If columns are missing above, the models.py file needs to be saved/reloaded")