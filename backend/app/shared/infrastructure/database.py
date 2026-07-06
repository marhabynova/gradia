import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import structlog

logger = structlog.get_logger(__name__)

# Default to a local postgres instance if not provided
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/gradia")

# Enterprise-grade connection pooling parameters
try:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800, # Recycle connections after 30 minutes
    )
    logger.info("database_engine_created", url=DATABASE_URL)
except Exception as e:
    logger.error("database_engine_creation_failed", error=str(e))
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency generator for FastAPI to manage DB sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
