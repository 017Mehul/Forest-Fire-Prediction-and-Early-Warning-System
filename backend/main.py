import os
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.predict import router as predict_router
from routes.heatmap import router as heatmap_router
from routes.zones import router as zones_router
from routes.weather import router as weather_router
from routes.fires import router as fires_router

app = FastAPI(title="Forest Fire Prediction and Early Warning System", version="2.1.0")

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(predict_router)
app.include_router(heatmap_router)
app.include_router(zones_router)
app.include_router(weather_router)
app.include_router(fires_router)

# Per-process guardrail. Multi-instance deployments should also configure a
# shared gateway/Redis limiter because in-memory counters are not distributed.
RATE_WINDOW_SECONDS = 60
DEFAULT_LIMIT = 120
SENSITIVE_LIMIT = 20
_requests = defaultdict(deque)
_rate_lock = Lock()


@app.middleware("http")
async def rate_limit_requests(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    bucket = request.url.path.split("/")[1] or "root"
    limit = SENSITIVE_LIMIT if bucket in {"predict", "fires"} else DEFAULT_LIMIT
    now = time.monotonic()
    key = (ip, bucket)
    with _rate_lock:
        recent = _requests[key]
        while recent and now - recent[0] >= RATE_WINDOW_SECONDS:
            recent.popleft()
        if len(recent) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded; retry shortly"},
                headers={"Retry-After": str(RATE_WINDOW_SECONDS)},
            )
        recent.append(now)
    return await call_next(request)


@app.get("/")
def root():
    return {"service": "forest-fire-api", "status": "ok", "version": app.version}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "forest-fire-api", "version": app.version}
