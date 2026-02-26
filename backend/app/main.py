from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import select

from app.api.router import api_router
from app.core.config import settings
from app.core.database import async_session
from app.core.security import get_password_hash
from app.models.user import User


async def create_admin_user():
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        if result.scalar_one_or_none() is None:
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="Admin",
                role="admin",
            )
            session.add(admin)
            await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_admin_user()
    yield


app = FastAPI(
    title="SignalForge",
    description="SCADA alarm ingestion and ISA-18.2 analysis platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router)
