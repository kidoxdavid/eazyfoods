"""
Test fixtures. Tests need a Postgres database (models use UUID/JSONB/ARRAY):

    TEST_DATABASE_URL=postgresql://postgres:pw@localhost:5432/easyfoods_test pytest

The database is created if missing, and every table is dropped and recreated per session.
"""
import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

TEST_URL = os.environ.get("TEST_DATABASE_URL", "postgresql://postgres:pw@localhost:5432/easyfoods_test")
os.environ["DATABASE_URL"] = TEST_URL  # must be set before the app imports its engine


def _ensure_database() -> bool:
    url = make_url(TEST_URL)
    try:
        admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
        with admin.connect() as conn:
            exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": url.database}).scalar()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{url.database}"'))
        admin.dispose()
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def client():
    if not _ensure_database():
        pytest.skip("No Postgres reachable; set TEST_DATABASE_URL")
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import Base, engine

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)


@pytest.fixture()
def device_id() -> str:
    return str(uuid.uuid4())
