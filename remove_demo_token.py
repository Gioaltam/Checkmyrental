"""
Remove DEMO1234 token and use only JS2024001 for Juliana
"""
import sqlite3
from pathlib import Path

print("REMOVING DEMO TOKEN AND SETTING CORRECT TOKEN")
print("=" * 60)

# Update both databases
databases = [
    Path("app.db"),
    Path("backend/app.db")
]

for db_path in databases:
    if not db_path.exists():
        continue

    print(f"\nUpdating {db_path}:")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Check current state
    print("  Current tokens for Juliana:")
    cursor.execute("""
        SELECT * FROM portal_client_tokens
        WHERE client_id = 2
    """)
    tokens = cursor.fetchall()
    for token in tokens:
        print(f"    Token record: {token}")

    # 2. Delete DEMO1234 token
    cursor.execute("""
        DELETE FROM portal_client_tokens
        WHERE portal_token = 'DEMO1234'
    """)
    deleted = cursor.rowcount
    if deleted:
        print(f"    Deleted {deleted} DEMO1234 token(s)")

    # 3. Insert JS2024001 as the correct token for Juliana
    try:
        cursor.execute("""
            INSERT INTO portal_client_tokens (client_id, portal_token)
            VALUES (2, 'JS2024001')
        """)
        print("    Added JS2024001 token for Juliana")
    except sqlite3.IntegrityError:
        print("    JS2024001 token already exists")

    # 4. Update clients table to ensure consistency
    cursor.execute("""
        UPDATE clients
        SET portal_token = 'JS2024001'
        WHERE email = 'julianagomesfl@yahoo.com'
    """)
    updated = cursor.rowcount
    if updated:
        print(f"    Updated {updated} client record(s) with JS2024001")

    conn.commit()

    # 5. Verify the change
    print("\n  After update:")
    cursor.execute("""
        SELECT client_id, portal_token FROM portal_client_tokens
        WHERE client_id = 2
    """)
    tokens = cursor.fetchall()
    for token in tokens:
        print(f"    Client {token[0]} -> Token: {token[1]}")

    conn.close()

print("\n" + "=" * 60)
print("TOKEN UPDATED!")
print("=" * 60)
print("\nJuliana's token is now: JS2024001")
print("\nDashboard URLs:")
print("- http://localhost:3000?token=JS2024001")
print("\nThe operator app should:")
print("- Use 'portal_2' internally for portal_client_id")
print("- But show dashboard with token=JS2024001")