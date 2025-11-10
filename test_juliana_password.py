"""
Test Juliana's password verification to debug login issue
"""
import sqlite3
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))
from app.portal_security import verify_password, hash_password

DB_PATH = 'app.db'
email = "julianagomesfl@yahoo.com"
test_password = "Tt8nDgtT43V05gx6gaMWEA"

print("=" * 70)
print("TESTING JULIANA'S PASSWORD VERIFICATION")
print("=" * 70)
print()

# Get stored password hash from database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute('SELECT id, email, password_hash, is_paid FROM portal_clients WHERE email = ?', (email,))
result = cursor.fetchone()

if not result:
    print("[ERROR] Account not found in database!")
    conn.close()
    sys.exit(1)

account_id, stored_email, stored_hash, is_paid = result

print(f"Account Found:")
print(f"  ID: {account_id}")
print(f"  Email: {stored_email}")
print(f"  Paid: {is_paid}")
print(f"  Password Hash: {stored_hash[:50]}...")
print()

# Test password verification
print("Testing password verification...")
is_valid = verify_password(test_password, stored_hash)
print(f"  Result: {is_valid}")
print()

if is_valid:
    print("[OK] Password verification PASSED!")
    print("Login should work. Check other issues (backend running, correct endpoint, etc.)")
else:
    print("[FAIL] Password verification FAILED!")
    print()
    print("Regenerating password hash and updating database...")

    # Generate new hash
    new_hash = hash_password(test_password)
    print(f"  New Hash: {new_hash[:50]}...")

    # Update database
    cursor.execute('UPDATE portal_clients SET password_hash = ? WHERE email = ?',
                   (new_hash, email))
    conn.commit()

    print("[OK] Database updated with new password hash")
    print()

    # Test again
    print("Re-testing verification with new hash...")
    cursor.execute('SELECT password_hash FROM portal_clients WHERE email = ?', (email,))
    updated_hash = cursor.fetchone()[0]
    is_valid_now = verify_password(test_password, updated_hash)
    print(f"  Result: {is_valid_now}")
    print()

    if is_valid_now:
        print("[OK] Password verification NOW WORKS!")
        print("Try logging in again.")
    else:
        print("[ERROR] Still failing! This is a deeper issue.")

conn.close()

print()
print("=" * 70)
print("DONE")
print("=" * 70)
