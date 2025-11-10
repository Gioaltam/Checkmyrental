import sqlite3

conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Find Juliana's client record
cursor.execute("SELECT id, name, email, portal_token FROM clients WHERE name LIKE '%Juliana%' OR email LIKE '%juliana%'")
result = cursor.fetchone()
print(f'Client: {result}')

if result:
    client_id = result[0]

    # Get properties
    cursor.execute('SELECT id, address FROM properties WHERE client_id = ?', (client_id,))
    props = cursor.fetchall()
    print(f'\nProperties: {len(props)}')
    for p in props:
        print(f'  - {p[0]}: {p[1]}')

        # Get reports for each property
        cursor.execute('SELECT id, created_at, pdf_path FROM reports WHERE property_id = ?', (p[0],))
        reports = cursor.fetchall()
        print(f'    Reports: {len(reports)}')
        for r in reports:
            print(f'      - {r[0]} ({r[1]})')

    # Get total report count
    cursor.execute('''
        SELECT COUNT(*) FROM reports r
        JOIN properties p ON r.property_id = p.id
        WHERE p.client_id = ?
    ''', (client_id,))
    count = cursor.fetchone()[0]
    print(f'\nTotal Reports: {count}')
else:
    print('No client found for Juliana')

conn.close()
