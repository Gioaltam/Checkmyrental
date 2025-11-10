#!/usr/bin/env python3
"""
FIX WITH CORRECT DATABASE PATH
"""

import os
import sys
import sqlite3
import time
import shutil

print("="*60)
print("PRODUCTION FIX - CORRECT DATABASE PATH")
print("="*60)

# Step 1: Kill backend
print("\n1. Stopping backend...")
os.system("taskkill /F /IM python.exe /FI \"COMMANDLINE eq *uvicorn*\" 2>nul")
os.system("taskkill /F /IM uvicorn.exe 2>nul")
time.sleep(2)

# Step 2: Clear caches
print("\n2. Clearing caches...")
cache_dirs = [
    "backend/__pycache__",
    "backend/app/__pycache__",
    "backend/app/api/__pycache__",
]

for cache_dir in cache_dirs:
    if os.path.exists(cache_dir):
        try:
            shutil.rmtree(cache_dir)
            print(f"   Deleted: {cache_dir}")
        except:
            pass

# Step 3: Check BOTH possible database locations
print("\n3. Finding database...")
db_paths = [
    "app.db",  # Root directory
    "backend/app.db",  # Backend directory
]

db_path = None
for path in db_paths:
    if os.path.exists(path):
        print(f"   Found database at: {path}")
        db_path = path
        break

if not db_path:
    print("   ERROR: No database found!")
    sys.exit(1)

# Step 4: Fix the database
print("\n4. Fixing database...")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in cur.fetchall()]
print(f"   Available tables: {tables}")

if 'clients' in tables:
    # Delete old entries
    cur.execute("DELETE FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
    cur.execute("DELETE FROM clients WHERE portal_token IN ('DEMO1234', 'JS2024001')")
    print("   Cleaned old entries")

    # Insert production entry
    cur.execute("""
        INSERT INTO clients (
            id, name, email, portal_token, is_paid,
            company_name, contact_name
        ) VALUES (
            'juliana_prod_js2024001', 'Juliana Shewmaker',
            'julianagomesfl@yahoo.com', 'JS2024001', 1,
            'Juliana Properties', 'Juliana Shewmaker'
        )
    """)
    print("   Created production client with JS2024001")

    conn.commit()

    # Verify
    cur.execute("SELECT portal_token, is_paid FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
    result = cur.fetchone()
    if result:
        print(f"   ✓ Verified: portal_token={result[0]}, is_paid={result[1]}")
        if result[0] != 'JS2024001':
            print(f"   WARNING: Token is {result[0]} instead of JS2024001!")
    else:
        print("   ERROR: Client not found after insert!")

# Check if portal_clients table exists and fix it too
if 'portal_clients' in tables:
    print("\n   Fixing portal_clients table...")
    cur.execute("""
        UPDATE portal_clients
        SET owner_id = 'JS2024001'
        WHERE email = 'julianagomesfl@yahoo.com'
    """)
    conn.commit()
    print("   Updated portal_clients")

conn.close()

# Step 5: Fix the hardcoded data in client.py
print("\n5. Fixing client.py source code...")
client_py_path = "backend/app/api/client.py"

with open(client_py_path, 'r') as f:
    content = f.read()

if 'DEMO1234' in content:
    print("   Found hardcoded DEMO1234 - fixing...")

    # Backup original
    with open(client_py_path + ".backup_original", 'w') as f:
        f.write(content)

    # Replace all instances of DEMO1234 with JS2024001
    content = content.replace('"DEMO1234"', '"JS2024001"')
    content = content.replace("'DEMO1234'", "'JS2024001'")

    # Also update the email if it's the old demo email
    content = content.replace('"juliana@checkmyrental.com"', '"julianagomesfl@yahoo.com"')
    content = content.replace("'juliana@checkmyrental.com'", "'julianagomesfl@yahoo.com'")

    with open(client_py_path, 'w') as f:
        f.write(content)
    print("   ✓ Updated client.py")
else:
    print("   Client.py already fixed or no DEMO1234 found")

# Step 6: Copy database to backend folder if needed
if db_path == "app.db" and not os.path.exists("backend/app.db"):
    print("\n6. Copying database to backend folder...")
    shutil.copy2(db_path, "backend/app.db")
    print("   ✓ Copied app.db to backend/app.db")

print("\n" + "="*60)
print("FIX COMPLETE!")
print("="*60)
print(f"\nDatabase location: {db_path}")
print("\nNOW:")
print("1. Start backend: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
print("2. Test with: python test_production_api.py")
print("="*60)