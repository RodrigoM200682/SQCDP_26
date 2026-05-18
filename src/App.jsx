import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell
} from "recharts";

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  S: { bg:"#c0392b", text:"#ff8a80", label:"SEGURANÇA",    sub:"Safety"   },
  Q: { bg:"#2471a3", text:"#82c4f8", label:"QUALIDADE",     sub:"Quality"  },
  C: { bg:"#1a7a4a", text:"#6ee7b7", label:"CUSTO / EFIC.", sub:"Cost"     },
  D: { bg:"#b7770d", text:"#ffd27a", label:"ENTREGA",       sub:"Delivery" },
  P: { bg:"#6c3483", text:"#c39bd3", label:"PESSOAS",       sub:"People"   },
};
const PILLARS = ["S","Q","C","D","P"];
const STATUS_CFG = [
  { icon:"●", color:"#ef4444", label:"Não iniciado", bg:"#450a0a" },
  { icon:"◑", color:"#facc15", label:"Em andamento",  bg:"#422006" },
  { icon:"●", color:"#22c55e", label:"Concluído",     bg:"#052e16" },
];
const DAYS = Array.from({length:17},(_,i)=>`${i+1}`);
const STORAGE_KEY = "sqcdp_v1";

// ─── DEFAULT STATE ────────────────────────────────────────────────────────────
const DEFAULT = {
  header: { area:"Produção", resp:"Gerência Industrial", mesAnt:"Abr/2025", mesAtual:"Mai/2025" },
  kpis: {
    S: [
      { key:"acid_af", label:"Acidentes c/ Afastamento", ant:0,   cur:0,   meta:0,  unit:"",   higher:false, color:"#ef4444",
        data:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
      { key:"acid_sf", label:"Acidentes s/ Afastamento", ant:2,   cur:1,   meta:0,  unit:"",   higher:false, color:"#fb923c",
        data:[0,1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,1] },
    ],
    Q: [
      { key:"cq",   label:"Reclamações CQ",       ant:5,   cur:3,   meta:2, unit:"qt", higher:false, color:"#60a5fa",
        data:[5,4,5,3,4,4,3,3,4,2,3,3,2,3,2,3,3] },
      { key:"retr", label:"Índice Retrabalho",     ant:2.4, cur:1.8, meta:1, unit:"%",  higher:false, color:"#a78bfa",
        data:[2.4,2.3,2.2,2.1,2.0,2.1,1.9,1.8,1.9,1.8,1.7,1.8,1.7,1.8,1.8,1.8,1.8] },
      { key:"atrs", label:"Ocorrências em Atraso", ant:4,   cur:2,   meta:0, unit:"qt", higher:false, color:"#f472b6",
        data:[4,3,4,3,3,3,2,3,2,2,2,2,2,2,2,2,2] },
    ],
    C: [
      { key:"efic", label:"Eficiência Total",  ant:82, cur:85, meta:85, unit:"%", higher:true, color:"#34d399",
        data:[79,80,81,80,82,83,82,84,83,85,84,85,86,85,85,86,85] },
      { key:"prd",  label:"Efic. Produção",    ant:79, cur:83, meta:85, unit:"%", higher:true, color:"#6ee7b7",
        data:[77,78,79,78,80,81,80,82,81,83,82,83,84,83,83,84,83] },
      { key:"prns", label:"Efic. Prensas",     ant:75, cur:80, meta:85, unit:"%", higher:true, color:"#a7f3d0",
        data:[75,76,77,76,78,79,78,80,79,80,80,80,81,80,80,81,80] },
    ],
    D: [
      { key:"prazo", label:"Atend. no Prazo",      ant:91, cur:95, meta:95, unit:"%", higher:true,  color:"#fbbf24",
        data:[88,89,90,91,90,92,91,93,92,94,93,95,94,95,96,95,95] },
      { key:"lt",    label:"Lead Time Lito (dias)", ant:7,  cur:5,  meta:4,  unit:"d", higher:false, color:"#fb923c",
        data:[7,7,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5] },
    ],
    P: [
      { key:"abs", label:"Absenteísmo", ant:4.2, cur:3.1, meta:2, unit:"%", higher:false, color:"#c084fc",
        data:[4.2,4.0,3.9,4.1,3.8,3.7,3.6,3.5,3.4,3.2,3.3,3.1,3.0,3.2,3.1,3.1,3.1] },
    ],
  },
  top3: [
    { rank:"1", linha:"Lito L01",   ant:"3,2%", cur:"2,8%" },
    { rank:"2", linha:"Prensa P03", ant:"2,1%", cur:"1,9%" },
    { rank:"3", linha:"Prensa P07", ant:"1,8%", cur:"1,5%" },
  ],
  linhasFora: [
    { linha:"P03", ant:"72%", cur:"78%" },
    { linha:"P07", ant:"74%", cur:"80%" },
  ],
  estragoFora: [
    { linha:"Lito L01",   ant:"3,2", cur:"2,8" },
    { linha:"Prensa P03", ant:"2,1", cur:"1,9" },
  ],
  turnos: { A:32, B:30, C:28 },
  actions: [
    { pilar:"S", oque:"Revisar bloqueio/etiquetagem nas prensas P03 e P07", quem:"Carlos M.",   quando:"15/Mai", status:1 },
    { pilar:"Q", oque:"Checklist autocontrole na saída da litografia L01",   quem:"Ana R.",      quando:"20/Mai", status:0 },
    { pilar:"C", oque:"Mapear perdas de eficiência – OEE por turno",         quem:"João P.",     quando:"22/Mai", status:1 },
    { pilar:"D", oque:"Reduzir lead time: ajustar sequenciamento de setup",  quem:"Mariana S.",  quando:"18/Mai", status:2 },
    { pilar:"P", oque:"Abrir seleção para 4 vagas no Turno C",               quem:"Fernanda RH", quando:"10/Mai", status:1 },
  ],
};

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function metaColor(v, meta, higher) {
  const num = parseFloat(String(v).replace(",","."));
  if (higher) return num >= meta ? "#22c55e" : num >= meta*0.92 ? "#facc15" : "#ef4444";
  return num <= meta ? "#22c55e" : num <= meta*1.3 ? "#facc15" : "#ef4444";
}
function n(v) { return parseFloat(String(v).replace(",",".")); }

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex",
      alignItems:"center", justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ position:"absolute", inset:0, background:"#000000cc", backdropFilter:"blur(4px)" }} />
      <div style={{ position:"relative", background:"#111", border:"1px solid #333", borderRadius:12,
        padding:"20px 24px", width: wide ? 700 : 460, maxWidth:"95vw",
        maxHeight:"85vh", overflowY:"auto", boxShadow:"0 0 40px #00000099" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", fontWeight:700,
            letterSpacing:3, textTransform:"uppercase", color:"#fff" }}>{title}</div>
          <button onClick={onClose} style={{ background:"#1f1f1f", border:"1px solid #333",
            color:"#888", width:28, height:28, borderRadius:6, cursor:"pointer",
            fontSize:"1rem", lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type="text" }) {
  return (
    <div style={{ marginBottom:10 }}>
      <label style={{ fontSize:"0.52rem", color:"#666", textTransform:"uppercase",
        letterSpacing:1, display:"block", marginBottom:4 }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", background:"#1a1a1a", border:"1px solid #333", borderRadius:6,
          color:"#f0f0f0", padding:"6px 10px", fontSize:"0.75rem",
          fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

// ─── CHART TOOLTIP ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#111", border:"1px solid #2a2a2a", borderRadius:6, padding:"8px 12px" }}>
      <div style={{ fontSize:"0.6rem", color:"#666", marginBottom:4 }}>Dia {label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ fontSize:"0.68rem", color:p.color, fontFamily:"'DM Mono',monospace" }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({ kpi, onEdit }) {
  const c = metaColor(kpi.cur, kpi.meta, kpi.higher);
  const delta = (n(kpi.cur) - n(kpi.ant)).toFixed(1);
  const up = delta >= 0;
  return (
    <div onDoubleClick={onEdit}
      style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:8,
        padding:"10px 12px", display:"flex", flexDirection:"column", gap:4,
        position:"relative", cursor:"default" }}>
      <button onClick={onEdit} title="Editar indicador"
        style={{ position:"absolute", top:6, right:6, background:"transparent", border:"none",
          color:"#333", fontSize:"0.7rem", cursor:"pointer", padding:"2px 5px",
          borderRadius:4, lineHeight:1 }}
        onMouseEnter={e=>e.target.style.color="#888"}
        onMouseLeave={e=>e.target.style.color="#333"}>✎</button>
      <div style={{ fontSize:"0.52rem", color:"#666", textTransform:"uppercase",
        letterSpacing:1, paddingRight:20 }}>{kpi.label}</div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"1.7rem", fontWeight:700,
          color:c, lineHeight:1 }}>
          {kpi.cur}<span style={{ fontSize:"0.85rem" }}>{kpi.unit}</span>
        </div>
        <div style={{ fontSize:"0.62rem", color:"#555", marginBottom:4, lineHeight:1.4 }}>
          <div style={{ color:"#444" }}>ant: {kpi.ant}{kpi.unit}</div>
          <div style={{ color: up===kpi.higher ? "#22c55e" : "#ef4444" }}>
            {up?"▲":"▼"} {Math.abs(delta)}{kpi.unit}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ flex:1, height:3, background:"#1f1f1f", borderRadius:2, overflow:"hidden" }}>
          <div style={{ width:`${Math.min(100,(n(kpi.cur)/kpi.meta)*100)}%`,
            height:"100%", background:c, borderRadius:2, transition:"width 0.5s" }} />
        </div>
        <span style={{ fontSize:"0.46rem", color:"#555" }}>META {kpi.meta}{kpi.unit}</span>
      </div>
    </div>
  );
}

