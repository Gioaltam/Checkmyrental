import sqlite3
from pathlib import Path

# Connect to the database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("=== DATABASE TABLES ===")
for table in tables:
    print(f"- {table[0]}")

# Check if portal_accounts exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='portal_accounts'")
portal_accounts_exists = cursor.fetchone()

if portal_accounts_exists:
    print("\n✅ portal_accounts table EXISTS")
    print("\nColumns in portal_accounts:")
    cursor.execute("PRAGMA table_info(portal_accounts)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
else:
    print("\n❌ portal_accounts table DOES NOT EXIST")

# Check portal_client table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='portal_client'")
portal_client_exists = cursor.fetchone()

if portal_client_exists:
    print("\n✅ portal_client table EXISTS")
    print("\nColumns in portal_client:")
    cursor.execute("PRAGMA table_info(portal_client)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")

conn.close()