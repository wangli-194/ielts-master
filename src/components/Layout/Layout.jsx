import { useState } from "react";
import { useStore } from "../../store";
import { getPhase, PHASE_META } from "../../utils/tasks";
import { useApiKey } from "../../utils/apiKey";

const NAV = [
  { id: "dashboard", icon: "layout-dashboard", label: "今日计划" },
  { id: "speaking",  icon: "microphone",       label: "口语对话" },
  { id: "reading",   icon: "clock",            label: "限时阅读" },
  { id: "vocab",     icon: "cards",            label: "词汇学习" },
  { id: "writing",   icon: "pencil",           label: "写作练习" },
  { id: "progress",  icon: "chart-line",       label: "备考进度" },
];

export default function Layout({ children, currentView, onNavigate }) {
  const { state } = useStore();
  const { clearKey } = useApiKey();
  const phase = getPhase(state.currentDay);
  const meta = PHASE_META[phase];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>
      <style>{`
        @media (min-width: 768px) {
          .app-layout { display: grid !important; grid-template-columns: 220px 1fr !important; }
          .sidebar { display: flex !important; }
          .mobile-header { display: none !important; }
          .mobile-nav { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar { display: none !important; }
          .main-content { padding-bottom: 70px !important; }
        }
      `}</style>

      <div className="app-layout" style={{ display: "block" }}>
        {/* Desktop sidebar */}
        <nav className="sidebar" style={{
          background: "var(--color-background-secondary)",
          borderRight: "0.5px solid var(--color-border-tertiary)",
          display: "none",
          flexDirection: "column",
          gap: 4,
          padding: "1.25rem 0",
          minHeight: "100vh",
        }}>
          <div style={{ padding: "0 1rem 1rem", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>IELTS Master</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>3.0 → 8.0 · 120天计划</div>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: meta.bg, color: meta.color }}>{meta.label}</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "6px 1rem 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>备考模块</div>
          {NAV.slice(0, 5).map(item => (
            <NavItem key={item.id} item={item} active={currentView === item.id} onClick={() => onNavigate(item.id)} />
          ))}
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "10px 1rem 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>数据</div>
          <NavItem item={NAV[5]} active={currentView === "progress"} onClick={() => onNavigate("progress")} />
          <div style={{ marginTop: "auto" }}>
            <button onClick={() => { if (window.confirm("重置 API Key？")) clearKey(); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 1rem", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 12, width: "100%", textAlign: "left" }}>
              <i className="ti ti-key" style={{ fontSize: 14 }} /> 重置 API Key
            </button>
            <div style={{ padding: "0.75rem 1rem 1rem", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>备考进度</div>
              <div style={{ fontSize: 13, color: "var(--color-text-primary)", marginBottom: 6 }}>第 {state.currentDay} 天 / 共 {state.totalDays} 天</div>
              <div style={{ height: 4, background: "var(--color-background-primary)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((state.currentDay / state.totalDays) * 100)}%`, background: "#534AB7", borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile top header */}
        <div className="mobile-header" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: "var(--color-background-primary)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>IELTS Master</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>第 {state.currentDay} 天 · {meta.label}</div>
          </div>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: meta.bg, color: meta.color }}>{meta.label}</span>
        </div>

        {/* Main content */}
        <main className="main-content" style={{ overflow: "auto", background: "var(--color-background-tertiary)" }}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="mobile-nav" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "var(--color-background-primary)",
          borderTop: "0.5px solid var(--color-border-tertiary)",
          display: "flex",
        }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "8px 2px 10px",
                background: "none", border: "none", cursor: "pointer",
                color: currentView === item.id ? "#534AB7" : "var(--color-text-tertiary)",
                borderTop: currentView === item.id ? "2px solid #534AB7" : "2px solid transparent",
                minWidth: 0,
              }}>
              <i className={`ti ti-${item.icon}`} style={{ fontSize: 20, marginBottom: 2 }} />
              <span style={{ fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", padding: "0 2px" }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavItem({ item, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 1rem",
        background: active ? "var(--color-background-primary)" : "transparent",
        border: "none", borderRight: active ? "2px solid #534AB7" : "2px solid transparent",
        color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        fontSize: 13.5, cursor: "pointer", width: "100%", textAlign: "left", transition: "background 0.15s",
      }}>
      <i className={`ti ti-${item.icon}`} style={{ fontSize: 16, width: 18 }} aria-hidden />
      {item.label}
    </button>
  );
}
