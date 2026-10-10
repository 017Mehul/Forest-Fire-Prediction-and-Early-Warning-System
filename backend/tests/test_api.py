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


def test_weather_returns_live_provider_data(monkeypatch):
    import routes.weather as weather

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "latitude": 37.5,
                "longitude": -119.5,
                "timezone": "America/Los_Angeles",
                "current_units": {},
                "current": {
                    "time": "2026-10-10T10:00",
                    "temperature_2m": 24.0,
                    "relative_humidity_2m": 18,
                    "precipitation": 0.0,
                    "surface_pressure": 990.0,
                    "cloud_cover": 5,
                    "wind_speed_10m": 12.0,
                },
            }

    monkeypatch.setattr(weather.httpx, "get", lambda *args, **kwargs: FakeResponse())
    response = client.get("/weather?latitude=37.5&longitude=-119.5")
    assert response.status_code == 200
    payload = response.json()
    assert payload["live"] is True
    assert payload["source"] == "Open-Meteo"
    assert payload["current"]["temperature_2m"] == 24.0


def test_weather_rejects_invalid_coordinates():
    response = client.get("/weather?latitude=91&longitude=0")
    assert response.status_code == 422
