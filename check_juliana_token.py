"""
Check what Juliana's actual token/credentials are
"""
import sqlite3
from pathlib import Path
import json

print("CHECKING JULIANA'S CREDENTIALS")
print("=" * 60)

# Check both database locations
databases = [
    ("Root DB", Path("app.db")),
    ("Backend DB", Path("backend/app.db"))
]

for db_name, db_path in databases:
    if not db_path.exists():
        continue

    print(f"\n{db_name} ({db_path}):")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check portal_clients table
    print("\n  Portal Clients table:")
    cursor.execute("""
        SELECT id, email, full_name, is_paid, properties_data
        FROM portal_clients
        WHERE email LIKE '%juliana%' OR full_name LIKE '%Juliana%'
    """)
    portal_clients = cursor.fetchall()

    if portal_clients:
        for client in portal_clients:
            print(f"    ID: {client[0]}")
            print(f"    Email: {client[1]}")
            print(f"    Name: {client[2]}")
            print(f"    Is Paid: {client[3]}")
            print(f"    Properties: {client[4]}")
            print(f"    >>> Token format would be: portal_{client[0]}")
    else:
        print("    No Juliana found in portal_clients")

    # Check portal_client_tokens table if it exists
    try:
        cursor.execute("""
            SELECT client_id, portal_token, created_at
            FROM portal_client_tokens
            ORDER BY created_at DESC
            LIMIT 5
        """)
        tokens = cursor.fetchall()
        if tokens:
            print("\n  Portal Client Tokens:")
            for token in tokens:
                print(f"    Client ID: {token[0]}, Token: {token[1]}, Created: {token[2]}")
    except:
        pass

    # Check clients table (old system)
    print("\n  Clients table (old system):")
    cursor.execute("""
        SELECT id, name, email, portal_token
        FROM clients
        WHERE email LIKE '%juliana%' OR name LIKE '%Juliana%' OR portal_token IS NOT NULL
        LIMIT 5
    """)
    clients = cursor.fetchall()

    if clients:
        for client in clients:
            print(f"    ID: {client[0]}, Name: {client[1]}, Email: {client[2]}, Token: {client[3]}")
    else:
        print("    No relevant clients found")

    conn.close()

print("\n" + "=" * 60)
print("IMPORTANT:")
print("=" * 60)
print("\nJuliana's portal_clients.id determines her token:")
print("- If her ID is 2, then token is 'portal_2'")
print("- If her ID is different, update accordingly")
print("\nThe operator app uses this token to:")
print("1. Save reports with correct portal_client_id")
print("2. Open dashboard with ?token=portal_X")

# Check for any credentials files
cred_files = list(Path(".").glob("*credentials*.json"))
if cred_files:
    print("\nFound credential files:")
    for cf in cred_files:
        print(f"  - {cf}")
        try:
            with open(cf) as f:
                data = json.load(f)
                if "portal_token" in data:
                    print(f"    Token in file: {data['portal_token']}")
        except:
            pass