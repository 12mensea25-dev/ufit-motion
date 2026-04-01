def test_admin_login_success(client):
    response = client.post("/api/login", json={
        "audience": "admin",
        "identifier": "admin",
        "password": "admin123",
    })
    assert response.status_code == 200
    assert response.get_json()["ok"] is True


def test_admin_login_wrong_password(client):
    response = client.post("/api/login", json={
        "audience": "admin",
        "identifier": "admin",
        "password": "wrong",
    })
    assert response.status_code == 401


def test_coach_login_on_admin_portal_fails(client):
    response = client.post("/api/login", json={
        "audience": "admin",
        "identifier": "coach1",
        "password": "coach123",
    })
    assert response.status_code == 401


def test_logout(client):
    client.post("/api/login", json={"audience": "admin", "identifier": "admin", "password": "admin123"})
    response = client.post("/api/logout")
    assert response.status_code == 200
    assert response.get_json()["ok"] is True
