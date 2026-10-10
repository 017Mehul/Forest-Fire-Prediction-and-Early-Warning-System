# Forest Fire Prediction & Early Warning System

An ML-powered wildfire-risk monitoring application combining a calibrated XGBoost classifier, environmental risk rules, FastAPI, and a React/Vite dashboard.

> **Important:** This project is an engineering/academic early-warning prototype. Its risk score is **not** an official emergency warning probability and should not be used as the sole basis for evacuation or emergency decisions.

## What is implemented

- Calibrated XGBoost wildfire-occurrence model
- Explicit model feature contract
- FastAPI prediction API with strict input validation
- Health endpoint for deployment monitoring
- Explicitly labeled baseline monitoring-zones API
- NASA FIRMS VIIRS NOAA-21 near-real-time fire-detection integration (requires a server-side MAP_KEY)
- Open-Meteo current-weather integration and weather-enriched prediction endpoint
- Per-process API rate limiting
- Fire-image hotspot detection without fabricated fallback coordinates
- React dashboard with prediction, map, and alert views
- Backend regression tests
- GitHub Actions CI for backend tests and frontend builds
- Vite production build configuration

## Architecture

```
React/Vite dashboard
        |
        v
FastAPI
  |     |      |       |       |
  v     v      v       v       v
Predict Zones Heatmap Weather NASA FIRMS
  |
  v
Calibrated XGBoost + environmental risk rules
```

## Model inputs

The deployed model was trained with:

1. `temperature_2m`
2. `relative_humidity_2m`
3. `precipitation`
4. `surface_pressure`
5. `cloud_cover`
6. `wind_speed_10m`
7. `soil_temperature_0_to_7cm`
8. `soil_temperature_7_to_28cm`
9. `soil_moisture_0_to_7cm`
10. `soil_moisture_7_to_28cm`

The public prediction UI currently supplies four environmental values. The API therefore marks responses as `partial_environmental_inputs`; the remaining model inputs are explicit engineering proxies rather than hidden claims of live measurements.

## API

### Health

`GET /health`

Returns the service health and version.

### Prediction

`POST /predict`

Example request:

```json
{
  "temperature": 35,
  "humidity": 20,
  "wind": 30,
  "vegetation": 80
}
```

The API validates physical ranges and rejects unknown fields.

### Live weather-based prediction

`GET /predict/current?latitude=37.5&longitude=-119.5&vegetation=60`

Fetches current Open-Meteo conditions and uses temperature, humidity, precipitation, surface pressure, cloud cover, and wind speed as model inputs. Soil temperature and soil moisture remain explicit proxies, so the response labels the result `live_weather_partial_inputs`. This is a model estimate, not an official warning.

### Monitoring zones

`GET /zones`

Returns the currently bundled baseline monitoring zones. The response explicitly contains `live: false`; these values are not presented as real-time observations.

### Current weather

`GET /weather?latitude=37.5&longitude=-119.5`

Fetches current weather from Open-Meteo for validated WGS84 coordinates. The response includes the provider timestamp, units, source, and `live: true`. Weather data is not an official wildfire alert. Attribute the source as [Weather data by Open-Meteo.com](https://open-meteo.com/); the data is licensed under CC BY 4.0. This endpoint is currently independent of model inference: the prediction model still uses partial-input proxies and must not be represented as fully weather-enriched.

### NASA FIRMS satellite fire detections

`GET /fires?west=-125&south=24&east=-66&north=50`

Fetches recent VIIRS NOAA-21 detections from the official NASA FIRMS area API. Set `FIRMS_MAP_KEY` as a server-side environment variable; request a key through [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/map_key/). The key is never sent to the frontend. If no key is configured, the endpoint returns HTTP 503 rather than simulated detections. Detection pixels can include false positives and are not confirmed incidents or official warnings. The current default bounding box is the contiguous United States; pass a different validated bounding box for another region. NASA FIRMS supports bounded area queries and documents the available NRT sensors. citeturn0search1turn0search2

### Fire heatmap

`GET /heatmap`

Returns image-derived hotspot coordinates only when a configured image source is available. If the source is unavailable, the endpoint returns HTTP 503 rather than fabricated hotspots.

## Local development

### Backend

```bash
cd backend
python -m venv .venv

# macOS/Linux
source .venv/bin/activate

# Windows
# .venv\\Scripts\\activate

pip install -r requirements.txt
export ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Set `VITE_API_URL` to the backend URL when deploying the frontend.

## Tests

Backend:

```bash
cd backend
pytest -q
```

Frontend build:

```bash
cd frontend
npm ci
npm run build
```

GitHub Actions runs both automatically for pushes and pull requests targeting `main`.

## ML training

Run:

```bash
python XGBoost_Model.py
```

Training produces both the root model artifact and the deployment artifact:

- `wildfire_model.pkl`
- `model_features.pkl`
- `backend/model/fire_model.pkl`
- `backend/model/features.json`

The deployment model and feature metadata are deliberately kept aligned with the inference service.

## Data and real-time integration

The repository contains historical weather and wildfire datasets used for model development. `/weather` and `/predict/current` use live Open-Meteo conditions; `/fires` uses NASA FIRMS when `FIRMS_MAP_KEY` is configured. `/zones` remains baseline data. The dashboard no longer generates alerts from static zone scores; it displays configured satellite detections as observations, not confirmed incidents.

For a multi-instance deployment, replace the in-process rate limiter with a shared gateway/Redis limiter. Persisted alert history and outbound notification delivery are not implemented. Do not replace unavailable live data with synthetic coordinates or random risk scores.

## Security

- Strict CORS allowlist via `ALLOWED_ORIGINS`
- Pydantic range validation
- Unknown JSON fields rejected
- Sanitized prediction errors
- No credentials committed to the repository
- Generated build/cache artifacts excluded from new commits

## Limitations

- The standard four-input prediction endpoint does not provide all ten model features directly; the live-weather endpoint supplies six weather features, while soil inputs remain proxies.
- The image detector is a computer-vision demonstration and is not a substitute for georeferenced MODIS/VIIRS/FIRMS or official fire-detection products.
- Baseline zones are not live observations.\n- Live weather is exposed by a separate endpoint but is not yet used directly by model inference.
- Alerts are in-memory UI state, not persisted history or outbound notifications.
- No alert should be interpreted as an official emergency notification.

## Author

Mehul Gupta and collaborators — Manipal University Jaipur.

## License

Add the project's intended open-source license before publishing the repository as a reusable open-source package.
