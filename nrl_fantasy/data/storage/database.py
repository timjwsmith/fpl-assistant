"""Database connection and session management"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator

from nrl_fantasy.config import settings
from nrl_fantasy.data.storage.models import Base


# Create engine
engine = create_engine(
    settings.nrl_database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.nrl_database_url else {},
    echo=False
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully")


def drop_all():
    """Drop all tables - use with caution!"""
    Base.metadata.drop_all(bind=engine)
    print("⚠️  All tables dropped")


@contextmanager
def get_db() -> Generator[Session, None, None]:
    """Get database session with context manager"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_session() -> Session:
    """Get database session for dependency injection"""
    return SessionLocal()
