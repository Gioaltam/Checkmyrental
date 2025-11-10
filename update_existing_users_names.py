"""
Script to identify and update existing portal_clients with missing or incomplete full_name.

This helps with:
1. Finding users who registered before full_name was required
2. Suggesting names derived from emails
3. Allowing manual updates for these users
"""

import sqlite3
import sys

DB_PATH = 'backend/app.db'

print("=" * 70)
print("EXISTING USERS NAME UPDATE TOOL")
print("=" * 70)

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Find portal_clients with email-derived or missing full_name
cursor.execute("""
    SELECT id, email, full_name, is_paid, created_at
    FROM portal_clients
    ORDER BY created_at DESC
""")
users = cursor.fetchall()

print(f"\nFound {len(users)} total portal client(s)\n")

# Check each user
users_needing_update = []
for user_id, email, full_name, is_paid, created_at in users:
    email_prefix = email.split('@')[0]
    derived_name = email_prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()

    # Check if full_name looks auto-generated from email
    is_auto_generated = (full_name == derived_name)

    status = "[PAID]" if is_paid else "[UNPAID]"

    if is_auto_generated:
        print(f"{status} ID: {user_id}")
        print(f"  Email: {email}")
        print(f"  Name:  {full_name} (AUTO-GENERATED)")
        print(f"  Date:  {created_at}")
        print()
        users_needing_update.append((user_id, email, full_name))
    else:
        print(f"{status} ID: {user_id}")
        print(f"  Email: {email}")
        print(f"  Name:  {full_name}")
        print(f"  Date:  {created_at}")
        print()

print("=" * 70)
print("SUMMARY")
print("=" * 70)

if users_needing_update:
    print(f"\n{len(users_needing_update)} user(s) have auto-generated names:")
    for user_id, email, full_name in users_needing_update:
        print(f"  - {email} ({full_name})")

    print("\nRecommendations:")
    print("1. Contact these users to update their profile with real name")
    print("2. Add 'Profile' section in dashboard settings for self-service")
    print("3. Send email campaign asking them to complete their profile")
    print("\nTo manually update a user's name:")
    print("  UPDATE portal_clients SET full_name = 'John Doe' WHERE id = 1;")
else:
    print("\n[OK] All users have proper full names!")

# Also check regular clients table for comparison
print("\n" + "=" * 70)
print("REGULAR CLIENTS (for comparison)")
print("=" * 70)

cursor.execute("""
    SELECT id, email, contact_name, is_paid
    FROM clients
    WHERE is_paid = 1
    LIMIT 10
""")
regular_clients = cursor.fetchall()

print(f"\nFound {len(regular_clients)} paid regular client(s):\n")
for client_id, email, contact_name, is_paid in regular_clients:
    print(f"  {contact_name} ({email})")

conn.close()

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)
