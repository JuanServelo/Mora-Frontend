// src/components/adm/financeiro/PainelFaturas.jsx
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";
import { formatarData } from "../../../utils/datas";
import { financeiroApi } from "../../../services/financeiroApi";
import { apartamentoApi } from "../../../services/estruturasApi";
import { formatarBRL } from "../../../utils/dinheiro";

const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const STATUS_CONFIG = {
  ABERTA: { cor: "bg-blue-500/15 text-blue-400", label: "faturas.status.ABERTA" },
  PAGA: { cor: "bg-green-500/15 text-green-400", label: "faturas.status.PAGA" },
  EM_ATRASO: { cor: "bg-error/15 text-error", label: "faturas.status.EM_ATRASO" },
  CANCELADA: { cor: "bg-veu/10 text-on-surface-variant", label: "faturas.status.CANCELADA" },
};

export function PainelFaturas() {
  const { t } = useTranslation("financeiro");
  const toast = useToast();

  const [competencia, setCompetencia] = useState(mesAtual());
  const [statusFiltro, setStatusFiltro] = useState("");
  const [faturas, setFaturas] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [baixaModal, setBaixaModal] = useState(null);
  const [baixaForm, setBaixaForm] = useState({ pagoEm: "", valorCentavos: "" });
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [unidadeMap, setUnidadeMap] = useState({});

  useEffect(() => {
    apartamentoApi.listarTodos()
      .then(({ data }) => {
        const apts = Array.isArray(data) ? data : (data.apartamentos ?? []);
        const map = {};
        apts.forEach((a) => {
          map[a.id] = a.blocoNome ? `${a.blocoNome} · ${a.numero}` : t("faturas.apt", { numero: a.numero });
        });
        setUnidadeMap(map);
      })
      .catch(() => {});
  }, [t]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [r1, r2] = await Promise.all([
        financeiroApi.listarFaturasCondominio({
          competencia,
          status: statusFiltro || undefined,
        }),
        financeiroApi.kpisFaturas(competencia),
      ]);
      setFaturas(r1.data.faturas ?? []);
      setKpis(r2.data ?? null);
    } catch {
      toast.error(t("faturas.toast.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }, [competencia, statusFiltro, t]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirBaixa(fatura) {
    setBaixaForm({
      pagoEm: new Date().toISOString().slice(0, 10),
      valorCentavos: String(fatura.valorCentavos),
    });
    setBaixaModal(fatura);
  }

  async function confirmarBaixa() {
    if (!baixaModal) return;
    setSalvandoBaixa(true);
    try {
      await financeiroApi.baixaManual(baixaModal.id, {
        pagoEm: baixaForm.pagoEm,
        valorCentavos: Number(baixaForm.valorCentavos),
      });
      toast.success(t("faturas.toast.baixaRegistrada"));
      setBaixaModal(null);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || t("faturas.toast.erroBaixa"));
    } finally {
      setSalvandoBaixa(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "faturas.kpis.totalEmitido", valor: formatarBRL(kpis.totalCentavos ?? 0), cor: "text-on-surface" },
            { label: "faturas.kpis.pagas", valor: formatarBRL(kpis.pagasCentavos ?? 0), cor: "text-green-400" },
            { label: "faturas.kpis.emAberto", valor: String(kpis.abertas ?? 0), cor: "text-blue-400" },
            { label: "faturas.kpis.emAtraso", valor: String(kpis.emAtraso ?? 0), cor: "text-error" },
          ].map((k) => (
            <div key={k.label} className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">{t(k.label)}</p>
              <p className={`font-bold text-xl ${k.cor}`}>{k.valor}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            {t("contas.competencia")}
          </label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="bg-veu/5 border border-veu/10 rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            {t("faturas.filtroStatus")}
          </label>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="bg-veu/5 border border-veu/10 rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
          >
            <option value="">{t("comum:estado.todos")}</option>
            <option value="ABERTA">{t("faturas.kpis.emAberto")}</option>
            <option value="PAGA">{t("faturas.kpis.pagas")}</option>
            <option value="EM_ATRASO">{t("faturas.kpis.emAtraso")}</option>
            <option value="CANCELADA">{t("faturas.filtroCanceladas")}</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      {carregando ? (
        <div className="flex items-center justify-center py-12 text-on-surface-variant">
          <Icone name="sync" className="text-3xl animate-spin mr-3" />
          <span>{t("faturas.carregando")}</span>
        </div>
      ) : faturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-on-surface-variant text-sm">
          <Icone name="receipt_long" className="text-4xl opacity-30" />
          <p>{t("faturas.vazio")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-veu/5 text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="text-left pb-3 pr-4">{t("faturas.tabela.unidade")}</th>
                <th className="text-left pb-3 pr-4">{t("faturas.tabela.vencimento")}</th>
                <th className="text-right pb-3 pr-4">{t("faturas.tabela.valor")}</th>
                <th className="text-center pb-3 pr-4">{t("faturas.filtroStatus")}</th>
                <th className="text-right pb-3">{t("faturas.tabela.acoes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-veu/5">
              {faturas.map((f) => {
                const sc = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.ABERTA;
                return (
                  <tr key={f.id} className="hover:bg-veu/2 transition">
                    <td className="py-3 pr-4 text-on-surface font-medium text-sm">
                      {unidadeMap[f.unidadeId] ?? f.unidadeId.slice(0, 8) + "…"}
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{formatarData(f.vencimento)}</td>
                    <td className="py-3 pr-4 text-right font-bold text-on-surface">
                      {formatarBRL(f.valorCentavos)}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cor}`}>
                        {t(sc.label)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {["ABERTA", "EM_ATRASO"].includes(f.status) && (
                        <button
                          onClick={() => abrirBaixa(f)}
                          title={t("faturas.baixa.botao")}
                          className="text-xs px-3 py-1.5 rounded-lg bg-veu/5 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition cursor-pointer font-medium"
                        >
                          {t("faturas.baixa.botao")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de baixa manual */}
      {baixaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-5" style={{ background: "rgba(18,18,28,0.98)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
            <h3 className="font-headline text-xl font-bold text-on-surface">{t("faturas.baixa.titulo")}</h3>
            <p className="text-sm text-on-surface-variant">
              {t("faturas.baixa.descricao")}
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                {t("faturas.baixa.dataPagamento")}
              </label>
              <input
                type="date"
                value={baixaForm.pagoEm}
                onChange={(e) => setBaixaForm((f) => ({ ...f, pagoEm: e.target.value }))}
                className="w-full bg-veu/5 border border-veu/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                {t("faturas.baixa.valorPago")}
              </label>
              <input
                type="number"
                value={baixaForm.valorCentavos}
                onChange={(e) => setBaixaForm((f) => ({ ...f, valorCentavos: e.target.value }))}
                className="w-full bg-veu/5 border border-veu/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              />
              <p className="text-xs text-on-surface-variant mt-1">
                {formatarBRL(Number(baixaForm.valorCentavos) || 0)}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setBaixaModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-veu/10 text-on-surface-variant text-sm font-semibold hover:bg-veu/5 transition cursor-pointer"
              >
                {t("comum:acoes.cancelar")}
              </button>
              <button
                onClick={confirmarBaixa}
                disabled={salvandoBaixa}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-tertiary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {salvandoBaixa ? t("geral.salvando") : t("faturas.baixa.confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
