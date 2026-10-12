import DashboardHome from "./pages/DashboardHome";
import FireRiskMap from "./pages/FireRiskMap";
import PredictionPanel from "./pages/PredictionPanel";
import AlertSystem from "./pages/AlertSystem";
import { useState, useCallback, useEffect } from "react";
import { Component } from "react";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    // Avoid logging exception objects/stacks that may contain user or request data.
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "Segoe UI, Arial, sans-serif" }}>
          <h2 style={{ marginTop: 0 }}>UI error detected</h2>
          <p>Refresh the page. If the issue persists, contact the site maintainer.</p>
          
        </div>
      );
    }
    return this.props.children;
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "")).replace(/\/$/, "");

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
    // Zones are explicitly baseline data when no live zone provider is configured.
    fetch(`${BASE_URL}/zones`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("zones unavailable")))
      .then(data => setZones(Array.isArray(data) ? data : (data.zones || [])))
      .catch(() => setZones([]));

    // Real NASA FIRMS detections are only available when FIRMS_MAP_KEY is configured server-side.
    fetch(`${BASE_URL}/fires`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("satellite fire data unavailable")))
      .then(data => {
        const detections = Array.isArray(data.detections) ? data.detections : [];
        setHeatmapData(detections.map(item => [
          item.latitude,
          item.longitude,
          Math.max(0.1, Math.min(1, Number(item.frp || 0) / 100)),
        ]));
      })
      .catch(() => setHeatmapData([]))
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
    activeAlerts: liveAlerts.filter(alert => alert.status === "ACTIVE" || alert.status === "ESCALATED").length,
    activeHotspots,
    topZone,
    avgHumidity,
    avgWind,
    loading: dataLoading,
  };

  // Build transparent, source-labelled alerts from baseline risk zones and FIRMS detections.
  // Baseline-zone alerts are estimates, not confirmed incidents or official warnings.
  useEffect(() => {
    const now = new Date().toLocaleTimeString();
    const zoneAlerts = zones
      .filter(zone => Number(zone.risk ?? zone.risk_score ?? 0) > 75)
      .map(zone => {
        const score = Number(zone.risk ?? zone.risk_score ?? 0);
        return {
          id: `baseline-zone-${zone.id ?? zone.name}`,
          type: score >= 90 ? "HIGH" : "MEDIUM",
          message: `Baseline environmental risk score ${score}/100 in ${zone.name}`,
          location: zone.name,
          riskScore: score,
          riskLevel: score >= 90 ? "Critical" : "High",
          score,
          time: now,
          status: score > 90 ? "ESCALATED" : "ACTIVE",
          autoEscalated: score > 90,
          zoomTarget: zone.center ?? { lat: zone.lat, lng: zone.lng },
          source: "Static baseline zone",
          disclaimer: "Bundled demonstration data; not a live observation or official emergency alert.",
        };
      });

    const detectionAlerts = heatmapData.length > 0 ? [{
      id: "firms-detections",
      type: "MEDIUM",
      message: `${heatmapData.length} image-derived hotspot(s) detected by the configured computer-vision demo`,
      location: "Bundled image region",
      riskScore: null,
      riskLevel: "Unclassified",
      score: 0,
      time: now,
      status: "ACTIVE",
      zoomTarget: null,
      source: "OpenCV demonstration image",
      disclaimer: "Image colour detection is not a validated satellite fire product.",
    }] : [];

    setLiveAlerts(previous => {
      const predictionAlerts = previous.filter(alert => alert.fromPrediction);
      const preservedStatuses = new Map(previous.map(alert => [alert.id, alert]));
      const generated = [...zoneAlerts, ...detectionAlerts].map(alert => {
        const previousAlert = preservedStatuses.get(alert.id);
        return previousAlert
          ? { ...alert, status: previousAlert.status, time: previousAlert.time }
          : alert;
      });
      return [...predictionAlerts, ...generated].slice(0, 30);
    });
  }, [zones, heatmapData]);

  // ── auto-escalate alerts with risk_score > 90 ───────────────────
  useEffect(() => {
    setLiveAlerts(prev =>
      prev.map(a => {
        if (a.status === "ACTIVE" && (a.score ?? 0) > 90) {
          // State transition is reflected in the UI; avoid logging alert details.
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
      message: `High environmental risk score ${score}/100 from user-entered simulation inputs.`,
      location: "Simulation Zone",
      source: "User-entered simulation",
      disclaimer: "Simulation output only; not a live observation or official warning.",
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
    // This UI transition does not send an external notification.
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
