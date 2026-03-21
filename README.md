# 🌲 Forest Fire Prediction & Early Warning System

An AI-powered system that predicts forest fire risk using environmental parameters like temperature, humidity, wind speed, and vegetation. It provides real-time predictions through a simple and interactive dashboard.

---

## 🚀 Features

* Forest fire risk prediction using Machine Learning
* Real-time prediction dashboard
* FastAPI backend for high-performance API
* Lightweight React frontend (Vite-based)
* REST API integration (`/predict`)
* Scikit-learn trained model (`.pkl`)

---

## 🏗️ Tech Stack

### Frontend

* React 18
* JavaScript (JSX)
* Vite 5
* Plain CSS
* Fetch API
* Custom Routing (no React Router)

### Backend

* Python
* FastAPI
* Uvicorn (ASGI server)
* Pydantic (data validation)
* NumPy
* Scikit-learn
* Joblib (model loading)

---

## 📂 Project Structure

```
project-root/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   └── PredictionPanel.jsx
│   │   ├── styles.css
│   │   └── main.jsx
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── model.pkl
│   ├── schemas/
│   │   └── request.py
│   └── requirements.txt
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone Repository

```
git clone https://github.com/your-username/forest-fire-prediction.git
cd forest-fire-prediction
```

---

### 2. Backend Setup

```
cd backend

python -m venv venv

# Activate (Windows)
venv\Scripts\activate

pip install -r requirements.txt
```

---

### ▶ Run Backend Server

```
uvicorn main:app --reload
```

Backend runs at:
http://127.0.0.1:8000

---

### 3. Frontend Setup

```
cd frontend

npm install
npm run dev
```

Frontend runs at:
http://localhost:5173

---

## 🔗 API Endpoint

### POST `/predict`

### Request

```
{
  "temperature": 35,
  "humidity": 40,
  "wind_speed": 10,
  "vegetation": 0.7
}
```

### Response

```
{
  "prediction": "High Risk"
}
```

---

## 🧠 ML Model

* Built using Scikit-learn
* Saved as `.pkl` using Joblib
* Input Features:

  * Temperature
  * Humidity
  * Wind Speed
  * Vegetation Index

---

## 🔄 AI Pipeline

1. Data Collection
2. Data Preprocessing
3. Model Training
4. Model Saving (Joblib)
5. Backend loads model
6. Frontend sends request
7. Backend predicts
8. UI displays result

---

## 🖥️ UI Overview

* Minimal design
* User input fields
* Instant prediction output
* Clean styling with CSS

---

## 🚧 Future Improvements

* Integration with real-time satellite data (MODIS, VIIRS)
* Map-based fire risk visualization
* Alert system (SMS/Email)
* Cloud deployment
* Advanced analytics dashboard

---

## 👨‍💻 Author

Manthan Dixit
B.Tech CSE (IoT)
Manipal University Jaipur

---

## ⭐ Contribution

Feel free to fork, contribute, and star the repository.

---

## ⚠️ Disclaimer

This project is for educational purposes. Predictions may not always be accurate.
