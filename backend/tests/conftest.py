import os
import sys

# MUST be set before any app imports so session.py uses SQLite engine
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Clear settings cache so DATABASE_URL env var takes effect
from app.core.config import get_settings
get_settings.cache_clear()

from app.db.base import Base
from app.db.session import get_db
from app.main import app as fastapi_app
import app.models  # noqa: F401 - ensure all models are registered

SQLITE_URL = "sqlite:///./test.db"
engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except OSError:
            pass


@pytest.fixture
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    settings = get_settings()
    response = client.post(
        "/api/v1/auth/login",
        json={"email": settings.DEMO_EMAIL, "password": settings.DEMO_PASSWORD},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
