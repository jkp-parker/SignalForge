from fastapi import APIRouter

from app.api import auth, users, connectors, alarms, health, metrics, transform

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(connectors.router)
api_router.include_router(alarms.router)
api_router.include_router(health.router)
api_router.include_router(metrics.router)
api_router.include_router(transform.router)
