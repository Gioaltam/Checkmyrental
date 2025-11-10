"""
Set up Juliana's password in the portal_clients table
"""
import sqlite3
from pathlib import Path
import hashlib
import sys
import io

# Set UTF-8 encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("SETTING UP JULIANA'S PASSWORD")
print("=" * 60)

# Connect to database
db_path = Path("app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if Juliana exists in portal_clients
cursor.execute("""
    SELECT id, full_name, email, password_hash
    FROM portal_clients
    WHERE id = 2 OR email = 'julianagomesfl@yahoo.com'
""")
juliana = cursor.fetchone()

if juliana:
    print(f"Found Juliana: {juliana[1]} ({juliana[2]})")
    print(f"Current password_hash: {juliana[3][:20] if juliana[3] else 'None'}...")

    # Set a known password for testing
    # Using bcrypt-style hashing that the backend expects
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # Set password to "password123" for testing
    new_password = "password123"
    password_hash = pwd_context.hash(new_password)

    # Update Juliana's password
    cursor.execute("""
        UPDATE portal_clients
        SET password_hash = ?
        WHERE id = 2
    """, (password_hash,))

    conn.commit()
    print(f"\n✅ Password updated successfully!")
    print(f"   • Email: julianagomesfl@yahoo.com")
    print(f"   • Password: {new_password}")
    print(f"   • Hash: {password_hash[:20]}...")

    # Verify the update
    cursor.execute("SELECT password_hash FROM portal_clients WHERE id = 2")
    result = cursor.fetchone()
    if result:
        print(f"\n✅ Verified: Password hash is now set")

        # Test the password verification
        if pwd_context.verify(new_password, result[0]):
            print("✅ Password verification works!")
        else:
            print("❌ Password verification failed!")
else:
    print("❌ Juliana not found in portal_clients table!")
    print("\nCreating Juliana's account...")

    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    password_hash = pwd_context.hash("password123")

    cursor.execute("""
        INSERT INTO portal_clients (id, email, password_hash, full_name, is_active, is_paid, properties_data)
        VALUES (2, 'julianagomesfl@yahoo.com', ?, 'Juliana Shewmaker', 1, 1, ?)
    """, (password_hash, '[{"name": "Main Property", "address": "904 Marshal St, St Petersburg, FL"}]'))

    conn.commit()
    print("✅ Created Juliana's account with password")

conn.close()

print("\n" + "=" * 60)
print("LOGIN CREDENTIALS FOR JULIANA:")
print("=" * 60)
print("Email: julianagomesfl@yahoo.com")
print("Password: password123")
print("\nYou can now log in from the Astro landing page!")