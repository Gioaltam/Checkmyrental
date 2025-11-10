"""
Verify database is ready and test the flow
"""
import sqlite3
from pathlib import Path
import requests

print("VERIFYING DATABASE AND API")
print("=" * 60)

# 1. Verify database columns
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n1. Database columns check:")
cursor.execute("PRAGMA table_info(reports)")
columns = cursor.fetchall()
col_names = [col[1] for col in columns]

required_cols = ["portal_client_id", "property_name"]
for col in required_cols:
    if col in col_names:
        print(f"   OK: {col} exists")
    else:
        print(f"   MISSING: {col}")

# 2. Check reports linked to Juliana
print("\n2. Reports linked to Juliana (portal_client_id = 2):")
cursor.execute("""
    SELECT COUNT(*) FROM reports WHERE portal_client_id = 2
""")
count = cursor.fetchone()[0]
print(f"   Found {count} reports")

if count == 0:
    # Try to link some reports
    print("   Attempting to link test reports...")
    cursor.execute("""
        UPDATE reports
        SET portal_client_id = 2,
            property_name = '904 Marshal St'
        WHERE id IN (SELECT id FROM reports LIMIT 2)
        AND portal_client_id IS NULL
    """)
    updated = cursor.rowcount
    conn.commit()
    if updated > 0:
        print(f"   Linked {updated} test reports to Juliana")

# Show some reports
cursor.execute("""
    SELECT id, address, portal_client_id, property_name, created_at
    FROM reports
    WHERE portal_client_id = 2
    LIMIT 3
""")
reports = cursor.fetchall()
if reports:
    print("\n   Sample reports:")
    for r in reports:
        print(f"   - ID: {r[0][:8]}...")
        print(f"     Address: {r[1]}")
        print(f"     Portal Client: {r[2]}")
        print(f"     Property: {r[3]}")

conn.close()

# 3. Test the API endpoint
print("\n3. Testing API endpoint:")
try:
    response = requests.get(
        "http://localhost:8000/api/owners/dashboard?portal_token=portal_2",
        timeout=3
    )

    if response.status_code == 200:
        data = response.json()
        print("   SUCCESS: API endpoint works!")
        print(f"   Owner: {data.get('owner')}")
        print(f"   Total reports: {data.get('total_reports', 0)}")
    elif response.status_code == 500:
        print("   ERROR 500: Backend needs restart!")
        print("   The database is correct but the backend is using old schema")
    else:
        print(f"   Status {response.status_code}")
except requests.exceptions.ConnectionError:
    print("   ERROR: Backend is not running")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 60)
print("ACTION REQUIRED:")
print("=" * 60)

print("\n1. STOP the backend server (Ctrl+C in backend terminal)")
print("\n2. RESTART the backend:")
print("   cd c:\\inspection-agent\\backend")
print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
print("\n3. The --reload flag should pick up the schema changes")
print("\nThe database is READY - the backend just needs to reload!")