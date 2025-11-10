import sqlite3
import uuid
import os
from pathlib import Path
from datetime import datetime

# All 14 properties from the operator app
all_properties = [
    "1425 40th st south St",
    "1735 25th St S St Pete",
    "1799 highland ave unit E100",
    "1799 highland ave unit O70",
    "2460 Melrose Ave S",
    "3272 20th Ave SW",
    "3351 Hillsdale Ave Unit A",
    "3351 Hillsdale Ave Unit C",
    "4666 12th Ave S",
    "7750 92nd St 102H Seminole",
    "13699 99th Ave Unit 3",
    "13699 99th Ave Unit 2",
    "1227 James Ave S St Pete",
    "904 marshal st"
]

conn = sqlite3.connect('app.db')
cursor = conn.cursor()

print("Adding missing properties for Juliana...")

# First, get existing properties to avoid duplicates
cursor.execute('SELECT address FROM properties WHERE client_id = "juliana_shewmaker"')
existing_props = [row[0].strip().lower() for row in cursor.fetchall()]
print(f"Existing properties: {len(existing_props)}")

added_count = 0
for prop_address in all_properties:
    # Normalize address for comparison
    normalized = prop_address.strip().lower()

    # Check various variations
    found = False
    for existing in existing_props:
        if normalized in existing or existing in normalized:
            found = True
            break
        # Check without trailing numbers/letters
        if normalized.replace(" ", "") in existing.replace(" ", "") or existing.replace(" ", "") in normalized.replace(" ", ""):
            found = True
            break

    if not found:
        # Generate unique ID
        prop_id = f"prop_{uuid.uuid4().hex[:8]}"

        # Insert new property
        cursor.execute('''
            INSERT INTO properties (id, client_id, address, label, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        ''', (prop_id, 'juliana_shewmaker', prop_address, prop_address))

        print(f"Added property: {prop_address} (ID: {prop_id})")
        added_count += 1

conn.commit()
print(f"\nAdded {added_count} new properties")

# Now check for workspace folders and create reports for them
print("\nChecking workspace folders for reports...")

workspace_path = Path('workspace/outputs')
report_count = 0

for folder in workspace_path.iterdir():
    if folder.is_dir() and '_2025' in folder.name:
        # Extract address from folder name
        folder_parts = folder.name.rsplit('_', 2)
        if len(folder_parts) >= 2:
            address_part = folder_parts[0]
            date_part = folder_parts[1]

            # Try to find matching property
            cursor.execute('''
                SELECT id FROM properties
                WHERE client_id = "juliana_shewmaker"
                AND (
                    LOWER(REPLACE(address, " ", "")) = LOWER(REPLACE(?, " ", ""))
                    OR LOWER(REPLACE(address, " ", "")) LIKE LOWER(REPLACE(?, " ", "")) || '%'
                    OR LOWER(REPLACE(?, " ", "")) LIKE LOWER(REPLACE(address, " ", "")) || '%'
                )
            ''', (address_part, address_part, address_part))

            prop_result = cursor.fetchone()

            if prop_result:
                property_id = prop_result[0]

                # Generate report ID
                report_id = uuid.uuid4().hex

                # Format date
                try:
                    date_obj = datetime.strptime(date_part, '%Y%m%d')
                    inspection_date = date_obj.strftime('%Y-%m-%d')
                except:
                    inspection_date = '2025-10-09'

                # Find PDF file
                pdf_path = None
                pdf_dir = folder / 'pdf'
                if pdf_dir.exists():
                    pdf_files = list(pdf_dir.glob('*.pdf'))
                    if pdf_files:
                        pdf_path = str(pdf_files[0])

                # Find JSON file
                json_path = str(folder / 'web' / 'report.json')
                if not Path(json_path).exists():
                    json_path = None

                # Check if report already exists for this property and date
                cursor.execute('''
                    SELECT id FROM reports
                    WHERE property_id = ? AND inspection_date = ?
                ''', (property_id, inspection_date))

                if not cursor.fetchone():
                    # Insert report
                    cursor.execute('''
                        INSERT INTO reports
                        (id, property_id, address, inspection_date, pdf_path, json_path, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                    ''', (report_id, property_id, address_part, inspection_date, pdf_path, json_path))

                    print(f"Added report for: {address_part} ({inspection_date})")
                    report_count += 1

conn.commit()
print(f"\nAdded {report_count} new reports")

# Remove duplicates - keep newest of each property/date combination
print("\nRemoving duplicate reports...")
cursor.execute('''
    DELETE FROM reports
    WHERE id NOT IN (
        SELECT MIN(id)
        FROM reports
        GROUP BY property_id, inspection_date
    )
''')
duplicates_removed = cursor.rowcount
conn.commit()
print(f"Removed {duplicates_removed} duplicate reports")

# Final count
cursor.execute('SELECT COUNT(DISTINCT id) FROM properties WHERE client_id = "juliana_shewmaker"')
prop_count = cursor.fetchone()[0]
cursor.execute('SELECT COUNT(*) FROM reports WHERE property_id IN (SELECT id FROM properties WHERE client_id = "juliana_shewmaker")')
report_count = cursor.fetchone()[0]

print(f"\nFinal counts for Juliana:")
print(f"  Properties: {prop_count}")
print(f"  Reports: {report_count}")

# List all properties with report counts
cursor.execute('''
    SELECT p.address, COUNT(r.id) as report_count
    FROM properties p
    LEFT JOIN reports r ON p.id = r.property_id
    WHERE p.client_id = "juliana_shewmaker"
    GROUP BY p.address
    ORDER BY p.address
''')

print("\nAll properties with report counts:")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} report(s)")

conn.close()