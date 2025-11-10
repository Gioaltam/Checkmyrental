"""
Database Migration: Make portal_clients.full_name NOT NULL

This migration:
1. Updates any empty/NULL full_name records with email-derived placeholder
2. Alters the table to make full_name NOT NULL
3. Creates backup before making changes
"""

import sqlite3
import shutil
import os
from datetime import datetime

DB_PATH = 'backend/app.db'
BACKUP_PATH = f'backend/app.db.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'

print("=" * 70)
print("DATABASE MIGRATION: Make portal_clients.full_name NOT NULL")
print("=" * 70)

# Step 1: Create backup
print(f"\n[1/4] Creating backup...")
if os.path.exists(DB_PATH):
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print(f"   [OK] Backup created: {BACKUP_PATH}")
else:
    print(f"   [X] Database not found: {DB_PATH}")
    exit(1)

# Step 2: Connect to database
print(f"\n[2/4] Connecting to database...")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
print(f"   [OK] Connected to {DB_PATH}")

# Step 3: Check for NULL or empty full_name records
print(f"\n[3/4] Checking for incomplete full_name records...")
cursor.execute("""
    SELECT id, email, full_name
    FROM portal_clients
    WHERE full_name IS NULL OR full_name = '' OR TRIM(full_name) = ''
""")
incomplete_records = cursor.fetchall()

if incomplete_records:
    print(f"   Found {len(incomplete_records)} record(s) with missing full_name:")
    for record in incomplete_records:
        print(f"     - ID: {record[0]}, Email: {record[1]}, Full Name: {repr(record[2])}")

    # Update records with email-derived placeholder
    print(f"\n   Updating records with placeholders...")
    for record_id, email, _ in incomplete_records:
        # Create placeholder from email (e.g., "john.doe@gmail.com" -> "John Doe")
        email_prefix = email.split('@')[0]
        placeholder = email_prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()

        cursor.execute("""
            UPDATE portal_clients
            SET full_name = ?
            WHERE id = ?
        """, (placeholder, record_id))
        print(f"     [OK] ID {record_id}: Set full_name to '{placeholder}'")

    conn.commit()
    print(f"   [OK] Updated {len(incomplete_records)} record(s)")
else:
    print(f"   [OK] All records have full_name values")

# Step 4: Alter table to make full_name NOT NULL
print(f"\n[4/4] Altering table schema...")

# SQLite doesn't support ALTER COLUMN, so we need to recreate the table
print(f"   Creating new table with NOT NULL constraint...")

# Get current table schema
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='portal_clients'")
current_schema = cursor.fetchone()[0]
print(f"   Current schema captured")

# Create new table with full_name NOT NULL (matching actual schema)
cursor.execute("""
    CREATE TABLE portal_clients_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(320) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        is_active BOOLEAN,
        created_at DATETIME,
        properties_data TEXT
    )
""")
print(f"   [OK] New table created with NOT NULL constraint")

# Copy data from old table to new table
cursor.execute("""
    INSERT INTO portal_clients_new
    SELECT * FROM portal_clients
""")
print(f"   [OK] Data copied to new table")

# Drop old table and rename new table
cursor.execute("DROP TABLE portal_clients")
cursor.execute("ALTER TABLE portal_clients_new RENAME TO portal_clients")
print(f"   [OK] Table replaced with new schema")

# Recreate indexes
cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_clients_email ON portal_clients(email)")
print(f"   [OK] Indexes recreated")

# Commit changes
conn.commit()
print(f"   [OK] Changes committed")

# Step 5: Verify migration
print(f"\n[5/5] Verifying migration...")
cursor.execute("PRAGMA table_info(portal_clients)")
columns = cursor.fetchall()

full_name_column = next((col for col in columns if col[1] == 'full_name'), None)
if full_name_column:
    is_not_null = full_name_column[3] == 1  # notnull flag
    print(f"   Column: full_name")
    print(f"   Type: {full_name_column[2]}")
    print(f"   NOT NULL: {is_not_null}")

    if is_not_null:
        print(f"   [OK] Migration successful!")
    else:
        print(f"   [X] Migration failed - full_name is still nullable")
else:
    print(f"   [X] full_name column not found!")

# Check all records have full_name
cursor.execute("SELECT COUNT(*) FROM portal_clients WHERE full_name IS NULL OR full_name = ''")
empty_count = cursor.fetchone()[0]

if empty_count == 0:
    print(f"   [OK] All records have full_name values")
else:
    print(f"   [X] Warning: {empty_count} record(s) still have empty full_name")

# Close connection
conn.close()

print("\n" + "=" * 70)
print("MIGRATION COMPLETE")
print("=" * 70)
print(f"\nBackup location: {BACKUP_PATH}")
print(f"\nIf anything goes wrong, restore with:")
print(f"  cp {BACKUP_PATH} {DB_PATH}")
print("\n[OK] You can now update the portal_models.py file to reflect the schema change.")
