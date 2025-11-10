# Database session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from pathlib import Path

from .config import settings
# Force reload to pick up new DATABASE_URL config

# Override to use absolute path to root app.db
root_dir = Path(__file__).parent.parent.parent
database_path = root_dir / "app.db"
DATABASE_URL = f"sqlite:///{database_path}"
print(f"=== OVERRIDING DATABASE PATH ===")
print(f"Using database: {DATABASE_URL}")
print(f"Absolute path: {database_path}")
print(f"================================")

# Create database engine with proper configuration
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration for development
    # Use StaticPool to properly handle threading with SQLite
    engine = create_engine(
        DATABASE_URL,  # Use our overridden path
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=settings.DEBUG  # Log SQL statements in debug mode
    )
else:
    # PostgreSQL/other database configuration for production
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,   # Recycle connections after 1 hour
        echo=settings.DEBUG  # Log SQL statements in debug mode
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
