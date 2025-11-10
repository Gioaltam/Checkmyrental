#!/usr/bin/env python3
"""
Fix the clients table to have proper entry for Juliana
"""

import sqlite3
from pathlib import Path

def fix_clients_table():
    db_path = Path("backend/app.db")
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    try:
        # Check if Juliana has entry in clients table
        cur.execute("""
            SELECT id FROM clients
            WHERE portal_token = 'JS2024001' OR portal_token = 'DEMO1234'
        """)
        existing = cur.fetchone()

        if existing:
            # Update existing entry
            print("Updating existing client entry...")
            cur.execute("""
                UPDATE clients
                SET portal_token = 'JS2024001',
                    name = 'Juliana Shewmaker',
                    is_paid = 1
                WHERE portal_token IN ('JS2024001', 'DEMO1234')
            """)
        else:
            # Create new entry
            print("Creating new client entry for Juliana...")
            cur.execute("""
                INSERT INTO clients (
                    id,
                    name,
                    email,
                    portal_token,
                    is_paid,
                    company_name,
                    contact_name
                ) VALUES (
                    'client_juliana_001',
                    'Juliana Shewmaker',
                    'julianagomesfl@yahoo.com',
                    'JS2024001',
                    1,
                    'Juliana Shewmaker Properties',
                    'Juliana Shewmaker'
                )
            """)

        conn.commit()
        print("SUCCESS! Clients table fixed.")

        # Verify
        cur.execute("""
            SELECT name, portal_token, is_paid
            FROM clients
            WHERE portal_token = 'JS2024001'
        """)
        result = cur.fetchone()
        if result:
            print(f"\nVerification:")
            print(f"  Name: {result[0]}")
            print(f"  Token: {result[1]}")
            print(f"  Paid: {result[2]}")
            print("\nNow restart the backend and retry!")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_clients_table()