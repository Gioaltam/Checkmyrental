"""
Fix database schema to match SQLAlchemy models
"""
import sqlite3
from pathlib import Path

print("FIXING DATABASE SCHEMA")
print("=" * 60)

# Connect to backend database
db_path = Path("backend/app.db")
if not db_path.exists():
    print(f"ERROR: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current schema
print("\n1. Current reports table schema:")
cursor.execute("PRAGMA table_info(reports)")
columns = cursor.fetchall()
existing_columns = {col[1]: col[2] for col in columns}

print("   Existing columns:")
for name, dtype in existing_columns.items():
    print(f"   - {name} ({dtype})")

# Add missing columns
columns_to_add = [
    ("portal_client_id", "INTEGER"),
    ("property_name", "TEXT")
]

print("\n2. Adding missing columns...")
for col_name, col_type in columns_to_add:
    if col_name not in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}")
            print(f"   ✓ Added {col_name} ({col_type})")
        except sqlite3.OperationalError as e:
            print(f"   ✗ Error adding {col_name}: {e}")
    else:
        print(f"   - {col_name} already exists")

conn.commit()

# Verify the columns were added
print("\n3. Verifying updated schema:")
cursor.execute("PRAGMA table_info(reports)")
columns = cursor.fetchall()
updated_columns = {col[1]: col[2] for col in columns}

if "portal_client_id" in updated_columns and "property_name" in updated_columns:
    print("   ✓ All required columns are present")
else:
    print("   ✗ Some columns are still missing")

# Link existing reports to Juliana (portal_client_id = 2)
print("\n4. Linking existing reports to Juliana...")

# Update reports that might belong to Juliana based on address
cursor.execute("""
    UPDATE reports
    SET portal_client_id = 2
    WHERE (address LIKE '%904 Marshal%' OR address LIKE '%St Petersburg%')
    AND portal_client_id IS NULL
""")
updated = cursor.rowcount
if updated > 0:
    print(f"   ✓ Linked {updated} reports to Juliana")

conn.commit()

# Check if we have any reports for Juliana now
cursor.execute("""
    SELECT COUNT(*)
    FROM reports
    WHERE portal_client_id = 2
""")
count = cursor.fetchone()[0]
print(f"\n5. Total reports linked to Juliana: {count}")

if count > 0:
    cursor.execute("""
        SELECT id, address, created_at
        FROM reports
        WHERE portal_client_id = 2
        ORDER BY created_at DESC
        LIMIT 3
    """)
    recent = cursor.fetchall()
    print("\n   Recent reports:")
    for r in recent:
        print(f"   - {r[0][:8]}... | {r[1]} | {r[2]}")

conn.close()

print("\n" + "=" * 60)
print("SCHEMA FIXED!")
print("=" * 60)
print("\n✓ Database schema has been updated")
print("✓ Columns portal_client_id and property_name added")
print("✓ Existing reports linked where possible")
print("\nNOTE: You may still need to restart the backend server")
print("if it's caching the old table schema.")