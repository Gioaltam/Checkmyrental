"""
Fix the reports table to properly link reports to portal clients
"""
import sqlite3
from pathlib import Path

print("FIXING REPORTS TABLE")
print("=" * 60)

# Connect to backend database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Add portal_client_id column if it doesn't exist
print("\n1. Adding portal_client_id column to reports table...")
try:
    cursor.execute("ALTER TABLE reports ADD COLUMN portal_client_id INTEGER")
    conn.commit()
    print("   SUCCESS: Added portal_client_id column")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("   Column already exists")
    else:
        print(f"   ERROR: {e}")

# 2. Add property_name column if it doesn't exist
print("\n2. Adding property_name column to reports table...")
try:
    cursor.execute("ALTER TABLE reports ADD COLUMN property_name TEXT")
    conn.commit()
    print("   SUCCESS: Added property_name column")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("   Column already exists")
    else:
        print(f"   ERROR: {e}")

# 3. Check current reports and their linkage
print("\n3. Checking existing reports...")
cursor.execute("SELECT COUNT(*) FROM reports")
total = cursor.fetchone()[0]
print(f"   Total reports in database: {total}")

# 4. Try to link existing reports to Juliana based on property addresses
print("\n4. Linking existing reports to Juliana...")

# Get Juliana's properties from portal_clients
cursor.execute("""
    SELECT properties_data
    FROM portal_clients
    WHERE id = 2
""")
result = cursor.fetchone()

if result and result[0]:
    import json
    try:
        properties = json.loads(result[0])
        print(f"   Juliana's properties: {properties}")

        # Update reports that match these addresses
        for prop in properties:
            address = prop.get('address', '')
            if address:
                cursor.execute("""
                    UPDATE reports
                    SET portal_client_id = 2
                    WHERE address LIKE ? AND portal_client_id IS NULL
                """, (f"%{address}%",))
                updated = cursor.rowcount
                if updated:
                    print(f"   Linked {updated} reports for address: {address}")

        conn.commit()
    except json.JSONDecodeError:
        print("   ERROR: Could not parse properties data")

# 5. Check if linkage worked
print("\n5. Reports now linked to Juliana:")
cursor.execute("""
    SELECT COUNT(*)
    FROM reports
    WHERE portal_client_id = 2
""")
linked_count = cursor.fetchone()[0]
print(f"   Reports linked to Juliana: {linked_count}")

# 6. Show sample of linked reports
if linked_count > 0:
    cursor.execute("""
        SELECT id, address, created_at
        FROM reports
        WHERE portal_client_id = 2
        LIMIT 3
    """)
    samples = cursor.fetchall()
    print("\n   Sample linked reports:")
    for report in samples:
        print(f"   - {report[1]} (Created: {report[2]})")

conn.close()

print("\n" + "=" * 60)
print("FIX APPLIED")
print("=" * 60)
print("\nThe reports table has been fixed:")
print("1. Added portal_client_id column")
print("2. Added property_name column")
print("3. Linked existing reports to Juliana where possible")
print("\nNOTE: New reports uploaded through the operator app")
print("should now be properly linked when using 'portal_2' as owner_id")
print("\nRestart the Next.js dashboard to see the reports!")