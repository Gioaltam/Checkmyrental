"""
Clear SQLAlchemy metadata cache and verify database schema
"""
import os
import shutil
from pathlib import Path

print("CLEARING SQLALCHEMY CACHE")
print("=" * 60)

# 1. Delete all Python cache directories
cache_dirs = [
    "backend/__pycache__",
    "backend/app/__pycache__",
    "backend/app/api/__pycache__",
    "__pycache__"
]

print("\n1. Deleting cache directories...")
for cache_dir in cache_dirs:
    cache_path = Path(cache_dir)
    if cache_path.exists():
        try:
            shutil.rmtree(cache_path)
            print(f"   Deleted: {cache_dir}")
        except Exception as e:
            print(f"   Error deleting {cache_dir}: {e}")
    else:
        print(f"   Not found: {cache_dir}")

# 2. Create a simple test of the database connection
print("\n2. Testing database directly...")
import sqlite3

db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check the schema
cursor.execute("PRAGMA table_info(reports)")
columns = cursor.fetchall()
col_names = [col[1] for col in columns]

print("\n   Reports table columns:")
for col in col_names:
    print(f"   - {col}")

if "portal_client_id" in col_names:
    print("\n   SUCCESS: portal_client_id column exists in database!")
else:
    print("\n   ERROR: portal_client_id column missing!")

conn.close()

# 3. Instructions
print("\n" + "=" * 60)
print("NEXT STEPS:")
print("=" * 60)
print("\n1. Run the force restart script:")
print("   force_restart_backend.bat")
print("\nOR manually:")
print("\n1. Kill all Python processes in Task Manager")
print("2. Open a new terminal")
print("3. cd c:\\inspection-agent\\backend")
print("4. python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
print("\n5. Wait for: 'Application startup complete'")
print("6. Test with: python test_after_restart.py")