#!/usr/bin/env python3
"""
Fix ALL token references to use production ID (JS2024001)
This fixes the SQLAlchemy caching issue by updating all tables
"""

import sqlite3
import sys
from pathlib import Path

def fix_all_tokens():
    """Update all token references from DEMO1234 to JS2024001"""

    db_path = Path("backend/app.db")
    if not db_path.exists():
        print(f"Error: Database not found at {db_path}")
        return False

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    try:
        old_token = "DEMO1234"
        new_token = "JS2024001"

        print("=" * 60)
        print("FIXING ALL TOKEN REFERENCES FOR PRODUCTION")
        print("=" * 60)
        print(f"Changing: {old_token} -> {new_token}")
        print()

        # 1. Update portal_client_tokens table
        print("1. Updating portal_client_tokens...")
        cur.execute("""
            UPDATE portal_client_tokens
            SET portal_token = ?
            WHERE portal_token = ?
        """, (new_token, old_token))
        tokens_updated = cur.rowcount
        print(f"   Updated {tokens_updated} token(s)")

        # 2. Update clients table portal_token
        print("2. Updating clients table...")
        cur.execute("""
            UPDATE clients
            SET portal_token = ?
            WHERE portal_token = ?
        """, (new_token, old_token))
        clients_updated = cur.rowcount
        print(f"   Updated {clients_updated} client token(s)")

        # 3. Ensure portal_clients has the correct owner_id
        print("3. Verifying portal_clients...")
        cur.execute("""
            UPDATE portal_clients
            SET owner_id = ?
            WHERE email = 'julianagomesfl@yahoo.com'
        """, (new_token,))
        portal_updated = cur.rowcount
        print(f"   Updated {portal_updated} portal client(s)")

        # 4. Create portal_client_token if missing
        print("4. Checking portal_client_tokens...")
        cur.execute("""
            SELECT COUNT(*) FROM portal_client_tokens
            WHERE client_id = (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')
        """)
        token_exists = cur.fetchone()[0] > 0

        if not token_exists:
            print("   Creating missing portal_client_token...")
            cur.execute("""
                INSERT INTO portal_client_tokens (client_id, portal_token, created_at)
                SELECT id, ?, datetime('now')
                FROM portal_clients
                WHERE email = 'julianagomesfl@yahoo.com'
            """, (new_token,))
            print(f"   Created new token entry")
        else:
            # Update existing token
            cur.execute("""
                UPDATE portal_client_tokens
                SET portal_token = ?
                WHERE client_id = (SELECT id FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com')
            """, (new_token,))
            print(f"   Updated existing token entry")

        # Commit all changes
        conn.commit()

        # Verify the changes
        print()
        print("5. Verification:")
        cur.execute("""
            SELECT pc.owner_id, pct.portal_token
            FROM portal_clients pc
            LEFT JOIN portal_client_tokens pct ON pc.id = pct.client_id
            WHERE pc.email = 'julianagomesfl@yahoo.com'
        """)
        result = cur.fetchone()
        if result:
            owner_id, portal_token = result
            print(f"   owner_id: {owner_id}")
            print(f"   portal_token: {portal_token}")

            if owner_id == new_token and portal_token == new_token:
                print()
                print("SUCCESS! All tokens updated to production ID")
                print()
                print("CRITICAL NEXT STEP:")
                print("-" * 40)
                print("You MUST restart the backend to clear SQLAlchemy cache:")
                print()
                print("1. Press Ctrl+C in the backend terminal")
                print("2. Run again:")
                print("   cd backend")
                print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
                print()
                print("After restart, the operator app will show:")
                print(f"   'Juliana Shewmaker ({new_token})'")
                return True
            else:
                print("   WARNING: Some values not updated correctly")
                return False
        else:
            print("   ERROR: Could not find Juliana's account")
            return False

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
        return False

    finally:
        conn.close()

if __name__ == "__main__":
    success = fix_all_tokens()
    sys.exit(0 if success else 1)