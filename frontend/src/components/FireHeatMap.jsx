import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { USA_ZONES } from "../data/zones";

const HEATMAP_API = "http://127.0.0.1:8000/heatmap";
const PREDICT_API = "http://127.0.0.1:8000/predict";
const ALERT_THRESHOLD_HOTSPOTS = 5;
const ALERT_THRESHOLD_RISK = 75;

// ML sample inputs derived from shared zone dataset
const ML_SAMPLE_INPUTS = USA_ZONES.map(z => ({
  temperature: z.temperature,
  humidity:    z.humidity,
  wind:        z.wind,
  vegetation:  z.vegetation,
  lat:         z.lat,
  lng:         z.lng,
  location:    z.name,
}));

function riskColor(s) { return s > 75 ? "#cc1111" : s > 40 ? "#ff8800" : "#22bb66"; }
function riskLabel(s) { return s > 75 ? "CRITICAL" : s > 40 ? "ELEVATED" : "NOMINAL"; }
function vegLabel(v)  { return v >= 80 ? "Dense" : v >= 50 ? "Moderate" : "Sparse"; }
function aiInsight(s, t, h, w) {
  if (s > 75) return "⚠ Extreme ignition probability — immediate response advised.";
  if (s > 40) return "🔶 Elevated risk — monitor closely for rapid escalation.";
  return "✅ Conditions stable — continue passive monitoring.";
}

function makeMarkerIcon(color, isCritical) {
  const pulse = isCritical
    ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};opacity:0.5;animation:markerPulse 1.4s ease-out infinite;"></div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:20px;height:20px;">
      ${pulse}
      <div style="width:20px;height:20px;border-radius:50%;background:${color};
        border:3px solid rgba(255,255,255,0.85);box-shadow:0 0 10px ${color}bb;
        animation:markerDrop 0.4s cubic-bezier(.22,1,.36,1) both;"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function buildPopup({ location, score, temperature, humidity, wind, vegetation }) {
  const color = riskColor(score);
  const label = riskLabel(score);
  const insight = aiInsight(score, temperature, humidity, wind);
  return `
    <div style="font-family:Inter,sans-serif;min-width:200px;padding:4px 2px">
      <div style="font-size:10px;letter-spacing:.12em;color:#888;margin-bottom:6px;font-weight:700">ML RISK ANALYSIS</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
        <span style="font-size:36px;font-weight:800;color:${color};line-height:1">${score}</span>
        <span style="font-size:11px;font-weight:800;color:${color};letter-spacing:.08em">${label}</span>
      </div>
      <div style="font-size:12px;font-weight:700;color:#1a2e28;margin-bottom:10px">📍 ${location}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
        <div style="background:#f4f7f5;border-radius:6px;padding:7px 9px">
          <div style="font-size:9px;color:#7a8f88;letter-spacing:.08em;margin-bottom:2px">TEMP</div>
          <div style="font-weight:700;font-size:13px;color:${temperature >= 40 ? "#cc1111" : "#1a2e28"}">🌡 ${temperature}°C</div>
        </div>
        <div style="background:#f4f7f5;border-radius:6px;padding:7px 9px">
          <div style="font-size:9px;color:#7a8f88;letter-spacing:.08em;margin-bottom:2px">HUMIDITY</div>
          <div style="font-weight:700;font-size:13px;color:${humidity <= 12 ? "#cc1111" : "#1a2e28"}">💧 ${humidity}%</div>
        </div>
        <div style="background:#f4f7f5;border-radius:6px;padding:7px 9px">
          <div style="font-size:9px;color:#7a8f88;letter-spacing:.08em;margin-bottom:2px">WIND</div>
          <div style="font-weight:700;font-size:13px">🌬 ${wind} km/h</div>
        </div>
        <div style="background:#f4f7f5;border-radius:6px;padding:7px 9px">
          <div style="font-size:9px;color:#7a8f88;letter-spacing:.08em;margin-bottom:2px">VEGETATION</div>
          <div style="font-weight:700;font-size:13px">🌿 ${vegLabel(vegetation)}</div>
        </div>
      </div>
      <div style="background:${score > 75 ? "#fff0f0" : score > 40 ? "#fff8f0" : "#f0fff6"};
        border:1px solid ${color}44;border-radius:6px;padding:8px 10px;
        font-size:11px;font-weight:600;color:#1a2e28;line-height:1.4">
        ${insight}
      </div>
    </div>`;
}

