// ─── Constantes de data ───────────────────────────────────────────────────────
export const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
export const now           = new Date();
export const CUR_MONTH     = now.getMonth();
export const CUR_YEAR      = now.getFullYear();
export const DAYS_IN_MONTH = new Date(CUR_YEAR, CUR_MONTH + 1, 0).getDate();

export const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => {
  const mi = (CUR_MONTH - 11 + i + 12) % 12;
  return MONTH_NAMES[mi];
});
export const DAY_LABELS = Array.from({ length: DAYS_IN_MONTH }, (_, i) => `D${i + 1}`);

// ─── Factories ─────────────────────────────────────────────────────────────────
export const mk12  = () => Array(12).fill(0);
export const mkDay = () => Array(DAYS_IN_MONTH).fill(0);

// ─── Estado padrão ────────────────────────────────────────────────────────────
export function makeDefault() {
  return {
    // mensais
    acidenteComAfastamento: mk12(), acidenteSemAfastamento: mk12(), diasSemAcidente: mk12(),
    reclamacoesClientes: mk12(), estoqueCQ: mk12(), reclamacoesAtrasadas: mk12(),
    responsavelReclamacoes: Array(12).fill("–"),
    eficienciaLMO: mk12(), eficienciaLito: mk12(),
    top5Perdas: Array(12).fill(0).map(() => Array(5).fill(0)),
    top5Labels: ["Perda 1","Perda 2","Perda 3","Perda 4","Perda 5"],
    atendimentoPrazo: mk12(), leadTimeLito: mk12(), estoqueAcabado: mk12(), estoqueLitografado: mk12(),
    absenteismo: mk12(), organicoLMO: mk12(), organicoLito: mk12(), horasTreinamento: mk12(),
    // diários
    d_acidenteComAfastamento: mkDay(), d_acidenteSemAfastamento: mkDay(), d_diasSemAcidente: mkDay(),
    d_reclamacoesClientes: mkDay(), d_estoqueCQ: mkDay(), d_reclamacoesAtrasadas: mkDay(),
    d_eficienciaLMO: mkDay(), d_eficienciaLito: mkDay(),
    d_atendimentoPrazo: mkDay(), d_leadTimeLito: mkDay(), d_estoqueAcabado: mkDay(), d_estoqueLitografado: mkDay(),
    d_absenteismo: mkDay(), d_organicoLMO: mkDay(), d_organicoLito: mkDay(), d_horasTreinamento: mkDay(),
  };
}

export const DEFAULT_METAS = {
  reclamacoesClientes: 5, eficienciaLMO: 75, eficienciaLito: 75,
  atendimentoPrazo: 98, absenteismo: 3, diasSemAcidente: 30, horasTreinamento: 8,
};

// ─── Definição dos pilares ────────────────────────────────────────────────────
export const PILARES = [
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
