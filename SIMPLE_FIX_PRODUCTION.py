#!/usr/bin/env python3
"""
SIMPLE PRODUCTION FIX - Just fix the clients table and source code
"""

import os
import sys
import sqlite3
import time
import shutil

print("="*60)
print("SIMPLE PRODUCTION FIX")
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

# Step 3: Fix the database - just clients table
print("\n3. Fixing database...")
conn = sqlite3.connect('backend/app.db')
cur = conn.cursor()

# Check what tables we actually have
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print(f"   Available tables: {[t[0] for t in tables]}")

# Delete old entries
cur.execute("DELETE FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
cur.execute("DELETE FROM clients WHERE portal_token IN ('DEMO1234', 'JS2024001')")
print("   Cleaned old entries")

# Insert ONLY the production entry with JS2024001
cur.execute("""
    INSERT INTO clients (
        id, name, email, portal_token, is_paid,
        company_name, contact_name
    ) VALUES (
        'juliana_js2024001', 'Juliana Shewmaker',
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
    print(f"   Verified: portal_token={result[0]}, is_paid={result[1]}")
else:
    print("   ERROR: Client not found!")

conn.close()

# Step 4: Fix the source code
print("\n4. Fixing hardcoded data in client.py...")
client_py_path = "backend/app/api/client.py"

with open(client_py_path, 'r') as f:
    lines = f.readlines()

# Find and comment out or modify the hardcoded demo section
new_lines = []
skip_demo_block = False
demo_block_start = None

for i, line in enumerate(lines):
    # Check if this is the start of the hardcoded demo block
    if "# Always include Juliana's demo account" in line:
        demo_block_start = i
        skip_demo_block = True
        new_lines.append("    # DISABLED: Hardcoded demo data - using database instead\n")
        new_lines.append("    # " + line)
    elif skip_demo_block:
        # Check if we've reached the end of the append block
        if "owner_list.append(" in line:
            new_lines.append("    # " + line)
        elif "    })" in line or "    }," in line:
            new_lines.append("    # " + line)
            skip_demo_block = False
        elif line.strip().startswith("}") and demo_block_start and i > demo_block_start:
            new_lines.append("    # " + line)
            skip_demo_block = False
        else:
            new_lines.append("    # " + line)
    else:
        new_lines.append(line)

# Write back the modified file
with open(client_py_path, 'w') as f:
    f.writelines(new_lines)
print("   Commented out hardcoded DEMO1234 block")

print("\n" + "="*60)
print("SIMPLE FIX COMPLETE!")
print("="*60)
print("\nNOW:")
print("1. Start backend: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
print("2. Test with: python test_production_api.py")
print("="*60)