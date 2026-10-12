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
            <small>Map markers are estimates or image-derived demo results; no validated detection-accuracy metric is available.</small>
          </div>

          <div className="status-dock" style={{ display: "block", maxWidth: 340 }}>
            <div style={{ color: "#fff", fontSize: 12, lineHeight: 1.6 }}>
              <strong>Monitoring data status</strong><br />
              Risk markers use bundled baseline inputs and model estimates. Image-derived hotspots appear only when the configured demonstration image is available. Live NASA FIRMS detections are exposed separately by the backend and are not represented as confirmed incidents here.
            </div>
          </div>
        </section>

        <footer className="map-footer">
          <span>© 2024 VIGILANT CURATOR | AI-DRIVEN PREDICTION SYSTEM</span>
          <span style={{ color: "#7aab96", fontWeight: 700 }}>
            DATA SOURCES: baseline zone estimates + optional image-derived OpenCV demo
          </span>
          <span>PROTOTYPE • NOT AN OFFICIAL WARNING SYSTEM</span>
        </footer>
      </main>
    </div>
  );
}
