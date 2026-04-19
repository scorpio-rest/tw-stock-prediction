"""Database engine and session management (SQLAlchemy 2.0 async)."""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import event
from config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_database():
    """Create all tables and enable WAL mode for SQLite."""
    from models.database_models import Base
    import sqlalchemy as sa

    async with engine.begin() as conn:
        # Enable WAL mode for SQLite
        if "sqlite" in settings.DATABASE_URL:
            await conn.execute(sa.text("PRAGMA journal_mode=WAL"))
            await conn.execute(sa.text("PRAGMA foreign_keys=ON"))
        await conn.run_sync(Base.metadata.create_all)

        # Migrate: add new columns to prediction_records if missing
        if "sqlite" in settings.DATABASE_URL:
            columns = [row[1] for row in (await conn.execute(sa.text("PRAGMA table_info(prediction_records)"))).fetchall()]
            if "horizon" not in columns:
                await conn.execute(sa.text("ALTER TABLE prediction_records ADD COLUMN horizon TEXT DEFAULT '1w'"))
            if "verify_after" not in columns:
                await conn.execute(sa.text("ALTER TABLE prediction_records ADD COLUMN verify_after DATETIME"))


async def close_database():
    """Dispose of the engine."""
    await engine.dispose()


async def get_db() -> AsyncSession:
    """Dependency for FastAPI routes."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
