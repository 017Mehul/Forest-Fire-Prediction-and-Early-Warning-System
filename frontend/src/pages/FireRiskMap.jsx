import SidebarNav from "../components/SidebarNav";
import FireHeatMap from "../components/FireHeatMap";
import SystemStatus from "../components/SystemStatus";

export default function FireRiskMap({ onNavigate, onAlert, zoomTarget, selectedLocation, onClearLocation }) {
  return (
    <div className="layout map-layout">
      <SidebarNav active="fire-risk-map" onNavigate={onNavigate} />

      <main className="content">
        <header className="topbar">
          <div className="left">
            <strong>Vigilant Curator</strong>
            <span className="link-like" onClick={() => onNavigate("dashboard")}>
              Dashboard
            </span>
            <span className="active-link">Fire Risk Map</span>
            <span className="link-like" onClick={() => onNavigate("prediction-panel")}>
              Prediction Panel
            </span>
            <span className="link-like" onClick={() => onNavigate("alert-system")}>
              Alert System
            </span>
          </div>
          <div className="right">
            <SystemStatus />
          </div>
        </header>

        <section className="map-screen" style={{ height: "calc(100vh - 56px - 42px)" }}>
          <FireHeatMap onAlert={onAlert} zoomTarget={zoomTarget} selectedLocation={selectedLocation} onClearLocation={onClearLocation} />

          <div className="legend-card">
            <h4>RISK ANALYSIS<br />LEGEND</h4>
            <div className="legend-items">
              <div className="legend-row"><span className="legend-dot critical" /><span className="legend-label">CRITICAL</span></div>
              <div className="legend-row"><span className="legend-dot elevated" /><span className="legend-label">ELEVATED</span></div>
              <div className="legend-row"><span className="legend-dot nominal" /><span className="legend-label">NOMINAL</span></div>
            </div>
            <hr className="legend-divider" />
            <small>REAL-TIME THERMAL ANOMALIES MAPPED WITH 98.4% ACCURACY.</small>
          </div>

          <div className="status-dock">
            <div className="status-group">
              <span className="status-icon">🔥</span>
              <div>
                <small>ACTIVE THREATS</small>
                <h3>03</h3>
                <strong>CRITICAL</strong>
              </div>
            </div>
            <div className="status-group">
              <span className="status-icon alert">⚠</span>
              <div>
                <small>ANOMALIES DETECTED</small>
                <h3>12</h3>
                <strong>UNVERIFIED</strong>
              </div>
            </div>
            <button className="deploy-btn">Deploy Field Drone</button>
          </div>
        </section>

        <footer className="map-footer">
          <span>© 2024 VIGILANT CURATOR | AI-DRIVEN PREDICTION SYSTEM</span>
          <span style={{ color: "#7aab96", fontWeight: 700 }}>
            DATA SOURCE: NASA FIRMS (historical) + simulated satellite input (OpenCV)
          </span>
          <span>SENTINEL DATA PROTOCOL V4.0.2</span>
        </footer>
      </main>
    </div>
  );
}
