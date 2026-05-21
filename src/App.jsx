import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const now = new Date();
const CUR_MONTH = now.getMonth();
const CUR_YEAR  = now.getFullYear();
const DAYS_IN_MONTH = new Date(CUR_YEAR, CUR_MONTH + 1, 0).getDate();

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => {
  const mi = (CUR_MONTH - 11 + i + 12) % 12;
  return MONTH_NAMES[mi];
});
const DAY_LABELS = Array.from({ length: DAYS_IN_MONTH }, (_, i) => `D${i + 1}`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mk12  = () => Array(12).fill(0);
const mkDay = () => Array(DAYS_IN_MONTH).fill(0);
const arrLast = a => (a?.length ? a[a.length - 1] : 0);
const arrPrev = a => (a?.length >= 2 ? a[a.length - 2] : null);

function deltaInfo(arr, hib) {
  const l = arrLast(arr), p = arrPrev(arr);
  if (p === null) return null;
  const diff = l - p;
  const good = hib ? diff > 0 : diff < 0;
  return {
    label: `${diff > 0 ? "+" : ""}${Number.isInteger(diff) ? diff : diff.toFixed(1)}`,
    color: diff === 0 ? "#8b8fa8" : good ? "#22c55e" : "#ef4444",
    arrow: diff === 0 ? "–" : diff > 0 ? "▲" : "▼",
  };
}

function fmtVal(v) {
  if (v == null) return "–";
  return Number.isInteger(+v) ? String(+v) : Number(v).toFixed(1);
}

function padArr(arr, len, def = 0) {
  const a = [...(arr || [])];
  while (a.length < len) a.push(def);
  return a.slice(0, len);
}

// ─── Per-pilar XLSX definitions ───────────────────────────────────────────────
// Each pilar declares: id, label, color, icon, monthlyFields, dailyFields
// monthlyFields: [{ key, label, type? }]   type defaults to "number"
const PILARES = [
  {
    id: "seguranca", label: "SEGURANÇA", icon: "🦺", color: "#ef4444",
    monthlyFields: [
      { key: "acidenteComAfastamento", label: "Acidente c/ Afastamento" },
      { key: "acidenteSemAfastamento", label: "Acidente s/ Afastamento" },
      { key: "diasSemAcidente",         label: "Dias sem Acidente" },
    ],
    dailyFields: [
      { key: "d_acidenteComAfastamento", label: "Acidente c/ Afastamento" },
      { key: "d_acidenteSemAfastamento", label: "Acidente s/ Afastamento" },
      { key: "d_diasSemAcidente",         label: "Dias sem Acidente" },
    ],
  },
  {
    id: "qualidade", label: "QUALIDADE", icon: "✅", color: "#3b82f6",
    monthlyFields: [
      { key: "reclamacoesClientes",   label: "Reclamações Clientes" },
      { key: "estoqueCQ",              label: "Estoque CQ" },
      { key: "reclamacoesAtrasadas",   label: "Reclamações Atrasadas" },
      { key: "responsavelReclamacoes", label: "Responsável Reclamações", type: "text" },
    ],
    dailyFields: [
      { key: "d_reclamacoesClientes",  label: "Reclamações Clientes" },
      { key: "d_estoqueCQ",             label: "Estoque CQ" },
      { key: "d_reclamacoesAtrasadas",  label: "Reclamações Atrasadas" },
    ],
  },
  {
    id: "custos", label: "CUSTO / EFICIÊNCIA", icon: "⚙️", color: "#f59e0b",
    monthlyFields: [
      { key: "eficienciaLMO",  label: "Eficiência LMO (%)" },
      { key: "eficienciaLito", label: "Eficiência Litografia (%)" },
      // top5 handled separately
    ],
    dailyFields: [
      { key: "d_eficienciaLMO",  label: "Eficiência LMO (%)" },
      { key: "d_eficienciaLito", label: "Eficiência Litografia (%)" },
    ],
    hasTop5: true,
  },
  {
    id: "entregas", label: "ENTREGAS", icon: "🚚", color: "#22c55e",
    monthlyFields: [
      { key: "atendimentoPrazo",  label: "Atendimento no Prazo (%)" },
      { key: "leadTimeLito",       label: "Lead Time Litografia (dias)" },
      { key: "estoqueAcabado",     label: "Estoque Acabado" },
      { key: "estoqueLitografado", label: "Estoque Litografado" },
    ],
    dailyFields: [
      { key: "d_atendimentoPrazo",  label: "Atendimento no Prazo (%)" },
      { key: "d_leadTimeLito",       label: "Lead Time Litografia (dias)" },
      { key: "d_estoqueAcabado",     label: "Estoque Acabado" },
      { key: "d_estoqueLitografado", label: "Estoque Litografado" },
    ],
  },
  {
    id: "pessoas", label: "PESSOAS", icon: "👥", color: "#8b5cf6",
    monthlyFields: [
      { key: "absenteismo",      label: "Absenteísmo (%)" },
      { key: "organicoLMO",      label: "Orgânico LMO (turno)" },
      { key: "organicoLito",     label: "Orgânico Lito (turno)" },
      { key: "horasTreinamento", label: "Horas Treinamento/Pessoa" },
    ],
    dailyFields: [
      { key: "d_absenteismo",      label: "Absenteísmo (%)" },
      { key: "d_organicoLMO",      label: "Orgânico LMO (turno)" },
      { key: "d_organicoLito",     label: "Orgânico Lito (turno)" },
      { key: "d_horasTreinamento", label: "Horas Treinamento/Pessoa" },
    ],
  },
];

// ─── XLSX per-pilar export ────────────────────────────────────────────────────
function exportPilar(pilar, data) {
  const wb = XLSX.utils.book_new();

  // Mensal sheet
  const mHeader = ["Indicador", ...MONTH_LABELS];
  const mRows = [mHeader, ...pilar.monthlyFields.map(f =>
    [f.label, ...padArr(data[f.key], 12, f.type === "text" ? "–" : 0)]
  )];
  if (pilar.hasTop5) {
    data.top5Labels.forEach((lbl, i) =>
      mRows.push([`Top5 - ${lbl}`, ...data.top5Perdas.map(r => r[i])])
    );
  }
  const ws1 = XLSX.utils.aoa_to_sheet(mRows);
  ws1["!cols"] = [{ wch: 32 }, ...MONTH_LABELS.map(() => ({ wch: 10 }))];
  XLSX.utils.book_append_sheet(wb, ws1, "Mensal");

  // Diário sheet
  const dHeader = ["Indicador", ...DAY_LABELS];
  const dRows = [dHeader, ...pilar.dailyFields.map(f =>
    [f.label, ...padArr(data[f.key], DAYS_IN_MONTH)]
  )];
  const ws2 = XLSX.utils.aoa_to_sheet(dRows);
  ws2["!cols"] = [{ wch: 32 }, ...DAY_LABELS.map(() => ({ wch: 7 }))];
  XLSX.utils.book_append_sheet(wb, ws2, "Diário");

  XLSX.writeFile(wb, `BI_${pilar.label.replace(/[^a-zA-Z]/g, "_")}.xlsx`);
}

// ─── XLSX per-pilar import ────────────────────────────────────────────────────
function importPilar(pilar, buffer, data) {
  const wb = XLSX.read(buffer, { type: "binary" });

  // Mensal
  const ws1 = wb.Sheets["Mensal"];
  if (!ws1) throw new Error("Aba 'Mensal' não encontrada.");
  const mRows = XLSX.utils.sheet_to_json(ws1, { header: 1 });
  const byM = {};
  mRows.slice(1).forEach(r => { if (r[0]) byM[r[0]] = r.slice(1); });

  const newData = { ...data };
  pilar.monthlyFields.forEach(f => {
    if (byM[f.label] !== undefined) {
      const raw = byM[f.label];
      newData[f.key] = f.type === "text"
        ? padArr(raw.map(v => v ?? "–"), 12, "–")
        : padArr(raw.map(v => +(v ?? 0)), 12, 0);
    }
  });

  if (pilar.hasTop5) {
    const newTop5 = data.top5Perdas.map(r => [...r]);
    data.top5Labels.forEach((lbl, i) => {
      const key = `Top5 - ${lbl}`;
      if (byM[key]) byM[key].forEach((v, mi) => { if (mi < 12) newTop5[mi][i] = +(v ?? 0); });
    });
    newData.top5Perdas = newTop5;
  }

  // Diário
  const ws2 = wb.Sheets["Diário"];
  if (ws2) {
    const dRows = XLSX.utils.sheet_to_json(ws2, { header: 1 });
    const byD = {};
    dRows.slice(1).forEach(r => { if (r[0]) byD[r[0]] = r.slice(1); });
    pilar.dailyFields.forEach(f => {
      if (byD[f.label] !== undefined)
        newData[f.key] = padArr(byD[f.label].map(v => +(v ?? 0)), DAYS_IN_MONTH, 0);
    });
  }

  return newData;
}

// ─── Default state ────────────────────────────────────────────────────────────
const makeDefault = () => ({
  acidenteComAfastamento: mk12(), acidenteSemAfastamento: mk12(), diasSemAcidente: mk12(),
  reclamacoesClientes: mk12(), estoqueCQ: mk12(), reclamacoesAtrasadas: mk12(),
  responsavelReclamacoes: Array(12).fill("–"),
  eficienciaLMO: mk12(), eficienciaLito: mk12(),
  top5Perdas: Array(12).fill(0).map(() => Array(5).fill(0)),
  top5Labels: ["Perda 1","Perda 2","Perda 3","Perda 4","Perda 5"],
  atendimentoPrazo: mk12(), leadTimeLito: mk12(), estoqueAcabado: mk12(), estoqueLitografado: mk12(),
  absenteismo: mk12(), organicoLMO: mk12(), organicoLito: mk12(), horasTreinamento: mk12(),
  d_acidenteComAfastamento: mkDay(), d_acidenteSemAfastamento: mkDay(), d_diasSemAcidente: mkDay(),
  d_reclamacoesClientes: mkDay(), d_estoqueCQ: mkDay(), d_reclamacoesAtrasadas: mkDay(),
  d_eficienciaLMO: mkDay(), d_eficienciaLito: mkDay(),
  d_atendimentoPrazo: mkDay(), d_leadTimeLito: mkDay(), d_estoqueAcabado: mkDay(), d_estoqueLitografado: mkDay(),
  d_absenteismo: mkDay(), d_organicoLMO: mkDay(), d_organicoLito: mkDay(), d_horasTreinamento: mkDay(),
});

const defaultMetas = {
  reclamacoesClientes: 5, eficienciaLMO: 75, eficienciaLito: 75,
  atendimentoPrazo: 98, absenteismo: 3, diasSemAcidente: 30, horasTreinamento: 8,
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const Tip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1a1d2e", border:"1px solid #2a2d45", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#f1f5f9" }}>
      <div style={{ color:"#8b8fa8", marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:700 }}>{p.name}: {fmtVal(p.value)}{unit}</div>)}
    </div>
  );
};

