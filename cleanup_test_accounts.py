import sqlite3
from pathlib import Path
import shutil
import os

# Connect to the database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== ACCOUNT CLEANUP TOOL ===\n")

# Get all portal accounts
cursor.execute("""
    SELECT id, email, owner_full_name, property_count, created_at
    FROM portal_accounts
    ORDER BY created_at DESC
""")
accounts = cursor.fetchall()

print(f"Found {len(accounts)} total accounts:\n")

for i, account in enumerate(accounts, 1):
    # Check for reports
    cursor.execute("SELECT COUNT(*) FROM reports WHERE portal_account_id = ?", (account[0],))
    report_count = cursor.fetchone()[0]

    print(f"{i}. [{account[0]}] {account[2]} ({account[1]})")
    print(f"   Properties: {account[3]}, Reports: {report_count}")

print("\n" + "="*50)
print("Which accounts do you want to KEEP?")
print("Enter the numbers separated by commas (e.g., 1,2)")
print("Or type 'keep all' to keep everything")
print("Or type 'keep juliana' to keep only Juliana's account")
print("="*50)

choice = input("\nYour choice: ").strip().lower()

if choice == 'keep all':
    print("Keeping all accounts. No changes made.")
elif choice == 'keep juliana':
    # Find and keep only Juliana's account
    cursor.execute("""
        SELECT id FROM portal_accounts
        WHERE email LIKE '%juliana%' OR owner_full_name LIKE '%Juliana%'
        ORDER BY created_at DESC
        LIMIT 1
    """)
    juliana = cursor.fetchone()

    if juliana:
        keep_id = juliana[0]
        cursor.execute("""
            SELECT id FROM portal_accounts WHERE id != ?
        """, (keep_id,))
        delete_ids = [row[0] for row in cursor.fetchall()]

        print(f"\nKeeping Juliana's account (ID: {keep_id})")
        print(f"Deleting {len(delete_ids)} other accounts...")

        for del_id in delete_ids:
            cursor.execute("DELETE FROM reports WHERE portal_account_id = ?", (del_id,))
            cursor.execute("DELETE FROM portal_accounts WHERE id = ?", (del_id,))

        conn.commit()
        print("Other accounts deleted successfully!")
    else:
        print("No Juliana account found!")
else:
    # Parse the numbers
    try:
        keep_indices = [int(x.strip()) for x in choice.split(',')]
        keep_ids = [accounts[i-1][0] for i in keep_indices if 0 < i <= len(accounts)]

        if keep_ids:
            # Delete all accounts NOT in the keep list
            cursor.execute("""
                SELECT id FROM portal_accounts WHERE id NOT IN ({})
            """.format(','.join('?' * len(keep_ids))), keep_ids)
            delete_ids = [row[0] for row in cursor.fetchall()]

            if delete_ids:
                print(f"\nDeleting {len(delete_ids)} accounts...")
                for del_id in delete_ids:
                    cursor.execute("DELETE FROM reports WHERE portal_account_id = ?", (del_id,))
                    cursor.execute("DELETE FROM portal_accounts WHERE id = ?", (del_id,))

                conn.commit()
                print("Accounts deleted successfully!")
            else:
                print("No accounts to delete.")
        else:
            print("Invalid selection. No changes made.")
    except:
        print("Invalid input format. No changes made.")

conn.close()

# Clear cache
print("\n=== CLEARING CACHE ===")
cache_dir = Path(".cache")
if cache_dir.exists():
    shutil.rmtree(cache_dir)
    os.makedirs(cache_dir)
    print("Cache directory cleared!")

# Clear any Python cache
pycache_dirs = list(Path(".").rglob("__pycache__"))
for pdir in pycache_dirs:
    shutil.rmtree(pdir, ignore_errors=True)
print("Python cache cleared!")

print("\n=== DONE ===")
print("Please restart the Operator App to see the changes.")
print("Command: python operator_ui.py")