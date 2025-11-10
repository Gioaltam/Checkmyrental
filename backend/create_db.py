"""Create database tables"""
from app.database import engine
from app.models import Base, Client, Property, Report, Asset, User
from app.portal_models import PortalClient, ClientPortalToken, PortalCode

# Create all tables
Base.metadata.create_all(bind=engine)
print("✓ All database tables created successfully!")