// ─── KPI EDIT MODAL ──────────────────────────────────────────────────────────
function KpiEditModal({ kpi, pillar, onSave, onClose }) {
  const [form, setForm] = useState({ ...kpi, data:[...kpi.data] });
  const set = (f,v) => setForm(p=>({...p,[f]:v}));
  const setDay = (i,v) => setForm(p=>{ const d=[...p.data]; d[i]=parseFloat(v)||0; return {...p,data:d}; });
  return (
    <Modal title={`Editar · ${kpi.label}`} onClose={onClose} wide>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 }}>
        <Field label="Valor Mês Anterior" value={form.ant} onChange={v=>set("ant",v)} />
        <Field label="Valor Atual"        value={form.cur} onChange={v=>set("cur",v)} />
        <Field label="Meta"               value={form.meta} onChange={v=>set("meta",parseFloat(v)||0)} type="number" />
        <Field label="Unidade (%, qt, d…)" value={form.unit} onChange={v=>set("unit",v)} />
      </div>
      <label style={{ fontSize:"0.52rem", color:"#666", textTransform:"uppercase",
        letterSpacing:1, display:"block", marginBottom:8 }}>Dados Diários (dia 1 → 17)</label>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(9,1fr)", gap:4, marginBottom:16 }}>
        {form.data.map((v,i)=>(
          <div key={i}>
            <div style={{ fontSize:"0.42rem", color:"#555", textAlign:"center", marginBottom:2 }}>{i+1}</div>
            <input type="number" value={v} onChange={e=>setDay(i,e.target.value)}
              style={{ width:"100%", background:"#1a1a1a", border:"1px solid #2a2a2a",
                borderRadius:4, color:"#f0f0f0", padding:"4px 2px", fontSize:"0.6rem",
                fontFamily:"'DM Mono',monospace", outline:"none",
                textAlign:"center", boxSizing:"border-box" }} />
          </div>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
        <button onClick={onClose} style={{ background:"#1a1a1a", border:"1px solid #333",
          color:"#888", padding:"7px 18px", borderRadius:6, cursor:"pointer", fontSize:"0.62rem" }}>
          Cancelar</button>
        <button onClick={()=>onSave(form)} style={{ background:T[pillar].bg, border:"none",
          color:"#fff", padding:"7px 18px", borderRadius:6, cursor:"pointer",
          fontSize:"0.62rem", fontWeight:700 }}>Salvar</button>
      </div>
    </Modal>
  );
}

// ─── PILLAR CHART ─────────────────────────────────────────────────────────────
function PillarChart({ kpis }) {
  const [activeKey, setActiveKey] = useState(kpis[0].key);
  const kpi = kpis.find(k=>k.key===activeKey) || kpis[0];
  const last = kpi.data[kpi.data.length-1];
  const onTarget = kpi.higher ? last>=kpi.meta : last<=kpi.meta;
  const data = DAYS.map((d,i)=>({ dia:d, [kpi.key]: kpi.data[i] }));
  return (
    <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:10,
      padding:"12px 14px", marginTop:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div>
          <div style={{ fontSize:"0.5rem", color:"#555", textTransform:"uppercase",
            letterSpacing:2, marginBottom:2 }}>Evolução do Mês</div>
          <div style={{ fontSize:"0.72rem", color:"#ddd", fontWeight:600,
            display:"flex", alignItems:"center", gap:8 }}>
            {kpi.label}
            <span style={{ fontSize:"0.56rem", fontWeight:700,
              color:onTarget?"#22c55e":"#ef4444",
              background:onTarget?"#052e16":"#450a0a",
              padding:"1px 8px", borderRadius:20 }}>
              {onTarget?"✓ NA META":"✗ FORA DA META"}
            </span>
          </div>
        </div>
        {kpis.length>1 && (
          <div style={{ display:"flex", gap:4 }}>
            {kpis.map(k=>(
              <button key={k.key} onClick={()=>setActiveKey(k.key)}
                style={{ background:activeKey===k.key?k.color+"33":"#1a1a1a",
                  border:`1px solid ${activeKey===k.key?k.color:"#2a2a2a"}`,
                  color:activeKey===k.key?k.color:"#555",
                  padding:"3px 8px", borderRadius:4, fontSize:"0.48rem",
                  cursor:"pointer", fontFamily:"inherit" }}>
                {k.label.split(" ").pop()}
              </button>
            ))}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top:5, right:5, left:-28, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
          <XAxis dataKey="dia" tick={{ fill:"#444", fontSize:9 }} tickLine={false} axisLine={false} interval={3}/>
          <YAxis tick={{ fill:"#444", fontSize:9 }} tickLine={false} axisLine={false} />
          <ReferenceLine y={kpi.meta} stroke={kpi.color} strokeDasharray="5 3" strokeWidth={1.5}
            label={{ value:`meta ${kpi.meta}${kpi.unit}`, fill:kpi.color, fontSize:8, position:"insideTopRight" }} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey={kpi.key} name={kpi.label}
            stroke={kpi.color} strokeWidth={2} dot={false}
            activeDot={{ r:4, fill:kpi.color, strokeWidth:0 }} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:4 }}>
        <div style={{ fontSize:"0.44rem", color:"#444", display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:14, height:1.5, background:kpi.color, borderRadius:1 }}/> Realizado
        </div>
        <div style={{ fontSize:"0.44rem", color:"#444", display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:14, borderTop:`1.5px dashed ${kpi.color}`, opacity:0.5 }}/> Meta
        </div>
      </div>
    </div>
  );
}

// ─── EDITABLE TABLE ──────────────────────────────────────────────────────────
function EditableTable({ title, rows, setRows, cols }) {
  return (
    <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:8,
      overflow:"hidden", marginTop:6 }}>
      <div style={{ padding:"6px 10px", borderBottom:"1px solid #1f1f1f",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:"0.5rem", color:"#555", textTransform:"uppercase", letterSpacing:1 }}>{title}</span>
        <button onClick={()=>setRows(r=>[...r, Object.fromEntries(cols.map(c=>[c.key,c.default||""]))])}
          style={{ background:"none", border:"none", color:"#444", fontSize:"0.55rem",
            cursor:"pointer", fontFamily:"inherit" }}>+ linha</button>
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:"#111" }}>
            {cols.map((c,i)=>(
              <th key={i} style={{ padding:"4px 8px", textAlign:"left", fontSize:"0.44rem",
                color:"#555", textTransform:"uppercase", letterSpacing:1,
                borderBottom:"1px solid #1f1f1f" }}>{c.label}</th>
            ))}
            <th style={{ width:24, borderBottom:"1px solid #1f1f1f" }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={i} style={{ borderBottom:i<rows.length-1?"1px solid #141414":"none" }}>
              {cols.map((c,j)=>(
                <td key={j} style={{ padding:"4px 8px" }}>
                  <input value={row[c.key]} onChange={e=>{
                    setRows(r=>r.map((rr,ri)=>ri===i?{...rr,[c.key]:e.target.value}:rr));
                  }} style={{ background:"none", border:"none",
                    color:j===0?"#facc15":"#ccc", fontSize:"0.62rem",
                    fontFamily:j===0?"'DM Mono',monospace":"inherit",
                    fontWeight:j===0?700:400, outline:"none", width:"100%", padding:0 }} />
                </td>
              ))}
              <td style={{ padding:"4px 6px", textAlign:"center" }}>
                <button onClick={()=>setRows(r=>r.filter((_,ri)=>ri!==i))}
                  style={{ background:"none", border:"none", color:"#333",
                    cursor:"pointer", fontSize:"0.7rem", lineHeight:1 }}
                  onMouseEnter={e=>e.target.style.color="#ef4444"}
                  onMouseLeave={e=>e.target.style.color="#333"}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── INFO BOX ────────────────────────────────────────────────────────────────
function InfoBox({ color, title, text }) {
  return (
    <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:8,
      padding:"10px 12px", marginBottom:10, borderLeft:`3px solid ${color}` }}>
      <span style={{ color, fontWeight:700, fontSize:"0.6rem" }}>◈ {title} — </span>
      <span style={{ fontSize:"0.58rem", color:"#777", lineHeight:1.7 }}>{text}</span>
    </div>
  );
}

