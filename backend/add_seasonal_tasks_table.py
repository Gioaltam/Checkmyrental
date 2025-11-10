#!/usr/bin/env python3
"""
Database migration script to add seasonal_tasks table.
Run this to add seasonal task tracking for Florida property maintenance.
"""

from app.database import engine
from app.models import Base, SeasonalTask
from sqlalchemy import inspect

def migrate():
    """Add seasonal_tasks table to database"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if "seasonal_tasks" in existing_tables:
        print("[OK] seasonal_tasks table already exists")
        return

    print("Creating seasonal_tasks table...")

    # Create only the SeasonalTask table
    SeasonalTask.__table__.create(engine, checkfirst=True)

    print("[OK] seasonal_tasks table created successfully")
    print("\nTable schema:")
    print("  - id (String, primary key)")
    print("  - client_id (String, foreign key)")
    print("  - task_key (String) - unique identifier")
    print("  - task_name (String) - display name")
    print("  - month (Integer) - 1-12")
    print("  - completed (Boolean)")
    print("  - completed_at (DateTime, nullable)")
    print("  - year (Integer) - tracking year")
    print("  - created_at (DateTime)")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"[ERROR] Error during migration: {e}")
        raise
