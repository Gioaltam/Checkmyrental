import sqlite3

conn = sqlite3.connect('app.db')
cursor = conn.cursor()

print("=== All properties ===")
cursor.execute('SELECT id, address, client_id FROM properties')
props = cursor.fetchall()
for p in props:
    print(f'{p[0]}: {p[1]} (client: {p[2]})')

print("\n=== Juliana's client ID ===")
cursor.execute("SELECT id FROM clients WHERE portal_token = 'kAPteRCxseUo4lft8puMsA'")
juliana = cursor.fetchone()
print(f"Juliana ID: {juliana[0] if juliana else 'NOT FOUND'}")

print("\n=== Properties for Juliana ===")
if juliana:
    cursor.execute('SELECT id, address FROM properties WHERE client_id = ?', (juliana[0],))
    juliana_props = cursor.fetchall()
    print(f"Count: {len(juliana_props)}")
    for p in juliana_props:
        print(f'  {p[0]}: {p[1]}')

conn.close()
