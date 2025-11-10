import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))
from app.portal_security import hash_password
from datetime import datetime

# Account details (same as before)
email = "julianagomesfl@yahoo.com"
full_name = "Juliana Shewmaker"
password = "Tt8nDgtT43V05gx6gaMWEA"  # Same temporary password

# Use the correct database that backend is using
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Check if account exists
cursor.execute("SELECT id, is_paid FROM portal_clients WHERE email = ?", (email,))
existing = cursor.fetchone()

if existing:
    print(f"Account already exists in app.db (ID: {existing[0]})")
    print(f"Updating to PAID status...")
    cursor.execute("UPDATE portal_clients SET is_paid = 1, full_name = ? WHERE email = ?", (full_name, email))
    conn.commit()
    print("Updated!")
else:
    # Create account
    cursor.execute("""
        INSERT INTO portal_clients
        (email, password_hash, full_name, is_active, is_paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        email,
        hash_password(password),
        full_name,
        1,  # is_active
        1,  # is_paid
        datetime.now()
    ))
    conn.commit()
    print(f"Created account: {full_name} ({email})")

# Verify
cursor.execute("SELECT id, email, full_name, is_paid FROM portal_clients WHERE email = ?", (email,))
result = cursor.fetchone()
print(f"\nVerification:")
print(f"  ID: {result[0]}")
print(f"  Email: {result[1]}")
print(f"  Full Name: {result[2]}")
print(f"  Paid Status: {'PAID' if result[3] else 'UNPAID'}")

conn.close()
print("\nDone! Account is ready in the correct database.")
