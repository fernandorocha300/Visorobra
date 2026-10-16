// Subscription plans and their storage limits (in MB).
export const PLANOS = {
  BASICO: { id: "BASICO", nome: "Plano Básico", limiteMb: 5120 },
  PROFISSIONAL: { id: "PROFISSIONAL", nome: "Plano Profissional", limiteMb: 25600 },
  EMPRESARIAL: { id: "EMPRESARIAL", nome: "Plano Empresarial", limiteMb: 102400 },
};

export const PLANO_LIST = Object.values(PLANOS);

export const planoLimitMb = (plano) =>
  (PLANOS[plano] || PLANOS.BASICO).limiteMb;

export const planoNome = (plano) =>
  (PLANOS[plano] || PLANOS.BASICO).nome;