// ─── PANELS ──────────────────────────────────────────────────────────────────
function PanelS({ kpis, setKpis }) {
  const [editIdx, setEditIdx] = useState(null);
  return (
    <div>
      {editIdx!==null && <KpiEditModal kpi={kpis[editIdx]} pillar="S" onClose={()=>setEditIdx(null)}
        onSave={f=>{ setKpis(k=>k.map((kk,i)=>i===editIdx?f:kk)); setEditIdx(null); }} />}
      <InfoBox color="#ef4444" title="SEGURANÇA"
        text="Monitora acidentes com e sem afastamento. Meta: zero acidentes. Duplo clique no card para editar." />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {kpis.map((k,i)=><KpiCard key={k.key} kpi={k} onEdit={()=>setEditIdx(i)} />)}
      </div>
      <PillarChart kpis={kpis} />
    </div>
  );
}

function PanelQ({ kpis, setKpis, top3, setTop3 }) {
  const [editIdx, setEditIdx] = useState(null);
  return (
    <div>
      {editIdx!==null && <KpiEditModal kpi={kpis[editIdx]} pillar="Q" onClose={()=>setEditIdx(null)}
        onSave={f=>{ setKpis(k=>k.map((kk,i)=>i===editIdx?f:kk)); setEditIdx(null); }} />}
      <InfoBox color="#60a5fa" title="QUALIDADE"
        text="Reclamações CQ, ocorrências em atraso e retrabalho. Selecione o indicador nos botões do gráfico." />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {kpis.map((k,i)=><KpiCard key={k.key} kpi={k} onEdit={()=>setEditIdx(i)} />)}
      </div>
      <PillarChart kpis={kpis} />
      <EditableTable title="▼ Estrago Top 3" rows={top3} setRows={setTop3}
        cols={[{key:"rank",label:"#",default:"4"},{key:"linha",label:"Linha",default:"Nova linha"},
               {key:"ant",label:"Ant.",default:"0%"},{key:"cur",label:"Atual",default:"0%"}]} />
    </div>
  );
}

