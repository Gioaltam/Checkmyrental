import sqlite3
from pathlib import Path

# Connect to the database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check all clients in the portal_accounts table
print("=== All Portal Accounts ===")
cursor.execute("""
    SELECT id, email, owner_full_name, property_count, created_at
    FROM portal_accounts
    ORDER BY email
""")
accounts = cursor.fetchall()

for account in accounts:
    print(f"ID: {account[0]}, Email: {account[1]}, Name: {account[2]}, Properties: {account[3]}, Created: {account[4]}")

# Check specifically for Juliana
print("\n=== Juliana Accounts ===")
cursor.execute("""
    SELECT id, email, owner_full_name, property_count, created_at
    FROM portal_accounts
    WHERE email LIKE '%juliana%' OR owner_full_name LIKE '%juliana%' OR owner_full_name LIKE '%Juliana%'
""")
juliana_accounts = cursor.fetchall()

print(f"Found {len(juliana_accounts)} Juliana account(s):")
for account in juliana_accounts:
    print(f"ID: {account[0]}, Email: {account[1]}, Name: {account[2]}, Properties: {account[3]}, Created: {account[4]}")

conn.close()

print("\nIf you see duplicates, run: python remove_duplicate_julianas.py")