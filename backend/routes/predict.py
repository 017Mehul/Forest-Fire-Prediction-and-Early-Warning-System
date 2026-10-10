from fastapi import APIRouter, HTTPException
from schemas.request import PredictionRequest
from services.model_service import predict_fire_risk

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
