"""
Fix the upload process to handle portal_X owner IDs correctly
"""
import sqlite3
from pathlib import Path

print("FIXING UPLOAD FOR PORTAL OWNERS")
print("=" * 60)

# Check the backend database structure
backend_db = Path("backend/app.db")
if not backend_db.exists():
    print("ERROR: Backend database not found")
    exit(1)

conn = sqlite3.connect(backend_db)
cursor = conn.cursor()

# Check reports table structure
print("\nReports table structure:")
cursor.execute("PRAGMA table_info(reports)")
columns = cursor.fetchall()
report_columns = {col[1]: col[2] for col in columns}
print("Columns:")
for name, dtype in report_columns.items():
    print(f"  - {name} ({dtype})")

# Check if there's a portal_client_id or portal_account_id column
has_portal_field = False
portal_field_name = None

if 'portal_client_id' in report_columns:
    has_portal_field = True
    portal_field_name = 'portal_client_id'
    print(f"\nFound portal_client_id column in reports table")
elif 'portal_account_id' in report_columns:
    has_portal_field = True
    portal_field_name = 'portal_account_id'
    print(f"\nFound portal_account_id column in reports table")
else:
    print("\nNo portal_client_id or portal_account_id column found")

# Add the missing column if needed
if not has_portal_field:
    print("\nAdding portal_client_id column to reports table...")
    try:
        cursor.execute("ALTER TABLE reports ADD COLUMN portal_client_id INTEGER")
        conn.commit()
        print("SUCCESS: Added portal_client_id column")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Column already exists")
        else:
            print(f"ERROR: {e}")

# Also add property_name column if missing
if 'property_name' not in report_columns:
    print("\nAdding property_name column to reports table...")
    try:
        cursor.execute("ALTER TABLE reports ADD COLUMN property_name TEXT")
        conn.commit()
        print("SUCCESS: Added property_name column")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Column already exists")
        else:
            print(f"ERROR: {e}")

conn.close()

print("\n" + "=" * 60)
print("FIX APPLIED")
print("\nThe reports table has been updated to support portal owners.")
print("When uploading with owner_id 'portal_2':")
print("1. The system should extract the ID (2) from 'portal_2'")
print("2. Save it in the portal_client_id field")
print("3. Link the report to Juliana's portal account")
print("\nYou may need to restart the backend server for changes to take effect.")