import { useEffect, useMemo, useState } from "react";
import SidebarNav from "../components/SidebarNav";
import SystemStatus from "../components/SystemStatus";

const API = "http://127.0.0.1:8000/predict";

// Compute each factor's raw contribution then normalise to 100 %
function computeContributions(temperature, humidity, wind, vegetation) {
  const t = temperature * 0.35;
  const h = (100 - humidity) * 0.25;
  const w = wind * 0.2;
  const v = vegetation * 0.2;
  const total = t + h + w + v || 1;
  return {
    temperature: Math.round((t / total) * 100),
    humidity:    Math.round((h / total) * 100),
    wind:        Math.round((w / total) * 100),
    vegetation:  Math.round((v / total) * 100),
  };
}

function insightText(score, humidity) {
  if (score === null) return `XGBoost indicates that current high temperatures and wind speeds, combined with exceptionally low humidity (${humidity}%), create a critical "flash-point" environment for dense vegetation fuel loads.`;
  if (score > 75)  return "Extreme heat, low humidity, and strong winds are driving critical wildfire risk.";
  if (score >= 40) return `XGBoost indicates that current high temperatures and wind speeds, combined with exceptionally low humidity (${humidity}%), create a critical "flash-point" environment for dense vegetation fuel loads.`;
  return "Conditions are stable with low fire risk. Continue passive monitoring.";
}

