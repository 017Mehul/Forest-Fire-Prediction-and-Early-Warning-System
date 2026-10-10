from fastapi import APIRouter, HTTPException

from services.opencv_service import detect_fire, pixel_to_geo

router = APIRouter()


@router.get("/heatmap", tags=["Heatmap"])
def get_heatmap():
    """Return image-derived points as [latitude, longitude, intensity]."""
    points = detect_fire()
    if points is None:
        raise HTTPException(status_code=503, detail="Satellite fire imagery is not configured or unavailable")

    return [
        [*pixel_to_geo(x, y), 0.8]
        for x, y in points
    ]
