function IconDashboard({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconMap({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5L9 5.5V17.5L4 19.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 5.5L15 7.5V19.5L9 17.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M15 7.5L20 5.5V17.5L15 19.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPrediction({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 16L9 11L13 13L19 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="4.5" cy="17.5" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6.2 19.2L8 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconAlertBell({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5a3.25 3.25 0 013.25 3.25v2.1c0 3.5 1.1 4.4 2.25 5.65H6.5c1.15-1.25 2.25-2.15 2.25-5.65V7.75A3.25 3.25 0 0112 4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 20h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 10v3.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="15.2" r="0.95" fill="currentColor" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", Icon: IconDashboard },
  { id: "fire-risk-map", label: "Fire Risk Map", Icon: IconMap },
  { id: "prediction-panel", label: "Prediction Panel", Icon: IconPrediction },
  { id: "alert-system", label: "Alert System", Icon: IconAlertBell },
];

/**
 * @param {{ active: string, onNavigate: (id: string) => void, footerText?: string }} props
 */
export default function SidebarNav({ active, onNavigate, footerText = "AI: ENVIRONMENTAL + HISTORICAL" }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">🌲</div>
        <div>
          <h1>Environmental Intelligence</h1>
          <p>Vigilant Curator Engine</p>
        </div>
      </div>

      <nav className="menu" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`menu-item ${active === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon className="menu-icon" />
            <span className="menu-label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden style={{ flexShrink: 0 }}>
          <path d="M14 3L25 8.5V14C25 19.8 20.1 24.4 14 26C7.9 24.4 3 19.8 3 14V8.5L14 3Z" fill="#4ecb9e" opacity="0.25" />
          <path d="M14 3L14 26C7.9 24.4 3 19.8 3 14V8.5L14 3Z" fill="#4ecb9e" opacity="0.55" />
          <path d="M14 3L25 8.5V14C25 19.8 20.1 24.4 14 26C7.9 24.4 3 19.8 3 14V8.5L14 3Z" stroke="#3ab88a" strokeWidth="1.5" />
        </svg>
        <span>AI: Environmental + Historical</span>
      </div>
    </aside>
  );
}
