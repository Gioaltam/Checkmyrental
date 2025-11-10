#!/usr/bin/env python3
"""Debug the report save process step by step"""

import sqlite3
from datetime import datetime

db_path = "backend/app.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Test data
owner_id = "DEMO1234"
property_address = "2460 Melrose Ave S"
report_id = f"debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

print("=" * 60)
print("DEBUG: Report Save Process for Juliana")
print("=" * 60)

# Step 1: Check portal_clients
print("\n1. Checking portal_clients for owner_id = DEMO1234...")
cur.execute("""
    SELECT id, full_name, email, owner_id FROM portal_clients
    WHERE owner_id = ? OR full_name = ?
""", (owner_id, owner_id))
portal_client = cur.fetchone()
if portal_client:
    print(f"   Found portal client: ID={portal_client['id']}, Name={portal_client['full_name']}")
else:
    print("   No portal client found")

# Step 2: Check/create clients entry
print("\n2. Checking clients table...")
if portal_client:
    client_name = portal_client['full_name']
    portal_client_id = portal_client['id']

    # Check if client exists
    cur.execute("SELECT id, name FROM clients WHERE id = ? OR name = ?", (portal_client_id, client_name))
    client = cur.fetchone()

    if client:
        client_id = client['id']
        print(f"   Found existing client: ID={client_id}, Name={client['name']}")
    else:
        print(f"   Creating new client with ID={portal_client_id}, Name={client_name}")
        try:
            cur.execute("INSERT OR REPLACE INTO clients (id, name, email) VALUES (?, ?, '')",
                       (portal_client_id, client_name))
            client_id = portal_client_id
            conn.commit()
            print(f"   Client created successfully")
        except Exception as e:
            print(f"   ERROR creating client: {e}")
else:
    client_id = None
    print("   Cannot proceed without portal client")

# Step 3: Check properties table structure
print("\n3. Checking properties table structure...")
cur.execute("PRAGMA table_info(properties)")
properties_columns = cur.fetchall()
print("   Properties columns:")
for col in properties_columns:
    print(f"     {col[1]} ({col[2]}) - PK: {col[5]}, NOT NULL: {col[3]}")

# Step 4: Try to insert property
if client_id:
    print(f"\n4. Attempting to insert property...")
    print(f"   client_id: {client_id}")
    print(f"   address: {property_address}")

    # First check if it exists
    cur.execute("SELECT id FROM properties WHERE client_id = ? AND address = ?",
               (client_id, property_address))
    prop = cur.fetchone()

    if prop:
        property_id = prop['id']
        print(f"   Found existing property: ID={property_id}")
    else:
        try:
            cur.execute("INSERT INTO properties (client_id, address) VALUES (?, ?)",
                       (client_id, property_address))
            property_id = cur.lastrowid
            conn.commit()
            print(f"   Property created successfully: ID={property_id}")
        except Exception as e:
            print(f"   ERROR creating property: {e}")
            # Try to see what's wrong
            print("\n   Checking ALL properties:")
            cur.execute("SELECT * FROM properties")
            for row in cur.fetchall():
                print(f"     {dict(row)}")

conn.close()
print("\n" + "=" * 60)