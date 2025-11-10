"""
Check if reports are being saved and linked correctly
"""
import sqlite3
from pathlib import Path
import json

print("CHECKING REPORTS IN DATABASE")
print("=" * 60)

# Connect to backend database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Check reports table structure
print("\n1. Reports table structure:")
cursor.execute("PRAGMA table_info(reports)")
columns = cursor.fetchall()
print("   Columns:")
for col in columns:
    print(f"   - {col[1]} ({col[2]})")

# 2. Check all reports in database
print("\n2. All reports in database:")
cursor.execute("""
    SELECT id, property_id, address, created_at, portal_client_id, property_name
    FROM reports
    ORDER BY created_at DESC
    LIMIT 10
""")
reports = cursor.fetchall()

if reports:
    print(f"   Found {len(reports)} recent reports:")
    for report in reports:
        print(f"   - ID: {report[0][:8]}...")
        print(f"     Property ID: {report[1]}")
        print(f"     Address: {report[2]}")
        print(f"     Created: {report[3]}")
        print(f"     Portal Client ID: {report[4]}")
        print(f"     Property Name: {report[5]}")
        print()
else:
    print("   No reports found in database")

# 3. Check reports linked to Juliana (portal_client_id = 2)
print("\n3. Reports linked to Juliana (portal_client_id = 2):")
cursor.execute("""
    SELECT id, address, property_name, created_at
    FROM reports
    WHERE portal_client_id = 2
""")
juliana_reports = cursor.fetchall()

if juliana_reports:
    print(f"   Found {len(juliana_reports)} reports for Juliana:")
    for report in juliana_reports:
        print(f"   - {report[1] or report[2]} (Created: {report[3]})")
else:
    print("   No reports linked to Juliana")

# 4. Check clients table for portal_2
print("\n4. Checking clients table for portal_2 entries:")
cursor.execute("""
    SELECT id, name, email
    FROM clients
    WHERE name LIKE '%portal%' OR id = 2
""")
clients = cursor.fetchall()

if clients:
    print(f"   Found {len(clients)} matching clients:")
    for client in clients:
        print(f"   - ID: {client[0]}, Name: {client[1]}, Email: {client[2]}")
else:
    print("   No matching clients found")

# 5. Check properties table
print("\n5. Properties in database:")
cursor.execute("""
    SELECT id, client_id, address
    FROM properties
    LIMIT 5
""")
properties = cursor.fetchall()

if properties:
    print(f"   Found properties:")
    for prop in properties:
        print(f"   - ID: {prop[0]}, Client ID: {prop[1]}, Address: {prop[2]}")
else:
    print("   No properties found")

conn.close()

print("\n" + "=" * 60)
print("DIAGNOSIS:")
print("=" * 60)

print("\nThe issue is likely one of these:")
print("1. Reports are saved but portal_client_id is NULL")
print("2. Reports are linked to wrong client_id")
print("3. Dashboard is looking in wrong place for reports")
print("\nCheck the portal_client_id values above.")
print("If they're NULL, the linkage isn't working correctly.")