// ─── PilarCharts ─────────────────────────────────────────────────────────────
function PilarCharts({ title, color, monthlyData, dailyData, goal, unit="", higherIsBetter=true }) {
  const barData  = MONTH_LABELS.map((m,i) => ({ m, v: monthlyData[i] ?? 0 }));
  const lineData = DAY_LABELS.map((d,i)   => ({ d, v: dailyData[i]   ?? 0 }));
  const bc = v => goal == null ? color : (higherIsBetter ? v >= goal : v <= goal) ? "#22c55e" : "#ef4444";

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
      background:"linear-gradient(135deg,#12152a,#0f1120)",
      border:"1px solid #1e2140", borderRadius:14, padding:"14px 16px", marginTop:6 }}>
      <div>
        <div style={{ fontSize:10, color:"#8b8fa8", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
          📊 Evolução Mensal — {title}
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={barData} margin={{ top:4, right:6, left:-22, bottom:0 }} barSize={13}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2140" vertical={false} />
            <XAxis dataKey="m" tick={{ fill:"#555", fontSize:9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:"#555", fontSize:9 }} axisLine={false} tickLine={false} />
            {goal != null && <ReferenceLine y={goal} stroke="#facc15" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value:`Meta ${goal}${unit}`, fill:"#facc15", fontSize:9, position:"insideTopRight" }} />}
            <Tooltip content={<Tip unit={unit} />} />
            <Bar dataKey="v" name={title} radius={[4,4,0,0]} isAnimationActive>
              {barData.map((e,i) => <rect key={i} fill={bc(e.v)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={{ fontSize:10, color:"#8b8fa8", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
          📈 Evolução Diária — {MONTH_NAMES[CUR_MONTH]}/{String(CUR_YEAR).slice(2)}
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={lineData} margin={{ top:4, right:6, left:-22, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2140" vertical={false} />
            <XAxis dataKey="d" tick={{ fill:"#555", fontSize:9 }} axisLine={false} tickLine={false}
              interval={Math.floor(DAYS_IN_MONTH/6)} />
            <YAxis tick={{ fill:"#555", fontSize:9 }} axisLine={false} tickLine={false} />
            {goal != null && <ReferenceLine y={goal} stroke="#facc15" strokeDasharray="4 3" strokeWidth={1.5} />}
            <Tooltip content={<Tip unit={unit} />} />
            <Line dataKey="v" name={title} stroke={color} strokeWidth={2}
              dot={{ r:2, fill:color }} activeDot={{ r:4 }} connectNulls isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, unit="", monthlyData, goal, higherIsBetter=true, color="#6366f1", extra }) {
  const dl      = deltaInfo(monthlyData, higherIsBetter);
  const goalMet = goal != null ? (higherIsBetter ? value >= goal : value <= goal) : null;
  const border  = goalMet===false?"#ef444455":goalMet===true?"#22c55e55":"#2a2d45";
  const shadow  = goalMet===false?"0 0 14px #ef444422":goalMet===true?"0 0 14px #22c55e22":"none";
  const sparkH=32, sparkW=80;
  const vals = (monthlyData||[]).filter(v => typeof v==="number");
  const sMin=Math.min(...vals)*0.9, sMax=Math.max(...vals,0.01)*1.1;
  const sx=i=>(i/(vals.length-1||1))*sparkW;
  const sy=v=>sparkH-((v-sMin)/(sMax-sMin||1))*sparkH;
  const pts=vals.map((v,i)=>`${sx(i)},${sy(v)}`).join(" ");
  return (
    <div style={{ background:"linear-gradient(135deg,#1a1d2e,#141627)", border:`1px solid ${border}`,
      borderRadius:12, padding:"12px 14px", display:"flex", flexDirection:"column", gap:4, boxShadow:shadow, minWidth:0 }}>
      <div style={{ fontSize:10, color:"#8b8fa8", fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>{title}</div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
          <span style={{ fontSize:24, fontWeight:800, color:"#f1f5f9", fontFamily:"'DM Mono',monospace", lineHeight:1 }}>
            {fmtVal(value)}{unit}
          </span>
          {dl && <span style={{ fontSize:11, fontWeight:700, color:dl.color, marginBottom:2 }}>{dl.arrow} {dl.label}{unit}</span>}
        </div>
        {vals.length>=2 && (
          <svg viewBox={`0 0 ${sparkW} ${sparkH}`} width={sparkW} height={sparkH} style={{ flexShrink:0 }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.8"/>
            <circle cx={sx(vals.length-1)} cy={sy(vals[vals.length-1])} r={3} fill={color}/>
          </svg>
        )}
      </div>
      {goal!=null && <div style={{ fontSize:10, color:goalMet?"#22c55e":"#ef4444", fontWeight:600 }}>Meta: {goal}{unit} {goalMet?"✓":"✗"}</div>}
      {extra && <div style={{ fontSize:10, color:"#f59e0b" }}>{extra}</div>}
    </div>
  );
}

// ─── Pilar Header with Export/Import buttons ──────────────────────────────────
function PilarHeader({ icon, label, color, pilarDef, data, onImport }) {
  const fileRef = useRef();
  const handleImport = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const newData = importPilar(pilarDef, ev.target.result, data);
        onImport(newData);
        alert(`${label}: dados importados com sucesso!`);
      } catch (err) { alert("Erro ao importar: " + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      borderBottom:`2px solid ${color}`, paddingBottom:8, marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:19 }}>{icon}</span>
        <span style={{ fontSize:14, fontWeight:800, color, letterSpacing:0.5 }}>{label}</span>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => exportPilar(pilarDef, data)}
          style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:6,
            padding:"5px 11px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:4 }}>
          ⬇ Exportar
        </button>
        <button onClick={() => fileRef.current.click()}
          style={{ background:"#0369a1", color:"#fff", border:"none", borderRadius:6,
            padding:"5px 11px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:4 }}>
          ⬆ Importar
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" style={{ display:"none" }} onChange={handleImport} />
      </div>
    </div>
  );
}

// ─── Pilar Section ────────────────────────────────────────────────────────────
function PilarSection({ pilarDef, data, onImport, children, charts }) {
  const { icon, label, color } = pilarDef;
  return (
    <section style={{ marginBottom:32, background:"#0e1022", border:"1px solid #1a1d36",
      borderRadius:16, padding:"18px 20px" }}>
      <PilarHeader icon={icon} label={label} color={color} pilarDef={pilarDef} data={data} onImport={onImport} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))", gap:10 }}>
        {children}
      </div>
      {charts}
    </section>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BIDashboard() {
  const [data,      setData]      = useState(makeDefault());
  const [metas,     setMetas]     = useState(defaultMetas);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMetas, setShowMetas] = useState(false);
  const [editMonth, setEditMonth] = useState(11);
  const [editDay,   setEditDay]   = useState(0);
  const [dataMode,  setDataMode]  = useState("monthly");

  const inp = {
    background:"#0f1120", border:"1px solid #2a2d45", color:"#f1f5f9",
    borderRadius:6, padding:"5px 8px", fontSize:13,
    fontFamily:"'DM Mono',monospace", width:"100%",
  };
  const tab = t => ({
    padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer",
    fontWeight:700, fontSize:12, fontFamily:"inherit",
    background: activeTab===t?"#6366f1":"#1a1d2e",
    color:      activeTab===t?"#fff":"#8b8fa8", transition:"all .2s",
  });

  const top5 = data.top5Perdas[11]
    .map((v,i) => ({ label:data.top5Labels[i], value:v }))
    .sort((a,b) => b.value-a.value);
  const maxP = Math.max(...top5.map(p=>p.value),1);

  const L = arrLast;

  return (
    <div style={{ minHeight:"100vh", background:"#0b0d1a", color:"#f1f5f9",
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:6px;background:#0b0d1a;}
        ::-webkit-scrollbar-thumb{background:#2a2d45;border-radius:3px;}
        select option{background:#1a1d2e;}
      `}</style>

      {/* Top bar */}
      <div style={{ background:"linear-gradient(90deg,#10122a,#1a1d2e)", borderBottom:"1px solid #1e2140",
        padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:9,fontSize:16,
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex",alignItems:"center",justifyContent:"center" }}>📊</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>BI Industrial</div>
            <div style={{ fontSize:10, color:"#6366f1" }}>Dashboard de Indicadores</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={()=>setShowMetas(v=>!v)}
            style={{ background:showMetas?"#f59e0b":"#374151", color:"#fff", border:"none",
              borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
            ⚙ Metas
          </button>
        </div>
      </div>

      {/* Metas panel */}
      {showMetas && (
        <div style={{ background:"#12152a", borderBottom:"1px solid #1e2140",
          padding:"14px 24px", display:"flex", flexWrap:"wrap", gap:16, alignItems:"center" }}>
          <span style={{ fontWeight:700, color:"#f59e0b", fontSize:12 }}>⚙ Configurar Metas</span>
          {[
            { k:"reclamacoesClientes", l:"Reclamações Clientes (máx)" },
            { k:"eficienciaLMO",       l:"Efic. LMO (%)" },
            { k:"eficienciaLito",      l:"Efic. Lito (%)" },
            { k:"atendimentoPrazo",    l:"Atend. Prazo (%)" },
            { k:"absenteismo",         l:"Absenteísmo (%)" },
            { k:"diasSemAcidente",     l:"Dias s/ Acidente" },
            { k:"horasTreinamento",    l:"Hrs Treinamento" },
          ].map(({ k,l }) => (
            <label key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <span style={{ fontSize:10, color:"#8b8fa8" }}>{l}</span>
              <input type="number" value={metas[k]}
                onChange={e=>setMetas(m=>({...m,[k]:+e.target.value}))}
                style={{ ...inp, width:90, fontSize:12 }} />
            </label>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding:"12px 24px 0", display:"flex", gap:8 }}>
        {[{ id:"dashboard",l:"📊 Dashboard"},{ id:"entrada",l:"✏️ Entrada de Dados"}]
          .map(t=><button key={t.id} style={tab(t.id)} onClick={()=>setActiveTab(t.id)}>{t.l}</button>)}
      </div>

      <div style={{ padding:"18px 24px 48px" }}>

        {/* ══ DASHBOARD ══ */}
        {activeTab==="dashboard" && (
          <div>

            {/* SEGURANÇA */}
            <PilarSection pilarDef={PILARES[0]} data={data} onImport={setData}
              charts={<div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
                <PilarCharts title="Acid. c/ Afastamento" color="#ef4444"
                  monthlyData={data.acidenteComAfastamento} dailyData={data.d_acidenteComAfastamento} higherIsBetter={false}/>
                <PilarCharts title="Acid. s/ Afastamento" color="#f97316"
                  monthlyData={data.acidenteSemAfastamento} dailyData={data.d_acidenteSemAfastamento} higherIsBetter={false}/>
                <PilarCharts title="Dias sem Acidente" color="#22c55e"
                  monthlyData={data.diasSemAcidente} dailyData={data.d_diasSemAcidente}
                  goal={metas.diasSemAcidente} higherIsBetter/>
              </div>}>
              <KpiCard title="Acid. c/ Afastamento" value={L(data.acidenteComAfastamento)}
                monthlyData={data.acidenteComAfastamento} color="#ef4444" higherIsBetter={false}/>
              <KpiCard title="Acid. s/ Afastamento" value={L(data.acidenteSemAfastamento)}
                monthlyData={data.acidenteSemAfastamento} color="#f97316" higherIsBetter={false}/>
              <KpiCard title="Dias sem Acidente" value={L(data.diasSemAcidente)}
                monthlyData={data.diasSemAcidente} color="#22c55e" goal={metas.diasSemAcidente} higherIsBetter/>
            </PilarSection>

            {/* QUALIDADE */}
            <PilarSection pilarDef={PILARES[1]} data={data} onImport={setData}
              charts={<div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
                <PilarCharts title="Reclamações Clientes" color="#3b82f6"
                  monthlyData={data.reclamacoesClientes} dailyData={data.d_reclamacoesClientes}
                  goal={metas.reclamacoesClientes} higherIsBetter={false}/>
                <PilarCharts title="Estoque no CQ" color="#0ea5e9"
                  monthlyData={data.estoqueCQ} dailyData={data.d_estoqueCQ} higherIsBetter={false}/>
                <PilarCharts title="Reclamações Atrasadas" color="#f59e0b"
                  monthlyData={data.reclamacoesAtrasadas} dailyData={data.d_reclamacoesAtrasadas} higherIsBetter={false}/>
              </div>}>
              <KpiCard title="Reclamações Clientes" value={L(data.reclamacoesClientes)}
                monthlyData={data.reclamacoesClientes} color="#3b82f6"
                goal={metas.reclamacoesClientes} higherIsBetter={false}/>
              <KpiCard title="Estoque Material CQ" value={L(data.estoqueCQ)}
                monthlyData={data.estoqueCQ} color="#0ea5e9" higherIsBetter={false}/>
              <KpiCard title="Reclamações Atrasadas" value={L(data.reclamacoesAtrasadas)}
                monthlyData={data.reclamacoesAtrasadas} color="#f59e0b" higherIsBetter={false}
                extra={`Resp.: ${data.responsavelReclamacoes[11]||"–"}`}/>
            </PilarSection>

            {/* CUSTO/EFICIÊNCIA */}
            <PilarSection pilarDef={PILARES[2]} data={data} onImport={setData}
              charts={<div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
                <PilarCharts title="Eficiência LMO" color="#f59e0b" unit="%"
                  monthlyData={data.eficienciaLMO} dailyData={data.d_eficienciaLMO}
                  goal={metas.eficienciaLMO} higherIsBetter/>
                <PilarCharts title="Eficiência Litografia" color="#fbbf24" unit="%"
                  monthlyData={data.eficienciaLito} dailyData={data.d_eficienciaLito}
                  goal={metas.eficienciaLito} higherIsBetter/>
              </div>}>
              <KpiCard title="Eficiência LMO" value={L(data.eficienciaLMO)} unit="%"
                monthlyData={data.eficienciaLMO} color="#f59e0b" goal={metas.eficienciaLMO} higherIsBetter/>
              <KpiCard title="Eficiência Litografia" value={L(data.eficienciaLito)} unit="%"
                monthlyData={data.eficienciaLito} color="#fbbf24" goal={metas.eficienciaLito} higherIsBetter/>
              <div style={{ gridColumn:"1/-1", background:"#12152a", border:"1px solid #1e2140",
                borderRadius:12, padding:"12px 16px" }}>
                <div style={{ fontSize:11, color:"#8b8fa8", fontWeight:700, textTransform:"uppercase",
                  letterSpacing:1, marginBottom:10 }}>🏆 Top 5 Perdas – Mês Atual</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {top5.map((p,i)=>(
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                        <span>{i+1}º {p.label}</span>
                        <span style={{ fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{p.value}</span>
                      </div>
                      <div style={{ height:5, background:"#1e2140", borderRadius:3 }}>
                        <div style={{ height:"100%", borderRadius:3, transition:"width .5s",
                          width:`${(p.value/maxP)*100}%`,
                          background:["#ef4444","#f97316","#f59e0b","#6366f1","#8b5cf6"][i] }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PilarSection>

            {/* ENTREGAS */}
            <PilarSection pilarDef={PILARES[3]} data={data} onImport={setData}
              charts={<div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
                <PilarCharts title="Atendimento no Prazo" color="#22c55e" unit="%"
                  monthlyData={data.atendimentoPrazo} dailyData={data.d_atendimentoPrazo}
                  goal={metas.atendimentoPrazo} higherIsBetter/>
                <PilarCharts title="Lead Time Litografia" color="#10b981" unit=" dias"
                  monthlyData={data.leadTimeLito} dailyData={data.d_leadTimeLito} higherIsBetter={false}/>
                <PilarCharts title="Estoque Acabado" color="#059669"
                  monthlyData={data.estoqueAcabado} dailyData={data.d_estoqueAcabado} higherIsBetter={false}/>
                <PilarCharts title="Estoque Litografado" color="#34d399"
                  monthlyData={data.estoqueLitografado} dailyData={data.d_estoqueLitografado} higherIsBetter={false}/>
              </div>}>
              <KpiCard title="Atendimento no Prazo" value={L(data.atendimentoPrazo)} unit="%"
                monthlyData={data.atendimentoPrazo} color="#22c55e" goal={metas.atendimentoPrazo} higherIsBetter/>
              <KpiCard title="Lead Time Litografia" value={L(data.leadTimeLito)} unit=" dias"
                monthlyData={data.leadTimeLito} color="#10b981" higherIsBetter={false}/>
              <KpiCard title="Estoque Acabado" value={L(data.estoqueAcabado)}
                monthlyData={data.estoqueAcabado} color="#059669" higherIsBetter={false}/>
              <KpiCard title="Estoque Litografado" value={L(data.estoqueLitografado)}
                monthlyData={data.estoqueLitografado} color="#34d399" higherIsBetter={false}/>
            </PilarSection>

            {/* PESSOAS */}
            <PilarSection pilarDef={PILARES[4]} data={data} onImport={setData}
              charts={<div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
                <PilarCharts title="Absenteísmo" color="#8b5cf6" unit="%"
                  monthlyData={data.absenteismo} dailyData={data.d_absenteismo}
                  goal={metas.absenteismo} higherIsBetter={false}/>
                <PilarCharts title="Orgânico LMO" color="#a78bfa"
                  monthlyData={data.organicoLMO} dailyData={data.d_organicoLMO} higherIsBetter/>
                <PilarCharts title="Orgânico Litografia" color="#c4b5fd"
                  monthlyData={data.organicoLito} dailyData={data.d_organicoLito} higherIsBetter/>
                <PilarCharts title="Hrs Treinamento/Pessoa" color="#7c3aed"
                  monthlyData={data.horasTreinamento} dailyData={data.d_horasTreinamento}
                  goal={metas.horasTreinamento} higherIsBetter/>
              </div>}>
              <KpiCard title="Absenteísmo" value={L(data.absenteismo)} unit="%"
                monthlyData={data.absenteismo} color="#8b5cf6" goal={metas.absenteismo} higherIsBetter={false}/>
              <KpiCard title="Orgânico LMO (turno)" value={L(data.organicoLMO)}
                monthlyData={data.organicoLMO} color="#a78bfa" higherIsBetter/>
              <KpiCard title="Orgânico Lito (turno)" value={L(data.organicoLito)}
                monthlyData={data.organicoLito} color="#c4b5fd" higherIsBetter/>
              <KpiCard title="Hrs Treinamento/Pessoa" value={L(data.horasTreinamento)}
                monthlyData={data.horasTreinamento} color="#7c3aed" goal={metas.horasTreinamento} higherIsBetter/>
            </PilarSection>
          </div>
        )}

        {/* ══ ENTRADA DE DADOS ══ */}
        {activeTab==="entrada" && (
          <EntradaDados data={data} editMonth={editMonth} setEditMonth={setEditMonth}
            editDay={editDay} setEditDay={setEditDay}
            dataMode={dataMode} setDataMode={setDataMode}
            updateMonthly={(f,mi,v)=>setData(d=>{const a=[...d[f]];a[mi]=isNaN(+v)?v:+v;return{...d,[f]:a};})}
            updateDaily={(f,di,v)=>setData(d=>{const a=[...d[f]];a[di]=+v||0;return{...d,[f]:a};})}
            updatePerda={(mi,pi,v)=>setData(d=>{const t=d.top5Perdas.map(r=>[...r]);t[mi][pi]=+v||0;return{...d,top5Perdas:t};})}
            inp={inp} />
        )}
      </div>
    </div>
  );
}

// ─── Entrada de Dados ─────────────────────────────────────────────────────────
function EntradaDados({ data, editMonth, setEditMonth, editDay, setEditDay,
  dataMode, setDataMode, updateMonthly, updateDaily, updatePerda, inp }) {

  const isDaily = dataMode==="daily";
  const sec = { background:"linear-gradient(135deg,#1a1d2e,#141627)",
    border:"1px solid #2a2d45", borderRadius:14, padding:"16px 18px", marginBottom:18 };
  const lbl = { fontSize:11, color:"#8b8fa8", fontWeight:600, marginBottom:3, display:"block" };
  const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:12 };

  const Field = ({ field, label, type="number", step="1", max }) => {
    const val = isDaily ? data[`d_${field}`]?.[editDay]??0 : data[field]?.[editMonth]??0;
    const onChange = e => isDaily
      ? updateDaily(`d_${field}`, editDay, e.target.value)
      : updateMonthly(field, editMonth, e.target.value);
    return (
      <label><span style={lbl}>{label}</span>
        <input type={type} min="0" step={step} max={max} value={val} onChange={onChange} style={inp}/>
      </label>
    );
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:18 }}>
        <div style={{ display:"flex", background:"#1a1d2e", borderRadius:8, padding:3, gap:3 }}>
          {[{ id:"monthly",l:"📅 Mensal"},{ id:"daily",l:"📆 Diário"}].map(m=>(
            <button key={m.id} onClick={()=>setDataMode(m.id)} style={{
              padding:"6px 14px", borderRadius:6, border:"none", cursor:"pointer",
              fontWeight:700, fontSize:12, fontFamily:"inherit",
              background:dataMode===m.id?"#6366f1":"transparent",
              color:dataMode===m.id?"#fff":"#8b8fa8" }}>{m.l}</button>
          ))}
        </div>
        {!isDaily && (
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#8b8fa8", fontWeight:600 }}>Mês:</span>
            <select value={editMonth} onChange={e=>setEditMonth(+e.target.value)}
              style={{ ...inp, width:"auto", padding:"6px 12px" }}>
              {MONTH_LABELS.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </label>
        )}
        {isDaily && (
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#8b8fa8", fontWeight:600 }}>Dia ({MONTH_NAMES[CUR_MONTH]}):</span>
            <select value={editDay} onChange={e=>setEditDay(+e.target.value)}
              style={{ ...inp, width:"auto", padding:"6px 12px" }}>
              {DAY_LABELS.map((d,i)=><option key={i} value={i}>{d}</option>)}
            </select>
          </label>
        )}
      </div>

      <div style={sec}>
        <div style={{ fontWeight:800, color:"#ef4444", fontSize:13, marginBottom:12 }}>🦺 Segurança</div>
        <div style={grid}>
          <Field field="acidenteComAfastamento" label="Acidentes c/ Afastamento"/>
          <Field field="acidenteSemAfastamento" label="Acidentes s/ Afastamento"/>
          <Field field="diasSemAcidente"         label="Dias sem Acidente"/>
        </div>
      </div>

      <div style={sec}>
        <div style={{ fontWeight:800, color:"#3b82f6", fontSize:13, marginBottom:12 }}>✅ Qualidade</div>
        <div style={grid}>
          <Field field="reclamacoesClientes"  label="Reclamações de Clientes"/>
          <Field field="estoqueCQ"             label="Estoque Material no CQ"/>
          <Field field="reclamacoesAtrasadas"  label="Reclamações Atrasadas"/>
          {!isDaily && (
            <label><span style={lbl}>Responsável Reclamações</span>
              <input type="text" value={data.responsavelReclamacoes[editMonth]}
                onChange={e=>updateMonthly("responsavelReclamacoes",editMonth,e.target.value)} style={inp}/>
            </label>
          )}
        </div>
      </div>

      <div style={sec}>
        <div style={{ fontWeight:800, color:"#f59e0b", fontSize:13, marginBottom:12 }}>⚙️ Custo / Eficiência</div>
        <div style={grid}>
          <Field field="eficienciaLMO"  label="Eficiência LMO (%)"       step="0.1" max="100"/>
          <Field field="eficienciaLito" label="Eficiência Litografia (%)" step="0.1" max="100"/>
        </div>
        {!isDaily && (
          <div style={{ marginTop:12 }}>
            <span style={{ ...lbl, marginBottom:8 }}>Top 5 Perdas do Processo</span>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
              {data.top5Labels.map((l,i)=>(
                <label key={i}><span style={lbl}>{l}</span>
                  <input type="number" min="0" value={data.top5Perdas[editMonth][i]}
                    onChange={e=>updatePerda(editMonth,i,e.target.value)} style={inp}/>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={sec}>
        <div style={{ fontWeight:800, color:"#22c55e", fontSize:13, marginBottom:12 }}>🚚 Entregas</div>
        <div style={grid}>
          <Field field="atendimentoPrazo"   label="Atendimento no Prazo (%)"      step="0.1" max="100"/>
          <Field field="leadTimeLito"        label="Lead Time Litografia (dias)"   step="0.1"/>
          <Field field="estoqueAcabado"      label="Estoque Acabado"/>
          <Field field="estoqueLitografado"  label="Estoque Litografado"/>
        </div>
      </div>

      <div style={sec}>
        <div style={{ fontWeight:800, color:"#8b5cf6", fontSize:13, marginBottom:12 }}>👥 Pessoas</div>
        <div style={grid}>
          <Field field="absenteismo"      label="Absenteísmo (%)"          step="0.1"/>
          <Field field="organicoLMO"      label="Orgânico LMO (turno)"/>
          <Field field="organicoLito"     label="Orgânico Lito (turno)"/>
          <Field field="horasTreinamento" label="Horas Treinamento/Pessoa" step="0.1"/>
        </div>
      </div>
    </div>
  );
}
