"""Live current weather from Open-Meteo.

This endpoint reports provider data only. It does not itself produce an official
fire warning or imply that the static monitoring zones are live.
"""
import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/weather", tags=["Weather"])
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


@router.get("")
def current_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,cloud_cover,wind_speed_10m",
        "timezone": "auto",
    }
    try:
        response = httpx.get(OPEN_METEO_URL, params=params, timeout=8.0)
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status_code=502, detail="Weather provider is temporarily unavailable")

    current = payload.get("current")
    if not isinstance(current, dict) or not current.get("time"):
        raise HTTPException(status_code=502, detail="Weather provider returned an invalid response")

    required = (
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "surface_pressure",
        "cloud_cover",
        "wind_speed_10m",
    )
    if any(current.get(key) is None for key in required):
        raise HTTPException(status_code=502, detail="Weather provider returned incomplete current conditions")

    return {
        "source": "Open-Meteo",
        "live": True,
        "coordinates": {
            "latitude": payload.get("latitude", latitude),
            "longitude": payload.get("longitude", longitude),
        },
        "time": current["time"],
        "timezone": payload.get("timezone"),
        "units": payload.get("current_units", {}),
        "current": {key: current[key] for key in required},
        "disclaimer": "Weather observations/model estimates are not an official wildfire alert. Use local emergency authorities for safety decisions.",
    }
