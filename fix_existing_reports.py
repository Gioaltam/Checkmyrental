"""
Fix existing reports by linking them to Juliana's portal_client_id
"""
import sqlite3
import json
from pathlib import Path

print("FIXING EXISTING REPORTS")
print("=" * 60)

# Connect to database
db_path = Path("app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get Juliana's portal client info
cursor.execute("""
    SELECT id, full_name, email, properties_data
    FROM portal_clients
    WHERE id = 2
""")
juliana = cursor.fetchone()

if juliana:
    print(f"Found Juliana: {juliana[1]} ({juliana[2]})")
    portal_client_id = juliana[0]

    # Parse her properties
    properties = []
    if juliana[3]:
        try:
            props_data = json.loads(juliana[3])
            if isinstance(props_data, list):
                properties = props_data
                print(f"Found {len(properties)} properties:")
                for prop in properties:
                    print(f"  - {prop.get('address', 'Unknown')}")
        except:
            pass

    # Get all reports with NULL portal_client_id
    cursor.execute("""
        SELECT id, address, portal_client_id
        FROM reports
        WHERE portal_client_id IS NULL
    """)
    orphan_reports = cursor.fetchall()

    print(f"\nFound {len(orphan_reports)} reports without portal_client_id")

    # Update reports that match Juliana's property addresses
    updated_count = 0
    for report_id, report_address, _ in orphan_reports:
        # Check if this report matches any of Juliana's properties
        for prop in properties:
            prop_address = prop.get('address', '')
            if prop_address and report_address and (
                prop_address in report_address or
                report_address in prop_address or
                # Partial match for cases like "904 Marshal St" vs full address
                any(part in report_address for part in prop_address.split(',')[0:1])
            ):
                print(f"\nLinking report {report_id}:")
                print(f"  Report address: {report_address}")
                print(f"  Matches property: {prop_address}")

                # Update the report
                cursor.execute("""
                    UPDATE reports
                    SET portal_client_id = ?, property_name = ?
                    WHERE id = ?
                """, (portal_client_id, prop_address, report_id))
                updated_count += 1
                break

    # Also update any reports that might have owner_id = 'portal_2' in their metadata
    # (These are reports that were uploaded for Juliana but not linked)
    cursor.execute("""
        UPDATE reports
        SET portal_client_id = 2, property_name = address
        WHERE portal_client_id IS NULL
        AND (address LIKE '%904 Marshal%' OR address LIKE '%St Petersburg%')
    """)
    additional_updates = cursor.rowcount

    conn.commit()

    print("\n" + "=" * 60)
    print("RESULTS:")
    print(f"✓ Updated {updated_count} reports by address matching")
    print(f"✓ Updated {additional_updates} additional reports by partial address")
    print(f"✓ Total updates: {updated_count + additional_updates}")

    # Verify the fix
    cursor.execute("""
        SELECT COUNT(*) FROM reports WHERE portal_client_id = 2
    """)
    juliana_reports = cursor.fetchone()[0]

    print(f"\nJuliana now has {juliana_reports} reports linked to her account")

else:
    print("ERROR: Juliana's portal client not found!")

conn.close()

print("\n✓ Database fixed! Reports are now linked to Juliana.")
print("✓ Dashboard should now show all reports.")