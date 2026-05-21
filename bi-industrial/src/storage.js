// ─── Chaves de persistência ───────────────────────────────────────────────────
const KEY_DATA  = "bi_industrial_data_v2";
const KEY_METAS = "bi_industrial_metas_v2";

// Salva o estado completo no localStorage
export function saveAll(data, metas) {
  try {
    localStorage.setItem(KEY_DATA,  JSON.stringify(data));
    localStorage.setItem(KEY_METAS, JSON.stringify(metas));
  } catch (e) {
    console.warn("Falha ao salvar no localStorage:", e);
  }
}

// Carrega o estado salvo; retorna null se não houver nada
export function loadAll() {
  try {
    const rawData  = localStorage.getItem(KEY_DATA);
    const rawMetas = localStorage.getItem(KEY_METAS);
    if (!rawData) return null;
    return {
      data:  JSON.parse(rawData),
      metas: rawMetas ? JSON.parse(rawMetas) : null,
    };
  } catch (e) {
    console.warn("Falha ao carregar do localStorage:", e);
    return null;
  }
}

// Limpa tudo (reset)
export function clearAll() {
  localStorage.removeItem(KEY_DATA);
  localStorage.removeItem(KEY_METAS);
}
