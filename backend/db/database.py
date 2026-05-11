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
    """Add columns introduced after initial schema. Each runs in its own transaction."""
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_access_token TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_full_name TEXT",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_webhook_id TEXT",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS quality_checks TEXT",
    ]
    for sql in migrations:
        with engine.connect() as conn:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
