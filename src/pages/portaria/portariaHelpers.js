/**
 * Funções puras da tela de Entradas e Saídas.
 *
 * Moradas aqui, e não em Portaria.jsx, por dois motivos: o arquivo da tela
 * exporta componentes, e misturar exports faz o Fast Refresh perder o estado a
 * cada salvamento; e porque assim elas são verificáveis sem montar uma tela de
 * 1.700 linhas com meia dúzia de serviços simulados.
 */

import i18n, { idiomaAtual } from "../../i18n";

const PLACA_REGEX = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function errMsg(err) {
  const d = err?.response?.data;
  return d?.mensagem ?? d?.message ?? d?.erro ?? null;
}

export function formatarCpfMask(cpf) {
  const d = String(cpf).replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function fmtData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(idiomaAtual());
}

export function fmtHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(idiomaAtual(), { hour: "2-digit", minute: "2-digit" });
}

export function fmtDuracao(entradaEm) {
  const diff = Math.floor((Date.now() - new Date(entradaEm)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function hoje() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function unidadeLabel(unidadeId, apartamentoId, apartamentoNumero, blocoNome, apartamentoMap) {
  if (apartamentoNumero) {
    return blocoNome
      ? i18n.t("portaria:unidade.blocoApto", { bloco: blocoNome, numero: apartamentoNumero })
      : i18n.t("portaria:unidade.apto", { numero: apartamentoNumero });
  }
  if (unidadeId && apartamentoMap[unidadeId]) return apartamentoMap[unidadeId];
  if (apartamentoId && apartamentoMap[apartamentoId]) return apartamentoMap[apartamentoId];
  return "—";
}

export function fmtDuracaoEntre(inicio, fim) {
  if (!inicio || !fim) return "—";
  const diff = Math.floor((new Date(fim) - new Date(inicio)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function normalizarPlaca(v) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function placaValida(p) {
  return PLACA_REGEX.test(p);
}
