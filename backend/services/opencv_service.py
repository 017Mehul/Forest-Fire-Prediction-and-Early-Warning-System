from pathlib import Path

import cv2
import numpy as np

DEFAULT_IMAGE_PATH = Path(__file__).resolve().parents[1] / "images" / "satellite.jpg"


def detect_fire(image_path: str | Path = DEFAULT_IMAGE_PATH) -> list[tuple[int, int]] | None:
    """Return fire-like image pixel centers, or None if no image source is available.

    HSV thresholding is a demo detector, not a validated satellite fire product.
    Missing or unreadable imagery never produces synthetic hotspot coordinates.
    """
    path = Path(image_path)
    if not path.is_file():
        return None

    image = cv2.imread(str(path))
    if image is None:
        return None

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lower = np.array([10, 100, 100])
    upper = np.array([35, 255, 255])
    mask = cv2.inRange(hsv, lower, upper)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    points: list[tuple[int, int]] = []
    for contour in contours:
        if cv2.contourArea(contour) > 10:
            moments = cv2.moments(contour)
            if moments["m00"]:
                points.append((
                    int(moments["m10"] / moments["m00"]),
                    int(moments["m01"] / moments["m00"]),
                ))
    return points


def pixel_to_geo(x: int, y: int) -> tuple[float, float]:
    """Demo-only California transform; use georeferencing metadata in production."""
    base_lat = 37.0
    base_lng = -120.0
    return base_lat + y * 0.01, base_lng + x * 0.01
