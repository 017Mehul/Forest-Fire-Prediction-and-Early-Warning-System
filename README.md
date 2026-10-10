# Forest Fire Prediction & Early Warning System

An ML-powered wildfire-risk monitoring application combining a calibrated XGBoost classifier, environmental risk rules, FastAPI, and a React/Vite dashboard.

> **Important:** This project is an engineering/academic early-warning prototype. Its risk score is **not** an official emergency warning probability and should not be used as the sole basis for evacuation or emergency decisions.

## What is implemented

- Calibrated XGBoost wildfire-occurrence model
- Explicit model feature contract
- FastAPI prediction API with strict input validation
- Health endpoint for deployment monitoring
- Monitoring-zones API
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
  |     |      |
  v     v      v
Predict Zones Heatmap
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

### Monitoring zones

`GET /zones`

Returns the currently bundled baseline monitoring zones. The response explicitly contains `live: false`; these values are not presented as real-time observations.

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

The repository contains historical weather and wildfire datasets used for model development. The bundled `/zones` endpoint is intentionally marked as baseline data.

For production deployment, connect an authoritative weather source and a documented satellite/fire-detection source, then persist timestamps, source identifiers, geolocation, and confidence for every observation. Do not replace unavailable live data with synthetic coordinates or random risk scores.

## Security

- Strict CORS allowlist via `ALLOWED_ORIGINS`
- Pydantic range validation
- Unknown JSON fields rejected
- Sanitized prediction errors
- No credentials committed to the repository
- Generated build/cache artifacts excluded from new commits

## Limitations

- The current four-input UI does not provide all ten model features directly.
- The image detector is a computer-vision demonstration and is not a substitute for georeferenced MODIS/VIIRS/FIRMS or official fire-detection products.
- Baseline zones are not live observations.
- No alert should be interpreted as an official emergency notification.

## Author

Mehul Gupta and collaborators — Manipal University Jaipur.

## License

Add the project's intended open-source license before publishing the repository as a reusable open-source package.
