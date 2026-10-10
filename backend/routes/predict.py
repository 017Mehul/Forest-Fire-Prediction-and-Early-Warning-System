from fastapi import APIRouter, HTTPException, Query
from schemas.request import PredictionRequest
from services.model_service import predict_fire_risk
from routes.weather import current_weather

router = APIRouter(prefix="/predict", tags=["Prediction"])

@router.post("")
def predict(payload: PredictionRequest):
    try:
        return predict_fire_risk(payload.temperature, payload.humidity, payload.wind, payload.vegetation)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Prediction model is unavailable")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction failed")


@router.get("/current")
def predict_from_current_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    vegetation: float = Query(..., ge=0, le=100),
):
    """Estimate risk using live weather and explicit proxy soil features."""
    weather_payload = current_weather(latitude, longitude)
    current = weather_payload["current"]
    try:
        result = predict_fire_risk(
            temperature=float(current["temperature_2m"]),
            humidity=float(current["relative_humidity_2m"]),
            wind=float(current["wind_speed_10m"]),
            vegetation=vegetation,
            weather=current,
        )
        result["weather_timestamp"] = weather_payload["time"]
        result["coordinates"] = weather_payload["coordinates"]
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Prediction model is unavailable")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction failed")
