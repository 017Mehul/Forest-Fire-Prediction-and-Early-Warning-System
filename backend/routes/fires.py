"""NASA FIRMS near-real-time satellite fire detections.

Requires FIRMS_MAP_KEY in the server environment. Never expose the key to the
browser. If the key is missing or the provider fails, return an explicit error.
"""
import csv
import io
import os

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/fires", tags=["Satellite Fire Detections"])
FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"


@router.get("")
def get_fire_detections(
    west: float = Query(-125.0, ge=-180, le=180),
    south: float = Query(24.0, ge=-90, le=90),
    east: float = Query(-66.0, ge=-180, le=180),
    north: float = Query(50.0, ge=-90, le=90),
):
    if west >= east or south >= north:
        raise HTTPException(status_code=422, detail="Invalid bounding box: west < east and south < north are required")

    map_key = os.getenv("FIRMS_MAP_KEY", "").strip()
    if not map_key:
        raise HTTPException(status_code=503, detail="NASA FIRMS is not configured; set FIRMS_MAP_KEY on the server")

    area = f"{west},{south},{east},{north}"
    url = f"{FIRMS_BASE_URL}/{map_key}/VIIRS_NOAA21_NRT/{area}/1"
    try:
        response = httpx.get(url, timeout=12.0, follow_redirects=False)
        response.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(response.text)))
    except (httpx.HTTPError, csv.Error, ValueError):
        raise HTTPException(status_code=502, detail="NASA FIRMS is temporarily unavailable or returned invalid data")

    detections = []
    for row in rows[:5000]:
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            confidence = row.get("confidence", "")
            frp = float(row.get("frp") or 0)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            detections.append({
                "latitude": lat,
                "longitude": lon,
                "confidence": confidence,
                "frp": frp,
                "acquired_at": f'{row.get("acq_date", "")}T{row.get("acq_time", "")}',
                "satellite": row.get("satellite"),
                "source": "NASA FIRMS VIIRS NOAA-21 NRT",
            })
        except (KeyError, TypeError, ValueError):
            continue

    return {
        "source": "NASA FIRMS VIIRS NOAA-21 NRT",
        "live": True,
        "retrieved_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "count": len(detections),
        "detections": detections,
        "disclaimer": "Satellite hotspot detections are not proof of an active wildfire and are not official emergency warnings.",
    }
