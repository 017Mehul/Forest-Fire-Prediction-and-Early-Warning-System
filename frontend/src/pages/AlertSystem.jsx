import { useEffect, useRef, useState } from "react";
import SidebarNav from "../components/SidebarNav";
import SystemStatus from "../components/SystemStatus";

const ALERT_STYLES = {
  HIGH:   { bg: "#c91f1f", border: "#ff4444", label: "HIGH ALERT" },
  MEDIUM: { bg: "#b85c00", border: "#ff8c00", label: "MODERATE ALERT" },
  LOW:    { bg: "#1a6b2e", border: "#2ecc71", label: "LOW ALERT" },
};

const ACK_STYLES = {
  HIGH:   { bg: "#7a4a00", border: "#c8860a" },
  MEDIUM: { bg: "#6b4200", border: "#b87020" },
  LOW:    { bg: "#1a3d28", border: "#2e7a50" },
};

const STATUS_ORDER = { ESCALATED: 0, ACTIVE: 1, ACKNOWLEDGED: 2 };

function getSeverityBadge(score, type) {
  if (score >= 90) return "CRITICAL";
  if (score >= 75) return "SEVERE";
  if (score >= 40) return "MODERATE";
  return type;
}

function getTimeAgo(timeStr) {
  try {
    const now = new Date();
    const [time, period] = timeStr.split(" ");
    let [h, m, s] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const then = new Date(now);
    then.setHours(h, m, s, 0);
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
    return timeStr;
  } catch {
    return "Just now";
  }
}

function getAIInsight(score) {
  if (score >= 90) return "Critical fire conditions: extreme heat, near-zero humidity, and high wind convergence detected.";
  if (score >= 75) return "Extreme temperature and low humidity driving rapid fire spread potential.";
  if (score >= 40) return "Moderate environmental stress detected — dry vegetation and elevated wind activity.";
  return "Conditions within normal range. Continued monitoring advised.";
}

