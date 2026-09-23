/**
 * Formatação de datas vindas da API.
 *
 * Colunas DATE do Postgres chegam como ISO completo — `2026-08-10T03:00:00.000Z`
 * é o dia 10 à meia-noite em São Paulo, serializado em UTC. O que interessa é o
 * dia, não o instante.
 *
 * Por isso aqui se recorta a parte da data em vez de passar por `new Date()`:
 * converter para objeto de data reintroduz fuso horário num valor que não tem
 * hora, e um navegador em fuso diferente passaria a exibir o dia anterior.
 */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Recorta `YYYY-MM-DD` de qualquer forma que a API mande. */
function parteData(valor) {
  if (!valor) return null;
  const texto = String(valor).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

/** `2026-08-10T03:00:00.000Z` → `10/08/2026` */
export function formatarData(valor) {
  const d = parteData(valor);
  if (!d) return '—';
  const [ano, mes, dia] = d.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Valor para `<input type="date">`, que só aceita `YYYY-MM-DD`.
 *
 * Passar o ISO completo deixa o campo em branco, sem aviso — o navegador
 * simplesmente descarta o que não reconhece.
 */
export function paraCampoData(valor) {
  return parteData(valor) ?? '';
}

/** `2026-08-01` → `ago/2026` */
export function formatarCompetencia(valor) {
  const d = parteData(valor) ?? `${String(valor ?? '').slice(0, 7)}-01`;
  const p = parteData(d);
  if (!p) return '—';
  const [ano, mes] = p.split('-');
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

/** `2026-08-01` → `2026-08`, que é o formato aceito pelos endpoints. */
export function paraCompetencia(valor) {
  return String(valor ?? '').slice(0, 7);
}

/** Data com hora, para registros de pagamento: `10/08/2026 14:30`. */
export function formatarDataHora(valor) {
  if (!valor) return '—';
  const data = formatarData(valor);
  if (data === '—') return '—';
  const hora = String(valor).slice(11, 16);
  return /^\d{2}:\d{2}$/.test(hora) ? `${data} ${hora}` : data;
}
