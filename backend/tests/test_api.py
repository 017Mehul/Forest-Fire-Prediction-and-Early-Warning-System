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


def test_current_prediction_uses_weather_provider(monkeypatch):
    import routes.predict as predict_route

    weather_payload = {
        "source": "Open-Meteo",
        "live": True,
        "time": "2026-10-10T10:00",
        "coordinates": {"latitude": 37.5, "longitude": -119.5},
        "current": {
            "temperature_2m": 31.0,
            "relative_humidity_2m": 22,
            "precipitation": 0.0,
            "surface_pressure": 990.0,
            "cloud_cover": 8,
            "wind_speed_10m": 18.0,
        },
    }
    monkeypatch.setattr(predict_route, "current_weather", lambda *_args, **_kwargs: weather_payload)
    monkeypatch.setattr(
        predict_route,
        "predict_fire_risk",
        lambda **kwargs: {
            "risk_score": 50.0,
            "risk_level": "Medium",
            "data_quality": "live_weather_partial_inputs",
            "inputs": kwargs,
        },
    )

    response = client.get("/predict/current?latitude=37.5&longitude=-119.5&vegetation=60")
    assert response.status_code == 200
    payload = response.json()
    assert payload["data_quality"] == "live_weather_partial_inputs"
    assert payload["weather_timestamp"] == weather_payload["time"]
    assert payload["inputs"]["weather"]["surface_pressure"] == 990.0


def test_missing_image_never_generates_synthetic_hotspots(tmp_path):
    from services.opencv_service import detect_fire

    assert detect_fire(tmp_path / "not-present.jpg") is None


def test_fire_endpoint_requires_server_side_map_key(monkeypatch):
    import routes.fires as fires

    monkeypatch.delenv("FIRMS_MAP_KEY", raising=False)
    response = client.get("/fires")
    assert response.status_code == 503
    assert "FIRMS_MAP_KEY" in response.json()["detail"]


def test_fire_endpoint_rejects_invalid_bounding_box():
    response = client.get("/fires?west=10&east=-10&south=0&north=20")
    assert response.status_code == 422


def test_fire_endpoint_requires_server_side_map_key(monkeypatch):
    monkeypatch.delenv("FIRMS_MAP_KEY", raising=False)
    response = client.get("/fires")
    assert response.status_code == 503
    assert "FIRMS_MAP_KEY" in response.json()["detail"]


def test_fire_endpoint_rejects_invalid_bounding_box():
    response = client.get("/fires?west=10&east=-10&south=0&north=20")
    assert response.status_code == 422


def test_fire_endpoint_parses_provider_detections(monkeypatch):
    import routes.fires as fires

    monkeypatch.setenv("FIRMS_MAP_KEY", "test-key")

    class FakeResponse:
        text = "latitude,longitude,confidence,frp,acq_date,acq_time,satellite\n37.5,-119.5,h,12.4,2026-10-10,1015,N21\n"

        def raise_for_status(self):
            return None

    monkeypatch.setattr(fires.httpx, "get", lambda *args, **kwargs: FakeResponse())
    response = client.get("/fires?west=-125&south=24&east=-66&north=50")
    assert response.status_code == 200
    payload = response.json()
    assert payload["live"] is True
    assert payload["count"] == 1
    assert payload["detections"][0]["latitude"] == 37.5
    assert payload["detections"][0]["confidence"] == "h"
