import cv2
import numpy as np
import os


def detect_fire(image_path: str) -> list[tuple[int, int]]:
    """
    Detect fire-like regions in an image using HSV color thresholding.
    Returns list of (x, y) pixel coordinates of fire hotspots.
    Falls back to simulated points if image not found.
    """
    if not os.path.exists(image_path):
        # Simulated hotspot pixels for demo when no satellite image is present
        return [
            (120, 80), (125, 85), (130, 90), (115, 75), (135, 95),
            (200, 150), (205, 155), (210, 160), (195, 145),
            (300, 200), (305, 205), (310, 195),
            (80, 220), (85, 225), (90, 230),
            (400, 100), (405, 105), (410, 110),
        ]

    img = cv2.imread(image_path)
    if img is None:
        return []

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    lower = np.array([10, 100, 100])
    upper = np.array([35, 255, 255])
    mask = cv2.inRange(hsv, lower, upper)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    points = []
    for contour in contours:
        if cv2.contourArea(contour) > 10:
            M = cv2.moments(contour)
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                points.append((cx, cy))

    return points


def pixel_to_geo(x: int, y: int) -> tuple[float, float]:
    """Convert pixel coordinates to approximate geo coordinates (California region)."""
    base_lat = 37.0
    base_lng = -120.0
    lat = base_lat + (y * 0.01)
    lng = base_lng + (x * 0.01)
    return lat, lng
