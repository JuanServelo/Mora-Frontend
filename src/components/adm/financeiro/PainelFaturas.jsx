// src/components/adm/financeiro/PainelFaturas.jsx
import { useState, useEffect, useCallback } from "react";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";
import { useConfirm } from "../../../contexts/ConfirmContext";
import { financeiroApi } from "../../../services/financeiroApi";
import { apartamentoApi } from "../../../services/estruturasApi";
import { formatarBRL } from "../../../utils/dinheiro";

const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const STATUS_CONFIG = {
  ABERTA: { cor: "bg-blue-500/15 text-blue-400", label: "Em aberto" },
  PAGA: { cor: "bg-green-500/15 text-green-400", label: "Paga" },
  EM_ATRASO: { cor: "bg-error/15 text-error", label: "Em atraso" },
  CANCELADA: { cor: "bg-white/10 text-on-surface-variant", label: "Cancelada" },
};

export function PainelFaturas() {
  const toast = useToast();
  const confirm = useConfirm();

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
          map[a.id] = a.blocoNome ? `${a.blocoNome} · ${a.numero}` : `Apt ${a.numero}`;
        });
        setUnidadeMap(map);
      })
      .catch(() => {});
  }, []);

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
      toast.error("Não foi possível carregar as faturas.");
    } finally {
      setCarregando(false);
    }
  }, [competencia, statusFiltro]);

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
      toast.success("Baixa manual registrada.");
      setBaixaModal(null);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao registrar baixa.");
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
            { label: "Total emitido", valor: formatarBRL(kpis.totalCentavos ?? 0), cor: "text-on-surface" },
            { label: "Pagas", valor: formatarBRL(kpis.pagasCentavos ?? 0), cor: "text-green-400" },
            { label: "Em aberto", valor: String(kpis.abertas ?? 0), cor: "text-blue-400" },
            { label: "Em atraso", valor: String(kpis.emAtraso ?? 0), cor: "text-error" },
          ].map((k) => (
            <div key={k.label} className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`font-bold text-xl ${k.cor}`}>{k.valor}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            Competência
          </label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            Status
          </label>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
          >
            <option value="">Todos</option>
            <option value="ABERTA">Em aberto</option>
            <option value="PAGA">Pagas</option>
            <option value="EM_ATRASO">Em atraso</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      {carregando ? (
        <div className="flex items-center justify-center py-12 text-on-surface-variant">
          <Icone name="sync" className="text-3xl animate-spin mr-3" />
          <span>Carregando faturas...</span>
        </div>
      ) : faturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-on-surface-variant text-sm">
          <Icone name="receipt_long" className="text-4xl opacity-30" />
          <p>Nenhuma fatura encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="text-left pb-3 pr-4">Unidade</th>
                <th className="text-left pb-3 pr-4">Vencimento</th>
                <th className="text-right pb-3 pr-4">Valor</th>
                <th className="text-center pb-3 pr-4">Status</th>
                <th className="text-right pb-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {faturas.map((f) => {
                const sc = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.ABERTA;
                return (
                  <tr key={f.id} className="hover:bg-white/2 transition">
                    <td className="py-3 pr-4 text-on-surface font-medium text-sm">
                      {unidadeMap[f.unidadeId] ?? f.unidadeId.slice(0, 8) + "…"}
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{f.vencimento}</td>
                    <td className="py-3 pr-4 text-right font-bold text-on-surface">
                      {formatarBRL(f.valorCentavos)}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cor}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {["ABERTA", "EM_ATRASO"].includes(f.status) && (
                        <button
                          onClick={() => abrirBaixa(f)}
                          title="Baixa manual"
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition cursor-pointer font-medium"
                        >
                          Baixa manual
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
            <h3 className="font-headline text-xl font-bold text-on-surface">Baixa Manual</h3>
            <p className="text-sm text-on-surface-variant">
              Registra o pagamento desta fatura sem passar pelo gateway de pagamento.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Data do pagamento
              </label>
              <input
                type="date"
                value={baixaForm.pagoEm}
                onChange={(e) => setBaixaForm((f) => ({ ...f, pagoEm: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Valor pago (centavos)
              </label>
              <input
                type="number"
                value={baixaForm.valorCentavos}
                onChange={(e) => setBaixaForm((f) => ({ ...f, valorCentavos: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              />
              <p className="text-xs text-on-surface-variant mt-1">
                {formatarBRL(Number(baixaForm.valorCentavos) || 0)}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setBaixaModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-on-surface-variant text-sm font-semibold hover:bg-white/5 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBaixa}
                disabled={salvandoBaixa}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-tertiary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {salvandoBaixa ? "Salvando..." : "Confirmar Baixa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
