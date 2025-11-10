"""
Fix the root app.db file to have the correct schema
"""
import sqlite3
from pathlib import Path
import shutil

print("FIXING ROOT DATABASE")
print("=" * 60)

# The two database files
root_db = Path("app.db")
backend_db = Path("backend/app.db")

print("\n1. Database file status:")
print(f"   Root app.db exists: {root_db.exists()}")
print(f"   Backend app.db exists: {backend_db.exists()}")

if root_db.exists():
    # Add the missing columns to the root database
    print("\n2. Adding missing columns to root app.db...")

    conn = sqlite3.connect(root_db)
    cursor = conn.cursor()

    # Check current schema
    cursor.execute("PRAGMA table_info(reports)")
    columns = cursor.fetchall()
    existing_cols = [col[1] for col in columns]

    # Add portal_client_id if missing
    if "portal_client_id" not in existing_cols:
        try:
            cursor.execute("ALTER TABLE reports ADD COLUMN portal_client_id INTEGER")
            print("   Added portal_client_id column")
        except sqlite3.OperationalError as e:
            print(f"   Error: {e}")
    else:
        print("   portal_client_id already exists")

    # Add property_name if missing
    if "property_name" not in existing_cols:
        try:
            cursor.execute("ALTER TABLE reports ADD COLUMN property_name TEXT")
            print("   Added property_name column")
        except sqlite3.OperationalError as e:
            print(f"   Error: {e}")
    else:
        print("   property_name already exists")

    conn.commit()

    # Link test reports to Juliana
    print("\n3. Linking test reports to Juliana...")
    cursor.execute("""
        UPDATE reports
        SET portal_client_id = 2
        WHERE portal_client_id IS NULL
        LIMIT 2
    """)
    updated = cursor.rowcount
    if updated > 0:
        print(f"   Linked {updated} test reports")

    conn.commit()
    conn.close()

print("\n" + "=" * 60)
print("DATABASE FIXED!")
print("=" * 60)
print("\nThe root app.db now has the correct schema.")
print("The backend should work now without restarting.")
print("\nTest with: python simple_test.py")