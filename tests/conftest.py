import pytest
from app import create_app


@pytest.fixture
def app(tmp_path):
    application = create_app({
        "TESTING": True,
        "DB_PATH_OVERRIDE": str(tmp_path / "test.db"),
    })
    return application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def admin_client(client):
    client.post("/api/login", json={
        "audience": "admin",
        "identifier": "admin",
        "password": "admin123",
    })
    return client


@pytest.fixture
def coach_client(client):
    client.post("/api/login", json={
        "audience": "coach",
        "identifier": "coach1",
        "password": "coach123",
    })
    return client
