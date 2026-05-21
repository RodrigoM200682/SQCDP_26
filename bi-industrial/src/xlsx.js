import * as XLSX from "xlsx";
import { MONTH_LABELS, DAY_LABELS, DAYS_IN_MONTH, mkDay, mk12 } from "./constants.js";

// ─── Utilitários ──────────────────────────────────────────────────────────────
export function padArr(arr, len, def = 0) {
  const a = [...(arr || [])];
  while (a.length < len) a.push(def);
  return a.slice(0, len);
}

// ─── Export de um pilar ───────────────────────────────────────────────────────
export function exportPilar(pilar, data) {
  const wb = XLSX.utils.book_new();

  // Aba Mensal
  const mHeader = ["Indicador", ...MONTH_LABELS];
  const mRows = [
    mHeader,
    ...pilar.monthlyFields.map(f => [
      f.label,
      ...padArr(data[f.key], 12, f.type === "text" ? "–" : 0),
    ]),
  ];
  if (pilar.hasTop5) {
    data.top5Labels.forEach((lbl, i) =>
      mRows.push([`Top5 - ${lbl}`, ...data.top5Perdas.map(r => r[i])])
    );
  }
  const ws1 = XLSX.utils.aoa_to_sheet(mRows);
  ws1["!cols"] = [{ wch: 32 }, ...MONTH_LABELS.map(() => ({ wch: 10 }))];
  XLSX.utils.book_append_sheet(wb, ws1, "Mensal");

  // Aba Diário
  const dHeader = ["Indicador", ...DAY_LABELS];
  const dRows = [
    dHeader,
    ...pilar.dailyFields.map(f => [
      f.label,
      ...padArr(data[f.key], DAYS_IN_MONTH),
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(dRows);
  ws2["!cols"] = [{ wch: 32 }, ...DAY_LABELS.map(() => ({ wch: 7 }))];
  XLSX.utils.book_append_sheet(wb, ws2, "Diário");

  XLSX.writeFile(wb, `BI_${pilar.label.replace(/[^\w]/g, "_")}.xlsx`);
}

// ─── Import de um pilar ───────────────────────────────────────────────────────
export function importPilar(pilar, buffer, data) {
  const wb = XLSX.read(buffer, { type: "binary" });

  // Mensal
  const ws1 = wb.Sheets["Mensal"];
  if (!ws1) throw new Error("Aba 'Mensal' não encontrada no arquivo.");
  const mRows = XLSX.utils.sheet_to_json(ws1, { header: 1 });
  const byM = {};
  mRows.slice(1).forEach(r => { if (r[0]) byM[r[0]] = r.slice(1); });

  const newData = { ...data };

  pilar.monthlyFields.forEach(f => {
    if (byM[f.label] !== undefined) {
      const raw = byM[f.label];
      newData[f.key] =
        f.type === "text"
          ? padArr(raw.map(v => (v != null ? String(v) : "–")), 12, "–")
          : padArr(raw.map(v => +(v ?? 0)), 12, 0);
    }
  });

  if (pilar.hasTop5) {
    const newTop5 = data.top5Perdas.map(r => [...r]);
    data.top5Labels.forEach((lbl, i) => {
      const key = `Top5 - ${lbl}`;
      if (byM[key])
        byM[key].forEach((v, mi) => { if (mi < 12) newTop5[mi][i] = +(v ?? 0); });
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
