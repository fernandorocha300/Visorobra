import { format, isValid } from "date-fns";

const toDate = (iso) => {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return isValid(d) ? d : null;
};

export const formatMb = (mb) => `${Math.round(mb)} MB`;

export const formatKb = (kb) => {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.round(kb)} KB`;
};

export const formatDate = (iso) => {
  const d = toDate(iso);
  return d ? format(d, "dd/MM/yyyy") : "—";
};

export const formatDateTime = (iso) => {
  const d = toDate(iso);
  return d ? format(d, "dd/MM/yyyy HH:mm") : "—";
};

export const formatDateTimeCard = (iso) => {
  const d = toDate(iso);
  return d ? format(d, "dd/MM/yyyy 'às' HH:mm") : "—";
};

export const statusObraLabel = (status) =>
  status === "CONCLUIDA" ? "Concluída" : "Em Andamento";

export const statusAssinaturaLabel = (status) =>
  status === "SUSPENSO" ? "Suspenso" : "Ativo";

export const perfilLabel = (role) => (role === "admin" ? "Administrador" : "Cliente");