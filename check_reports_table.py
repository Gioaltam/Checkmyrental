import sqlite3

db_path = "backend/app.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("Checking reports table structure...")
cur.execute("PRAGMA table_info(reports)")
columns = cur.fetchall()
print("Reports table columns:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

# Check if web_dir and pdf_path columns exist
column_names = [col[1] for col in columns]
if 'web_dir' not in column_names:
    print("\nAdding web_dir column...")
    cur.execute("ALTER TABLE reports ADD COLUMN web_dir TEXT")
    conn.commit()
    print("  web_dir column added")

if 'pdf_path' not in column_names:
    print("\nAdding pdf_path column...")
    cur.execute("ALTER TABLE reports ADD COLUMN pdf_path TEXT")
    conn.commit()
    print("  pdf_path column added")

# Check again
cur.execute("PRAGMA table_info(reports)")
columns = cur.fetchall()
print("\nUpdated reports table columns:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

conn.close()