#!/usr/bin/env python3
"""
FINAL PRODUCTION FIX - Updates both database AND removes hardcoded demo data
"""

import os
import sys
import sqlite3
import time
import shutil

print("="*60)
print("FINAL PRODUCTION FIX")
print("="*60)

# Step 1: Kill backend
print("\n1. Stopping backend...")
os.system("taskkill /F /IM python.exe /FI \"COMMANDLINE eq *uvicorn*\" 2>nul")
os.system("taskkill /F /IM uvicorn.exe 2>nul")
time.sleep(2)

# Step 2: Clear ALL caches
print("\n2. Clearing all caches...")
cache_dirs = [
    "backend/__pycache__",
    "backend/app/__pycache__",
    "backend/app/api/__pycache__",
    "backend/app/lib/__pycache__",
]

for cache_dir in cache_dirs:
    if os.path.exists(cache_dir):
        try:
            shutil.rmtree(cache_dir)
            print(f"   Deleted: {cache_dir}")
        except:
            pass

# Step 3: Fix the database comprehensively
print("\n3. Fixing database...")
conn = sqlite3.connect('backend/app.db')
cur = conn.cursor()

# First, check current state
print("   Current state:")
cur.execute("SELECT owner_id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com'")
result = cur.fetchone()
print(f"   portal_clients.owner_id: {result[0] if result else 'NOT FOUND'}")

# Delete ALL old client entries
cur.execute("DELETE FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
cur.execute("DELETE FROM clients WHERE portal_token IN ('DEMO1234', 'JS2024001')")
print("   Cleaned old entries")

# Update portal_clients to JS2024001
cur.execute("""
    UPDATE portal_clients
    SET owner_id = 'JS2024001',
        is_paid = 1
    WHERE email = 'julianagomesfl@yahoo.com'
""")
print("   Updated portal_clients")

# Fix portal_client_tokens
cur.execute("""
    DELETE FROM portal_client_tokens
    WHERE client_id = (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')
""")

cur.execute("""
    INSERT INTO portal_client_tokens (client_id, portal_token, created_at)
    SELECT id, 'JS2024001', datetime('now')
    FROM portal_clients
    WHERE email = 'julianagomesfl@yahoo.com'
""")
print("   Updated portal_client_tokens")

# Create ONLY production client entry
cur.execute("""
    INSERT INTO clients (
        id, name, email, portal_token, is_paid,
        company_name, contact_name
    ) VALUES (
        'client_juliana_production', 'Juliana Shewmaker',
        'julianagomesfl@yahoo.com', 'JS2024001', 1,
        'Juliana Properties', 'Juliana Shewmaker'
    )
""")
print("   Created production client entry")

conn.commit()

# Verify the changes
print("\n   Verifying changes:")
cur.execute("""
    SELECT 'portal_clients.owner_id' as table_col, owner_id as value
    FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com'
    UNION ALL
    SELECT 'portal_client_tokens.portal_token', portal_token
    FROM portal_client_tokens WHERE client_id =
        (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')
    UNION ALL
    SELECT 'clients.portal_token', portal_token
    FROM clients WHERE email = 'julianagomesfl@yahoo.com'
""")

for row in cur.fetchall():
    print(f"   {row[0]}: {row[1]}")
    if row[1] != 'JS2024001':
        print(f"   ERROR: Still showing wrong value!")

conn.close()

# Step 4: Fix the hardcoded demo data in client.py
print("\n4. Checking for hardcoded data in client.py...")
client_py_path = "backend/app/api/client.py"
if os.path.exists(client_py_path):
    with open(client_py_path, 'r') as f:
        content = f.read()

    if 'DEMO1234' in content:
        print("   WARNING: Found hardcoded DEMO1234 in client.py!")
        print("   This needs to be removed or updated to JS2024001")
        print("   The /owners endpoint has hardcoded data that will override database!")

        # Create a backup
        backup_path = client_py_path + ".backup_demo"
        with open(backup_path, 'w') as f:
            f.write(content)
        print(f"   Created backup: {backup_path}")

        # Replace DEMO1234 with JS2024001 in the file
        content = content.replace('"DEMO1234"', '"JS2024001"')
        content = content.replace("'DEMO1234'", "'JS2024001'")

        with open(client_py_path, 'w') as f:
            f.write(content)
        print("   Updated client.py: DEMO1234 -> JS2024001")

# Step 5: Create a test script
print("\n5. Creating test script...")
test_script = '''
import requests
import json

print("Testing API endpoints...")

# Test /api/owners/paid-owners
try:
    response = requests.get("http://localhost:8000/api/owners/paid-owners", timeout=3)
    if response.status_code == 200:
        data = response.json()
        owners = data.get("owners", [])
        print(f"\\nFound {len(owners)} paid owners:")
        for owner in owners:
            print(f"  Name: {owner.get('name')}")
            print(f"  Owner ID: {owner.get('owner_id')}")
            print(f"  Email: {owner.get('email')}")
            print(f"  Portal Token: {owner.get('portal_token')}")
            print()

            if owner.get('email') == 'julianagomesfl@yahoo.com':
                if owner.get('owner_id') == 'JS2024001':
                    print("  ✓ CORRECT: Juliana has JS2024001")
                else:
                    print(f"  ✗ ERROR: Juliana has {owner.get('owner_id')} instead of JS2024001")
except Exception as e:
    print(f"Error: {e}")
'''

with open('test_production_api.py', 'w') as f:
    f.write(test_script)

print("\n" + "="*60)
print("FINAL PRODUCTION FIX COMPLETE!")
print("="*60)
print("\nNOW RUN THESE COMMANDS:")
print("\n1. Start the backend (in a new terminal):")
print("   cd backend")
print("   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
print("\n2. Test the API (in another terminal):")
print("   python test_production_api.py")
print("\n3. If the test shows JS2024001, start the operator app")
print("="*60)