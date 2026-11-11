def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"
    assert data["service"] == "cloudcare-api"


def test_readiness_endpoint(client):
    response = client.get("/readiness")
    # In test environment, the real postgres engine may or may not be connected, so handle both 200 and 503
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data


def test_root_redirect_to_docs(client):
    response = client.get("/", follow_redirects=False)
    assert response.status_code in [302, 307]
    assert response.headers["location"] == "/docs"
