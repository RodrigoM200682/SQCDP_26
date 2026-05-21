import { MONTH_LABELS, DAY_LABELS, DAYS_IN_MONTH, MONTH_NAMES, CUR_MONTH } from "../constants.js";

export default function EntradaDados({
  data, editMonth, setEditMonth, editDay, setEditDay,
  dataMode, setDataMode, updateMonthly, updateDaily, updatePerda, inp,
}) {
  const isDaily = dataMode === "daily";

  const sec  = { background: "linear-gradient(135deg,#1a1d2e,#141627)", border: "1px solid #2a2d45", borderRadius: 14, padding: "16px 18px", marginBottom: 18 };
  const lbl  = { fontSize: 11, color: "#8b8fa8", fontWeight: 600, marginBottom: 3, display: "block" };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 };

  const Field = ({ field, label, type = "number", step = "1", max }) => {
    const val = isDaily
      ? (data[`d_${field}`]?.[editDay] ?? 0)
      : (data[field]?.[editMonth] ?? 0);
    const onChange = e =>
      isDaily
        ? updateDaily(`d_${field}`, editDay, e.target.value)
        : updateMonthly(field, editMonth, e.target.value);
    return (
      <label>
        <span style={lbl}>{label}</span>
        <input type={type} min="0" step={step} max={max} value={val} onChange={onChange} style={inp} />
      </label>
    );
  };

  return (
    <div>
      {/* Controles de modo / mês / dia */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", background: "#1a1d2e", borderRadius: 8, padding: 3, gap: 3 }}>
          {[{ id: "monthly", l: "📅 Mensal" }, { id: "daily", l: "📆 Diário" }].map(m => (
            <button key={m.id} onClick={() => setDataMode(m.id)} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12, fontFamily: "inherit",
              background: dataMode === m.id ? "#6366f1" : "transparent",
              color: dataMode === m.id ? "#fff" : "#8b8fa8",
            }}>{m.l}</button>
          ))}
        </div>

        {!isDaily && (
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#8b8fa8", fontWeight: 600 }}>Mês:</span>
            <select value={editMonth} onChange={e => setEditMonth(+e.target.value)}
              style={{ ...inp, width: "auto", padding: "6px 12px" }}>
              {MONTH_LABELS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </label>
        )}

        {isDaily && (
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#8b8fa8", fontWeight: 600 }}>
              Dia ({MONTH_NAMES[CUR_MONTH]}):
            </span>
            <select value={editDay} onChange={e => setEditDay(+e.target.value)}
              style={{ ...inp, width: "auto", padding: "6px 12px" }}>
              {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Segurança */}
      <div style={sec}>
        <div style={{ fontWeight: 800, color: "#ef4444", fontSize: 13, marginBottom: 12 }}>🦺 Segurança</div>
        <div style={grid}>
          <Field field="acidenteComAfastamento" label="Acidentes c/ Afastamento" />
          <Field field="acidenteSemAfastamento" label="Acidentes s/ Afastamento" />
          <Field field="diasSemAcidente"         label="Dias sem Acidente" />
        </div>
      </div>

      {/* Qualidade */}
      <div style={sec}>
        <div style={{ fontWeight: 800, color: "#3b82f6", fontSize: 13, marginBottom: 12 }}>✅ Qualidade</div>
        <div style={grid}>
          <Field field="reclamacoesClientes"  label="Reclamações de Clientes" />
          <Field field="estoqueCQ"             label="Estoque Material no CQ" />
          <Field field="reclamacoesAtrasadas"  label="Reclamações Atrasadas" />
          {!isDaily && (
            <label>
              <span style={lbl}>Responsável Reclamações</span>
              <input type="text" value={data.responsavelReclamacoes[editMonth] ?? ""}
                onChange={e => updateMonthly("responsavelReclamacoes", editMonth, e.target.value)}
                style={inp} />
            </label>
          )}
        </div>
      </div>

      {/* Custo / Eficiência */}
      <div style={sec}>
        <div style={{ fontWeight: 800, color: "#f59e0b", fontSize: 13, marginBottom: 12 }}>⚙️ Custo / Eficiência</div>
        <div style={grid}>
          <Field field="eficienciaLMO"  label="Eficiência LMO (%)"        step="0.1" max="100" />
          <Field field="eficienciaLito" label="Eficiência Litografia (%)"  step="0.1" max="100" />
        </div>
        {!isDaily && (
          <div style={{ marginTop: 12 }}>
            <span style={{ ...lbl, marginBottom: 8 }}>Top 5 Perdas do Processo</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
              {data.top5Labels.map((l, i) => (
                <label key={i}>
                  <span style={lbl}>{l}</span>
                  <input type="number" min="0" value={data.top5Perdas[editMonth][i]}
                    onChange={e => updatePerda(editMonth, i, e.target.value)} style={inp} />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Entregas */}
      <div style={sec}>
        <div style={{ fontWeight: 800, color: "#22c55e", fontSize: 13, marginBottom: 12 }}>🚚 Entregas</div>
        <div style={grid}>
          <Field field="atendimentoPrazo"   label="Atendimento no Prazo (%)"    step="0.1" max="100" />
          <Field field="leadTimeLito"        label="Lead Time Litografia (dias)" step="0.1" />
          <Field field="estoqueAcabado"      label="Estoque Acabado" />
          <Field field="estoqueLitografado"  label="Estoque Litografado" />
        </div>
      </div>

      {/* Pessoas */}
      <div style={sec}>
        <div style={{ fontWeight: 800, color: "#8b5cf6", fontSize: 13, marginBottom: 12 }}>👥 Pessoas</div>
        <div style={grid}>
          <Field field="absenteismo"      label="Absenteísmo (%)"          step="0.1" />
          <Field field="organicoLMO"      label="Orgânico LMO (turno)" />
          <Field field="organicoLito"     label="Orgânico Lito (turno)" />
          <Field field="horasTreinamento" label="Horas Treinamento/Pessoa"  step="0.1" />
        </div>
      </div>
    </div>
  );
}
