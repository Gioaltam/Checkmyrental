import sqlite3
import os

print("=== Deleting Juliana Accounts ===\n")

# Track what we delete
deleted_items = []

# 1. Delete from backend/app.db (portal_clients table)
print("1. Checking backend/app.db...")
if os.path.exists('backend/app.db'):
    conn1 = sqlite3.connect('backend/app.db')
    cursor1 = conn1.cursor()

    # Check portal_clients table
    cursor1.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='portal_clients'")
    if cursor1.fetchone():
        # Find Juliana Gomes
        cursor1.execute("SELECT id, email, full_name FROM portal_clients WHERE email LIKE '%juliana%'")
        portal_accounts = cursor1.fetchall()

        if portal_accounts:
            print(f"   Found {len(portal_accounts)} portal account(s):")
            for acc in portal_accounts:
                print(f"     - ID: {acc[0]}, Email: {acc[1]}, Name: {acc[2]}")
                deleted_items.append(f"Portal account: {acc[1]}")

            # Delete them
            cursor1.execute("DELETE FROM portal_clients WHERE email LIKE '%juliana%'")
            conn1.commit()
            print(f"   [OK] Deleted {len(portal_accounts)} portal account(s)\n")
        else:
            print("   No portal accounts found for Juliana\n")
    else:
        print("   portal_clients table not found\n")

    # Check clients table in backend/app.db
    cursor1.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'")
    if cursor1.fetchone():
        cursor1.execute("SELECT id, email, name FROM clients WHERE email LIKE '%juliana%' OR name LIKE '%Juliana%'")
        backend_clients = cursor1.fetchall()

        if backend_clients:
            print(f"   Found {len(backend_clients)} client(s) in backend/app.db:")
            for client in backend_clients:
                print(f"     - ID: {client[0]}, Email: {client[1]}, Name: {client[2]}")
                deleted_items.append(f"Backend client: {client[1]}")

            cursor1.execute("DELETE FROM clients WHERE email LIKE '%juliana%' OR name LIKE '%Juliana%'")
            conn1.commit()
            print(f"   [OK] Deleted {len(backend_clients)} client(s) from backend/app.db\n")
        else:
            print("   No clients found in backend/app.db\n")

    conn1.close()
else:
    print("   backend/app.db not found\n")

# 2. Delete from app.db (root level clients table)
print("2. Checking app.db (root level)...")
if os.path.exists('app.db'):
    conn2 = sqlite3.connect('app.db')
    cursor2 = conn2.cursor()

    # Check clients table
    cursor2.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'")
    if cursor2.fetchone():
        cursor2.execute("SELECT id, email, name FROM clients WHERE email LIKE '%juliana%' OR name LIKE '%Juliana%'")
        root_clients = cursor2.fetchall()

        if root_clients:
            print(f"   Found {len(root_clients)} client(s):")
            for client in root_clients:
                print(f"     - ID: {client[0]}, Email: {client[1]}, Name: {client[2]}")
                deleted_items.append(f"Root client: {client[1]}")

            cursor2.execute("DELETE FROM clients WHERE email LIKE '%juliana%' OR name LIKE '%Juliana%'")
            conn2.commit()
            print(f"   [OK] Deleted {len(root_clients)} client(s) from app.db\n")
        else:
            print("   No clients found in app.db\n")
    else:
        print("   clients table not found in app.db\n")

    conn2.close()
else:
    print("   app.db not found\n")

# Summary
print("=" * 50)
print("DELETION COMPLETE")
print("=" * 50)

if deleted_items:
    print(f"\nDeleted {len(deleted_items)} account(s):")
    for item in deleted_items:
        print(f"  [OK] {item}")
else:
    print("\nNo accounts found to delete.")

print("\n[DONE] All Juliana accounts have been removed from the database.")
