import sqlite3

# Check backend/app.db (the one the backend uses)
print("=== Checking backend/app.db ===")
conn = sqlite3.connect('backend/app.db')
cursor = conn.cursor()

cursor.execute("SELECT id, name, portal_token FROM clients WHERE portal_token = 'kAPteRCxseUo4lft8puMsA'")
client = cursor.fetchone()
print(f"Client: {client}")

if client:
    cursor.execute('SELECT COUNT(*) FROM properties WHERE client_id = ?', (client[0],))
    prop_count = cursor.fetchone()[0]
    print(f"Properties: {prop_count}")

    cursor.execute('SELECT id, address FROM properties WHERE client_id = ? LIMIT 5', (client[0],))
    props = cursor.fetchall()
    for p in props:
        print(f'  - {p[0]}: {p[1]}')

    cursor.execute('''
        SELECT COUNT(*) FROM reports r
        JOIN properties p ON r.property_id = p.id
        WHERE p.client_id = ?
    ''', (client[0],))
    report_count = cursor.fetchone()[0]
    print(f"Reports: {report_count}")
else:
    print("Client not found in backend/app.db!")

conn.close()

# Check root app.db
print("\n=== Checking root app.db ===")
conn2 = sqlite3.connect('app.db')
cursor2 = conn2.cursor()

cursor2.execute("SELECT id, name, portal_token FROM clients WHERE portal_token = 'kAPteRCxseUo4lft8puMsA'")
client2 = cursor2.fetchone()
print(f"Client: {client2}")

if client2:
    cursor2.execute('SELECT COUNT(*) FROM properties WHERE client_id = ?', (client2[0],))
    prop_count2 = cursor2.fetchone()[0]
    print(f"Properties: {prop_count2}")

    cursor2.execute('SELECT id, address FROM properties WHERE client_id = ? LIMIT 5', (client2[0],))
    props2 = cursor2.fetchall()
    for p in props2:
        print(f'  - {p[0]}: {p[1]}')

conn2.close()
