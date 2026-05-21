import { useState, useEffect, useCallback, useRef } from "react";
import KpiCard       from "./components/KpiCard.jsx";
import PilarSection  from "./components/PilarSection.jsx";
import PilarCharts   from "./components/PilarCharts.jsx";
import EntradaDados  from "./components/EntradaDados.jsx";
import { saveAll, loadAll, clearAll } from "./storage.js";
import { makeDefault, DEFAULT_METAS, PILARES } from "./constants.js";

// ─── Helpers locais ───────────────────────────────────────────────────────────
const arrLast = a => (a?.length ? a[a.length - 1] : 0);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Estado ──
  const [data,       setDataRaw]   = useState(makeDefault);
  const [metas,      setMetasRaw]  = useState(DEFAULT_METAS);
  const [activeTab,  setActiveTab] = useState("dashboard");
  const [showMetas,  setShowMetas] = useState(false);
  const [editMonth,  setEditMonth] = useState(11);
  const [editDay,    setEditDay]   = useState(0);
  const [dataMode,   setDataMode]  = useState("monthly");
  const [loaded,     setLoaded]    = useState(false);   // mostra indicador na 1ª carga
  const [saveStatus, setSaveStatus] = useState("");     // "Salvo ✓"

  // ── Carrega persistência na montagem ──
  useEffect(() => {
    const saved = loadAll();
    if (saved) {
      if (saved.data)  setDataRaw(saved.data);
      if (saved.metas) setMetasRaw(saved.metas);
      setLoaded(true);
    }
  }, []);

  // ── Wrapper: salva sempre que data ou metas mudam ──
  const saveTimer = useRef(null);

  const setData = useCallback(updater => {
    setDataRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // debounce save 800ms para não escrever no localStorage a cada tecla
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setMetasRaw(m => { saveAll(next, m); return m; });
        setSaveStatus("Salvo ✓");
        setTimeout(() => setSaveStatus(""), 2000);
      }, 800);
      return next;
    });
  }, []);

  const setMetas = useCallback(updater => {
    setMetasRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setDataRaw(d => { saveAll(d, next); return d; });
        setSaveStatus("Salvo ✓");
        setTimeout(() => setSaveStatus(""), 2000);
      }, 800);
      return next;
    });
  }, []);

  const handleReset = () => {
    if (!window.confirm("Apagar todos os dados salvos e reiniciar? Esta ação não pode ser desfeita.")) return;
    clearAll();
    setDataRaw(makeDefault());
    setMetasRaw(DEFAULT_METAS);
  };

  // ── Updaters ──
  const updateMonthly = (f, mi, v) =>
    setData(d => { const a = [...d[f]]; a[mi] = isNaN(+v) ? v : +v; return { ...d, [f]: a }; });
  const updateDaily = (f, di, v) =>
    setData(d => { const a = [...d[f]]; a[di] = +v || 0; return { ...d, [f]: a }; });
  const updatePerda = (mi, pi, v) =>
    setData(d => { const t = d.top5Perdas.map(r => [...r]); t[mi][pi] = +v || 0; return { ...d, top5Perdas: t }; });

  // ── Top 5 do mês mais recente ──
  const top5 = data.top5Perdas[11]
    .map((v, i) => ({ label: data.top5Labels[i], value: v }))
    .sort((a, b) => b.value - a.value);
  const maxP = Math.max(...top5.map(p => p.value), 1);

  const L = arrLast;

  // ── Estilos base ──
  const inp = {
    background: "#0f1120", border: "1px solid #2a2d45", color: "#f1f5f9",
    borderRadius: 6, padding: "5px 8px", fontSize: 13,
    fontFamily: "'DM Mono',monospace", width: "100%",
  };
  const tab = t => ({
    padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: 12, fontFamily: "inherit",
    background: activeTab === t ? "#6366f1" : "#1a1d2e",
    color: activeTab === t ? "#fff" : "#8b8fa8",
    transition: "all .2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d1a", color: "#f1f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; background: #0b0d1a; }
        ::-webkit-scrollbar-thumb { background: #2a2d45; border-radius: 3px; }
        select option { background: #1a1d2e; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        background: "linear-gradient(90deg,#10122a,#1a1d2e)",
        borderBottom: "1px solid #1e2140",
        padding: "12px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, fontSize: 16,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>📊</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>BI Industrial</div>
            <div style={{ fontSize: 10, color: "#6366f1" }}>Dashboard de Indicadores</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Indicador de persistência */}
          {loaded && (
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
              💾 Dados restaurados
            </span>
          )}
          {saveStatus && (
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
              {saveStatus}
            </span>
          )}
          <button onClick={handleReset}
            style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 8,
              padding: "7px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            🗑 Reset
          </button>
          <button onClick={() => setShowMetas(v => !v)}
            style={{ background: showMetas ? "#f59e0b" : "#374151", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit" }}>
            ⚙ Metas
          </button>
        </div>
      </div>

      {/* ── Painel de Metas ── */}
      {showMetas && (
        <div style={{ background: "#12152a", borderBottom: "1px solid #1e2140",
          padding: "14px 24px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: 12 }}>⚙ Configurar Metas</span>
          {[
            { k: "reclamacoesClientes", l: "Reclamações Clientes (máx)" },
            { k: "eficienciaLMO",       l: "Efic. LMO (%)" },
            { k: "eficienciaLito",      l: "Efic. Lito (%)" },
            { k: "atendimentoPrazo",    l: "Atend. Prazo (%)" },
            { k: "absenteismo",         l: "Absenteísmo (%)" },
            { k: "diasSemAcidente",     l: "Dias s/ Acidente" },
            { k: "horasTreinamento",    l: "Hrs Treinamento" },
          ].map(({ k, l }) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 10, color: "#8b8fa8" }}>{l}</span>
              <input type="number" value={metas[k]}
                onChange={e => setMetas(m => ({ ...m, [k]: +e.target.value }))}
                style={{ ...inp, width: 90, fontSize: 12 }} />
            </label>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: "12px 24px 0", display: "flex", gap: 8 }}>
        {[{ id: "dashboard", l: "📊 Dashboard" }, { id: "entrada", l: "✏️ Entrada de Dados" }].map(t => (
          <button key={t.id} style={tab(t.id)} onClick={() => setActiveTab(t.id)}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding: "18px 24px 48px" }}>

        {/* ══ DASHBOARD ══ */}
        {activeTab === "dashboard" && (
          <div>

            {/* SEGURANÇA */}
            <PilarSection pilarDef={PILARES[0]} data={data} onImport={setData}
              charts={
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <PilarCharts title="Acid. c/ Afastamento" color="#ef4444"
                    monthlyData={data.acidenteComAfastamento} dailyData={data.d_acidenteComAfastamento} higherIsBetter={false} />
                  <PilarCharts title="Acid. s/ Afastamento" color="#f97316"
                    monthlyData={data.acidenteSemAfastamento} dailyData={data.d_acidenteSemAfastamento} higherIsBetter={false} />
                  <PilarCharts title="Dias sem Acidente" color="#22c55e"
                    monthlyData={data.diasSemAcidente} dailyData={data.d_diasSemAcidente}
                    goal={metas.diasSemAcidente} higherIsBetter />
                </div>
              }>
              <KpiCard title="Acid. c/ Afastamento"  value={L(data.acidenteComAfastamento)}
                monthlyData={data.acidenteComAfastamento} color="#ef4444" higherIsBetter={false} />
              <KpiCard title="Acid. s/ Afastamento"  value={L(data.acidenteSemAfastamento)}
                monthlyData={data.acidenteSemAfastamento} color="#f97316" higherIsBetter={false} />
              <KpiCard title="Dias sem Acidente"      value={L(data.diasSemAcidente)}
                monthlyData={data.diasSemAcidente} color="#22c55e" goal={metas.diasSemAcidente} higherIsBetter />
            </PilarSection>

            {/* QUALIDADE */}
            <PilarSection pilarDef={PILARES[1]} data={data} onImport={setData}
              charts={
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <PilarCharts title="Reclamações Clientes" color="#3b82f6"
                    monthlyData={data.reclamacoesClientes} dailyData={data.d_reclamacoesClientes}
                    goal={metas.reclamacoesClientes} higherIsBetter={false} />
                  <PilarCharts title="Estoque no CQ" color="#0ea5e9"
                    monthlyData={data.estoqueCQ} dailyData={data.d_estoqueCQ} higherIsBetter={false} />
                  <PilarCharts title="Reclamações Atrasadas" color="#f59e0b"
                    monthlyData={data.reclamacoesAtrasadas} dailyData={data.d_reclamacoesAtrasadas} higherIsBetter={false} />
                </div>
              }>
              <KpiCard title="Reclamações Clientes"  value={L(data.reclamacoesClientes)}
                monthlyData={data.reclamacoesClientes} color="#3b82f6"
                goal={metas.reclamacoesClientes} higherIsBetter={false} />
              <KpiCard title="Estoque Material CQ"   value={L(data.estoqueCQ)}
                monthlyData={data.estoqueCQ} color="#0ea5e9" higherIsBetter={false} />
              <KpiCard title="Reclamações Atrasadas" value={L(data.reclamacoesAtrasadas)}
                monthlyData={data.reclamacoesAtrasadas} color="#f59e0b" higherIsBetter={false}
                extra={`Resp.: ${data.responsavelReclamacoes[11] || "–"}`} />
            </PilarSection>

            {/* CUSTO / EFICIÊNCIA */}
            <PilarSection pilarDef={PILARES[2]} data={data} onImport={setData}
              charts={
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <PilarCharts title="Eficiência LMO" color="#f59e0b" unit="%"
                    monthlyData={data.eficienciaLMO} dailyData={data.d_eficienciaLMO}
                    goal={metas.eficienciaLMO} higherIsBetter />
                  <PilarCharts title="Eficiência Litografia" color="#fbbf24" unit="%"
                    monthlyData={data.eficienciaLito} dailyData={data.d_eficienciaLito}
                    goal={metas.eficienciaLito} higherIsBetter />
                </div>
              }>
              <KpiCard title="Eficiência LMO"        value={L(data.eficienciaLMO)} unit="%"
                monthlyData={data.eficienciaLMO} color="#f59e0b" goal={metas.eficienciaLMO} higherIsBetter />
              <KpiCard title="Eficiência Litografia"  value={L(data.eficienciaLito)} unit="%"
                monthlyData={data.eficienciaLito} color="#fbbf24" goal={metas.eficienciaLito} higherIsBetter />
              {/* Top 5 */}
              <div style={{ gridColumn: "1 / -1", background: "#12152a", border: "1px solid #1e2140", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: "#8b8fa8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  🏆 Top 5 Perdas – Mês Atual
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {top5.map((p, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span>{i + 1}º {p.label}</span>
                        <span style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{p.value}</span>
                      </div>
                      <div style={{ height: 5, background: "#1e2140", borderRadius: 3 }}>
                        <div style={{
                          height: "100%", borderRadius: 3, transition: "width .5s",
                          width: `${(p.value / maxP) * 100}%`,
                          background: ["#ef4444","#f97316","#f59e0b","#6366f1","#8b5cf6"][i],
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PilarSection>

            {/* ENTREGAS */}
            <PilarSection pilarDef={PILARES[3]} data={data} onImport={setData}
              charts={
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <PilarCharts title="Atendimento no Prazo" color="#22c55e" unit="%"
                    monthlyData={data.atendimentoPrazo} dailyData={data.d_atendimentoPrazo}
                    goal={metas.atendimentoPrazo} higherIsBetter />
                  <PilarCharts title="Lead Time Litografia" color="#10b981" unit=" dias"
                    monthlyData={data.leadTimeLito} dailyData={data.d_leadTimeLito} higherIsBetter={false} />
                  <PilarCharts title="Estoque Acabado" color="#059669"
                    monthlyData={data.estoqueAcabado} dailyData={data.d_estoqueAcabado} higherIsBetter={false} />
                  <PilarCharts title="Estoque Litografado" color="#34d399"
                    monthlyData={data.estoqueLitografado} dailyData={data.d_estoqueLitografado} higherIsBetter={false} />
                </div>
              }>
              <KpiCard title="Atendimento no Prazo"  value={L(data.atendimentoPrazo)} unit="%"
                monthlyData={data.atendimentoPrazo} color="#22c55e" goal={metas.atendimentoPrazo} higherIsBetter />
              <KpiCard title="Lead Time Litografia"   value={L(data.leadTimeLito)} unit=" dias"
                monthlyData={data.leadTimeLito} color="#10b981" higherIsBetter={false} />
              <KpiCard title="Estoque Acabado"        value={L(data.estoqueAcabado)}
                monthlyData={data.estoqueAcabado} color="#059669" higherIsBetter={false} />
              <KpiCard title="Estoque Litografado"    value={L(data.estoqueLitografado)}
                monthlyData={data.estoqueLitografado} color="#34d399" higherIsBetter={false} />
            </PilarSection>

            {/* PESSOAS */}
            <PilarSection pilarDef={PILARES[4]} data={data} onImport={setData}
              charts={
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <PilarCharts title="Absenteísmo" color="#8b5cf6" unit="%"
                    monthlyData={data.absenteismo} dailyData={data.d_absenteismo}
                    goal={metas.absenteismo} higherIsBetter={false} />
                  <PilarCharts title="Orgânico LMO" color="#a78bfa"
                    monthlyData={data.organicoLMO} dailyData={data.d_organicoLMO} higherIsBetter />
                  <PilarCharts title="Orgânico Litografia" color="#c4b5fd"
                    monthlyData={data.organicoLito} dailyData={data.d_organicoLito} higherIsBetter />
                  <PilarCharts title="Hrs Treinamento/Pessoa" color="#7c3aed"
                    monthlyData={data.horasTreinamento} dailyData={data.d_horasTreinamento}
                    goal={metas.horasTreinamento} higherIsBetter />
                </div>
              }>
              <KpiCard title="Absenteísmo"            value={L(data.absenteismo)} unit="%"
                monthlyData={data.absenteismo} color="#8b5cf6" goal={metas.absenteismo} higherIsBetter={false} />
              <KpiCard title="Orgânico LMO (turno)"   value={L(data.organicoLMO)}
                monthlyData={data.organicoLMO} color="#a78bfa" higherIsBetter />
              <KpiCard title="Orgânico Lito (turno)"  value={L(data.organicoLito)}
                monthlyData={data.organicoLito} color="#c4b5fd" higherIsBetter />
              <KpiCard title="Hrs Treinamento/Pessoa" value={L(data.horasTreinamento)}
                monthlyData={data.horasTreinamento} color="#7c3aed" goal={metas.horasTreinamento} higherIsBetter />
            </PilarSection>
          </div>
        )}

        {/* ══ ENTRADA DE DADOS ══ */}
        {activeTab === "entrada" && (
          <EntradaDados
            data={data} editMonth={editMonth} setEditMonth={setEditMonth}
            editDay={editDay} setEditDay={setEditDay}
            dataMode={dataMode} setDataMode={setDataMode}
            updateMonthly={updateMonthly} updateDaily={updateDaily} updatePerda={updatePerda}
            inp={inp}
          />
        )}
      </div>
    </div>
  );
}
