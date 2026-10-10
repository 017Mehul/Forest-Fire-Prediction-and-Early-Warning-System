import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.predict import router as predict_router
from routes.heatmap import router as heatmap_router
from routes.zones import router as zones_router
from routes.weather import router as weather_router

app = FastAPI(title="Forest Fire Prediction and Early Warning System", version="2.0.0")

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

app.include_router(predict_router)
app.include_router(heatmap_router)
app.include_router(zones_router)
app.include_router(weather_router)

@app.get("/")
def root():
    return {"service": "forest-fire-api", "status": "ok", "version": app.version}

@app.get("/health")
def health():
    return {"status": "healthy", "service": "forest-fire-api", "version": app.version}
