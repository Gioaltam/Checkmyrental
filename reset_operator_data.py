import os
import shutil
from pathlib import Path
import sqlite3

print("=== OPERATOR APP DATA RESET ===\n")

# 1. Clear all cache directories
cache_dirs = [".cache", "__pycache__", "backend/__pycache__", "backend/app/__pycache__"]
for cache_dir in cache_dirs:
    cache_path = Path(cache_dir)
    if cache_path.exists():
        shutil.rmtree(cache_path, ignore_errors=True)
        if cache_dir == ".cache":
            os.makedirs(cache_path)  # Recreate .cache directory
        print(f"Cleared: {cache_dir}")

# 2. Show current database state
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM portal_accounts")
account_count = cursor.fetchone()[0]

print(f"\nCurrent database status:")
print(f"Total portal accounts: {account_count}")

cursor.execute("""
    SELECT email, owner_full_name
    FROM portal_accounts
    ORDER BY created_at DESC
""")
accounts = cursor.fetchall()

print("\nAccounts in database:")
for email, name in accounts:
    print(f"  - {name} ({email})")

conn.close()

# 3. Kill any running Python processes (optional)
print("\n" + "="*50)
print("IMPORTANT: Close the Operator App if it's running!")
print("="*50)
input("Press Enter after closing the Operator App...")

print("\nData reset complete! Now restart the Operator App:")
print("Command: python operator_ui.py")
print("\nThe client dropdown should now show only the accounts listed above.")