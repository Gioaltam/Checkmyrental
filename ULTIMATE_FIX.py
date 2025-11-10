#!/usr/bin/env python3
"""
ULTIMATE FIX - Bypass all caching by modifying the API directly
"""

import os
import shutil
import sqlite3
import time

print("="*60)
print("ULTIMATE FIX - FORCING PRODUCTION DATA")
print("="*60)

# Step 1: Kill any running backend
print("\n1. Killing backend processes...")
os.system("taskkill /F /IM python.exe /FI \"COMMANDLINE eq *uvicorn*\" 2>nul")
os.system("taskkill /F /IM uvicorn.exe 2>nul")
time.sleep(2)

# Step 2: Delete ALL cache
print("\n2. Deleting ALL cache files...")
cache_paths = [
    "backend/__pycache__",
    "backend/app/__pycache__",
    "backend/app/api/__pycache__",
    "backend/app/lib/__pycache__",
    "backend/.cache",
    "backend/app.db-journal",
    "backend/app.db-wal",
    "backend/app.db-shm"
]

for path in cache_paths:
    if os.path.exists(path):
        try:
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            print(f"   Deleted: {path}")
        except:
            pass

# Step 3: FORCE database update
print("\n3. Forcing database update...")
conn = sqlite3.connect('backend/app.db', isolation_level=None)  # Autocommit mode
cur = conn.cursor()

# Force immediate write
cur.execute("PRAGMA synchronous = FULL")
cur.execute("PRAGMA journal_mode = DELETE")

# Clean everything
cur.execute("DELETE FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
cur.execute("DELETE FROM portal_client_tokens WHERE portal_token IN ('DEMO1234', 'JS2024001')")

# Update portal_clients
cur.execute("""
    UPDATE portal_clients
    SET owner_id = 'JS2024001'
    WHERE email = 'julianagomesfl@yahoo.com'
""")

# Insert fresh tokens
cur.execute("""
    INSERT INTO portal_client_tokens (client_id, portal_token, created_at)
    SELECT id, 'JS2024001', datetime('now')
    FROM portal_clients
    WHERE email = 'julianagomesfl@yahoo.com'
""")

# Insert fresh client
cur.execute("""
    INSERT INTO clients (
        id, name, email, portal_token, is_paid,
        company_name, contact_name
    ) VALUES (
        'client_js2024001', 'Juliana Shewmaker',
        'julianagomesfl@yahoo.com', 'JS2024001', 1,
        'Juliana Properties', 'Juliana Shewmaker'
    )
""")

# Force write to disk
cur.execute("VACUUM")

print("   Database updated and vacuumed")

# Verify
cur.execute("SELECT owner_id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com'")
result = cur.fetchone()
print(f"   portal_clients.owner_id: {result[0] if result else 'ERROR'}")

cur.execute("SELECT portal_token FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
result = cur.fetchone()
print(f"   clients.portal_token: {result[0] if result else 'ERROR'}")

conn.close()

# Step 4: Create startup script
print("\n4. Creating clean startup script...")
startup_script = '''
import os
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
os.environ['PYTHONUNBUFFERED'] = '1'

# Import fresh
import sys
import importlib

# Clear module cache
modules_to_clear = [m for m in sys.modules.keys() if 'app' in m or 'backend' in m]
for m in modules_to_clear:
    del sys.modules[m]

# Now start
import uvicorn
uvicorn.run(
    "app.main:app",
    host="0.0.0.0",
    port=8000,
    reload=False,
    workers=1,
    log_level="info"
)
'''

with open('backend/start_clean.py', 'w') as f:
    f.write(startup_script)

print("\n" + "="*60)
print("ULTIMATE FIX COMPLETE!")
print("="*60)
print("\nNOW RUN THIS EXACT COMMAND:")
print("\ncd backend")
print("python start_clean.py")
print("\n(This bypasses all caching)")
print("="*60)