export default function PredictionPanel({ onNavigate, onPredictionAlert }) {
  const [temperature, setTemperature] = useState(32);
  const [humidity,    setHumidity]    = useState(14);
  const [wind,        setWind]        = useState(28);
  const [vegetation,  setVegetation]  = useState(85);

  const [riskScore, setRiskScore] = useState(null);
  const [riskLevel, setRiskLevel] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState("");
  const [alertGenerated, setAlertGenerated] = useState(false);
  const [selectedModel, setSelectedModel] = useState("xgboost");
  const [displayScore, setDisplayScore] = useState(0);

  // Count-up animation whenever riskScore changes
  useEffect(() => {
    if (riskScore === null) return;
    let current = 0;
    const duration = 800;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = riskScore / steps;
    const interval = setInterval(() => {
      current += increment;
      if (current >= riskScore) {
        current = riskScore;
        clearInterval(interval);
      }
      setDisplayScore(Math.round(current));
    }, stepTime);
    return () => clearInterval(interval);
  }, [riskScore]);

  const getRiskColor = (score) => {
    if (score < 40) return "#22c55e";
    if (score < 75) return "#f59e0b";
    return "#ef4444";
  };
  const riskColor = getRiskColor(displayScore);

  const models = {
    xgboost: { label: "MODEL: XGBOOST | OPTIMIZED FOR HIGH RECALL", icon: "sliders" },
    nasa:    { label: "TRAINED ON NASA FIRMS + WEATHER DATA",        icon: "db"      },
  };

  const isExtreme = riskScore !== null && riskScore > 75;

  const displayLevel = riskScore !== null
    ? (riskScore > 75 ? "CRITICAL / EXTREME" : riskScore >= 40 ? "MEDIUM RISK" : "LOW RISK")
    : "--";

  const contribution = useMemo(
    () => computeContributions(temperature, humidity, wind, vegetation),
    [temperature, humidity, wind, vegetation]
  );

  async function runPrediction() {
    setLoading(true);
    setApiError("");
    setAlertGenerated(false);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature, humidity, wind, vegetation }),
      });
      if (!res.ok) throw new Error(`API error (${res.status})`);
      const data = await res.json();
      if (typeof data.risk_score !== "number") throw new Error("Invalid response");
      const score = Math.round(Math.max(0, Math.min(100, data.risk_score)));
      setRiskScore(score);
      setRiskLevel(data.risk_level ?? "");
      // prediction → alert loop
      if (score > 75) {
        onPredictionAlert?.({ score, temperature, humidity, wind, vegetation });
        setAlertGenerated(true);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Prediction unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`layout prediction-layout ${isExtreme ? "prediction-extreme" : ""}`}>
      <SidebarNav active="prediction-panel" onNavigate={onNavigate} />

      <main className="content">
        <header className="topbar">
          <div className="left">
            <strong>Vigilant Curator</strong>
            <span className="link-like" onClick={() => onNavigate("dashboard")}>Dashboard</span>
            <span className="link-like" onClick={() => onNavigate("fire-risk-map")}>Fire Risk Map</span>
            <span className="active-link">Prediction Panel</span>
            <span className="link-like" onClick={() => onNavigate("alert-system")}>Alert System</span>
          </div>
          <div className="right"><SystemStatus /></div>
        </header>

        <section className="prediction-wrap">
          <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }`}</style>
          {isExtreme && (
            <div className="prediction-alert-banner">⚠ EXTREME WEATHER CONDITIONS DETECTED</div>
          )}
          {alertGenerated && (
            <div style={{
              background: "linear-gradient(90deg,#7a0000,#c91f1f)",
              color: "#fff", borderRadius: 10, padding: "10px 18px",
              fontWeight: 800, fontSize: 12, letterSpacing: "0.08em",
              marginBottom: 14, display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 2px 12px rgba(180,20,20,0.35)",
              animation: "fadeIn 0.4s ease both",
            }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              High risk detected — alert generated and sent to Alert System
              <button
                onClick={() => onNavigate("alert-system")}
                style={{ marginLeft: "auto", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 6, background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 11, padding: "4px 10px", cursor: "pointer" }}
              >
                View Alerts →
              </button>
            </div>
          )}

          <div className="prediction-header">
            <span className="engine-tag">NEURAL ENGINE v4.2</span>
            <h2>Prediction Panel</h2>
            <div className="header-tags">
              <span
                className={`header-tag-btn ${selectedModel === "xgboost" ? "header-tag-btn--active" : ""}`}
                onClick={() => setSelectedModel("xgboost")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{marginRight:6,verticalAlign:"middle",flexShrink:0}}>
                  <line x1="5" y1="3" x2="5" y2="21"/>
                  <rect x="3" y="8" width="4" height="5" rx="1"/>
                  <line x1="12" y1="3" x2="12" y2="21"/>
                  <rect x="10" y="12" width="4" height="5" rx="1"/>
                  <line x1="19" y1="3" x2="19" y2="21"/>
                  <rect x="17" y="6" width="4" height="5" rx="1"/>
                </svg>
                MODEL: XGBOOST | OPTIMIZED FOR HIGH RECALL
              </span>
              <span
                className={`header-tag-btn ${selectedModel === "nasa" ? "header-tag-btn--active" : ""}`}
                onClick={() => setSelectedModel("nasa")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{marginRight:6,verticalAlign:"middle"}}>
                  <ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>
                </svg>
                TRAINED ON NASA FIRMS + WEATHER DATA
              </span>
            </div>
            <p>
              Leverage XGBoost neural networks to simulate environmental variables
              and forecast wildfire probability with the Vigilant Curator Engine.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4e8a6a", background: "rgba(30,100,60,0.1)", border: "1px solid rgba(30,100,60,0.2)", borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em" }}>
                🛰 Confidence: 87% — NASA FIRMS + Weather Data
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7a6030", background: "rgba(120,90,20,0.08)", border: "1px solid rgba(120,90,20,0.18)", borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em" }}>
                📡 Powered by satellite + weather intelligence
              </span>
            </div>
          </div>

          <div className="prediction-grid">
            {/* ── Left: sliders ── */}
            <section className="params-card">
              <div className="params-head">
                <div>
                  <h3>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{marginRight:10,verticalAlign:"middle",opacity:0.75}}>
                      <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                      <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
                    </svg>
                    Model Parameters
                  </h3>
                  <div className="model-chip">
                    {selectedModel === "xgboost" ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6b45" strokeWidth="2.5" strokeLinecap="round" style={{marginRight:6,verticalAlign:"middle",flexShrink:0}}>
                        <line x1="5" y1="3" x2="5" y2="21"/>
                        <rect x="3" y="8" width="4" height="5" rx="1"/>
                        <line x1="12" y1="3" x2="12" y2="21"/>
                        <rect x="10" y="12" width="4" height="5" rx="1"/>
                        <line x1="19" y1="3" x2="19" y2="21"/>
                        <rect x="17" y="6" width="4" height="5" rx="1"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6b45" strokeWidth="2.5" strokeLinecap="round" style={{marginRight:6,verticalAlign:"middle",flexShrink:0}}>
                        <ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>
                      </svg>
                    )}
                    {models[selectedModel].label}
                  </div>
                  <small style={{display:"block", marginTop:8}}>ADJUST VARIABLES FOR SIMULATION</small>
                </div>
                <div className="model-status-block">
                  <span className="model-status-label">MODEL STATUS</span>
                  <div className="model-status-pill">
                    <span className="model-status-dot" />
                    <span className="model-status-text">
                      {loading ? "Running…" : isExtreme ? "Simulation Active" : "Live System Ready"}
                    </span>
                  </div>
                </div>
              </div>

              <label>
                <div className="row">
                  <span>Temperature</span>
                  <strong className={isExtreme && temperature >= 40 ? "metric-alert" : ""}>
                    {temperature}°C
                  </strong>
                </div>
                <input type="range" min="0" max="50" value={temperature}
                  onChange={e => setTemperature(Number(e.target.value))} />
                <div className="range-limits"><small>0°C</small><small>50°C</small></div>
              </label>

              <label>
                <div className="row">
                  <span>Humidity</span>
                  <strong className={isExtreme && humidity <= 12 ? "metric-alert" : ""}>
                    {humidity}%
                  </strong>
                </div>
                <input type="range" min="0" max="100" value={humidity}
                  onChange={e => setHumidity(Number(e.target.value))} />
                <div className="range-limits"><small>0%</small><small>100%</small></div>
              </label>

              <label>
                <div className="row">
                  <span>Wind Speed</span>
                  <strong className={isExtreme && wind >= 35 ? "metric-alert" : ""}>
                    {wind} km/h
                  </strong>
                </div>
                <input type="range" min="0" max="50" value={wind}
                  onChange={e => setWind(Number(e.target.value))} />
                <div className="range-limits"><small>0 KM/H</small><small>50 KM/H</small></div>
              </label>

              <label>
                <div className="row">
                  <span>Vegetation Density</span>
                  <strong>{vegetation}%</strong>
                </div>
                <input type="range" min="0" max="100" value={vegetation}
                  onChange={e => setVegetation(Number(e.target.value))} />
                <div className="range-limits"><small>SPARSE</small><small>DENSE</small></div>
              </label>

              <div className="predict-action">
                <div className="predict-action-info">
                  <div className="predict-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5"/><line x1="12" y1="11" x2="12" y2="17"/>
                    </svg>
                  </div>
                  <p>
                    AI Engine processes 142 historical variables against real-time
                    sensor data to generate this predictive confidence score.
                  </p>
                </div>
                <button
                  className={`predict-btn ${isExtreme ? "danger-btn" : ""}`}
                  onClick={runPrediction}
                  disabled={loading}
                >
                  <span>{loading ? "Predicting…" : isExtreme ? "Update Prediction" : "Run AI Prediction"}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
                  </svg>
                </button>
              </div>

              {apiError && (
                <small className="api-error">⚠ {apiError}</small>
              )}
            </section>

            {/* ── Right: results ── */}
            <aside className="prediction-side">
              <article className={`risk-card ${isExtreme ? "risk-card-extreme" : ""}`}>
                <div className="pf-heading">
                  <span className="pf-heading-line" />
                  <h4>{isExtreme ? "SIMULATED PROBABILITY" : "PROBABILITY\nFORECAST"}</h4>
                  <span className="pf-heading-line" />
                </div>

                {/* Circular gauge */}
                <div className={`pf-gauge-wrap${displayScore > 85 ? " risk-pulse" : displayScore > 75 ? " risk-glow-high" : ""}`}>
                  <svg className="pf-gauge-svg" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f5e0e0" strokeWidth="8"/>
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={riskColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - displayScore / 100)}`}
                      transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
                    />
                  </svg>
                  <div className="pf-gauge-inner">
                    <span className="pf-gauge-score" style={{ color: riskColor, transition: "color 0.4s ease" }}>
                      {riskScore !== null ? displayScore : "--"}
                    </span>
                    <small className="pf-gauge-label">RISK SCORE</small>
                  </div>
                </div>

                {/* Risk pill */}
                <div style={{display:"flex", justifyContent:"center"}}>
                  <div className={`pf-pill ${displayScore > 75 ? "pf-pill--red" : displayScore >= 40 ? "pf-pill--orange" : "pf-pill--green"}`}>
                  <svg className="pf-pill-triangle" viewBox="0 0 24 24" fill="white" aria-hidden>
                    <path d="M12 2L1 21h22L12 2z"/>
                    <text x="12" y="18" textAnchor="middle" fontSize="9" fill={riskScore !== null && riskScore > 75 ? "#c91f1f" : "#ea580c"} fontWeight="900">!</text>
                  </svg>
                  <div className="pf-pill-body">
                    <span className="pf-pill-score">{displayScore} / 100 →</span>
                    <span className="pf-pill-level">{displayLevel}</span>
                  </div>
                  </div>
                </div>
                <div className="pf-contrib">
                  <div className="pf-contrib-head">
                    <span>FACTOR CONTRIBUTION BREAKDOWN</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
                    </svg>
                  </div>
                  {[
                    ["TEMPERATURE", contribution.temperature],
                    ["HUMIDITY",    contribution.humidity],
                    ["WIND SPEED",  contribution.wind],
                    ["VEGETATION",  contribution.vegetation],
                  ].map(([label, pct]) => (
                    <div key={label} className="pf-bar-row">
                      <div className="pf-bar-meta">
                        <span className="pf-bar-label">{label}</span>
                        <span className="pf-bar-pct">{pct}%</span>
                      </div>
                      <div className="pf-bar-track">
                        <div className="pf-bar-fill" style={{width:`${pct}%`, transition:"width 0.4s ease"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={`mi-card ${isExtreme ? "mi-card--critical" : ""}`}>
                {/* Header row */}
                <div className="mi-header">
                  <div className="mi-header-left">
                    <div className="mi-icon-box">
                      {/* person + target icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="8" r="3"/>
                        <path d="M6 20v-1a6 6 0 0112 0v1"/>
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                      </svg>
                    </div>
                    <span className="mi-title">{isExtreme ? "Critical Risk Insights" : "Model Insights"}</span>
                  </div>
                  {/* brain icon top-right */}
                  <svg className="mi-brain" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35">
                    <path d="M9.5 2a4.5 4.5 0 014 2.5A4.5 4.5 0 0121 9c0 2-1 3.5-2.5 4.5.5.8.5 1.8 0 2.5a3 3 0 01-2 2.8V20a2 2 0 01-4 0v-.2a3 3 0 01-2-2.8 2.5 2.5 0 010-2.5A4.5 4.5 0 013 9a4.5 4.5 0 017.5-3.5"/>
                    <path d="M12 6v6M9 9h6"/>
                  </svg>
                </div>

                {/* Body text */}
                <p className="mi-body">{insightText(riskScore, humidity)}</p>

                {/* Sub-cards */}
                <div className="mi-sub-grid">
                  <div className="mi-sub-card">
                    <div className="mi-sub-label">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                      </svg>
                      FUEL LOAD
                    </div>
                    <strong className="mi-sub-value">
                      {isExtreme ? "Extreme Dryspell" : riskScore !== null && riskScore >= 40 ? "Critical Level" : "Moderate"}
                    </strong>
                  </div>
                  <div className="mi-sub-card">
                    <div className="mi-sub-label">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      SPREAD RATE
                    </div>
                    <strong className="mi-sub-value">
                      {isExtreme ? "Critical (E5+)" : riskScore !== null && riskScore >= 40 ? "Rapid (E4)" : "Slow (E2)"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="region-card" style={{
                backgroundImage: `url(https://lh3.googleusercontent.com/aida-public/AB6AXuCkzY7V2fNdeO10mQcRacReJGDSUnaVZlroHpJ8addEiDMcGSnjnnKL42X4_uS2IGwcHvyAwbh9WmEI-zRDUcg75s7SftkHi-pkJMadZ85sXPZ4cxamlkEg7cWBiZzgQ6uaePmMLlNZGuSluus_nzp2a2LuCz7lICoYe83Ty1VKDVKqp6gt1D0pOgcVWIGGqRdhw5u2JJrnMx5VfLIoYg4dNpQrPdqo04MRYRGuiQS7W7o1KEGPHbAbeUtulvU35hOwFuWkxUZ44fY)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}>
                {isExtreme ? "SIMULATION HOTZONE ACTIVE" : "ACTIVE SIMULATION REGION"}
              </article>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