/**
 * @param {{ onAlert: (alert: object) => void, zoomTarget: {lat:number,lng:number}|null }} props
 */
export default function FireHeatMap({ onAlert, zoomTarget, selectedLocation, onClearLocation }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const heatLayer   = useRef(null);
  const mlMarkers   = useRef([]);
  const focusMarker = useRef(null);

  const [status,   setStatus]   = useState("idle");
  const [btnLabel, setBtnLabel] = useState("Run Satellite Analysis");
  const [hotspots, setHotspots] = useState(0);
  const [mlRisks,  setMlRisks]  = useState([]);
  const [visible,  setVisible]  = useState(false);

  // init map
  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, {
      center: [37.2, -120.5], zoom: 6, zoomControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance.current);
    L.control.zoom({ position: "topright" }).addTo(mapInstance.current);
    setTimeout(() => setVisible(true), 50); // fade-in trigger
    runAnalysis();
    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);

  // zoom to alert target when navigated from alert system
  useEffect(() => {
    if (!zoomTarget || !mapInstance.current) return;
    mapInstance.current.flyTo([zoomTarget.lat, zoomTarget.lng], 9, { duration: 1.4 });
  }, [zoomTarget]);

  // focus + highlight selected location from alert
  useEffect(() => {
    if (!selectedLocation || !mapInstance.current) return;

    const lat = selectedLocation.zoomTarget?.lat ?? selectedLocation.lat;
    const lng = selectedLocation.zoomTarget?.lng ?? selectedLocation.lng;
    if (!lat || !lng) return;

    // remove previous focus marker
    if (focusMarker.current) {
      mapInstance.current.removeLayer(focusMarker.current);
      focusMarker.current = null;
    }

    mapInstance.current.flyTo([lat, lng], 10, { duration: 1.6 });

    // find matching zone for full data
    const zone = USA_ZONES.find(z => z.name === selectedLocation.location) ?? {};
    const score = selectedLocation.score ?? zone.risk ?? 0;

    // pulsing red focus marker
    const pulseIcon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:28px;height:28px;">
        <div style="position:absolute;inset:-10px;border-radius:50%;border:3px solid #ff2222;opacity:0.7;animation:focusPulse 1.2s ease-out infinite;"></div>
        <div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid #ff6666;opacity:0.4;animation:focusPulse 1.2s ease-out infinite 0.3s;"></div>
        <div style="width:28px;height:28px;border-radius:50%;background:#cc1111;border:3px solid #fff;box-shadow:0 0 16px #ff2222;display:grid;place-items:center;font-size:14px;">🔥</div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const popupContent = buildPopup({
      location: selectedLocation.location ?? "Unknown",
      score,
      temperature: zone.temperature ?? "—",
      humidity:    zone.humidity    ?? "—",
      wind:        zone.wind        ?? "—",
      vegetation:  zone.vegetation  ?? "—",
    });

    const extraHtml = `<div style="margin-top:8px;background:#fff0f0;border:1px solid #ff444444;border-radius:6px;padding:7px 10px;font-size:11px;font-weight:700;color:#cc1111;">🔥 High Risk Zone — Alert Active</div>`;

    focusMarker.current = L.marker([lat, lng], { icon: pulseIcon, zIndexOffset: 1000 })
      .bindPopup(popupContent + extraHtml, { maxWidth: 280, autoClose: false, closeOnClick: false })
      .addTo(mapInstance.current)
      .openPopup();

    focusMarker.current.on("popupclose", () => {
      onClearLocation?.();
    });
  }, [selectedLocation]);

  async function fetchHeatmap() {
    const res = await fetch(HEATMAP_API);
    if (!res.ok) throw new Error(`Heatmap API ${res.status}`);
    return res.json();
  }

  async function fetchMLRisk(input) {
    try {
      const res = await fetch(PREDICT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return typeof data.risk_score === "number" ? data.risk_score : null;
    } catch {
      const { temperature, humidity, wind, vegetation } = input;
      return Math.max(0, Math.min(100, Math.round(
        temperature * 0.9 + (100 - humidity) * 0.28 + wind * 0.8 + vegetation * 0.22
      )));
    }
  }

  const runAnalysis = useCallback(async () => {
    if (!mapInstance.current) return;
    setStatus("loading");
    setBtnLabel("Analyzing Satellite Data...");

    try {
      // 1. CV heatmap
      const heatData = await fetchHeatmap();
      if (heatLayer.current) mapInstance.current.removeLayer(heatLayer.current);
      heatLayer.current = L.heatLayer(heatData, {
        radius: 40, blur: 28, maxZoom: 10,
        gradient: { 0.3: "#ffe066", 0.6: "#ff8800", 1.0: "#cc1111" },
      }).addTo(mapInstance.current);
      setHotspots(heatData.length);

      // 2. Auto-zoom to hotspot bounds
      if (heatData.length > 0) {
        const bounds = L.latLngBounds(heatData.map(([lat, lng]) => [lat, lng]));
        mapInstance.current.fitBounds(bounds.pad(0.3), { maxZoom: 9, animate: true, duration: 1 });
      }

      // 3. ML markers
      mlMarkers.current.forEach(m => mapInstance.current.removeLayer(m));
      mlMarkers.current = [];

      const risks = await Promise.all(
        ML_SAMPLE_INPUTS.map(async (pt) => {
          const score = await fetchMLRisk(pt);
          return { ...pt, score };
        })
      );

      risks.forEach((pt) => {
        if (pt.score === null) return;
        const color    = riskColor(pt.score);
        const critical = pt.score > 75;
        const marker   = L.marker([pt.lat, pt.lng], { icon: makeMarkerIcon(color, critical) })
          .bindPopup(buildPopup(pt), { maxWidth: 260 })
          .addTo(mapInstance.current);
        mlMarkers.current.push(marker);
      });

      setMlRisks(risks.map(r => r.score ?? 0));

      // 4. Alert
      const maxRisk   = Math.max(...risks.map(r => r.score ?? 0));
      const critCount = risks.filter(r => (r.score ?? 0) > ALERT_THRESHOLD_RISK).length;
      const topZone   = risks.reduce((a, b) => ((a.score ?? 0) > (b.score ?? 0) ? a : b));
      if (heatData.length > ALERT_THRESHOLD_HOTSPOTS || maxRisk > ALERT_THRESHOLD_RISK) {
        onAlert?.({
          type: "critical",
          message: `HIGH ALERT: ${heatData.length} fire hotspots detected — ML risk ${maxRisk}/100 (${critCount} critical zone${critCount !== 1 ? "s" : ""})`,
          hotspots: heatData.length,
          maxRisk,
          time: new Date().toLocaleTimeString(),
          zoomTarget: { lat: topZone.lat, lng: topZone.lng },
          location: topZone.location,
        });
      }

      setStatus("success");
      setBtnLabel("Hotspots Updated ✓");
      setTimeout(() => setBtnLabel("Run Satellite Analysis"), 3000);
    } catch (err) {
      console.error("[FireHeatMap]", err);
      setStatus("error");
      setBtnLabel("Run Satellite Analysis");
    }
  }, [onAlert]);

  const criticalCount = mlRisks.filter(s => s > 75).length;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%",
      opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}>

      {/* top label */}
      <div style={{
        position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
        zIndex: 1000, background: "rgba(10,40,28,0.88)", color: "#fff",
        borderRadius: 10, padding: "8px 18px", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.12em", textAlign: "center", whiteSpace: "nowrap",
        border: "1px solid rgba(100,220,160,0.3)",
        animation: "slideDown 0.5s cubic-bezier(.22,1,.36,1) both",
      }}>
        🔥 AI Detected Fire Hotspots (Computer Vision) &nbsp;+&nbsp; ML Risk Overlay
      </div>

      {/* map */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* hotspot count */}
      {status === "success" && (
        <div style={{
          position: "absolute", top: 56, left: 14, zIndex: 1000,
          background: "rgba(10,50,34,0.92)", color: "#7effc8",
          borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700,
          border: "1px solid rgba(80,200,130,0.3)",
          animation: "slideDown 0.4s ease both",
        }}>
          🔥 Active Hotspots: {hotspots}
          {criticalCount > 0 && (
            <span style={{ marginLeft: 10, color: "#ff6b6b" }}>
              ⚠ {criticalCount} Critical ML Zone{criticalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* LEGEND — bottom right */}
      <div style={{
        position: "absolute", bottom: 140, right: 14, zIndex: 1000,
        background: "rgba(250,252,251,0.96)", borderRadius: 14,
        border: "1px solid #d4ddd8", padding: "12px 16px", minWidth: 190,
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.16em",
          color: "#4e625a", marginBottom: 10, borderBottom: "1px solid #e4ece8", paddingBottom: 8 }}>
          MAP LEGEND
        </div>
        {/* ML markers */}
        <div style={{ fontSize: 10, color: "#7a8f88", fontWeight: 700,
          letterSpacing: "0.1em", marginBottom: 6 }}>ML RISK MARKERS</div>
        {[
          ["#cc1111", "🔴 High Risk (ML)", "score > 75"],
          ["#ff8800", "🟡 Medium Risk (ML)", "score 40–75"],
          ["#22bb66", "🟢 Low Risk (ML)", "score < 40"],
        ].map(([c, label, sub]) => (
          <div key={label} style={{ display: "flex", alignItems: "center",
            gap: 8, marginBottom: 7 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
              background: c, border: "2px solid rgba(255,255,255,0.8)",
              boxShadow: `0 0 6px ${c}88` }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1a2e28" }}>{label}</div>
              <div style={{ fontSize: 10, color: "#8a9e96" }}>{sub}</div>
            </div>
          </div>
        ))}
        {/* CV heatmap */}
        <div style={{ fontSize: 10, color: "#7a8f88", fontWeight: 700,
          letterSpacing: "0.1em", margin: "10px 0 6px",
          borderTop: "1px solid #e4ece8", paddingTop: 8 }}>OPENCV HEATMAP</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 48, height: 12, borderRadius: 4, flexShrink: 0,
            background: "linear-gradient(90deg, #ffe066, #ff8800, #cc1111)",
          }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2e28" }}>
            🔥 Hotspots (OpenCV)
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 9, color: "#8a9e96", marginTop: 3 }}>
          <span>Low</span><span>High</span>
        </div>
      </div>

      {/* action button */}
      <div style={{
        position: "absolute", bottom: 140, left: 14, zIndex: 1000,
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
      }}>
        {status === "error" && (
          <div style={{
            background: "rgba(180,20,20,0.92)", color: "#fff",
            borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700,
          }}>
            Backend unreachable — using fallback
          </div>
        )}
        <button
          onClick={runAnalysis}
          disabled={status === "loading"}
          style={{
            border: 0, borderRadius: 12,
            background: status === "loading" ? "#1a6b4a" : "#0d4e37",
            color: "#fff", fontWeight: 700, padding: "12px 22px",
            cursor: status === "loading" ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: 8, fontSize: 13,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            transition: "background 0.2s ease",
          }}
        >
          {status === "loading" && (
            <span style={{
              width: 14, height: 14,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff", borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }} />
          )}
          {btnLabel}
        </button>
      </div>

      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes markerPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.4);opacity:0} }
        @keyframes markerDrop  { from{transform:scale(0) translateY(-10px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes slideDown   { from{transform:translateY(-12px) translateX(-50%);opacity:0} to{transform:translateY(0) translateX(-50%);opacity:1} }
        @keyframes focusPulse  { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.8);opacity:0} }
      `}</style>
    </div>
  );
}
