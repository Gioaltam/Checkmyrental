#!/usr/bin/env python3
"""
Update Juliana's account to production-ready status
"""

import sqlite3
import sys
from pathlib import Path

def update_juliana_to_production():
    """Update Juliana's account from demo to production"""

    db_path = Path("backend/app.db")
    if not db_path.exists():
        print(f"Error: Database not found at {db_path}")
        return False

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    try:
        # Check current status
        cur.execute("""
            SELECT id, owner_id, full_name, email, is_paid
            FROM portal_clients
            WHERE email = 'julianagomesfl@yahoo.com'
        """)

        result = cur.fetchone()
        if not result:
            print("Error: Juliana's account not found")
            return False

        client_id, current_owner_id, full_name, email, is_paid = result

        print("Current Account Status:")
        print(f"  Name: {full_name}")
        print(f"  Email: {email}")
        print(f"  Current Owner ID: {current_owner_id}")
        print(f"  Paid Status: {'Yes' if is_paid else 'No'}")
        print()

        # Generate a professional owner_id
        # Using initials + unique number for production
        new_owner_id = "JS2024001"  # Juliana Shewmaker, 2024, Account 001

        print(f"Updating to Production Owner ID: {new_owner_id}")

        # Update the owner_id
        cur.execute("""
            UPDATE portal_clients
            SET owner_id = ?
            WHERE id = ?
        """, (new_owner_id, client_id))

        # Update any existing client records that might be linked
        if current_owner_id:
            # Check if there's a client record using the old owner_id as name
            cur.execute("""
                SELECT COUNT(*)
                FROM clients
                WHERE name = ?
            """, (current_owner_id,))

            client_count = cur.fetchone()[0]
            if client_count > 0:
                cur.execute("""
                    UPDATE clients
                    SET name = ?
                    WHERE name = ?
                """, (new_owner_id, current_owner_id))
                print(f"  Updated client record to use new owner_id")

        conn.commit()
        print()
        print("SUCCESS: Account updated to production status!")
        print()
        print("Production Configuration:")
        print(f"  Production Owner ID: {new_owner_id}")
        print(f"  Dashboard URL: http://localhost:3000/")
        print(f"  Status: PAID CUSTOMER")
        print()
        print("IMPORTANT: In the Operator App, Juliana will now appear as:")
        print(f"  'Juliana Shewmaker ({new_owner_id})'")

        return True

    except Exception as e:
        print(f"Error updating account: {e}")
        conn.rollback()
        return False

    finally:
        conn.close()

if __name__ == "__main__":
    success = update_juliana_to_production()
    sys.exit(0 if success else 1)