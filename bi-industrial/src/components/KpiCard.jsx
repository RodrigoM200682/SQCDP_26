function fmtVal(v) {
  if (v == null) return "–";
  return Number.isInteger(+v) ? String(+v) : Number(v).toFixed(1);
}

function deltaInfo(arr, hib) {
  const l = arr?.length ? arr[arr.length - 1] : 0;
  const p = arr?.length >= 2 ? arr[arr.length - 2] : null;
  if (p === null) return null;
  const diff = l - p;
  const good = hib ? diff > 0 : diff < 0;
  return {
    label: `${diff > 0 ? "+" : ""}${Number.isInteger(diff) ? diff : diff.toFixed(1)}`,
    color: diff === 0 ? "#8b8fa8" : good ? "#22c55e" : "#ef4444",
    arrow: diff === 0 ? "–" : diff > 0 ? "▲" : "▼",
  };
}

export default function KpiCard({ title, value, unit = "", monthlyData, goal, higherIsBetter = true, color = "#6366f1", extra }) {
  const dl      = deltaInfo(monthlyData, higherIsBetter);
  const goalMet = goal != null ? (higherIsBetter ? value >= goal : value <= goal) : null;
  const border  = goalMet === false ? "#ef444455" : goalMet === true ? "#22c55e55" : "#2a2d45";
  const shadow  = goalMet === false ? "0 0 14px #ef444422" : goalMet === true ? "0 0 14px #22c55e22" : "none";

  const sparkH = 32, sparkW = 80;
  const vals = (monthlyData || []).filter(v => typeof v === "number");
  const sMin = Math.min(...vals) * 0.9;
  const sMax = Math.max(...vals, 0.01) * 1.1;
  const sx = i => (i / (vals.length - 1 || 1)) * sparkW;
  const sy = v => sparkH - ((v - sMin) / (sMax - sMin || 1)) * sparkH;
  const pts = vals.map((v, i) => `${sx(i)},${sy(v)}`).join(" ");

  return (
    <div style={{
      background: "linear-gradient(135deg,#1a1d2e,#141627)",
      border: `1px solid ${border}`, borderRadius: 12,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4,
      boxShadow: shadow, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: "#8b8fa8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>
            {fmtVal(value)}{unit}
          </span>
          {dl && (
            <span style={{ fontSize: 11, fontWeight: 700, color: dl.color, marginBottom: 2 }}>
              {dl.arrow} {dl.label}{unit}
            </span>
          )}
        </div>
        {vals.length >= 2 && (
          <svg viewBox={`0 0 ${sparkW} ${sparkH}`} width={sparkW} height={sparkH} style={{ flexShrink: 0 }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
              strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
            <circle cx={sx(vals.length - 1)} cy={sy(vals[vals.length - 1])} r={3} fill={color} />
          </svg>
        )}
      </div>
      {goal != null && (
        <div style={{ fontSize: 10, color: goalMet ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
          Meta: {goal}{unit} {goalMet ? "✓" : "✗"}
        </div>
      )}
      {extra && <div style={{ fontSize: 10, color: "#f59e0b" }}>{extra}</div>}
    </div>
  );
}
