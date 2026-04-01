def test_engagement_rating_out_of_range_rejected(coach_client):
    response = coach_client.post("/api/sessions", json={
        "gradeId": 1,
        "date": "2026-04-01",
        "engagementRating": 6.0,
    })
    assert response.status_code == 400
    assert "1 and 5" in response.get_json()["error"]


def test_engagement_rating_valid_accepted(coach_client):
    response = coach_client.post("/api/sessions", json={
        "gradeId": 1,
        "date": "2026-04-01",
        "engagementRating": 4.5,
    })
    assert response.status_code == 200


def test_eod_invalid_date_rejected(coach_client):
    response = coach_client.post("/api/eod-reports", json={
        "date": "01-04-2026",
        "summary": "Good day",
        "celebrations": "Great",
        "followUpNeeded": "None",
    })
    assert response.status_code == 400
    assert "YYYY-MM-DD" in response.get_json()["error"]


def test_incident_invalid_date_rejected(coach_client):
    response = coach_client.post("/api/incidents", json={
        "date": "not-a-date",
        "title": "Test",
        "details": "Details here",
    })
    assert response.status_code == 400
    assert "YYYY-MM-DD" in response.get_json()["error"]
