#!/usr/bin/env python3
"""
Quick database fix for production
"""

import sqlite3

conn = sqlite3.connect('backend/app.db')
cur = conn.cursor()

# Clean old entries
cur.execute("DELETE FROM clients WHERE portal_token IN ('DEMO1234', 'JS2024001')")

# Update portal_clients
cur.execute("""
    UPDATE portal_clients
    SET owner_id = 'JS2024001'
    WHERE email = 'julianagomesfl@yahoo.com'
""")

# Fix portal_client_tokens
cur.execute("""
    DELETE FROM portal_client_tokens
    WHERE client_id = (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')
""")

cur.execute("""
    INSERT INTO portal_client_tokens (client_id, portal_token, created_at)
    SELECT id, 'JS2024001', datetime('now')
    FROM portal_clients
    WHERE email = 'julianagomesfl@yahoo.com'
""")

# Create fresh client entry
cur.execute("""
    INSERT INTO clients (
        id, name, email, portal_token, is_paid,
        company_name, contact_name
    ) VALUES (
        'client_juliana_prod', 'Juliana Shewmaker',
        'julianagomesfl@yahoo.com', 'JS2024001', 1,
        'Juliana Properties', 'Juliana Shewmaker'
    )
""")

conn.commit()
print("Database fixed!")

# Verify
cur.execute("SELECT owner_id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com'")
result = cur.fetchone()
print(f"portal_clients.owner_id: {result[0] if result else 'NOT FOUND'}")

cur.execute("SELECT portal_token FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
result = cur.fetchone()
print(f"clients.portal_token: {result[0] if result else 'NOT FOUND'}")

conn.close()
print("\nNow start the backend WITHOUT --reload flag!")