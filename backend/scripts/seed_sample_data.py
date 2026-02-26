"""Seed sample data for development."""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.connector import Connector
from app.core.database import Base


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Create operator user
        result = await session.execute(select(User).where(User.email == "operator@signalforge.local"))
        if not result.scalar_one_or_none():
            session.add(User(
                id=str(uuid.uuid4()),
                email="operator@signalforge.local",
                hashed_password=get_password_hash("operator123"),
                full_name="Plant Operator",
                role="operator",
            ))

        # Create sample connectors
        result = await session.execute(select(Connector))
        if not result.scalars().first():
            session.add(Connector(
                id=str(uuid.uuid4()),
                name="Plant A - Ignition",
                connector_type="ignition",
                description="Main plant Ignition gateway",
                host="192.168.1.100",
                port=8088,
                polling_interval=30,
                credentials={"username": "api_user", "password": "changeme"},
                connection_params={"gateway_url": "/system/alarming"},
            ))
            session.add(Connector(
                id=str(uuid.uuid4()),
                name="Plant B - FactoryTalk",
                connector_type="factorytalk",
                description="Secondary plant FactoryTalk Alarms & Events",
                host="192.168.2.50",
                port=4241,
                polling_interval=60,
            ))

        await session.commit()
        print("Sample data seeded successfully")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
