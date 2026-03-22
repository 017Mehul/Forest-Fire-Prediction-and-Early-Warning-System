from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np


MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "fire_model.pkl"

# Feature order the model was trained on
FEATURE_NAMES = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "surface_pressure",
    "cloud_cover",
    "wind_speed_10m",
    "soil_temperature_0_to_7cm",
    "soil_temperature_7_to_28cm",
    "soil_moisture_0_to_7cm",
    "soil_moisture_7_to_28cm",
]


@lru_cache(maxsize=1)
def get_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def _to_risk_level(risk_score: float) -> str:
    if risk_score < 40:
        return "Low"
    if risk_score < 75:
        return "Medium"
    return "High"


def predict_fire_risk(temperature: float, humidity: float, wind: float, vegetation: float):
    model = get_model()

    # Map 4 UI inputs → 10 model features.
    # Unmeasured fields use climatological medians for a dry, high-risk day.
    soil_temp = temperature - 4.0          # soil slightly cooler than air
    soil_moisture = (humidity / 100) * 0.3 # rough proxy: low humidity → dry soil
    features = np.array([[
        temperature,       # temperature_2m
        humidity,          # relative_humidity_2m
        0.0,               # precipitation  (assume dry conditions)
        1013.25,           # surface_pressure (standard atmosphere)
        10.0,              # cloud_cover (%)
        wind,              # wind_speed_10m
        soil_temp,         # soil_temperature_0_to_7cm
        soil_temp - 1.0,   # soil_temperature_7_to_28cm
        soil_moisture,     # soil_moisture_0_to_7cm
        soil_moisture,     # soil_moisture_7_to_28cm
    ]], dtype=float)

    predicted = float(model.predict(features)[0])

    # ── ML score ────────────────────────────────────────────────────
    if hasattr(model, "predict_proba"):
        ml_score = float(model.predict_proba(features)[0][1]) * 100.0
    else:
        ml_score = predicted * 100.0 if 0.0 <= predicted <= 1.0 else predicted

    # ── Rule-based score (threshold-based, not pure linear) ─────────
    if temperature > 45:
        temp_score = 35
    elif temperature > 35:
        temp_score = 25
    elif temperature > 25:
        temp_score = 15
    else:
        temp_score = 5

    if humidity < 10:
        humidity_score = 25
    elif humidity < 20:
        humidity_score = 18
    elif humidity < 30:
        humidity_score = 10
    else:
        humidity_score = 3

    if wind > 40:
        wind_score = 25
    elif wind > 25:
        wind_score = 18
    elif wind > 15:
        wind_score = 10
    else:
        wind_score = 3

    if vegetation > 80:
        vegetation_score = 15
    elif vegetation > 60:
        vegetation_score = 10
    elif vegetation > 40:
        vegetation_score = 6
    else:
        vegetation_score = 2

    rule_score = float(temp_score + humidity_score + wind_score + vegetation_score)
    rule_score = max(0.0, min(100.0, rule_score))

    print(f"TEMP: {temp_score}  HUM: {humidity_score}  WIND: {wind_score}  VEG: {vegetation_score}")
    print(f"RULE: {rule_score}  ML: {round(ml_score, 2)}  FINAL: {round((0.3 * ml_score) + (0.7 * rule_score), 2)}")

    # ── Hybrid: 30% ML + 70% rule-based ────────────────────────────
    final_score = (0.3 * ml_score) + (0.7 * rule_score)
    final_score = max(0.0, min(100.0, final_score))

    return {"risk_score": round(final_score, 2), "risk_level": _to_risk_level(final_score)}
