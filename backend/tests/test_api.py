import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_prediction_validation_rejects_invalid_humidity():
    response = client.post("/predict", json={"temperature": 30, "humidity": 120, "wind": 10, "vegetation": 50})
    assert response.status_code == 422


def test_prediction_rejects_unknown_fields():
    response = client.post("/predict", json={"temperature": 30, "humidity": 40, "wind": 10, "vegetation": 50, "secret": 1})
    assert response.status_code == 422


def test_zones_contract():
    response = client.get("/zones")
    assert response.status_code == 200
    payload = response.json()
    assert payload["live"] is False
    assert len(payload["zones"]) > 0


def test_heatmap_does_not_fabricate_data_when_source_missing(monkeypatch):
    import routes.heatmap as heatmap
    monkeypatch.setattr(heatmap, "detect_fire", lambda *_args, **_kwargs: None)
    response = client.get("/heatmap")
    assert response.status_code == 503
