import sqlite3

print("=== Checking Portal Login Accounts ===\n")

try:
    conn = sqlite3.connect('backend/app.db')
    cursor = conn.cursor()

    # Check if portal_clients table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='portal_clients'")
    if cursor.fetchone():
        print("[OK] portal_clients table exists\n")

        # Check for Juliana
        cursor.execute("SELECT id, email, full_name FROM portal_clients WHERE email LIKE '%juliana%'")
        accounts = cursor.fetchall()

        if accounts:
            print(f"Found {len(accounts)} portal_clients account(s) for Juliana:\n")
            for acc in accounts:
                print(f"  ID: {acc[0]}")
                print(f"  Email: {acc[1]}")
                print(f"  Name: {acc[2]}")
                print()
        else:
            print("[X] No portal_clients account found for Juliana")
            print("\nTo create a login account, you need to either:")
            print("1. Register via the Sign Up form on the landing page")
            print("2. Or run a script to create the account")
    else:
        print("[X] portal_clients table does not exist")
        print("The backend might be using a different table name")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
