#!/usr/bin/env python3
"""
Nuclear option - Clear ALL caches and reset everything
"""

import os
import shutil
import psutil
import time
from pathlib import Path

def kill_all_python():
    """Kill all Python processes"""
    print("1. Killing all Python processes...")
    killed = 0
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            if proc.info['name'] and 'python' in proc.info['name'].lower():
                proc.kill()
                killed += 1
        except:
            pass
    if killed:
        print(f"   Killed {killed} Python process(es)")
        time.sleep(2)
    else:
        print("   No Python processes found")

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

    # Also find and delete all __pycache__ recursively
    for root, dirs, files in os.walk("backend"):
        for dir_name in dirs:
            if dir_name == "__pycache__":
                cache_path = os.path.join(root, dir_name)
                try:
                    shutil.rmtree(cache_path)
                    print(f"   Deleted: {cache_path}")
                except:
                    pass

def fix_database():
    """Ensure database has correct values"""
    print("\n3. Fixing database...")
    import sqlite3

    conn = sqlite3.connect("backend/app.db")
    cur = conn.cursor()

    # Update portal_clients
    cur.execute("""
        UPDATE portal_clients
        SET owner_id = 'JS2024001'
        WHERE email = 'julianagomesfl@yahoo.com'
    """)

    # Update portal_client_tokens
    cur.execute("""
        UPDATE portal_client_tokens
        SET portal_token = 'JS2024001'
        WHERE client_id = (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')
    """)

    # Ensure client exists with correct token
    cur.execute("""
        DELETE FROM clients
        WHERE portal_token IN ('DEMO1234', 'JS2024001')
    """)

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

    conn.commit()

    # Verify
    cur.execute("""
        SELECT
            (SELECT owner_id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com') as pc_owner,
            (SELECT portal_token FROM portal_client_tokens WHERE client_id =
                (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')) as pct_token,
            (SELECT portal_token FROM clients WHERE email = 'julianagomesfl@yahoo.com') as c_token
    """)

    result = cur.fetchone()
    if result:
        print(f"   portal_clients.owner_id: {result[0]}")
        print(f"   portal_client_tokens.portal_token: {result[1]}")
        print(f"   clients.portal_token: {result[2]}")

        if all(x == 'JS2024001' for x in result):
            print("   ✓ Database fixed successfully!")
        else:
            print("   ⚠ Some values still incorrect")

    conn.close()

def clear_session_data():
    """Clear any session/temp files"""
    print("\n4. Clearing session data...")

    session_files = [
        "backend/.env.local",
        "backend/session.json",
        "backend/cache.db"
    ]

    for file in session_files:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"   Deleted: {file}")
            except:
                pass

def main():
    print("="*60)
    print("NUCLEAR CACHE CLEAR - COMPLETE RESET")
    print("="*60)

    try:
        import psutil
    except ImportError:
        print("Installing psutil...")
        os.system("pip install psutil")
        import psutil

    # Kill everything
    kill_all_python()

    # Clear all caches
    clear_pycache()

    # Fix database
    fix_database()

    # Clear sessions
    clear_session_data()

    print("\n" + "="*60)
    print("NUCLEAR CLEAR COMPLETE!")
    print("="*60)
    print("\nNow start fresh:")
    print("1. Open a NEW terminal")
    print("2. Run: cd backend")
    print("3. Run: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
    print("\nNOTE: Don't use --reload flag to avoid cache issues")
    print("\nThen:")
    print("1. Start the operator app fresh")
    print("2. Click Refresh")
    print("3. Select 'Juliana Shewmaker (JS2024001)'")
    print("4. Retry the failed inspections")

if __name__ == "__main__":
    main()