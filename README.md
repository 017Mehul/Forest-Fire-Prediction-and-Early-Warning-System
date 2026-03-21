# 🔥 Forest Fire Prediction & Early Warning System

An AI-powered system designed to predict wildfire risks using environmental and historical data, enabling early detection, visualization, and alert generation to prevent large-scale disasters.

---

## 🚀 Project Overview

Forest fires cause severe damage to ecosystems, air quality, and human life. This project leverages **machine learning + real-time environmental data** to:

- Predict wildfire risk
- Visualize high-risk zones on a map
- Generate early alerts
- Simulate extreme weather scenarios

---

## 🧠 Key Features

### 🔍 AI-Based Prediction
- Uses ML model trained on environmental + historical data
- Inputs:
  - Temperature 🌡
  - Humidity 💧
  - Wind Speed 🌬
  - Vegetation Density 🌿
- Outputs:
  - Risk Score (0–100)
  - Risk Level (Low / Medium / High)

---

### 🗺️ Fire Risk Map
- Interactive map with:
  - 🔴 High Risk zones
  - 🟡 Medium Risk zones
  - 🟢 Low Risk zones
- Heatmap visualization for real-time monitoring

---

### 📊 Dashboard
- Real-time overview of:
  - High-risk zones
  - Average temperature
  - Vegetation density
  - Active alerts

---

### 🚨 Alert System
- Automatically triggers alerts based on prediction
- Displays:
  - Location
  - Severity
  - Time

---

### 🔁 Simulation Mode (WOW Feature)
- Simulates extreme weather conditions
- Dynamically updates:
  - Risk scores
  - Alerts
  - Map visualization

---

## 🏗️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Leaflet (OpenStreetMap)

### Backend
- FastAPI
- Python
- Joblib (for ML model)

### Machine Learning
- XGBoost / Random Forest (trained model)
- NASA FIRMS dataset (historical fire data)
- Weather data integration

---

## 🧪 API Endpoint

### POST `/predict`

#### Request:
```json
{
  "temperature": 40,
  "humidity": 20,
  "wind": 25,
  "vegetation": 70
}
