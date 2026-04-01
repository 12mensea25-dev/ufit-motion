def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}


def test_index_returns_200(client):
    response = client.get("/")
    assert response.status_code == 200


def test_setup_status_returns_needs_setup_false(client):
    # init_db() seeds admin account, so needsSetup should be False
    response = client.get("/api/setup-status")
    assert response.status_code == 200
    assert response.get_json()["needsSetup"] is False


def test_bootstrap_school_filter(admin_client):
    response = admin_client.get("/api/bootstrap?school_id=1")
    assert response.status_code == 200
    data = response.get_json()
    assert "schools" in data
    assert "performanceRows" in data
