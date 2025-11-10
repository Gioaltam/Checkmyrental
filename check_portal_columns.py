import sqlite3
conn = sqlite3.connect('backend/app.db')
cur = conn.cursor()
cur.execute('PRAGMA table_info(portal_clients)')
print("portal_clients columns:")
for row in cur.fetchall():
    print(f"  {row}")

print("\nChecking if owner_id column exists...")
columns = [row[1] for row in cur.execute('PRAGMA table_info(portal_clients)')]
if 'owner_id' in columns:
    print("  owner_id column EXISTS")
    cur.execute("SELECT id, email, full_name, owner_id FROM portal_clients")
    print("\nPortal clients:")
    for row in cur.fetchall():
        print(f"  ID: {row[0]}, Email: {row[1]}, Name: {row[2]}, owner_id: {row[3]}")
else:
    print("  owner_id column NOT FOUND")
    # Add the column
    print("\nAdding owner_id column to portal_clients...")
    cur.execute("ALTER TABLE portal_clients ADD COLUMN owner_id TEXT")
    # Set owner_id for existing clients
    cur.execute("UPDATE portal_clients SET owner_id = 'DEMO1234' WHERE email = 'julianagomesfl@yahoo.com'")
    cur.execute("UPDATE portal_clients SET owner_id = 'TEST123' WHERE email = 'heath.shewmaker@example.com'")
    conn.commit()
    print("  owner_id column added and values set")

conn.close()