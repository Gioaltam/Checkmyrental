#!/usr/bin/env python3
"""
Database Migration: Add theme_config column to clients table

This script adds the theme_config JSON column to the clients table
to support custom branding for each owner.

Usage:
    python add_theme_config_column.py
"""

import sqlite3
import sys
from pathlib import Path

# Database path
DB_PATH = Path("workspace/inspection.db")

def migrate():
    """Add theme_config column to clients table"""

    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        print("   Create the database first by running the backend.")
        sys.exit(1)

    print(f"📊 Migrating database: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(clients)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'theme_config' in columns:
            print("✅ Column 'theme_config' already exists in clients table")
            return

        # Add theme_config column
        print("➕ Adding theme_config column...")
        cursor.execute("""
            ALTER TABLE clients
            ADD COLUMN theme_config TEXT
        """)

        conn.commit()
        print("✅ Migration successful!")
        print("   Column 'theme_config' added to clients table")

        # Show table structure
        cursor.execute("PRAGMA table_info(clients)")
        print("\n📋 Updated clients table structure:")
        for row in cursor.fetchall():
            col_id, name, col_type, not_null, default, pk = row
            print(f"   {name:20} {col_type:15} {'NOT NULL' if not_null else ''}")

    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

def add_sample_theme():
    """Add a sample theme to the DEMO client"""

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        import json

        # Check if DEMO1234 client exists
        cursor.execute("""
            SELECT id, name, portal_token FROM clients
            WHERE portal_token = 'DEMO1234' OR name = 'DEMO1234'
            LIMIT 1
        """)

        result = cursor.fetchone()
        if not result:
            print("\n⚠️  No DEMO client found to add sample theme")
            return

        client_id = result[0]
        print(f"\n🎨 Adding sample theme to client: {result[1]}")

        # Create a sample green theme
        sample_theme = {
            "brandName": "Demo Properties",
            "brandSubtitle": "Inspection Portal",
            "colors": {
                "primary": "#10b981",
                "primaryDark": "#059669",
                "primaryLight": "#d1fae5",
                "accent": "#8b5cf6"
            },
            "ui": {
                "sidebarStyle": "dark",
                "borderRadius": "rounded",
                "showLogo": True,
                "showCompanyName": True
            },
            "features": {
                "hvacMaintenance": True,
                "photoAnalysis": True,
                "reportFiltering": True,
                "notifications": True
            },
            "contact": {
                "email": "demo@checkmyrental.com"
            }
        }

        cursor.execute("""
            UPDATE clients
            SET theme_config = ?
            WHERE id = ?
        """, (json.dumps(sample_theme), client_id))

        conn.commit()
        print("✅ Sample theme added successfully!")
        print(f"   Access with: http://localhost:3000?token=DEMO1234")

    except Exception as e:
        print(f"❌ Failed to add sample theme: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  Database Migration: Add Theme Configuration")
    print("=" * 60)
    print()

    migrate()

    # Ask if user wants to add sample theme
    print()
    response = input("Add sample theme to DEMO client? (y/n): ").strip().lower()
    if response == 'y':
        add_sample_theme()

    print()
    print("=" * 60)
    print("  Migration Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Start the backend: python main.py")
    print("  2. Start the dashboard: cd nextjs-dashboard && npm run dev")
    print("  3. Test theme API: curl http://localhost:5000/api/client/owners/DEMO1234/theme")
    print()
