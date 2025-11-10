import sqlite3
import secrets

# Generate a clean token
token = secrets.token_urlsafe(16)

print("=== Setting up Juliana Shewmaker ===\n")

# Clean up app.db
print("1. Cleaning app.db...")
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Delete all Juliana-related entries
cursor.execute("DELETE FROM clients WHERE email LIKE '%juliana%' OR name LIKE '%Juliana%'")
conn.commit()

# Create single Juliana entry
juliana_id = 'juliana_shewmaker'
cursor.execute("""
    INSERT INTO clients (id, name, company_name, contact_name, email, portal_token, is_paid, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (juliana_id, 'Juliana Shewmaker', 'Juliana Shewmaker Properties', 'Juliana Shewmaker',
      'juliana.shewmaker@checkmyrental.com', token, 1, ''))
conn.commit()

# Check for existing properties and reports
cursor.execute("SELECT COUNT(*) FROM properties")
prop_count = cursor.fetchone()[0]
print(f"   Found {prop_count} properties in database")

# Assign all properties to Juliana (since you said you've already created reports for her)
cursor.execute("UPDATE properties SET client_id = ?", (juliana_id,))
conn.commit()

cursor.execute("SELECT COUNT(*) FROM properties WHERE client_id = ?", (juliana_id,))
juliana_props = cursor.fetchone()[0]

cursor.execute("""
    SELECT COUNT(*) FROM reports r
    JOIN properties p ON r.property_id = p.id
    WHERE p.client_id = ?
""", (juliana_id,))
juliana_reports = cursor.fetchone()[0]

print(f"   Assigned {juliana_props} properties to Juliana")
print(f"   Juliana now has {juliana_reports} reports")

conn.close()

# Clean up backend/app.db
print("\n2. Cleaning backend/app.db...")
conn2 = sqlite3.connect('backend/app.db')
cursor2 = conn2.cursor()

cursor2.execute("DELETE FROM clients WHERE email LIKE '%juliana%' OR name LIKE '%Juliana%'")
conn2.commit()

cursor2.execute("""
    INSERT INTO clients (id, name, company_name, contact_name, email, portal_token, is_paid, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (juliana_id, 'Juliana Shewmaker', 'Juliana Shewmaker Properties', 'Juliana Shewmaker',
      'juliana.shewmaker@checkmyrental.com', token, 1, ''))
conn2.commit()
print("   Backend database updated")

conn2.close()

print("\n=== Setup Complete! ===")
print(f"\nJuliana Shewmaker's Dashboard:")
print(f"  Token: {token}")
print(f"  URL: http://localhost:3000/dashboard/{token}")
print(f"  Properties: {juliana_props}")
print(f"  Reports: {juliana_reports}")
