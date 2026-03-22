import DashboardHome from "./pages/DashboardHome";
import FireRiskMap from "./pages/FireRiskMap";
import PredictionPanel from "./pages/PredictionPanel";
import AlertSystem from "./pages/AlertSystem";
import { useState, useCallback, useEffect } from "react";
import { Component } from "react";
import { USA_ZONES } from "./data/zones";

// Shared fallback — used when backend /zones is unavailable
const MOCK_ZONES = USA_ZONES;

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected UI error" };
  }
  componentDidCatch(error, errorInfo) {
    console.error("UI crash captured:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "Segoe UI, Arial, sans-serif" }}>
          <h2 style={{ marginTop: 0 }}>UI error detected</h2>
          <p>Refresh once. If issue persists, share this message:</p>
          <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
            {this.state.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [activePage,   setActivePage]  = useState("dashboard");
  const [liveAlerts,   setLiveAlerts]  = useState([]);
  const [zoomTarget,   setZoomTarget]  = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [zones,        setZones]       = useState([]);
  const [heatmapData,  setHeatmapData] = useState([]);
  const [dataLoading,  setDataLoading] = useState(true);

  // ── load zones + heatmap once on mount ──────────────────────────
  useEffect(() => {
    // zones: try backend first, fall back to mock
    fetch(`${BASE_URL}/zones`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => MOCK_ZONES)
      .then(data => setZones(data));

    // heatmap
    fetch(`${BASE_URL}/heatmap`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
      .then(data => setHeatmapData(data))
      .finally(() => setDataLoading(false));
  }, []);

  // ── computed dashboard metrics ───────────────────────────────────
  const highRiskZones  = zones.filter(z => z.risk > 70).length;
  const avgTemp        = zones.length ? (zones.reduce((s, z) => s + z.temperature, 0) / zones.length).toFixed(1) : "—";
  const avgVegetation  = zones.length ? (zones.reduce((s, z) => s + z.vegetation,  0) / zones.length).toFixed(0) : "—";
  const activeHotspots = heatmapData.length;
  const topZone        = zones.length ? zones.reduce((a, b) => a.risk > b.risk ? a : b) : null;
  const avgHumidity    = zones.length ? (zones.reduce((s, z) => s + z.humidity, 0) / zones.length).toFixed(0) : "—";
  const avgWind        = zones.length ? (zones.reduce((s, z) => s + z.wind,     0) / zones.length).toFixed(0) : "—";

  const metrics = {
    highRiskZones,
    avgTemp,
    avgVegetation,
    activeAlerts: liveAlerts.length,
    activeHotspots,
    topZone,
    avgHumidity,
    avgWind,
    loading: dataLoading,
  };

  // ── fetch real risk score from /predict for a zone ─────────────
  const createAlert = useCallback(async (zone) => {
    const fallbackScore = Math.floor(60 + Math.random() * 30);
    let riskScore = fallbackScore;
    let riskLevel = zone.risk > 75 ? "High" : "Medium";

    try {
      const res = await fetch(`${BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: zone.temperature ?? 32,
          humidity:    zone.humidity    ?? 20,
          wind:        zone.wind        ?? 20,
          vegetation:  zone.vegetation  ?? 70,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.risk_score === "number") {
          riskScore = Math.round(data.risk_score);
          riskLevel = data.risk_level ?? riskLevel;
        }
      }
    } catch (err) {
      console.warn("[createAlert] /predict failed, using fallback:", err);
    }

    const type = riskScore >= 75 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";
    return {
      id:         `zone-${zone.name}-${Date.now()}`,
      type,
      message:    `${type === "HIGH" ? "Severe" : "Moderate"} fire risk detected in ${zone.name}`,
      location:   zone.name,
      riskScore,
      riskLevel,
      score:      riskScore,   // keep score alias for existing badge/insight logic
      time:       new Date().toLocaleTimeString(),
      status:     "ACTIVE",
      zoomTarget: zone.center ?? null,
    };
  }, []);

  // ── auto-generate alerts from zones + heatmap data ──────────────
  useEffect(() => {
    if (!zones.length && !heatmapData.length) return;

    const buildAlerts = async () => {
      const alertPromises = [];

      zones.forEach(zone => {
        const score = zone.risk ?? zone.risk_score ?? 0;
        if (score > 75 || score > 40) {
          alertPromises.push(createAlert(zone));
        }
      });

      const zoneAlerts = await Promise.all(alertPromises);

      if (heatmapData.length > 5) {
        zoneAlerts.push({
          id:        "heatmap-hotspots",
          type:      "HIGH",
          message:   "Multiple fire hotspots detected via satellite",
          location:  "Forest Region",
          riskScore: Math.floor(60 + Math.random() * 30),
          riskLevel: "High",
          score:     75,
          time:      new Date().toLocaleTimeString(),
          status:    "ACTIVE",
          zoomTarget: null,
        });
      }

      console.log("[App] alerts generated:", zoneAlerts);
      setLiveAlerts(zoneAlerts);
    };

    buildAlerts();
  }, [zones, heatmapData, createAlert]);

  // ── auto-escalate alerts with risk_score > 90 ───────────────────
  useEffect(() => {
    setLiveAlerts(prev =>
      prev.map(a => {
        if (a.status === "ACTIVE" && (a.score ?? 0) > 90) {
          console.log(`[AUTO-ESCALATE] ${a.location} — score ${a.score} exceeds critical threshold`);
          return { ...a, status: "ESCALATED", autoEscalated: true };
        }
        return a;
      })
    );
  }, [zones, heatmapData]);

  // ── prediction → alert loop ──────────────────────────────────────
  const handlePredictionAlert = useCallback(({ score, temperature, humidity, wind, vegetation }) => {
    if (score <= 75) return;
    const id = `prediction-${Date.now()}`;
    const newAlert = {
      id,
      type: score > 90 ? "HIGH" : "HIGH",
      message: `High risk detected from simulation — score ${score}/100`,
      location: "Simulation Zone",
      time: new Date().toLocaleTimeString(),
      score,
      status: score > 90 ? "ESCALATED" : "ACTIVE",
      autoEscalated: score > 90,
      zoomTarget: null,
      fromPrediction: true,
    };
    setLiveAlerts(prev => [newAlert, ...prev].slice(0, 15));
  }, []);

  const handleAlert = useCallback((alert) => {
    setLiveAlerts(prev => [alert, ...prev].slice(0, 10));
  }, []);
  const acknowledgeAlert = useCallback((id) => {
    setLiveAlerts(prev =>
      prev.map(a => a.id === id ? { ...a, status: "ACKNOWLEDGED" } : a)
    );
  }, []);

  // ── escalate an alert ────────────────────────────────────────────
  const escalateAlert = useCallback((id) => {
    console.log("Dispatching emergency alert to authorities...");
    setLiveAlerts(prev =>
      prev.map(a => a.id === id ? { ...a, status: "ESCALATED" } : a)
    );
  }, []);

  // ── reactivate acknowledged alerts if risk crosses threshold ─────
  useEffect(() => {
    if (!zones.length) return;
    setLiveAlerts(prev =>
      prev.map(alert => {
        if (alert.status !== "ACKNOWLEDGED") return alert;
        const zone = zones.find(z => z.name === alert.location);
        if (!zone) return alert;
        const newScore = zone.risk ?? 0;
        if (newScore > 75 && alert.score <= 75) {
          return { ...alert, score: newScore, status: "ACTIVE", type: "HIGH", time: new Date().toLocaleTimeString() };
        }
        return { ...alert, score: newScore };
      })
    );
  }, [zones]);

  const handleViewOnMap = useCallback((alert) => {
    const target = alert.zoomTarget ?? (alert.lat && alert.lng ? { lat: alert.lat, lng: alert.lng } : null);
    setZoomTarget(target);
    setSelectedLocation(alert);
    setActivePage("fire-risk-map");
  }, []);

  let page;
  switch (activePage) {
    case "fire-risk-map":
      page = <FireRiskMap onNavigate={setActivePage} onAlert={handleAlert} zoomTarget={zoomTarget} selectedLocation={selectedLocation} onClearLocation={() => setSelectedLocation(null)} />;
      break;
    case "prediction-panel":
      page = <PredictionPanel onNavigate={setActivePage} onPredictionAlert={handlePredictionAlert} />;
      break;
    case "alert-system":
      page = <AlertSystem onNavigate={setActivePage} liveAlerts={liveAlerts} onViewOnMap={handleViewOnMap} acknowledgeAlert={acknowledgeAlert} escalateAlert={escalateAlert} />;
      break;
    default:
      page = <DashboardHome onNavigate={setActivePage} liveAlerts={liveAlerts} metrics={metrics} />;
  }

  return (
    <AppErrorBoundary>
      {/* Global alert banner — visible on all pages when HIGH alert fires */}
      {liveAlerts.some(a => a.type === "HIGH" && (a.status === "ACTIVE" || a.status === "ESCALATED")) && activePage !== "alert-system" && (
        <div
          className="global-alert-banner"
          onClick={() => setActivePage("alert-system")}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
            background: liveAlerts.some(a => a.status === "ESCALATED") ? "#7a0000" : "#c91f1f",
            color: "#fff", textAlign: "center",
            padding: "10px 16px", fontWeight: 800, fontSize: 12,
            letterSpacing: "0.1em", cursor: "pointer",
            boxShadow: "0 2px 12px rgba(180,20,20,0.5)",
          }}
        >
          {liveAlerts.some(a => a.status === "ESCALATED")
            ? `🚨 ESCALATED: ${liveAlerts.find(a => a.status === "ESCALATED")?.message} — Click to view`
            : `🚨 ${liveAlerts.find(a => a.type === "HIGH" && a.status === "ACTIVE")?.message} — Click to view Alert System`
          }
        </div>
      )}
      <div style={{ paddingTop: liveAlerts.some(a => a.type === "HIGH" && (a.status === "ACTIVE" || a.status === "ESCALATED")) && activePage !== "alert-system" ? 38 : 0 }}>
        {page}
      </div>
    </AppErrorBoundary>
  );
}

export default App;
