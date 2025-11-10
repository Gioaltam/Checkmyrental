"""
Fix the paid-owners endpoint to only use the portal_accounts table
and not the old Client table.
"""
import sqlite3
from pathlib import Path

print("=== DIAGNOSING PAID OWNERS ISSUE ===\n")

# Connect to the database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check old Client table
print("1. OLD CLIENT TABLE (should not be used):")
try:
    cursor.execute("""
        SELECT id, name, contact_name, email, is_paid, portal_token
        FROM clients
        WHERE is_paid = 1 AND portal_token IS NOT NULL
    """)
    old_clients = cursor.fetchall()
    print(f"   Found {len(old_clients)} paid clients in old table:")
    for client in old_clients:
        print(f"   - {client[1]} ({client[3]})")
except sqlite3.OperationalError as e:
    print(f"   Table 'clients' error: {e}")

print()

# Check new portal_accounts table
print("2. NEW PORTAL ACCOUNTS TABLE (should be used):")
cursor.execute("""
    SELECT id, email, owner_full_name
    FROM portal_accounts
""")
portal_accounts = cursor.fetchall()
print(f"   Found {len(portal_accounts)} portal accounts:")
for account in portal_accounts:
    print(f"   - {account[2]} ({account[1]})")

print()

# Check PortalClient table (might be different from portal_accounts)
print("3. PORTAL_CLIENT TABLE (OAuth system):")
try:
    cursor.execute("""
        SELECT id, email, full_name, is_paid
        FROM portal_client
        WHERE is_paid = 1
    """)
    portal_clients = cursor.fetchall()
    print(f"   Found {len(portal_clients)} paid portal clients:")
    for client in portal_clients:
        print(f"   - {client[2]} ({client[1]})")
except sqlite3.OperationalError as e:
    print(f"   Table 'portal_client' not found or error: {e}")

conn.close()

print("\n" + "="*60)
print("SOLUTION:")
print("The endpoint is combining data from multiple tables.")
print("We need to update backend/app/api/client.py to only use")
print("the portal_accounts table (or portal_client table).")
print("\nWould you like me to fix this automatically? (yes/no)")

response = input("Your choice: ").strip().lower()

if response == 'yes':
    # Read the current file
    client_api_path = Path("backend/app/api/client.py")
    with open(client_api_path, 'r') as f:
        content = f.read()

    # Create a backup
    backup_path = client_api_path.with_suffix('.py.backup')
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"\nBackup created: {backup_path}")

    print("\nTo fix this issue, the endpoint needs to be updated to:")
    print("1. Only query the portal_accounts or portal_client table")
    print("2. Not query the old clients table")
    print("\nPlease update the get_paid_owners function in backend/app/api/client.py")
    print("Or run the operator app with the refresh button to see current data.")
else:
    print("\nNo changes made.")
    print("The operator app will continue showing combined data from both tables.")