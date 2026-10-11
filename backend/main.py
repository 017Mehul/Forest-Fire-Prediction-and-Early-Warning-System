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

try:
    import redis.asyncio as redis
    from redis.exceptions import RedisError
except ImportError:  # pragma: no cover - dependency is pinned in production
    redis = None
    RedisError = Exception


app = FastAPI(
    title="Forest Fire Prediction and Early Warning System",
    version="2.2.0",
    docs_url=None if os.getenv("DISABLE_API_DOCS", "true").lower() == "true" else "/docs",
    redoc_url=None,
)

# The production Vercel domain is the safe default. Local development should
# explicitly set ALLOWED_ORIGINS to localhost origins.
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://forest-fire-prediction-psi.vercel.app",
    ).split(",")
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

RATE_WINDOW_SECONDS = 60
DEFAULT_LIMIT = 120
SENSITIVE_LIMIT = 20
MAX_RATE_BUCKETS = 10000

# Local fallback remains useful for development/single-instance deployments.
# Production multi-instance deployments should set REDIS_URL so every instance
# shares the same counters.
_requests = defaultdict(deque)
_rate_lock = Lock()
_redis = None
_redis_url = os.getenv("REDIS_URL", "").strip()
if _redis_url and redis is not None:
    _redis = redis.from_url(_redis_url, decode_responses=True)

_RATE_SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
"""


async def _redis_rate_limit(key: str, limit: int) -> bool:
    if _redis is None:
        return False
    try:
        current = int(
            await _redis.eval(
                _RATE_SCRIPT,
                1,
                key,
                str(RATE_WINDOW_SECONDS),
            )
        )
        return current <= limit
    except RedisError as exc:
        # Fail closed when Redis was explicitly configured: silently falling
        # back to a per-process limiter would defeat the shared-limit guarantee.
        raise RuntimeError("Shared rate limiter unavailable") from exc


def _local_rate_limit(key: tuple[str, str], limit: int, now: float) -> bool:
    with _rate_lock:
        if len(_requests) >= MAX_RATE_BUCKETS and key not in _requests:
            expired_keys = [
                old_key
                for old_key, events in _requests.items()
                if not events or now - events[-1] >= RATE_WINDOW_SECONDS
            ]
            for old_key in expired_keys:
                _requests.pop(old_key, None)
            if len(_requests) >= MAX_RATE_BUCKETS:
                return False

        recent = _requests[key]
        while recent and now - recent[0] >= RATE_WINDOW_SECONDS:
            recent.popleft()
        if len(recent) >= limit:
            return False
        recent.append(now)
        return True


@app.middleware("http")
async def security_and_rate_limit(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    bucket = request.url.path.split("/")[1] or "root"
    limit = SENSITIVE_LIMIT if bucket in {"predict", "fires"} else DEFAULT_LIMIT

    try:
        if _redis is not None:
            redis_key = f"forest-fire:rate:{ip}:{bucket}"
            allowed = await _redis_rate_limit(redis_key, limit)
        else:
            allowed = _local_rate_limit((ip, bucket), limit, time.monotonic())
    except RuntimeError:
        return JSONResponse(
            status_code=503,
            content={"detail": "Rate limiting service temporarily unavailable"},
            headers={"Retry-After": str(RATE_WINDOW_SECONDS)},
        )

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded; retry shortly"},
            headers={"Retry-After": str(RATE_WINDOW_SECONDS)},
        )

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
