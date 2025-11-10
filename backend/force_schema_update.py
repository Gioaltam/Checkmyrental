"""
Force SQLAlchemy to update its schema
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine
from app.models import Report

print("Forcing schema update...")

# Drop and recreate the Report table metadata
Base.metadata.drop_all(bind=engine, tables=[Report.__table__])
Base.metadata.create_all(bind=engine, tables=[Report.__table__])

print("Schema updated successfully!")
print("\nNow restart the backend normally.")