function PanelC({ kpis, setKpis, linhasFora, setLinhasFora, estragoFora, setEstragoFora }) {
  const [editIdx, setEditIdx] = useState(null);
  const eficData = kpis.map(k=>({
    name:k.label.replace("Eficiência ","").replace("Efic. ",""),
    v:n(k.cur), meta:k.meta, color:k.color
  }));
  return (
    <div>
      {editIdx!==null && <KpiEditModal kpi={kpis[editIdx]} pillar="C" onClose={()=>setEditIdx(null)}
        onSave={f=>{ setKpis(k=>k.map((kk,i)=>i===editIdx?f:kk)); setEditIdx(null); }} />}
      <InfoBox color="#34d399" title="CUSTO / EFICIÊNCIA"
        text="Eficiências por área, linhas e estragos fora da meta. Gráfico de barras compara atual vs meta." />
      <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:10,
        padding:"12px 14px", marginBottom:8 }}>
        <div style={{ fontSize:"0.5rem", color:"#555", textTransform:"uppercase",
          letterSpacing:2, marginBottom:8 }}>Eficiências — Atual vs Meta</div>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={eficData} margin={{ top:0, right:5, left:-30, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
            <XAxis dataKey="name" tick={{ fill:"#666", fontSize:9 }} tickLine={false} axisLine={false} />
            <YAxis domain={[70,100]} tick={{ fill:"#444", fontSize:9 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background:"#111", border:"1px solid #333",
              borderRadius:6, fontSize:"0.65rem" }} cursor={{ fill:"#ffffff08" }} />
            <Bar dataKey="v" name="Atual" radius={[3,3,0,0]}>
              {eficData.map((e,i)=><Cell key={i} fill={e.v>=e.meta?"#34d399":"#ef4444"} />)}
            </Bar>
            <ReferenceLine y={85} stroke="#34d399" strokeDasharray="4 3" strokeWidth={1}
              label={{ value:"Meta 85%", fill:"#34d399", fontSize:8, position:"insideTopRight" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
        {kpis.map((k,i)=><KpiCard key={k.key} kpi={k} onEdit={()=>setEditIdx(i)} />)}
      </div>
      <PillarChart kpis={kpis} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
        <EditableTable title="Linhas — Desempenho Fora da Meta" rows={linhasFora} setRows={setLinhasFora}
          cols={[{key:"linha",label:"Linha",default:"P0X"},{key:"ant",label:"Ant.",default:"0%"},
                 {key:"cur",label:"Atual",default:"0%"}]} />
        <EditableTable title="Estrago por Linha Fora da Meta" rows={estragoFora} setRows={setEstragoFora}
          cols={[{key:"linha",label:"Linha",default:"Nova"},{key:"ant",label:"Ant.%",default:"0"},
                 {key:"cur",label:"Atual%",default:"0"}]} />
      </div>
    </div>
  );
}

function PanelD({ kpis, setKpis }) {
  const [editIdx, setEditIdx] = useState(null);
  return (
    <div>
      {editIdx!==null && <KpiEditModal kpi={kpis[editIdx]} pillar="D" onClose={()=>setEditIdx(null)}
        onSave={f=>{ setKpis(k=>k.map((kk,i)=>i===editIdx?f:kk)); setEditIdx(null); }} />}
      <InfoBox color="#fbbf24" title="ENTREGA"
        text="Cumprimento de prazos e lead time de litografia. Gráfico mostra evolução diária do atendimento no prazo." />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {kpis.map((k,i)=><KpiCard key={k.key} kpi={k} onEdit={()=>setEditIdx(i)} />)}
      </div>
      <PillarChart kpis={kpis} />
    </div>
  );
}

function PanelP({ kpis, setKpis, turnos, setTurnos }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editTurnos, setEditTurnos] = useState(false);
  const [tmpTurnos, setTmpTurnos] = useState({...turnos});
  return (
    <div>
      {editIdx!==null && <KpiEditModal kpi={kpis[editIdx]} pillar="P" onClose={()=>setEditIdx(null)}
        onSave={f=>{ setKpis(k=>k.map((kk,i)=>i===editIdx?f:kk)); setEditIdx(null); }} />}
      {editTurnos && (
        <Modal title="Editar Pessoas por Turno" onClose={()=>setEditTurnos(false)}>
          {["A","B","C"].map(t=>(
            <Field key={t} label={`Turno ${t} — nº de pessoas`} type="number"
              value={tmpTurnos[t]} onChange={v=>setTmpTurnos(p=>({...p,[t]:parseInt(v)||0}))} />
          ))}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
            <button onClick={()=>setEditTurnos(false)} style={{ background:"#1a1a1a",
              border:"1px solid #333", color:"#888", padding:"7px 18px",
              borderRadius:6, cursor:"pointer", fontSize:"0.62rem" }}>Cancelar</button>
            <button onClick={()=>{ setTurnos(tmpTurnos); setEditTurnos(false); }}
              style={{ background:T.P.bg, border:"none", color:"#fff", padding:"7px 18px",
                borderRadius:6, cursor:"pointer", fontSize:"0.62rem", fontWeight:700 }}>Salvar</button>
          </div>
        </Modal>
      )}
      <InfoBox color="#c084fc" title="PESSOAS"
        text="Absenteísmo, headcount por turno e vagas em aberto. Controle de faltas impacta a capacidade produtiva." />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        {kpis.map((k,i)=><KpiCard key={k.key} kpi={k} onEdit={()=>setEditIdx(i)} />)}
      </div>
      <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:8,
        padding:"10px 12px", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ fontSize:"0.5rem", color:"#555", textTransform:"uppercase", letterSpacing:1 }}>Pessoas por Turno</div>
          <button onClick={()=>{ setTmpTurnos({...turnos}); setEditTurnos(true); }}
            style={{ background:"none", border:"none", color:"#444", fontSize:"0.62rem",
              cursor:"pointer", fontFamily:"inherit" }}>✎ Editar</button>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {["A","B","C"].map(t=>(
            <div key={t} style={{ flex:1, background:"#111", border:"1px solid #2a2a2a",
              borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
              <div style={{ fontSize:"0.46rem", color:"#555", textTransform:"uppercase",
                letterSpacing:1, marginBottom:4 }}>Turno {t}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"1.5rem",
                fontWeight:700, color:"#f0f0f0" }}>{turnos[t]}</div>
              <div style={{ fontSize:"0.4rem", color:"#444", marginTop:2 }}>pessoas</div>
            </div>
          ))}
        </div>
      </div>
      <PillarChart kpis={kpis} />
    </div>
  );
}

