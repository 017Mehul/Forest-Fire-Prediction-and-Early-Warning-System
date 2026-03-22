from fastapi import APIRouter, HTTPException

from schemas.request import PredictionRequest
from services.model_service import predict_fire_risk


router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post("")
def predict(payload: PredictionRequest):
    try:
        return predict_fire_risk(
            temperature=payload.temperature,
            humidity=payload.humidity,
            wind=payload.wind,
            vegetation=payload.vegetation,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
