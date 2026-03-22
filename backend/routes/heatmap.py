from fastapi import APIRouter
from services.opencv_service import detect_fire, pixel_to_geo

router = APIRouter()


@router.get("/heatmap")
def get_heatmap():
    """
    Detect fire hotspots from satellite image and return
    heatmap data as [[lat, lng, intensity], ...].
    """
    points = detect_fire("backend/images/satellite.jpg")

    heatmap_data = []
    for x, y in points:
        lat, lng = pixel_to_geo(x, y)
        intensity = 0.8
        heatmap_data.append([lat, lng, intensity])

    return heatmap_data
