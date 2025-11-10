import sqlite3
from pathlib import Path

# Connect to the database
db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== PORTAL CLIENTS TABLE ===\n")

# Check portal_clients table
cursor.execute("SELECT * FROM portal_clients")
clients = cursor.fetchall()

print(f"Found {len(clients)} portal clients:\n")

cursor.execute("PRAGMA table_info(portal_clients)")
columns = cursor.fetchall()
col_names = [col[1] for col in columns]

for client in clients:
    for i, value in enumerate(client):
        print(f"  {col_names[i]}: {value}")
    print()

conn.close()

print("="*60)
print("If this is empty, you may need to add Juliana to portal_clients:")
print("Run: python create_juliana_account.py")