import { useState, useEffect } from "react";

export default function SystemStatus() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const formatted = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 600,
      color: "#e8fff4", letterSpacing: "0.04em",
    }}>
      {/* pulsing green dot */}
      <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
        <span style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "#4ade80", opacity: 0.6,
          animation: "statusPing 1.8s ease-out infinite",
        }} />
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
          display: "inline-block", position: "relative",
        }} />
      </span>
      <span>System Active</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span style={{ opacity: 0.75 }}>🔄 Updated {formatted}</span>
      <style>{`
        @keyframes statusPing {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
