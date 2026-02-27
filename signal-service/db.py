"""Lightweight async database access for the signal-service."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from config import settings


def get_async_session() -> async_sessionmaker[AsyncSession]:
    """Create a fresh engine + session factory for the current event loop."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Backward-compatible module-level alias (used by connectors)
async_session = get_async_session()
