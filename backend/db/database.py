import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/autotest"
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def create_tables() -> None:
    """Create tables and apply any missing column additions."""
    Base.metadata.create_all(bind=engine)
    _apply_migrations()


def _apply_migrations() -> None:
    """Add columns that were introduced after the initial schema creation."""
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_access_token TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_full_name TEXT",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_webhook_id TEXT",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__("sqlalchemy").text(sql))
            except Exception:
                pass  # column may already exist or DB doesn't support IF NOT EXISTS
        conn.commit()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
