import sqlite3
from pathlib import Path

# Connect to the database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== ALL PORTAL ACCOUNTS IN DATABASE ===\n")

# Get all portal accounts
cursor.execute("""
    SELECT id, email, owner_full_name, property_count, created_at
    FROM portal_accounts
    ORDER BY created_at DESC
""")
accounts = cursor.fetchall()

print(f"Total accounts found: {len(accounts)}\n")

for i, account in enumerate(accounts, 1):
    print(f"{i}. ID: {account[0]}")
    print(f"   Email: {account[1]}")
    print(f"   Name: {account[2]}")
    print(f"   Properties: {account[3]}")
    print(f"   Created: {account[4]}")

    # Check for reports
    cursor.execute("SELECT COUNT(*) FROM reports WHERE portal_account_id = ?", (account[0],))
    report_count = cursor.fetchone()[0]
    print(f"   Reports: {report_count}")
    print()

conn.close()

print("\nIf you see test accounts or duplicates that should be removed,")
print("run: python cleanup_test_accounts.py")