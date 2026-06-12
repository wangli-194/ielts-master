export function Card({ children, className = "", style = {} }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1rem", ...style }} className={className}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 16, color: "#534AB7" }} aria-hidden />}
      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{children}</span>
    </div>
  );
}

export function MetricCard({ label, value, sub }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem" }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Tag({ children, bg, color }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: bg, color, flexShrink: 0 }}>
      {children}
    </span>
  );
}

export function Btn({ children, onClick, primary, small, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: small ? "5px 10px" : "7px 14px",
        borderRadius: "var(--border-radius-md)",
        border: primary ? "none" : "0.5px solid var(--color-border-secondary)",
        background: primary ? "#534AB7" : "var(--color-background-primary)",
        color: primary ? "#fff" : "var(--color-text-primary)",
        fontSize: small ? 12 : 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, max = 100, color = "#534AB7", height = 6 }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height, background: "var(--color-background-secondary)", borderRadius: height / 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: height / 2, transition: "width 0.4s" }} />
    </div>
  );
}

export function StageBadge({ phase }) {
  const map = {
    1: { label: "Stage 1 - Foundation", bg: "#E1F5EE", color: "#085041" },
    2: { label: "Stage 2 - Consolidation", bg: "#E6F1FB", color: "#0C447C" },
    3: { label: "Stage 3 - Breakthrough", bg: "#FAEEDA", color: "#633806" },
    4: { label: "Stage 4 - Final Sprint", bg: "#FCEBEB", color: "#791F1F" },
  };
  const s = map[phase] || map[1];
  return (
    <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 10, fontWeight: 500, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export function ScoreDimBar({ name, score, color }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>{name}</div>
      <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ height: "100%", width: `${(score / 9) * 100}%`, background: color, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{score.toFixed(1)} / 9.0</div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-secondary)", fontSize: 13 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 16, animation: "spin 1s linear infinite" }} aria-hidden />
      <span>Loading...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
