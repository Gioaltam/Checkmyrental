"""
Check which database files exist and which one has the correct schema
"""
import sqlite3
from pathlib import Path

print("CHECKING DATABASE FILES")
print("=" * 60)

# Check both possible database locations
db_locations = [
    Path("app.db"),                    # Root directory
    Path("backend/app.db")              # Backend directory
]

for db_path in db_locations:
    print(f"\n{db_path}:")
    if db_path.exists():
        print(f"   EXISTS - Size: {db_path.stat().st_size} bytes")

        # Check schema
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check for portal_client_id column
        cursor.execute("PRAGMA table_info(reports)")
        columns = cursor.fetchall()
        col_names = [col[1] for col in columns]

        if "portal_client_id" in col_names:
            print("   ✓ HAS portal_client_id column")
        else:
            print("   ✗ MISSING portal_client_id column")

        # Check number of reports
        cursor.execute("SELECT COUNT(*) FROM reports")
        count = cursor.fetchone()[0]
        print(f"   Reports: {count}")

        conn.close()
    else:
        print("   Does not exist")

print("\n" + "=" * 60)
print("SOLUTION:")
print("=" * 60)
print("\nThe backend is using the WRONG database file!")
print("It's using app.db in the root instead of backend/app.db")
print("\nWe need to either:")
print("1. Copy the correct schema to the root app.db")
print("2. Or change the backend config to use backend/app.db")