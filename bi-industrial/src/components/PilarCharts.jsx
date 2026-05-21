import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { MONTH_LABELS, DAY_LABELS, DAYS_IN_MONTH, MONTH_NAMES, CUR_MONTH, CUR_YEAR } from "../constants.js";

function fmtVal(v) {
  if (v == null) return "–";
  return Number.isInteger(+v) ? String(+v) : Number(v).toFixed(1);
}

const Tip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1d2e", border: "1px solid #2a2d45", borderRadius: 8,
      padding: "8px 12px", fontSize: 12, color: "#f1f5f9",
    }}>
      <div style={{ color: "#8b8fa8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {fmtVal(p.value)}{unit}
        </div>
      ))}
    </div>
  );
};

export default function PilarCharts({ title, color, monthlyData, dailyData, goal, unit = "", higherIsBetter = true }) {
  const barData  = MONTH_LABELS.map((m, i) => ({ m, v: monthlyData[i] ?? 0 }));
  const lineData = DAY_LABELS.map((d, i)   => ({ d, v: dailyData[i]   ?? 0 }));
  const bc = v =>
    goal == null ? color : (higherIsBetter ? v >= goal : v <= goal) ? "#22c55e" : "#ef4444";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
      background: "linear-gradient(135deg,#12152a,#0f1120)",
      border: "1px solid #1e2140", borderRadius: 14, padding: "14px 16px", marginTop: 6,
    }}>
      {/* Barras mensais */}
      <div>
        <div style={{ fontSize: 10, color: "#8b8fa8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          📊 Evolução Mensal — {title}
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={barData} margin={{ top: 4, right: 6, left: -22, bottom: 0 }} barSize={13}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2140" vertical={false} />
            <XAxis dataKey="m" tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
            {goal != null && (
              <ReferenceLine y={goal} stroke="#facc15" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: `Meta ${goal}${unit}`, fill: "#facc15", fontSize: 9, position: "insideTopRight" }} />
            )}
            <Tooltip content={<Tip unit={unit} />} />
            <Bar dataKey="v" name={title} radius={[4, 4, 0, 0]} isAnimationActive>
              {barData.map((e, i) => <rect key={i} fill={bc(e.v)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Linha diária */}
      <div>
        <div style={{ fontSize: 10, color: "#8b8fa8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          📈 Evolução Diária — {MONTH_NAMES[CUR_MONTH]}/{String(CUR_YEAR).slice(2)}
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={lineData} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2140" vertical={false} />
            <XAxis dataKey="d" tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false}
              interval={Math.floor(DAYS_IN_MONTH / 6)} />
            <YAxis tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
            {goal != null && (
              <ReferenceLine y={goal} stroke="#facc15" strokeDasharray="4 3" strokeWidth={1.5} />
            )}
            <Tooltip content={<Tip unit={unit} />} />
            <Line dataKey="v" name={title} stroke={color} strokeWidth={2}
              dot={{ r: 2, fill: color }} activeDot={{ r: 4 }} connectNulls isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
