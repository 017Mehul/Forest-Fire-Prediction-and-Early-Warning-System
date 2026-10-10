import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function SystemStatus() {
  const [time, setTime] = useState(new Date());
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const response = await fetch(`${API}/health`, { cache: "no-store" });
        if (mounted) setHealthy(response.ok);
      } catch {
        if (mounted) setHealthy(false);
      }
      if (mounted) setTime(new Date());
    };
    check();
    const id = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const formatted = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#e8fff4", letterSpacing: "0.04em" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: healthy ? "#22c55e" : "#ef4444", display: "inline-block" }} />
      <span>{healthy ? "API Healthy" : "API Offline"}</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span style={{ opacity: 0.75 }}>Checked {formatted}</span>
    </div>
  );
}
