import { useRef } from "react";
import { exportPilar, importPilar } from "../xlsx.js";

function PilarHeader({ icon, label, color, pilarDef, data, onImport }) {
  const fileRef = useRef();

  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const newData = importPilar(pilarDef, ev.target.result, data);
        onImport(newData);
        alert(`${label}: dados importados com sucesso!`);
      } catch (err) {
        alert("Erro ao importar: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const btnBase = {
    border: "none", borderRadius: 6, padding: "5px 11px",
    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", gap: 4,
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `2px solid ${color}`, paddingBottom: 8, marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 19 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color, letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => exportPilar(pilarDef, data)}
          style={{ ...btnBase, background: "#16a34a", color: "#fff" }}>
          ⬇ Exportar
        </button>
        <button onClick={() => fileRef.current.click()}
          style={{ ...btnBase, background: "#0369a1", color: "#fff" }}>
          ⬆ Importar
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleImport} />
      </div>
    </div>
  );
}

export default function PilarSection({ pilarDef, data, onImport, children, charts }) {
  return (
    <section style={{
      marginBottom: 32, background: "#0e1022",
      border: "1px solid #1a1d36", borderRadius: 16, padding: "18px 20px",
    }}>
      <PilarHeader
        icon={pilarDef.icon} label={pilarDef.label} color={pilarDef.color}
        pilarDef={pilarDef} data={data} onImport={onImport}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(195px,1fr))", gap: 10 }}>
        {children}
      </div>
      {charts}
    </section>
  );
}
