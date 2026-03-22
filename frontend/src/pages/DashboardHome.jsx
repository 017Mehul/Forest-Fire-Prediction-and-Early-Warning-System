import { useState } from "react";
import SidebarNav from "../components/SidebarNav";
import SystemStatus from "../components/SystemStatus";
import DashboardMiniMap from "../components/DashboardMiniMap";

function IconHeroPin({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="white"
        d="M12 20.5S6 14.2 6 9.5A6 6 0 1118 9.5c0 4.7-6 11-6 11z"
      />
      <circle cx="12" cy="9" r="2.5" fill="#8b1414" />
    </svg>
  );
}

function IconLightning({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 14h6.5l-1.5 8L20 8h-6.5L13 2z"
        stroke="white"
        strokeWidth="1.85"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function IconStopSquare({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function InsightAiIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="3" r="1.35" fill="currentColor" />
      <rect x="6" y="8.5" width="12" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.75" fill="none" />
      <circle cx="9.25" cy="13" r="1.15" fill="currentColor" />
      <circle cx="14.75" cy="13" r="1.15" fill="currentColor" />
      <path d="M9.5 16.25h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CardSparkline({ variant, redStroke }) {
  const stroke = redStroke ? "#d32f2f" : "#e85c1f";
  const paths = {
    volatile: "0,18 6,14 12,16 18,10 24,12 30,8 36,6",
    up: "0,20 6,18 12,14 18,12 24,8 30,6 36,4",
    simVolatile: "0,20 6,12 12,14 18,8 24,6 30,4 36,2",
    simUp: "0,22 6,20 12,16 18,12 24,8 30,4 36,2",
  };
  const pts = paths[variant] || paths.volatile;
  return (
    <svg className="card-sparkline" viewBox="0 0 40 24" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function CardSegmentBar({ filled, total = 5 }) {
  return (
    <div className="card-segments" role="img" aria-label={`${filled} of ${total} segments`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < filled ? "card-segment filled" : "card-segment"} />
      ))}
    </div>
  );
}

export default function DashboardHome({ onNavigate, metrics = {}, liveAlerts = [] }) {
  const [isSimulation, setIsSimulation] = useState(false);

  const {
    loading        = false,
    highRiskZones  = 0,
    avgTemp        = "—",
    avgVegetation  = "—",
    activeAlerts   = 0,
    activeHotspots = 0,
    topZone        = null,
    avgHumidity    = "—",
    avgWind        = "—",
  } = metrics;

  // simulation overrides
  const simHighRisk  = highRiskZones + 4;
  const simTemp      = avgTemp !== "—" ? (parseFloat(avgTemp) + 6).toFixed(1) : "—";
  const simVeg       = avgVegetation !== "—" ? Math.min(99, parseInt(avgVegetation) + 7) : "—";
  const simAlerts    = activeAlerts + 3;
  const simHotspots  = activeHotspots + 8;

  // live values (switches between real and simulated)
  const liveHighRisk  = isSimulation ? simHighRisk  : highRiskZones;
  const liveTemp      = isSimulation ? simTemp       : avgTemp;
  const liveVeg       = isSimulation ? simVeg        : avgVegetation;
  const liveAlertCnt  = isSimulation ? simAlerts     : activeAlerts;
  const liveHotspots  = isSimulation ? simHotspots   : activeHotspots;
  const liveWind      = isSimulation ? "48 km/h"     : (avgWind !== "—" ? `${avgWind} km/h` : "—");
  const liveHumidity  = isSimulation ? "4%"          : (avgHumidity !== "—" ? `${avgHumidity}%` : "—");
  const liveFuel      = isSimulation ? "Catastrophic" : (liveHighRisk > 2 ? "Critical" : "Moderate");

  // derived flags
  const hotspotSurge  = liveHotspots > 5;
  const extremeRisk   = liveHighRisk > 3;
  const riskPct       = isSimulation ? "98%" : `${Math.min(99, liveHighRisk * 14 + 30)}%`;
  const riskLabel     = isSimulation ? "Fire Risk Probability: 98% (Extreme)" : `Fire Risk Probability: ${Math.min(99, liveHighRisk * 14 + 30)}% (${extremeRisk ? "High" : "Moderate"})`;
  const topZoneName   = topZone ? topZone.name : "Fresno Highlands";

  // data-driven "why" insight
  const insightText = isSimulation
    ? "EXTREME RISK: Gale-force winds and excessive heat detected. Catastrophic fire spread highly probable."
    : (() => {
        if (!topZone) return "Environmental conditions are being monitored. No critical threshold breaches detected.";
        const { risk, temperature, humidity, wind, vegetation } = topZone;
        const drivers = [];
        if (temperature >= 40) drivers.push(`high temperature (${temperature}°C)`);
        if (humidity <= 15)    drivers.push(`critically low humidity (${humidity}%)`);
        if (wind >= 30)        drivers.push(`strong winds (${wind} km/h)`);
        if (vegetation >= 80)  drivers.push(`dense vegetation (${vegetation}%)`);
        if (risk > 75) {
          return `High ${drivers.length ? drivers.join(" and ") + " are" : "environmental conditions are"} driving extreme fire risk in ${topZone.name}. Immediate action recommended.`;
        }
        if (risk > 50) {
          return `Elevated risk in ${topZone.name} — ${drivers.length ? drivers.join(" and ") + " are contributing factors" : "conditions warrant close monitoring"}.`;
        }
        return `Conditions in ${topZone.name} are within manageable range. Continue passive monitoring across all zones.`;
      })();

  // card definitions — values injected from live data
  const liveCards = [
    {
      title: "High Risk Zones",
      value: loading ? "…" : String(liveHighRisk),
      tag: isSimulation ? "EXTREME" : extremeRisk ? "CRITICAL" : "ELEVATED",
      hint: extremeRisk ? "Risk increasing — multiple zones above threshold" : "Monitoring active zones",
      iconType: "critical", badgeVariant: "critical", sparkline: isSimulation ? "simVolatile" : "volatile",
      segments: null, footerEmoji: "🔥", footerHintClass: extremeRisk ? "card-footer-hint--danger" : "",
      mapLink: true, alertLine: null,
      highlight: extremeRisk,
    },
    {
      title: "Avg Temperature",
      value: loading ? "…" : `${liveTemp}°C`,
      tag: isSimulation ? "SIMULATED" : "REAL-TIME",
      hint: isSimulation ? "Gale-force winds active" : "Aggregated across all monitored zones",
      iconType: "thermo", badgeVariant: "realtime", sparkline: isSimulation ? "simUp" : "up",
      segments: null, footerEmoji: "💨",
      footerHintClass: isSimulation ? "card-footer-hint--danger" : "",
      mapLink: false, alertLine: null, highlight: false,
    },
    {
      title: "Avg Vegetation",
      value: loading ? "…" : `${liveVeg}%`,
      tag: isSimulation ? "DENSITY" : "SATELLITE",
      hint: isSimulation ? "Fuel load simulation set to max" : "Vegetation density from satellite feed",
      iconType: "tree", badgeVariant: "satellite", sparkline: null,
      segments: isSimulation ? 4 : Math.min(5, Math.round(parseInt(liveVeg) / 20)),
      footerEmoji: "🌿", footerHintClass: "", mapLink: false, alertLine: null, highlight: false,
    },
    {
      title: "Active Alerts",
      value: loading ? "…" : String(liveAlertCnt),
      tag: liveAlertCnt > 2 ? "CRITICAL" : "WARNING",
      hint: liveAlertCnt > 0 ? `${liveAlertCnt} alert${liveAlertCnt !== 1 ? "s" : ""} require attention` : "No active alerts",
      iconType: "bell", badgeVariant: "warning", sparkline: null, segments: null,
      footerEmoji: "💧", footerHintClass: liveAlertCnt > 0 ? "card-footer-hint--danger" : "",
      mapLink: false,
      alertLine: liveAlertCnt > 0 ? `${liveAlertCnt > 2 ? "Multiple threshold breaches" : "Low moisture detected in basin"}` : null,
      highlight: false,
    },
  ];

  const mapLabel    = isSimulation ? "SIMULATION: ACTIVE HEATMAPS" : "MAP VIEW: ACTIVE HEATMAPS";
  const mapBadgeExtra = hotspotSurge && !isSimulation
    ? ` · 🔥 ${liveHotspots} hotspots` : "";

  return (
    <div className={`layout ${isSimulation ? "simulation" : ""}`}>
      <SidebarNav active="dashboard" onNavigate={onNavigate} />

      <main className="content">
        <header className="topbar">
          <div className="left">
            <strong>Vigilant Curator</strong>
            <span className="active-link">Dashboard</span>
            <span className="link-like" onClick={() => onNavigate("fire-risk-map")}>Fire Risk Map</span>
            <span className="link-like" onClick={() => onNavigate("prediction-panel")}>Prediction Panel</span>
            <span className="link-like" onClick={() => onNavigate("alert-system")}>Alert System</span>
          </div>
          <div className="right">
            <SystemStatus />
            <span className="live-pill">
              {isSimulation ? "Simulation Active" : "System Live"}
            </span>
          </div>
        </header>

        {isSimulation && (
          <section className="sim-banner">⚠ EXTREME WEATHER SIMULATION ACTIVE ⚠</section>
        )}

        {/* hotspot surge banner */}
        {hotspotSurge && !isSimulation && (
          <section className="sim-banner" style={{ background: "#b45309" }}>
            🔥 HOTSPOT SURGE DETECTED — {liveHotspots} active hotspots across monitored zones
          </section>
        )}

        <section className="hero">
          <div>
            <h2>Environmental Overview</h2>
            <p>Real-time surveillance and predictive analytics for high-stakes ecological management.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4e8a6a", background: "rgba(30,100,60,0.1)", border: "1px solid rgba(30,100,60,0.2)", borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em" }}>
                🛰 Confidence: 87% — NASA FIRMS + Weather Data
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7a6030", background: "rgba(120,90,20,0.08)", border: "1px solid rgba(120,90,20,0.18)", borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em" }}>
                📡 Powered by satellite + weather intelligence
              </span>
            </div>
          </div>
          <div className="hero-actions">
            <div className="risk-zone">
              <div className="risk-zone-pill"><IconHeroPin className="risk-zone-pin" /></div>
              <div className="risk-zone-copy">
                <span className="risk-zone-label">HIGHEST RISK ZONE</span>
                <span className="risk-zone-place">{topZoneName}</span>
              </div>
            </div>
            <button type="button" className="cta" onClick={() => setIsSimulation(p => !p)}>
              {isSimulation ? (
                <><IconStopSquare className="cta-icon" /><span className="cta-text"><span className="cta-line">Stop</span><span className="cta-line">Simulation</span></span></>
              ) : (
                <><IconLightning className="cta-icon" /><span className="cta-text"><span className="cta-line">Simulate Extreme</span><span className="cta-line">Weather</span></span></>
              )}
            </button>
          </div>
        </section>

        <section className="cards">
          {liveCards.map((card, idx) => (
            <article
              key={card.title}
              className={`card ${(isSimulation && idx === 0) || card.highlight ? "critical-card" : ""}`}
            >
              <div className="card-header-row">
                <div className={`card-icon-square card-icon-square--${card.iconType}`} aria-hidden>
                  {card.iconType === "critical" && "⚠"}
                  {card.iconType === "thermo"   && "🌡"}
                  {card.iconType === "tree"     && "🌲"}
                  {card.iconType === "bell"     && "🔔"}
                </div>
                <span className={`card-badge card-badge--${card.badgeVariant}`}>{card.tag}</span>
              </div>
              <h3>{card.title}</h3>
              <p className="big">{card.value}</p>
              <div className="card-viz">
                {card.sparkline && (
                  <div className="card-sparkline-wrap">
                    <CardSparkline variant={card.sparkline} redStroke={isSimulation} />
                  </div>
                )}
                {card.segments != null && <CardSegmentBar filled={card.segments} />}
                {card.alertLine && <p className="card-alert-line">{card.alertLine}</p>}
              </div>
              <div className="card-footer">
                <span className="card-footer-emoji" aria-hidden>{card.footerEmoji}</span>
                <span className={`card-footer-hint ${card.footerHintClass}`}>{card.hint}</span>
              </div>
              {card.mapLink && (
                <button type="button" className="card-map-link" onClick={() => onNavigate("fire-risk-map")}>
                  VIEW MAP →
                </button>
              )}
            </article>
          ))}
        </section>

        {/* ── Top Risk Zone highlight ── */}
        {topZone && !loading && (
          <div style={{
            margin: "0 26px 14px",
            background: topZone.risk > 75 ? "linear-gradient(135deg,#3d0a0a,#6b1414)" : "linear-gradient(135deg,#1a3a2a,#0d4e37)",
            border: `1px solid ${topZone.risk > 75 ? "#8b2020" : "#1d6b45"}`,
            borderRadius: 14, padding: "14px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, color: "#fff",
            boxShadow: topZone.risk > 75 ? "0 4px 20px rgba(180,20,20,0.3)" : "0 4px 20px rgba(10,60,40,0.25)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: topZone.risk > 75 ? "#c91f1f" : topZone.risk > 50 ? "#ff8800" : "#22bb66",
                display: "grid", placeItems: "center", fontSize: 20,
                boxShadow: `0 0 0 6px ${topZone.risk > 75 ? "rgba(201,31,31,0.25)" : "rgba(34,187,102,0.2)"}`,
              }}>📍</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                  opacity: 0.7, marginBottom: 3 }}>HIGHEST RISK ZONE</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{topZone.name}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              {[
                ["RISK SCORE", `${topZone.risk}/100`, topZone.risk > 75 ? "#ff8080" : "#7effc8"],
                ["TEMP",       `${isSimulation ? (topZone.temperature + 6) : topZone.temperature}°C`, "#ffd580"],
                ["HUMIDITY",   `${isSimulation ? Math.max(2, topZone.humidity - 6) : topZone.humidity}%`, "#80d4ff"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", opacity: 0.6, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
                </div>
              ))}
              <button
                onClick={() => onNavigate("fire-risk-map")}
                style={{
                  border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8,
                  background: "rgba(255,255,255,0.1)", color: "#fff",
                  fontWeight: 700, fontSize: 11, padding: "8px 14px",
                  cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.06em",
                }}
              >
                VIEW ON MAP →
              </button>
            </div>
          </div>
        )}

        <section className={`insight ${isSimulation ? "insight--simulation" : ""}`}>
          <div className="insight-icon-wrap" aria-hidden>
            <InsightAiIcon className="insight-ai-svg" />
          </div>
          <div className="insight-body">
            <span className="insight-kicker">INTELLIGENCE INSIGHT</span>
            <p className="insight-message">{insightText}</p>
          </div>
        </section>

        <section className="lower-grid">
          <div className="map-panel">
            <span className="map-badge">{mapLabel}{mapBadgeExtra}</span>
            <DashboardMiniMap
              metrics={{ avgTemp: parseFloat(liveTemp) || 32, avgHumidity: parseFloat(liveHumidity) || 14, avgWind: parseFloat(liveWind) || 28, avgVegetation: parseFloat(liveVeg) || 85 }}
              onNavigate={onNavigate}
            />
            {isSimulation && (
              <div className="critical-sector">CRITICAL SECTOR: Sector 7: Extreme Heat Pulse</div>
            )}
            <div className="map-overlay">
              <h4>{riskLabel}</h4>
              <div className="progress"><span style={{ width: riskPct }} /></div>
              <p>Aggregated from satellite feeds and historical burn pattern trends.</p>
            </div>
          </div>

          <div className="telemetry">
            <h3>Real-time Telemetry</h3>
            <div className="telemetry-item">
              <span>Wind Velocity</span>
              <strong>{loading ? "…" : (avgWind !== "—" ? `${isSimulation ? 48 : avgWind} km/h` : "--")}</strong>
            </div>
            <div className="telemetry-item">
              <span>Relative Humidity</span>
              <strong>{loading ? "…" : (avgHumidity !== "—" ? `${isSimulation ? 4 : avgHumidity}%` : "--")}</strong>
            </div>
            <div className="telemetry-item">
              <span>Fuel Moisture</span>
              <strong style={{
                color: (() => {
                  const h = isSimulation ? 4 : parseFloat(avgHumidity);
                  if (isNaN(h)) return "inherit";
                  return h < 15 ? "#c62828" : h < 30 ? "#e65100" : "#2e7d32";
                })()
              }}>
                {loading ? "…" : (() => {
                  const h = isSimulation ? 4 : parseFloat(avgHumidity);
                  if (isNaN(h)) return "--";
                  return h < 15 ? "Critical" : h < 30 ? "Low" : "Normal";
                })()}
              </strong>
            </div>
            <div className="telemetry-item">
              <span>Avg Temperature</span>
              <strong>{loading ? "…" : (avgTemp !== "—" ? `${isSimulation ? (parseFloat(avgTemp) + 6).toFixed(1) : avgTemp}°C` : "--")}</strong>
            </div>
            <div className="telemetry-item">
              <span>Vegetation Density</span>
              <strong>{loading ? "…" : (avgVegetation !== "—" ? `${isSimulation ? Math.min(99, parseInt(avgVegetation) + 7) : avgVegetation}%` : "--")}</strong>
            </div>
            <div className="bars" aria-hidden>
              {(() => {
                const windVal  = isSimulation ? 48 : parseFloat(avgWind) || 0;
                const humVal   = isSimulation ? 4  : parseFloat(avgHumidity) || 0;
                const tempVal  = isSimulation ? parseFloat(avgTemp) + 6 : parseFloat(avgTemp) || 0;
                // normalise each to a bar height 10–72px
                const norm = (v, min, max) => Math.round(10 + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 62);
                const heights = [
                  norm(windVal, 0, 60),
                  norm(humVal,  0, 100),
                  norm(tempVal, 0, 50),
                  norm(windVal * 0.7, 0, 60),
                  norm(humVal  * 1.1, 0, 100),
                  norm(tempVal * 0.85, 0, 50),
                ];
                const maxH = Math.max(...heights);
                return heights.map((h, i) => (
                  <span key={i} className={h === maxH ? "active" : ""} style={{ height: h }} />
                ));
              })()}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
