#!/usr/bin/env python3
"""
Restart the backend to sync with database changes
"""

import subprocess
import time
import sys
import os
import signal
import psutil

def kill_backend_processes():
    """Kill any existing backend processes"""
    print("Stopping existing backend processes...")

    killed = False
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            # Check if it's a uvicorn or backend process
            if proc.info['cmdline']:
                cmdline = ' '.join(proc.info['cmdline'])
                if 'uvicorn' in cmdline and 'app.main:app' in cmdline:
                    print(f"  Killing PID {proc.info['pid']}: {proc.info['name']}")
                    proc.terminate()
                    killed = True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    if killed:
        time.sleep(2)  # Wait for processes to terminate
        print("  Backend stopped.")
    else:
        print("  No backend processes found running.")

def start_backend():
    """Start the backend server"""
    print("\nStarting backend with fresh data...")

    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)

    # Start uvicorn
    cmd = [sys.executable, '-m', 'uvicorn', 'app.main:app',
           '--reload', '--host', '0.0.0.0', '--port', '8000']

    print(f"Running: {' '.join(cmd)}")
    print("\nBackend starting... (Press Ctrl+C to stop)")
    print("-" * 50)

    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n\nBackend stopped by user.")

def main():
    print("=" * 50)
    print("BACKEND RESTART UTILITY")
    print("=" * 50)

    try:
        import psutil
    except ImportError:
        print("\nERROR: psutil not installed.")
        print("Run: pip install psutil")
        sys.exit(1)

    # Kill existing processes
    kill_backend_processes()

    # Start fresh backend
    start_backend()

if __name__ == "__main__":
    main()