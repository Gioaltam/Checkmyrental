import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime

# Connect to both databases
workspace_db = sqlite3.connect('workspace/inspection_portal.db')
workspace_db.row_factory = sqlite3.Row
main_db = sqlite3.connect('app.db')

# Get all reports from workspace database
cursor_w = workspace_db.cursor()
cursor_w.execute('SELECT * FROM reports')
reports = cursor_w.fetchall()

print(f'Found {len(reports)} reports to migrate')

cursor_m = main_db.cursor()

migrated = 0
skipped = 0

# For each report in workspace DB
for report in reports:
    # Check if report already exists in main DB
    cursor_m.execute('SELECT id FROM reports WHERE id = ?', (report['id'],))
    if cursor_m.fetchone():
        print(f'Report {report["id"][:8]}... already exists, skipping')
        skipped += 1
        continue

    # Parse the web_dir to get the workspace folder
    web_dir = report['web_dir']
    if web_dir:
        # Convert web_dir path to get the actual workspace folder
        # Handle both forward and backward slashes
        parts = web_dir.replace('\\', '/').split('/')
        if len(parts) >= 3:
            folder_name = parts[2]  # e.g., '13699 99th Ave Unit 2_20251009_203528'

            # Try to extract address and date from folder name
            if '_' in folder_name:
                parts_split = folder_name.rsplit('_', 2)
                address_part = parts_split[0]
                date_part = parts_split[1] if len(parts_split) > 1 else '20251009'

                # Format the date
                try:
                    date_obj = datetime.strptime(date_part, '%Y%m%d')
                    inspection_date = date_obj.strftime('%Y-%m-%d')
                except:
                    inspection_date = '2025-10-09'

                # Clean address for matching
                clean_address = address_part.strip().lower()

                # Try to find matching property
                cursor_m.execute('''
                    SELECT id FROM properties
                    WHERE LOWER(REPLACE(REPLACE(address, " ", ""), ".", "")) =
                          LOWER(REPLACE(REPLACE(?, " ", ""), ".", ""))
                ''', (address_part,))
                prop_result = cursor_m.fetchone()

                if prop_result:
                    property_id = prop_result[0]

                    # Construct paths
                    pdf_path = f'workspace/outputs/{folder_name}/pdf'
                    json_path = f'workspace/outputs/{folder_name}/web/report.json'

                    # Check if PDF exists and find the actual filename
                    pdf_dir = Path(pdf_path)
                    if pdf_dir.exists():
                        pdf_files = list(pdf_dir.glob('*.pdf'))
                        if pdf_files:
                            pdf_path = str(pdf_files[0])

                    # Insert into main database
                    try:
                        cursor_m.execute('''
                            INSERT INTO reports
                            (id, property_id, address, inspection_date, pdf_path, json_path, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                        ''', (report['id'], property_id, address_part, inspection_date, pdf_path, json_path))

                        print(f'Migrated report {report["id"][:8]}... for {address_part}')
                        migrated += 1
                    except sqlite3.IntegrityError as e:
                        print(f'Error migrating {report["id"][:8]}: {e}')
                else:
                    # Try to find property with fuzzy matching
                    cursor_m.execute('SELECT id, address FROM properties WHERE client_id = "juliana_shewmaker"')
                    all_props = cursor_m.fetchall()
                    print(f'Could not find exact match for: {address_part}')
                    print(f'  Available properties: {[p[1] for p in all_props]}')

main_db.commit()

# Check final count
cursor_m.execute('SELECT COUNT(*) FROM reports')
final_count = cursor_m.fetchone()[0]
print(f'\nMigration complete:')
print(f'  Migrated: {migrated} reports')
print(f'  Skipped: {skipped} reports')
print(f'  Total reports in main DB: {final_count}')

workspace_db.close()
main_db.close()