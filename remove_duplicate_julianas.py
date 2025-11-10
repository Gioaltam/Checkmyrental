import sqlite3
from pathlib import Path

# Connect to the database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== Checking for duplicate Juliana accounts ===")

# Find all Juliana accounts
cursor.execute("""
    SELECT id, email, owner_full_name, created_at
    FROM portal_accounts
    WHERE email LIKE '%juliana%' OR owner_full_name LIKE '%juliana%' OR owner_full_name LIKE '%Juliana%'
    ORDER BY created_at DESC
""")
juliana_accounts = cursor.fetchall()

if len(juliana_accounts) > 1:
    print(f"Found {len(juliana_accounts)} Juliana accounts:")
    for i, account in enumerate(juliana_accounts):
        print(f"{i+1}. ID: {account[0]}, Email: {account[1]}, Name: {account[2]}, Created: {account[3]}")

    # Keep the most recent one (first in list since ordered by created_at DESC)
    keep_id = juliana_accounts[0][0]
    delete_ids = [account[0] for account in juliana_accounts[1:]]

    print(f"\nKeeping account ID: {keep_id}")
    print(f"Deleting account IDs: {delete_ids}")

    response = input("\nDo you want to delete the duplicate accounts? (yes/no): ")
    if response.lower() == 'yes':
        for del_id in delete_ids:
            # First delete related reports
            cursor.execute("DELETE FROM reports WHERE portal_account_id = ?", (del_id,))
            # Then delete the account
            cursor.execute("DELETE FROM portal_accounts WHERE id = ?", (del_id,))

        conn.commit()
        print("Duplicate accounts removed successfully!")
    else:
        print("No changes made.")
elif len(juliana_accounts) == 1:
    print("Only one Juliana account found - no duplicates to remove.")
    print(f"Account: ID: {juliana_accounts[0][0]}, Email: {juliana_accounts[0][1]}")
else:
    print("No Juliana accounts found.")

conn.close()

# Clear any cache
import os
import shutil

cache_dir = Path(".cache")
if cache_dir.exists():
    response = input("\nDo you want to clear the cache directory? This might help with stale data. (yes/no): ")
    if response.lower() == 'yes':
        shutil.rmtree(cache_dir)
        os.makedirs(cache_dir)
        print("Cache cleared successfully!")

print("\nDone! Please restart the operator app to see the changes.")