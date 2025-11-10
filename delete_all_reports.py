"""
Delete all existing reports so we can test with fresh data
"""
import sqlite3
from pathlib import Path
import sys
import io

# Set UTF-8 encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("DELETING ALL EXISTING REPORTS")
print("=" * 60)

# Connect to database
db_path = Path("app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Count existing reports
cursor.execute("SELECT COUNT(*) FROM reports")
report_count = cursor.fetchone()[0]

print(f"Found {report_count} existing reports")

if report_count > 0:
    # Delete all reports
    cursor.execute("DELETE FROM reports")
    conn.commit()
    print(f"✓ Deleted {report_count} reports")

    # Verify deletion
    cursor.execute("SELECT COUNT(*) FROM reports")
    remaining = cursor.fetchone()[0]

    if remaining == 0:
        print("✓ All reports successfully deleted")
    else:
        print(f"⚠ Warning: {remaining} reports still remain")
else:
    print("No reports to delete")

conn.close()

print("\n" + "=" * 60)
print("✓ Database cleaned!")
print("✓ You can now upload fresh ZIP files through the operator app")
print("✓ Reports will be properly linked with portal_client_id")