// ─── ACTIONS TABLE ───────────────────────────────────────────────────────────
function ActionsTable({ actions, setActions }) {
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({});
  const add = () => setActions(a=>[...a,{pilar:"S",oque:"Descreva a ação...",quem:"Responsável",quando:"DD/Mmm",status:0}]);
  const del = i => setActions(a=>a.filter((_,j)=>j!==i));
  const cyclePilar = i => { const idx=PILLARS.indexOf(actions[i].pilar);
    setActions(a=>a.map((r,j)=>j===i?{...r,pilar:PILLARS[(idx+1)%PILLARS.length]}:r)); };
  const cycleStatus = i => setActions(a=>a.map((r,j)=>j===i?{...r,status:(r.status+1)%3}:r));
  const openEdit = i => { setForm({...actions[i]}); setEditRow(i); };
  const saveEdit = () => { setActions(a=>a.map((r,j)=>j===editRow?form:r)); setEditRow(null); };

  return (
    <>
      {editRow!==null && (
        <Modal title={`Editar Ação #${String(editRow+1).padStart(2,"0")}`} onClose={()=>setEditRow(null)}>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:"0.52rem", color:"#666", textTransform:"uppercase",
              letterSpacing:1, display:"block", marginBottom:6 }}>Pilar</label>
            <div style={{ display:"flex", gap:6 }}>
              {PILLARS.map(p=>(
                <button key={p} onClick={()=>setForm(f=>({...f,pilar:p}))}
                  style={{ flex:1, background:form.pilar===p?T[p].bg+"44":"#1a1a1a",
                    border:`1px solid ${form.pilar===p?T[p].bg:"#333"}`,
                    color:form.pilar===p?T[p].text:"#666",
                    padding:"6px 4px", borderRadius:6, cursor:"pointer",
                    fontSize:"0.65rem", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{p}</button>
              ))}
            </div>
          </div>
          <Field label="O Que Fazer" value={form.oque} onChange={v=>setForm(f=>({...f,oque:v}))} />
          <Field label="Quem (Responsável)" value={form.quem} onChange={v=>setForm(f=>({...f,quem:v}))} />
          <Field label="Quando (prazo)" value={form.quando} onChange={v=>setForm(f=>({...f,quando:v}))} />
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:"0.52rem", color:"#666", textTransform:"uppercase",
              letterSpacing:1, display:"block", marginBottom:6 }}>Status</label>
            <div style={{ display:"flex", gap:6 }}>
              {STATUS_CFG.map((s,i)=>(
                <button key={i} onClick={()=>setForm(f=>({...f,status:i}))}
                  style={{ flex:1, background:form.status===i?s.bg:"#1a1a1a",
                    border:`1px solid ${form.status===i?s.color+"66":"#333"}`,
                    color:form.status===i?s.color:"#555",
                    padding:"6px 4px", borderRadius:6, cursor:"pointer",
                    fontSize:"0.55rem", fontFamily:"inherit" }}>{s.icon} {s.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
            <button onClick={()=>setEditRow(null)} style={{ background:"#1a1a1a",
              border:"1px solid #333", color:"#888", padding:"7px 18px",
              borderRadius:6, cursor:"pointer", fontSize:"0.62rem" }}>Cancelar</button>
            <button onClick={saveEdit} style={{ background:T[form.pilar].bg, border:"none",
              color:"#fff", padding:"7px 18px", borderRadius:6,
              cursor:"pointer", fontSize:"0.62rem", fontWeight:700 }}>Salvar</button>
          </div>
        </Modal>
      )}
      <div style={{ background:"#0c0c0c", border:"1px solid #2a2a2a", borderRadius:10, overflow:"hidden" }}>
        <div style={{ background:"#111", padding:"9px 14px", borderBottom:"1px solid #2a2a2a",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.82rem", fontWeight:700,
              letterSpacing:3, textTransform:"uppercase", color:"#fff" }}>📋 Plano de Ações</span>
            <span style={{ fontSize:"0.48rem", color:"#444", marginLeft:12 }}>
              ✎ ícone de lápis para editar · clique no pilar/status para alternar
            </span>
          </div>
          <button onClick={add} style={{ background:"#1a1a1a", border:"1px solid #333",
            color:"#888", padding:"4px 12px", borderRadius:4, cursor:"pointer",
            fontSize:"0.55rem", fontFamily:"inherit", letterSpacing:1, textTransform:"uppercase" }}>
            + Adicionar</button>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.6rem" }}>
          <thead>
            <tr style={{ background:"#0e0e0e" }}>
              {["#","Pilar","O Que Fazer","Quem","Quando","Status",""].map((h,i)=>(
                <th key={i} style={{ padding:"5px 10px", textAlign:"left", fontSize:"0.46rem",
                  fontWeight:700, textTransform:"uppercase", letterSpacing:1,
                  color:"#444", borderBottom:"1px solid #1f1f1f",
                  width:["28px","58px","auto","110px","80px","130px","38px"][i] }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actions.map((a,i)=>{
              const th=T[a.pilar]; const st=STATUS_CFG[a.status];
              return (
                <tr key={i} style={{ borderBottom:"1px solid #141414", transition:"background 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#111"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"6px 10px", color:"#333", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>
                    {String(i+1).padStart(2,"0")}
                  </td>
                  <td style={{ padding:"6px 10px" }}>
                    <span onClick={()=>cyclePilar(i)}
                      style={{ background:th.bg+"33", color:th.text, border:`1px solid ${th.bg}55`,
                        padding:"2px 8px", borderRadius:4, fontSize:"0.5rem", fontWeight:700,
                        letterSpacing:1, cursor:"pointer", userSelect:"none", textTransform:"uppercase" }}>
                      {a.pilar}
                    </span>
                  </td>
                  <td style={{ padding:"6px 10px", color:"#ccc" }}>{a.oque}</td>
                  <td style={{ padding:"6px 10px", color:"#aaa" }}>{a.quem}</td>
                  <td style={{ padding:"6px 10px", color:"#facc15",
                    fontFamily:"'DM Mono',monospace" }}>{a.quando}</td>
                  <td style={{ padding:"6px 10px" }}>
                    <span onClick={()=>cycleStatus(i)}
                      style={{ cursor:"pointer", userSelect:"none", display:"flex",
                        alignItems:"center", gap:5, background:st.bg,
                        borderRadius:4, padding:"3px 8px", width:"fit-content" }}>
                      <span style={{ color:st.color, fontSize:"0.48rem" }}>{st.icon}</span>
                      <span style={{ color:st.color, fontSize:"0.52rem", fontWeight:600 }}>{st.label}</span>
                    </span>
                  </td>
                  <td style={{ padding:"6px 8px", textAlign:"center" }}>
                    <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                      <button onClick={()=>openEdit(i)}
                        style={{ background:"none", border:"none", color:"#444",
                          cursor:"pointer", fontSize:"0.75rem", lineHeight:1, padding:"2px" }}
                        onMouseEnter={e=>e.target.style.color="#aaa"}
                        onMouseLeave={e=>e.target.style.color="#444"}>✎</button>
                      <button onClick={()=>del(i)}
                        style={{ background:"none", border:"none", color:"#333",
                          cursor:"pointer", fontSize:"0.8rem", lineHeight:1, padding:"2px" }}
                        onMouseEnter={e=>e.target.style.color="#ef4444"}
                        onMouseLeave={e=>e.target.style.color="#333"}>×</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── HEADER EDIT ─────────────────────────────────────────────────────────────
function HeaderEdit({ header, setHeader }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({...header});
  return (
    <>
      {editing && (
        <Modal title="Editar Cabeçalho" onClose={()=>setEditing(false)}>
          <Field label="Área / Setor"   value={form.area}     onChange={v=>setForm(f=>({...f,area:v}))} />
          <Field label="Responsável"    value={form.resp}     onChange={v=>setForm(f=>({...f,resp:v}))} />
          <Field label="Mês Anterior"   value={form.mesAnt}   onChange={v=>setForm(f=>({...f,mesAnt:v}))} />
          <Field label="Mês Atual"      value={form.mesAtual} onChange={v=>setForm(f=>({...f,mesAtual:v}))} />
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
            <button onClick={()=>setEditing(false)} style={{ background:"#1a1a1a",
              border:"1px solid #333", color:"#888", padding:"7px 18px",
              borderRadius:6, cursor:"pointer", fontSize:"0.62rem" }}>Cancelar</button>
            <button onClick={()=>{ setHeader(form); setEditing(false); }}
              style={{ background:"#333", border:"none", color:"#fff",
                padding:"7px 18px", borderRadius:6, cursor:"pointer",
                fontSize:"0.62rem", fontWeight:700 }}>Salvar</button>
          </div>
        </Modal>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ fontSize:"0.56rem", color:"#555", textAlign:"right", lineHeight:2 }}>
          <span style={{ color:"#555" }}>Área: </span><span style={{ color:"#ccc" }}>{header.area}</span>
          {"  ·  "}
          <span style={{ color:"#555" }}>Resp.: </span><span style={{ color:"#ccc" }}>{header.resp}</span>
          {"  ·  "}
          <span style={{ color:"#555" }}>Ant.: </span><span style={{ color:"#facc15" }}>{header.mesAnt}</span>
          {"  ·  "}
          <span style={{ color:"#555" }}>Atual: </span><span style={{ color:"#22c55e" }}>{header.mesAtual}</span>
        </div>
        <button onClick={()=>{ setForm({...header}); setEditing(true); }}
          style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#555",
            padding:"3px 9px", borderRadius:4, cursor:"pointer", fontSize:"0.5rem",
            fontFamily:"inherit", letterSpacing:1, whiteSpace:"nowrap" }}
          onMouseEnter={e=>e.target.style.color="#aaa"}
          onMouseLeave={e=>e.target.style.color="#555"}>✎ Editar</button>
      </div>
    </>
  );
}

// ─── SAVE INDICATOR ──────────────────────────────────────────────────────────
function SaveBadge({ savedAt }) {
  if (!savedAt) return null;
  return (
    <div style={{ fontSize:"0.44rem", color:"#22c55e", display:"flex", alignItems:"center", gap:4,
      background:"#052e16", border:"1px solid #166534", borderRadius:4, padding:"2px 7px" }}>
      <span>✓</span>
      <span>Salvo {savedAt}</span>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function SQCDP() {
  const saved = loadState();
  const init = saved || DEFAULT;

  const [tab, setTab]               = useState("S");
  const [header, setHeader]         = useState(init.header);
  const [kpisS, setKpisS]           = useState(init.kpis.S);
  const [kpisQ, setKpisQ]           = useState(init.kpis.Q);
  const [kpisC, setKpisC]           = useState(init.kpis.C);
  const [kpisD, setKpisD]           = useState(init.kpis.D);
  const [kpisP, setKpisP]           = useState(init.kpis.P);
  const [top3, setTop3]             = useState(init.top3);
  const [linhasFora, setLinhasFora] = useState(init.linhasFora);
  const [estragoFora,setEstragoFora]= useState(init.estragoFora);
  const [turnos, setTurnos]         = useState(init.turnos);
  const [actions, setActions]       = useState(init.actions);
  const [savedAt, setSavedAt]       = useState(saved ? "sessão anterior" : null);
  const [showReset, setShowReset]   = useState(false);

  // ── Auto-save whenever any state changes ──────────────────────────────────
  useEffect(() => {
    const state = { header, kpis:{S:kpisS,Q:kpisQ,C:kpisC,D:kpisD,P:kpisP},
      top3, linhasFora, estragoFora, turnos, actions };
    saveState(state);
    const now = new Date();
    setSavedAt(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`);
  }, [header, kpisS, kpisQ, kpisC, kpisD, kpisP, top3, linhasFora, estragoFora, turnos, actions]);

  // ── Export JSON ────────────────────────────────────────────────────────────
  const exportData = () => {
    const state = { header, kpis:{S:kpisS,Q:kpisQ,C:kpisC,D:kpisD,P:kpisP},
      top3, linhasFora, estragoFora, turnos, actions };
    const blob = new Blob([JSON.stringify(state,null,2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sqcdp_${header.mesAtual.replace("/","_")}.json`;
    a.click();
  };

  // ── Import JSON ────────────────────────────────────────────────────────────
  const importData = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const s = JSON.parse(ev.target.result);
        if (s.header)      setHeader(s.header);
        if (s.kpis?.S)     setKpisS(s.kpis.S);
        if (s.kpis?.Q)     setKpisQ(s.kpis.Q);
        if (s.kpis?.C)     setKpisC(s.kpis.C);
        if (s.kpis?.D)     setKpisD(s.kpis.D);
        if (s.kpis?.P)     setKpisP(s.kpis.P);
        if (s.top3)        setTop3(s.top3);
        if (s.linhasFora)  setLinhasFora(s.linhasFora);
        if (s.estragoFora) setEstragoFora(s.estragoFora);
        if (s.turnos)      setTurnos(s.turnos);
        if (s.actions)     setActions(s.actions);
      } catch { alert("Arquivo inválido."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const doReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHeader(DEFAULT.header); setKpisS(DEFAULT.kpis.S); setKpisQ(DEFAULT.kpis.Q);
    setKpisC(DEFAULT.kpis.C); setKpisD(DEFAULT.kpis.D); setKpisP(DEFAULT.kpis.P);
    setTop3(DEFAULT.top3); setLinhasFora(DEFAULT.linhasFora);
    setEstragoFora(DEFAULT.estragoFora); setTurnos(DEFAULT.turnos);
    setActions(DEFAULT.actions); setShowReset(false);
  };

  const importRef = useRef();

  const panels = {
    S: <PanelS kpis={kpisS} setKpis={setKpisS} />,
    Q: <PanelQ kpis={kpisQ} setKpis={setKpisQ} top3={top3} setTop3={setTop3} />,
    C: <PanelC kpis={kpisC} setKpis={setKpisC} linhasFora={linhasFora} setLinhasFora={setLinhasFora}
               estragoFora={estragoFora} setEstragoFora={setEstragoFora} />,
    D: <PanelD kpis={kpisD} setKpis={setKpisD} />,
    P: <PanelP kpis={kpisP} setKpis={setKpisP} turnos={turnos} setTurnos={setTurnos} />,
  };

  return (
    <div style={{ background:"#080808", color:"#f0f0f0", fontFamily:"'Barlow',sans-serif",
      height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* RESET CONFIRM */}
      {showReset && (
        <Modal title="Apagar todos os dados?" onClose={()=>setShowReset(false)}>
          <p style={{ fontSize:"0.65rem", color:"#999", marginBottom:16, lineHeight:1.8 }}>
            Isso apagará <strong style={{ color:"#f0f0f0" }}>todos</strong> os dados salvos e voltará
            ao exemplo inicial. Esta ação não pode ser desfeita.
          </p>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
            <button onClick={()=>setShowReset(false)} style={{ background:"#1a1a1a",
              border:"1px solid #333", color:"#888", padding:"7px 18px",
              borderRadius:6, cursor:"pointer", fontSize:"0.62rem" }}>Cancelar</button>
            <button onClick={doReset} style={{ background:"#7f1d1d", border:"none",
              color:"#fca5a5", padding:"7px 18px", borderRadius:6,
              cursor:"pointer", fontSize:"0.62rem", fontWeight:700 }}>Apagar tudo</button>
          </div>
        </Modal>
      )}

      {/* HEADER */}
      <div style={{ background:"#0e0e0e", borderBottom:"1px solid #1e1e1e",
        padding:"6px 14px", display:"flex", alignItems:"center",
        justifyContent:"space-between", flexShrink:0, gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", display:"flex", gap:2 }}>
            {PILLARS.map(l=>(
              <span key={l} style={{ background:T[l].bg, color:"#fff",
                padding:"2px 7px", borderRadius:4, fontSize:"1rem", fontWeight:700 }}>{l}</span>
            ))}
          </div>
          <div style={{ borderLeft:"1px solid #2a2a2a", paddingLeft:10 }}>
            <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#777",
              letterSpacing:3, textTransform:"uppercase" }}>Gestão Diária</div>
            <div style={{ fontSize:"0.44rem", color:"#3a3a3a", marginTop:1 }}>
              Quadro de Acompanhamento de Indicadores
            </div>
          </div>
        </div>

        {/* CENTER: save badge */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <SaveBadge savedAt={savedAt} />
        </div>

        {/* RIGHT: header info + actions */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <HeaderEdit header={header} setHeader={setHeader} />
          <div style={{ width:1, height:20, background:"#2a2a2a" }} />
          {/* Export */}
          <button onClick={exportData} title="Exportar dados como JSON"
            style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#666",
              padding:"3px 9px", borderRadius:4, cursor:"pointer", fontSize:"0.5rem",
              fontFamily:"inherit", letterSpacing:1, whiteSpace:"nowrap" }}
            onMouseEnter={e=>e.target.style.color="#aaa"}
            onMouseLeave={e=>e.target.style.color="#666"}>⬇ Exportar</button>
          {/* Import */}
          <button onClick={()=>importRef.current.click()} title="Importar dados de um JSON"
            style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#666",
              padding:"3px 9px", borderRadius:4, cursor:"pointer", fontSize:"0.5rem",
              fontFamily:"inherit", letterSpacing:1, whiteSpace:"nowrap" }}
            onMouseEnter={e=>e.target.style.color="#aaa"}
            onMouseLeave={e=>e.target.style.color="#666"}>⬆ Importar</button>
          <input ref={importRef} type="file" accept=".json" onChange={importData}
            style={{ display:"none" }} />
          {/* Reset */}
          <button onClick={()=>setShowReset(true)} title="Apagar todos os dados"
            style={{ background:"transparent", border:"1px solid #2a2a2a", color:"#444",
              padding:"3px 9px", borderRadius:4, cursor:"pointer", fontSize:"0.5rem",
              fontFamily:"inherit", letterSpacing:1, whiteSpace:"nowrap" }}
            onMouseEnter={e=>e.target.style.color="#ef4444"}
            onMouseLeave={e=>e.target.style.color="#444"}>↺ Reset</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex", borderBottom:"2px solid #1a1a1a", flexShrink:0 }}>
        {PILLARS.map(l=>{
          const active=tab===l; const th=T[l];
          return (
            <button key={l} onClick={()=>setTab(l)} style={{ flex:1, padding:"9px 8px",
              border:"none", cursor:"pointer",
              background:active?th.bg+"22":"transparent",
              borderBottom:active?`3px solid ${th.bg}`:"3px solid transparent",
              transition:"all 0.2s", fontFamily:"'Barlow',sans-serif", marginBottom:-2 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"1.3rem",
                fontWeight:700, color:active?"#fff":"#3a3a3a", lineHeight:1 }}>{l}</div>
              <div style={{ fontSize:"0.5rem", fontWeight:700, letterSpacing:1,
                color:active?th.text:"#2e2e2e", textTransform:"uppercase", marginTop:2 }}>{th.label}</div>
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px",
        display:"flex", flexDirection:"column", gap:0 }}>
        {panels[tab]}
        <div style={{ marginTop:14 }}>
          <ActionsTable actions={actions} setActions={setActions} />
        </div>
        <div style={{ marginTop:10, padding:"8px 0", borderTop:"1px solid #1a1a1a",
          fontSize:"0.45rem", color:"#333", textAlign:"center" }}>
          Os dados são salvos automaticamente no seu navegador (localStorage). Use ⬇ Exportar para fazer backup em arquivo JSON.
        </div>
      </div>
    </div>
  );
}
