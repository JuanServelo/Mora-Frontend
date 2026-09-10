// src/pages/usuario/perfil/CobrancaView.jsx
import { useState, useEffect } from "react";
import { Icone } from "../../../components/icones/Icone";
import { financeiroApi } from "../../../services/financeiroApi";
import { formatarBRL } from "../../../utils/dinheiro";
import { formatarData, formatarDataHora } from "../../../utils/datas";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"];

function competenciaLabel(dateStr) {
  if (!dateStr) return "";
  const [ano, mes] = String(dateStr).split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

const STATUS_CONFIG = {
  ABERTA: { cor: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Em aberto", icone: "schedule" },
  PAGA: { cor: "bg-green-500/15 text-green-400 border-green-500/20", label: "Paga", icone: "check_circle" },
  EM_ATRASO: { cor: "bg-error/15 text-error border-error/20", label: "Em atraso", icone: "warning" },
  CANCELADA: { cor: "bg-veu/5 text-on-surface-variant border-veu/10", label: "Cancelada", icone: "cancel" },
};

function DetalhesFatura({ faturaId, onFechar }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setCarregando(true);
    financeiroApi.obterDetalhesFatura(faturaId)
      .then(({ data }) => setDados(data))
      .catch(() => setDados(null))
      .finally(() => setCarregando(false));
  }, [faturaId]);

  async function copiar(texto) {
    await navigator.clipboard.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" style={{ background: "rgba(18,18,28,0.98)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-veu/8" style={{ background: "rgba(18,18,28,0.98)", backdropFilter: "blur(32px)" }}>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            {carregando ? "Carregando..." : `Fatura ${competenciaLabel(dados?.fatura?.competencia)}`}
          </h3>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-veu/10 transition cursor-pointer"
          >
            <Icone name="close" className="text-lg" />
          </button>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16 text-on-surface-variant">
            <Icone name="sync" className="text-3xl animate-spin mr-3" />
            <span>Carregando fatura...</span>
          </div>
        ) : !dados?.fatura ? (
          <div className="p-6 text-center text-on-surface-variant text-sm">
            Não foi possível carregar os detalhes.
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Resumo */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Total</p>
                <p className="text-3xl font-bold text-on-surface mt-1">
                  {formatarBRL(dados.fatura.valorCentavos)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Vence em {formatarData(dados.fatura.vencimento)}</p>
              </div>
              {(() => {
                const sc = STATUS_CONFIG[dados.fatura.status] ?? STATUS_CONFIG.ABERTA;
                return (
                  <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${sc.cor}`}>
                    <Icone name={sc.icone} className="text-base" />
                    {sc.label}
                  </span>
                );
              })()}
            </div>

            {/* Itens */}
            {dados.itens?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Composição
                </p>
                <div className="space-y-1">
                  {dados.itens.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-veu/5 last:border-0">
                      <p className="text-sm text-on-surface">{item.descricao}</p>
                      <p className={`text-sm font-semibold ${item.valorCentavos < 0 ? "text-green-400" : "text-on-surface"}`}>
                        {formatarBRL(item.valorCentavos)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagamento confirmado */}
            {dados.fatura.status === "PAGA" && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                <Icone name="check_circle" className="text-green-400 text-2xl" />
                <div>
                  <p className="text-green-400 font-semibold text-sm">Pagamento confirmado</p>
                  {dados.fatura.pagoEm && (
                    <p className="text-on-surface-variant text-xs">
                      em {formatarDataHora(dados.fatura.pagoEm)} · {dados.fatura.formaBaixa === "MANUAL" ? "Baixa manual" : "Gateway"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* PIX para pagamento */}
            {["ABERTA", "EM_ATRASO"].includes(dados.fatura.status) && dados.cobranca && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Pagar via PIX
                </p>

                {dados.cobranca.pixQrcode && (
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-2xl">
                      <img
                        src={`data:image/png;base64,${dados.cobranca.pixQrcode}`}
                        alt="QR Code PIX"
                        className="w-44 h-44"
                      />
                    </div>
                  </div>
                )}

                {dados.cobranca.pixPayload && (
                  <div className="space-y-2">
                    <p className="text-xs text-on-surface-variant">Código copia e cola:</p>
                    <div className="flex gap-2 items-center">
                      <code className="flex-1 bg-veu/5 rounded-xl px-3 py-2 text-xs text-on-surface-variant break-all font-mono border border-veu/10">
                        {dados.cobranca.pixPayload}
                      </code>
                      <button
                        onClick={() => copiar(dados.cobranca.pixPayload)}
                        className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition cursor-pointer"
                        title="Copiar"
                      >
                        <Icone name={copiado ? "check" : "content_copy"} className="text-lg" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sem cobrança ainda */}
            {["ABERTA", "EM_ATRASO"].includes(dados.fatura.status) && !dados.cobranca && (
              <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 text-sm text-warning">
                <p className="font-semibold mb-1">Cobrança em processamento</p>
                <p className="text-xs opacity-80">Aguarde alguns instantes e recarregue a página para ver as opções de pagamento.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CobrancaView() {
  const [faturas, setFaturas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    financeiroApi.listarMinhasFaturas()
      .then(({ data }) => setFaturas(data.faturas ?? []))
      .catch(() => setFaturas([]))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1 mb-4">
        Minhas cobranças
      </p>

      {carregando ? (
        <div className="flex items-center justify-center py-12 text-on-surface-variant">
          <Icone name="sync" className="text-3xl animate-spin mr-3" />
          <span>Carregando faturas...</span>
        </div>
      ) : faturas.length === 0 ? (
        <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-on-surface-variant text-sm text-center px-4">
          <Icone name="receipt_long" className="text-4xl opacity-30" />
          <p>Nenhuma fatura encontrada.</p>
          <p className="text-xs opacity-70">As faturas aparecerão aqui quando o síndico fechar a competência.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faturas.map((fatura) => {
            const sc = STATUS_CONFIG[fatura.status] ?? STATUS_CONFIG.ABERTA;
            return (
              <button
                key={fatura.id}
                onClick={() => setDetalhe(fatura.id)}
                className="w-full text-left glass-panel rounded-2xl p-4 flex items-center gap-4 hover:bg-veu/5 transition cursor-pointer group"
              >
                <div className={`p-2.5 rounded-xl border ${sc.cor}`}>
                  <Icone name={sc.icone} className="text-xl" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-on-surface text-sm">
                      {competenciaLabel(fatura.competencia)}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.cor}`}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Vence em {formatarData(fatura.vencimento)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-on-surface">{formatarBRL(fatura.valorCentavos)}</p>
                  <p className="text-xs text-on-surface-variant group-hover:text-primary transition mt-0.5">
                    Ver detalhes →
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detalhe && <DetalhesFatura faturaId={detalhe} onFechar={() => setDetalhe(null)} />}
    </div>
  );
}