export default function AlertSystem({ onNavigate, liveAlerts = [], onViewOnMap, acknowledgeAlert, escalateAlert }) {
  const audioRef    = useRef(null);
  const prevHighRef = useRef(false);
  const newestRef   = useRef(null);
  const [toast, setToast]       = useState(null);
  const [eventLog, setEventLog] = useState([]);

  const addLog = (msg) => {
    setEventLog(prev => [{ msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 8));
  };

  const showToast = (msg) => setToast(msg);

  // sound on new ACTIVE HIGH
  useEffect(() => {
    const hasHigh = liveAlerts.some(a => a.type === "HIGH" && a.status === "ACTIVE");
    if (hasHigh && !prevHighRef.current) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
          audioRef.current.volume = 0.5;
        }
        audioRef.current.play().catch(() => {});
      } catch (_) {}
    }
    prevHighRef.current = hasHigh;
  }, [liveAlerts]);

  // log new alerts
  useEffect(() => {
    liveAlerts.forEach(a => {
      if (a.status === "ACTIVE") addLog(`Alert triggered: ${a.location}`);
    });
  }, [liveAlerts.length]);

  // auto-scroll to newest
  useEffect(() => {
    if (liveAlerts.length > 0) newestRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [liveAlerts]);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAcknowledge = (id, location) => {
    acknowledgeAlert?.(id);
    addLog(`Alert acknowledged: ${location}`);
    showToast("✔ Alert acknowledged. System will continue monitoring.");
  };

  const handleEscalate = (id, location) => {
    escalateAlert?.(id);
    addLog(`Authorities notified: ${location}`);
    showToast("🚨 Authorities notified successfully. Emergency response initiated.");
    console.log("Dispatching emergency alert to authorities...");
  };

  // ESCALATED → ACTIVE → ACKNOWLEDGED
  const sorted = [...liveAlerts].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1)
  );

  const btnBase = {
    borderRadius: 6, fontWeight: 700, fontSize: 11,
    padding: "6px 12px", whiteSpace: "nowrap", cursor: "pointer",
  };

  return (
    <div className="layout alert-layout">
      <SidebarNav active="alert-system" onNavigate={onNavigate} />

      <main className="content">
        <header className="topbar">
          <div className="left">
            <strong>Vigilant Curator</strong>
            <span className="link-like" onClick={() => onNavigate("dashboard")}>Dashboard</span>
            <span className="link-like" onClick={() => onNavigate("fire-risk-map")}>Fire Risk Map</span>
            <span className="link-like" onClick={() => onNavigate("prediction-panel")}>Prediction Panel</span>
            <span className="active-link">Alert System</span>
          </div>
          <div className="right"><SystemStatus /></div>
        </header>

        {toast && <div className="ack-toast">{toast}</div>}

        <section className="alert-wrap">
          <div className="alert-header">
            <small>LIVE MONITORING</small>
            <h2>Critical Alerts</h2>
            <p>
              Real-time hazard detection utilizing multispectral satellite imagery and
              ground-level sensor fusion. Includes environmental + historical risk factors.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4e8a6a", background: "rgba(30,100,60,0.1)", border: "1px solid rgba(30,100,60,0.2)", borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em" }}>
                🛰 Confidence: 87% — NASA FIRMS + Weather Data
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7a6030", background: "rgba(120,90,20,0.08)", border: "1px solid rgba(120,90,20,0.18)", borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em" }}>
                🤖 Auto-escalation active for score &gt; 90
              </span>
            </div>
          </div>

          {/* ── Live alerts ── */}
          {sorted.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {sorted.map((alert, i) => {
                const isAck       = alert.status === "ACKNOWLEDGED";
                const isEscalated = alert.status === "ESCALATED";
                const cardStyle   = isEscalated
                  ? { bg: "#6b0000", border: "#ff2222" }
                  : isAck
                    ? (ACK_STYLES[alert.type] ?? ACK_STYLES.LOW)
                    : (ALERT_STYLES[alert.type] ?? ALERT_STYLES.LOW);
                const label  = isEscalated
                  ? (alert.autoEscalated ? "🚨 AUTO-ESCALATED" : "🚨 ESCALATED")
                  : isAck ? "MONITORING" : (ALERT_STYLES[alert.type]?.label ?? "ALERT");
                const badge  = isEscalated
                  ? (alert.autoEscalated ? "AUTO-ESCALATED" : "ESCALATED")
                  : isAck ? "Monitoring" : getSeverityBadge(alert.score ?? 0, alert.type);
                const timeAgo = getTimeAgo(alert.time);
                const insight = getAIInsight(alert.score ?? 0);

                return (
                  <div
                    key={alert.id ?? i}
                    ref={i === 0 ? newestRef : null}
                    onClick={() => onViewOnMap?.(alert)}
                    style={{
                      background: cardStyle.bg,
                      border: `1px solid ${cardStyle.border}`,
                      borderRadius: 10, padding: "14px 18px", marginBottom: 10,
                      color: "#fff",
                      opacity: isAck ? 0.78 : 1,
                      boxShadow: isEscalated
                        ? "0 0 0 2px #ff2222, 0 4px 20px rgba(255,30,30,0.45)"
                        : isAck ? "none" : "0 4px 14px rgba(0,0,0,0.3)",
                      animation: "alertSlide 0.4s cubic-bezier(.22,1,.36,1) both",
                      transition: "opacity 0.3s, background 0.3s, box-shadow 0.3s",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        {/* top row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", opacity: 0.85 }}>{label}</span>
                          <span style={{
                            background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.4)",
                            borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                          }}>{badge}</span>
                          {isAck && <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, background: "rgba(255,255,255,0.12)", borderRadius: 4, padding: "1px 6px" }}>👁 Background monitoring active</span>}
                          {isEscalated && alert.autoEscalated && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(255,50,50,0.3)", borderRadius: 4, padding: "1px 6px", border: "1px solid rgba(255,100,100,0.4)" }}>
                              Critical threshold breached
                            </span>
                          )}
                          {alert.fromPrediction && (
                            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 6px" }}>
                              🔬 From simulation
                            </span>
                          )}
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{alert.message}</div>

                        <p style={{ fontSize: 12, fontStyle: "italic", opacity: 0.9, margin: "0 0 7px", lineHeight: 1.4, borderLeft: "2px solid rgba(255,255,255,0.4)", paddingLeft: 8 }}>
                          🧠 {insight}
                        </p>

                        <div style={{ fontSize: 12, opacity: 0.8, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                          <span>📍 {alert.location}</span>
                          <span>⏱ {timeAgo}</span>
                          {(alert.riskScore ?? alert.score) != null && (
                            <span>🔥 Risk Score: {alert.riskScore ?? alert.score}/100</span>
                          )}
                          {alert.riskLevel && (
                            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
                              {alert.riskLevel}
                            </span>
                          )}
                          <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>{alert.status}</span>
                        </div>
                      </div>

                      {/* action buttons — stop propagation so card click doesn't fire */}
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}
                      >
                        <button
                          onClick={() => onViewOnMap?.(alert)}
                          style={{ ...btnBase, border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.15)", color: "#fff" }}
                        >
                          View on Map →
                        </button>

                        {/* Notify Authorities — only on ACTIVE */}
                        {!isEscalated && !isAck && alert.id && (
                          <button
                            onClick={() => handleEscalate(alert.id, alert.location)}
                            style={{ ...btnBase, border: "1px solid rgba(255,100,100,0.6)", background: "rgba(180,0,0,0.4)", color: "#fff" }}
                          >
                            🚨 Notify Authorities
                          </button>
                        )}
                        {isEscalated && (
                          <button disabled style={{ ...btnBase, border: "1px solid rgba(255,100,100,0.3)", background: "rgba(100,0,0,0.3)", color: "rgba(255,180,180,0.8)", cursor: "not-allowed" }}>
                            Authorities Notified ✓
                          </button>
                        )}

                        {/* Acknowledge — on ACTIVE or ESCALATED */}
                        {!isAck && alert.id && (
                          <button
                            onClick={() => handleAcknowledge(alert.id, alert.location)}
                            style={{ ...btnBase, border: "1px solid rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                          >
                            Acknowledge &amp; Monitor
                          </button>
                        )}
                        {isAck && (
                          <button disabled style={{ ...btnBase, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.15)", color: "rgba(255,255,255,0.6)", cursor: "not-allowed" }}>
                            Monitoring Active ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <style>{`
            @keyframes alertSlide { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
            .ack-toast {
              position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
              background: #1a4d2e; color: #a3ffcc; border: 1px solid #2e7a50;
              border-radius: 10px; padding: 12px 22px; font-size: 13px; font-weight: 700;
              z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.35);
              animation: alertSlide 0.3s ease both; white-space: nowrap;
            }
          `}</style>

          <div className="alert-top-grid">
            {(() => {
              const primary = sorted.find(a => a.type === "HIGH") ?? sorted[0];
              if (!primary) return null;
              const score = primary.riskScore ?? primary.score ?? 0;
              return (
                <article className="primary-alert">
                  <div className="terrain">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8_kB639xDUACETJtEnR1Fzhiuiqx_TOmb28Vay8A8JzKMGDhCt58jIDH_o94gn1SceJlel7VLfv4cpFjURvDLZf-pdLH_-5Yl0fMAlAd7NptjAvdgCrgRfTyvAdQYqTyEWH1RrxwSaxTG67oYSVjgjSAxLGQSA7bw-Sh_oQKToDesfCJKtLgedN4LduP4w-iff2nUuYyI6GfwzOz_cvOwBdvvTldsa_oqKDDU_Yk4gntnnKeSpaKlv01IGD3mm16M07sjmKW33rw"
                      alt="Satellite thermal view of high-risk fire zone"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                  <div className="primary-content">
                    <div className="primary-heading">
                      <span>{ALERT_STYLES[primary.type]?.label ?? "ALERT"}</span>
                      <b>{primary.status}</b>
                    </div>
                    <h3>{primary.message}</h3>
                    <div className="meta-row">
                      <div><small>TIME</small><strong>{getTimeAgo(primary.time)}</strong></div>
                      <div>
                        <small>RISK SCORE</small>
                        <strong className="danger-text">{score}/100</strong>
                      </div>
                    </div>
                    <div className="warning-line">
                      Risk level: {primary.riskLevel ?? (score >= 75 ? "High" : score >= 40 ? "Medium" : "Low")}
                    </div>
                    <div className="warning-line">{getAIInsight(score)}</div>
                    <div className="action-row">
                      <button className="btn-red" onClick={() => {
                        handleEscalate(primary.id, primary.location);
                      }}>Notify Authorities</button>
                      <button className="btn-green" onClick={() => onViewOnMap?.(primary)}>View on Map</button>
                    </div>
                  </div>
                </article>
              );
            })()}
          </div>

          <div className="alert-bottom-grid">
            <article className="stable-card">
              <small>STABLE ENVIRONMENT</small>
              <div className="moderate-top-row">
                <div className="moderate-risk-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  MODERATE RISK
                </div>
                <span className="moderate-updated">UPDATED 14 MINS AGO</span>
              </div>
              <h4>Moderate risk in Napa Valley, CA</h4>
              <p>Dry heat accumulation detected across the valley floor. Monitoring for ignition triggers near vineyard corridors.</p>
              <div className="moderate-peak-line">🔥 <span>RISK PEAK: ~1 HOUR</span></div>
              <div className="moderate-saturation-box">
                <div className="moderate-sat-header">
                  <span className="moderate-sat-label">SATURATION</span>
                  <span className="moderate-sat-value">30% Humidity</span>
                </div>
                <div className="moderate-sat-track">
                  <div className="moderate-sat-fill" style={{ width: "30%" }} />
                </div>
              </div>
              <div className="stable-actions">
                <button className="moderate-view-btn" onClick={() => onNavigate("prediction-panel")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
                  </svg>
                  View Prediction
                </button>
                <button
                  style={{ ...btnBase, border: "1px solid #b0b8b4", background: "#eceeed", color: "#2a3a34", width: "100%", marginTop: 6 }}
                  onClick={() => {
                    addLog("Alert acknowledged: Napa Valley");
                    showToast("✔ Alert acknowledged. System will continue monitoring.");
                  }}
                >
                  Acknowledge &amp; Monitor
                </button>
              </div>
            </article>
          </div>

          {/* ── Event Log ── */}
          {eventLog.length > 0 && (
            <div style={{
              margin: "14px 0 0", background: "rgba(10,30,22,0.7)",
              border: "1px solid rgba(80,180,120,0.2)", borderRadius: 12,
              padding: "12px 16px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#7effc0", marginBottom: 10 }}>
                SYSTEM ACTIVITY LOG
              </div>
              {eventLog.map((entry, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(220,240,230,0.8)", padding: "4px 0", borderBottom: i < eventLog.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <span>• {entry.msg}</span>
                  <span style={{ opacity: 0.5, flexShrink: 0, marginLeft: 16 }}>{entry.time}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── System Health Banner ── */}
          <div className="sys-health-banner">
            <div className="sys-health-left">
              <h4 className="sys-health-title">System Health</h4>
              <div className="sys-health-status">
                <span className="sys-health-dot" />
                <span>ALL SENSORS OPERATIONAL</span>
              </div>
              <div className="sys-health-sync-row">
                <span className="sys-health-sync-label">SATELLITE SYNC</span>
                <span className="sys-health-sync-pct">99.9%</span>
              </div>
              <div className="sys-health-track"><div className="sys-health-fill" /></div>
            </div>
            <div className="sys-health-shield" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
              </svg>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
