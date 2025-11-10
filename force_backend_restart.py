#!/usr/bin/env python3
"""
Force complete backend restart to clear all caches
"""

import psutil
import subprocess
import time
import sys
import os

def kill_all_python_backends():
    """Kill ALL Python processes running uvicorn/backend"""
    print("Killing ALL backend processes...")
    killed_count = 0

    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if proc.info['name'] and 'python' in proc.info['name'].lower():
                if proc.info['cmdline']:
                    cmdline = ' '.join(proc.info['cmdline']).lower()
                    if any(x in cmdline for x in ['uvicorn', 'app.main', 'backend']):
                        print(f"  Killing PID {proc.info['pid']}")
                        proc.kill()  # Force kill
                        killed_count += 1
        except:
            pass

    if killed_count > 0:
        print(f"  Killed {killed_count} backend process(es)")
        time.sleep(3)  # Wait for processes to fully terminate
    else:
        print("  No backend processes found")

    return killed_count > 0

def start_fresh_backend():
    """Start backend with completely fresh state"""
    print("\nStarting FRESH backend (no cache)...")

    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)

    # Start with explicit no-reload to avoid cache
    cmd = [
        sys.executable, '-m', 'uvicorn',
        'app.main:app',
        '--host', '0.0.0.0',
        '--port', '8000',
        '--reload'  # Keep reload for development
    ]

    print(f"Running: {' '.join(cmd)}")
    print("\n" + "="*60)
    print("BACKEND STARTING WITH FRESH STATE")
    print("The operator app should now show:")
    print("  'Juliana Shewmaker (JS2024001)'")
    print("="*60)
    print("\nPress Ctrl+C to stop the backend")
    print("-" * 60)

    try:
        # Run backend
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n\nBackend stopped.")

def main():
    print("="*60)
    print("FORCE BACKEND RESTART - CLEAR ALL CACHES")
    print("="*60)

    try:
        import psutil
    except ImportError:
        print("\nERROR: psutil not installed")
        print("Run: pip install psutil")
        sys.exit(1)

    # Kill everything
    kill_all_python_backends()

    # Quick database check
    print("\nChecking database values...")
    import sqlite3
    conn = sqlite3.connect('app.db')
    cur = conn.cursor()
    cur.execute("SELECT owner_id FROM portal_clients WHERE email='julianagomesfl@yahoo.com'")
    result = cur.fetchone()
    if result:
        print(f"  Database owner_id: {result[0]}")
    cur.execute("SELECT portal_token FROM clients WHERE portal_token='JS2024001'")
    result = cur.fetchone()
    if result:
        print(f"  Clients portal_token: {result[0]}")
    conn.close()

    # Start fresh
    start_fresh_backend()

if __name__ == "__main__":
    main()