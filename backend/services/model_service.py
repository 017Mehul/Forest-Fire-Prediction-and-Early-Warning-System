from functools import lru_cache
from pathlib import Path
import json

import joblib
import numpy as np

MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "fire_model.pkl"
FEATURES_PATH = Path(__file__).resolve().parent.parent / "model" / "features.json"
DEFAULT_FEATURE_NAMES = [
    "temperature_2m", "relative_humidity_2m", "precipitation", "surface_pressure",
    "cloud_cover", "wind_speed_10m", "soil_temperature_0_to_7cm",
    "soil_temperature_7_to_28cm", "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm",
]

@lru_cache(maxsize=1)
def get_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)

@lru_cache(maxsize=1)
def get_feature_names():
    if FEATURES_PATH.exists():
        names = json.loads(FEATURES_PATH.read_text(encoding="utf-8"))
    else:
        names = DEFAULT_FEATURE_NAMES
    if not isinstance(names, list) or not names:
        raise ValueError("Model feature metadata is invalid")
    return names

def _to_risk_level(score: float) -> str:
    if score < 40: return "Low"
    if score < 75: return "Medium"
    return "High"

def predict_fire_risk(temperature: float, humidity: float, wind: float, vegetation: float, weather: dict | None = None):
    for name, value in {"temperature": temperature, "humidity": humidity, "wind": wind, "vegetation": vegetation}.items():
        if not np.isfinite(value):
            raise ValueError(f"{name} must be finite")

    model = get_model()
    feature_names = get_feature_names()
    if feature_names != DEFAULT_FEATURE_NAMES:
        raise ValueError("Loaded model feature metadata does not match the deployed inference contract")

    # Live weather supplies six model features when available. Soil variables remain
    # explicit proxies until an authoritative soil-data feed is connected.
    weather = weather or {}
    precipitation = float(weather.get("precipitation", 0.0))
    surface_pressure = float(weather.get("surface_pressure", 1013.25))
    cloud_cover = float(weather.get("cloud_cover", 10.0))
    soil_temp = temperature - 4.0
    soil_moisture = (humidity / 100.0) * 0.3
    features = np.array([[
        temperature, humidity, precipitation, surface_pressure, cloud_cover, wind,
        soil_temp, soil_temp - 1.0, soil_moisture, soil_moisture,
    ]], dtype=float)

    if hasattr(model, "predict_proba"):
        ml_score = float(model.predict_proba(features)[0][1]) * 100.0
    else:
        predicted = float(model.predict(features)[0])
        ml_score = predicted * 100.0 if 0.0 <= predicted <= 1.0 else predicted

    temp_score = 35 if temperature > 45 else 25 if temperature > 35 else 15 if temperature > 25 else 5
    humidity_score = 25 if humidity < 10 else 18 if humidity < 20 else 10 if humidity < 30 else 3
    wind_score = 25 if wind > 40 else 18 if wind > 25 else 10 if wind > 15 else 3
    vegetation_score = 15 if vegetation > 80 else 10 if vegetation > 60 else 6 if vegetation > 40 else 2
    rule_score = float(temp_score + humidity_score + wind_score + vegetation_score)
    final_score = max(0.0, min(100.0, 0.3 * ml_score + 0.7 * rule_score))

    return {
        "risk_score": round(final_score, 2),
        "risk_level": _to_risk_level(final_score),
        "model": "calibrated_xgboost_plus_environmental_rules",
        "inputs": {"temperature": temperature, "humidity": humidity, "wind": wind, "vegetation": vegetation},
        "data_quality": "live_weather_partial_inputs" if weather else "partial_environmental_inputs",
        "weather_source": "Open-Meteo" if weather else None,
        "disclaimer": "Risk score is an engineering estimate and is not an official emergency warning probability. Soil features remain estimated proxies.",

    }
