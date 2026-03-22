import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const HEATMAP_API = `${BASE_URL}/heatmap`;

export default function DashboardMiniMap({ metrics = {}, onNavigate }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const [count, setCount] = useState(null);

  // Compute live probability from real metrics
  const { avgTemp = 32, avgHumidity = 14, avgWind = 28, avgVegetation = 85 } = metrics;
  const probability = Math.min(99, Math.round(
    (avgTemp * 0.35) +
    ((100 - avgHumidity) * 0.25) +
    (avgWind * 0.2) +
    (avgVegetation * 0.2)
  ));
  const probLabel = probability > 75 ? "High" : "Moderate";

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    map.setView([37.7749, -122.4194], 6);
    mapRef.current = map;

    // Two-pass invalidateSize: once after paint, once after tiles settle
    setTimeout(() => { map.invalidateSize(); }, 500);
    setTimeout(() => { map.invalidateSize(); }, 1200);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    fetch(HEATMAP_API)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        L.heatLayer(data, {
          radius: 30,
          blur: 25,
          maxZoom: 10,
          gradient: { 0.2: "#4ade80", 0.5: "#facc15", 0.7: "#f97316", 1.0: "#dc2626" },
        }).addTo(map);
        // Recalculate after heatmap layer is added
        setTimeout(() => { map.invalidateSize(); }, 100);
        setCount(data.length);
      })
      .catch(err => {
        console.error("[DashboardMiniMap] heatmap fetch failed:", err);
        setCount(0);
      });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  return (
    <div className="heatmap-card">
      <div ref={containerRef} id="dashboard-heatmap" />

      {/* Top-left: label + "View Full Map" button */}
      <div className="heatmap-label">
        MAP VIEW: ACTIVE HEATMAPS
        {onNavigate && (
          <button className="heatmap-map-link" onClick={() => onNavigate("fire-risk-map")}>
            View Full Map →
          </button>
        )}
      </div>

      {/* Hotspot count badge — live from API */}
      {count !== null && (
        <div className="heatmap-badge">
          🔥 {count} hotspot{count !== 1 ? "s" : ""}
        </div>
      )}

      {count === null && (
        <div className="heatmap-loading">Loading heatmap…</div>
      )}

      {/* Overlay card — live probability */}
      <div className="heatmap-overlay">
        Fire Risk Probability: {probability}% ({probLabel})
      </div>
    </div>
  );
}
