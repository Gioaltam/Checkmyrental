#!/usr/bin/env python3
"""
Nuclear fix without external dependencies
"""

import os
import shutil
import sqlite3
import time
import subprocess
import sys

def kill_python_windows():
    """Kill Python processes on Windows"""
    print("1. Killing all Python processes...")
    os.system("taskkill /F /IM python.exe 2>nul")
    os.system("taskkill /F /IM pythonw.exe 2>nul")
    os.system("taskkill /F /IM uvicorn.exe 2>nul")
    time.sleep(3)
    print("   Done - all Python processes killed")

def clear_pycache():
    """Delete all __pycache__ directories"""
    print("\n2. Deleting all cache directories...")

    cache_dirs = [
        "backend/__pycache__",
        "backend/app/__pycache__",
        "backend/app/api/__pycache__",
        "backend/app/lib/__pycache__",
        "__pycache__",
        ".pytest_cache"
    ]

    for cache_dir in cache_dirs:
        if os.path.exists(cache_dir):
            try:
                shutil.rmtree(cache_dir)
                print(f"   Deleted: {cache_dir}")
            except Exception as e:
                print(f"   Could not delete {cache_dir}: {e}")

    # Find and delete all __pycache__ recursively
    deleted_count = 0
    for root, dirs, files in os.walk("backend"):
        for dir_name in dirs:
            if dir_name == "__pycache__":
                cache_path = os.path.join(root, dir_name)
                try:
                    shutil.rmtree(cache_path)
                    print(f"   Deleted: {cache_path}")
                    deleted_count += 1
                except:
                    pass

    print(f"   Total cache directories deleted: {deleted_count}")

def fix_database():
    """Ensure database has correct values"""
    print("\n3. Fixing database...")

    conn = sqlite3.connect("backend/app.db")
    cur = conn.cursor()

    # First, clean up any old entries
    cur.execute("DELETE FROM clients WHERE portal_token IN ('DEMO1234', 'JS2024001')")
    print("   Cleaned old client entries")

    # Update portal_clients
    cur.execute("""
        UPDATE portal_clients
        SET owner_id = 'JS2024001'
        WHERE email = 'julianagomesfl@yahoo.com'
    """)
    print("   Updated portal_clients owner_id")

    # Update or create portal_client_tokens
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

    # Insert fresh client entry
    cur.execute("""
        INSERT INTO clients (
            id, name, email, portal_token, is_paid,
            company_name, contact_name
        ) VALUES (
            'client_juliana_prod', 'Juliana Shewmaker',
            'julianagomesfl@yahoo.com', 'JS2024001', 1,
            'Juliana Properties', 'Juliana Shewmaker'
        )
    """)
    print("   Created fresh client entry")

    conn.commit()

    # Verify everything
    print("\n   Verification:")
    cur.execute("SELECT owner_id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com'")
    result = cur.fetchone()
    if result:
        print(f"   portal_clients.owner_id: {result[0]}")

    cur.execute("""
        SELECT portal_token FROM portal_client_tokens
        WHERE client_id = (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')
    """)
    result = cur.fetchone()
    if result:
        print(f"   portal_client_tokens.portal_token: {result[0]}")

    cur.execute("SELECT portal_token FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
    result = cur.fetchone()
    if result:
        print(f"   clients.portal_token: {result[0]}")

    conn.close()
    print("   Database fixed successfully!")

def start_backend():
    """Start backend without cache"""
    print("\n4. Starting fresh backend...")
    print("   Running: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
    print("   (NO --reload flag to avoid caching)")
    print("\n" + "="*60)
    print("Press Ctrl+C to stop the backend when done")
    print("="*60 + "\n")

    os.chdir("backend")
    subprocess.run([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"])

def main():
    print("="*60)
    print("NUCLEAR FIX - COMPLETE CACHE AND DATABASE RESET")
    print("="*60)

    # Kill everything
    kill_python_windows()

    # Clear all caches
    clear_pycache()

    # Fix database
    fix_database()

    print("\n" + "="*60)
    print("NUCLEAR FIX COMPLETE!")
    print("="*60)
    print("\nStarting backend now...")
    print("\nOnce backend is running:")
    print("1. Start the operator app")
    print("2. Click Refresh")
    print("3. Select 'Juliana Shewmaker (JS2024001)'")
    print("4. Retry the failed inspections")
    print("\n")

    # Start backend
    start_backend()

if __name__ == "__main__":
    main()