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

app = FastAPI(
    title="Forest Fire Prediction and Early Warning System",
    version="2.2.0",
    docs_url=None if os.getenv("DISABLE_API_DOCS", "true").lower() == "true" else "/docs",
    redoc_url=None,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

app.include_router(predict_router)
app.include_router(heatmap_router)
app.include_router(zones_router)
app.include_router(weather_router)
app.include_router(fires_router)

# Per-process guardrail. Use a shared gateway/Redis limiter in multi-instance
# deployments. Never trust X-Forwarded-For unless the proxy is configured to
# strip and overwrite it; request.client.host is used here deliberately.
RATE_WINDOW_SECONDS = 60
DEFAULT_LIMIT = 120
SENSITIVE_LIMIT = 20
MAX_RATE_BUCKETS = 10000
_requests = defaultdict(deque)
_rate_lock = Lock()


@app.middleware("http")
async def security_and_rate_limit(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    bucket = request.url.path.split("/")[1] or "root"
    limit = SENSITIVE_LIMIT if bucket in {"predict", "fires"} else DEFAULT_LIMIT
    now = time.monotonic()
    key = (ip, bucket)

    with _rate_lock:
        # Expire old buckets as well as old events so arbitrary client IPs
        # cannot grow the in-memory limiter without bound.
        if len(_requests) >= MAX_RATE_BUCKETS and key not in _requests:
            expired_keys = [
                old_key for old_key, events in _requests.items()
                if not events or now - events[-1] >= RATE_WINDOW_SECONDS
            ]
            for old_key in expired_keys:
                _requests.pop(old_key, None)
            if len(_requests) >= MAX_RATE_BUCKETS:
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Request capacity temporarily exhausted"},
                    headers={"Retry-After": str(RATE_WINDOW_SECONDS)},
                )

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

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    return response


@app.get("/")
def root():
    return {"service": "forest-fire-api", "status": "ok", "version": app.version}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "forest-fire-api", "version": app.version}
