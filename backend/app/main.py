from contextlib import asynccontextmanager
from typing import Any, Dict
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401 - ensure models are registered with Base.metadata
from app.routers import (
    analytics,
    appointments,
    auth,
    dashboard,
    doctors,
    notifications,
    patients,
    queue,
    settings as clinic_settings,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables at startup
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"Warning: Database initialization encountered an error: {exc}")
    yield


app = FastAPI(
    title="CloudCare API",
    version="1.0.0",
    description="Cloud-Native Healthcare Operations Platform",
    lifespan=lifespan,
)

# CORS Middleware
origins = settings.cors_origins_list
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers under /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(queue.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(clinic_settings.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": "cloudcare-api",
    }


@app.get("/readiness")
def readiness_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not ready", "detail": str(exc)},
        )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    detail = "Resource not found"
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        detail = exc.detail
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": detail, "code": "NOT_FOUND"},
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred", "code": "INTERNAL_SERVER_ERROR"},
    )
