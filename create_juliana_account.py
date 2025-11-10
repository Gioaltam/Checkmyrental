"""
Create a paid portal account for Juliana Shewmaker
"""

import sqlite3
import secrets
import sys
from pathlib import Path

# Add backend to path for password hashing
sys.path.insert(0, str(Path(__file__).parent / "backend"))
from app.portal_security import hash_password

DB_PATH = 'backend/app.db'

print("=" * 70)
print("CREATING ACCOUNT FOR JULIANA SHEWMAKER")
print("=" * 70)

# Account details
email = "julianagomesfl@yahoo.com"
full_name = "Juliana Shewmaker"
# Generate a random secure password (user can change it later)
temp_password = secrets.token_urlsafe(16)
password_hash = hash_password(temp_password)

print(f"\nAccount Details:")
print(f"  Email: {email}")
print(f"  Full Name: {full_name}")
print(f"  Temporary Password: {temp_password}")
print(f"  Status: PAID")
print()

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if account already exists
cursor.execute("SELECT id, email, full_name, is_paid FROM portal_clients WHERE email = ?", (email,))
existing = cursor.fetchone()

if existing:
    print(f"⚠️  Account already exists!")
    print(f"  ID: {existing[0]}")
    print(f"  Email: {existing[1]}")
    print(f"  Full Name: {existing[2]}")
    print(f"  Paid Status: {existing[3]}")
    print()

    response = input("Update this account to PAID status? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        cursor.execute("""
            UPDATE portal_clients
            SET is_paid = 1, full_name = ?
            WHERE email = ?
        """, (full_name, email))
        conn.commit()
        print(f"\n✅ Account updated!")
        print(f"  Set is_paid = True")
        print(f"  Updated full_name to: {full_name}")
    else:
        print("\nNo changes made.")

else:
    # Create new account
    from datetime import datetime

    cursor.execute("""
        INSERT INTO portal_clients
        (email, password_hash, full_name, is_active, is_paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        email,
        password_hash,
        full_name,
        True,  # is_active
        True,  # is_paid
        datetime.utcnow()
    ))

    conn.commit()

    # Get the created account
    cursor.execute("SELECT id, email, full_name, is_paid FROM portal_clients WHERE email = ?", (email,))
    created = cursor.fetchone()

    print(f"\n✅ Account created successfully!")
    print(f"  ID: {created[0]}")
    print(f"  Email: {created[1]}")
    print(f"  Full Name: {created[2]}")
    print(f"  Paid Status: {'PAID' if created[3] else 'UNPAID'}")
    print()
    print(f"📝 IMPORTANT - Save this information:")
    print(f"  Email: {email}")
    print(f"  Temporary Password: {temp_password}")
    print()
    print(f"⚠️  User should change password on first login!")

conn.close()

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)
print()
print("Next Steps:")
print("1. Share the email and temporary password with Juliana")
print("2. She can login at: http://localhost:4321 (or your landing page URL)")
print("3. She should change her password in the dashboard settings")
print()
print("To verify the account, run:")
print(f"  python check_portal_login.py")
