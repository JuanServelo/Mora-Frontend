import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { financeiroApi } from "../../../services/financeiroApi";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";

/**
 * Banco de provas da integração de pagamento.
 *
 * Emite uma cobrança de verdade no ambiente de teste do gateway e mostra o que
 * o morador receberia: o QR do PIX, o boleto, a linha digitável. Serve para
 * responder "a integração está de pé?" sem depender de haver fatura gerada.
 *
 * O backend recusa esta rota quando não está apontando para o sandbox — em
 * produção um clique aqui mandaria cobrança real para alguém.
 */
export function PainelGateway() {
  const { t } = useTranslation("financeiro");
  const toast = useToast();

  const [status, setStatus] = useState(null);
  const [forma, setForma] = useState("PIX");
  const [valor, setValor] = useState("350,00");
  const [emitindo, setEmitindo] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    financeiroApi
      .statusGateway()
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus({ configurado: false }));
  }, []);

  async function emitir() {
    setEmitindo(true);
    setResultado(null);
    try {
      const { data } = await financeiroApi.cobrancaDeTeste(forma, valor);
      setResultado(data);
      if (data.aviso) toast.error(data.aviso);
      else toast.success(t("gateway.toast.criada"));
    } catch (e) {
      toast.error(e.response?.data?.mensagem || t("gateway.toast.erroGateway"));
    } finally {
      setEmitindo(false);
    }
  }

  async function conferir() {
    try {
      const { data } = await financeiroApi.consultarCobrancaTeste(resultado.cobranca.id);
      toast.success(
        data.cobranca.pagoEm
          ? t("gateway.toast.statusPago", { status: data.cobranca.status, pagoEm: data.cobranca.pagoEm })
          : t("gateway.toast.status", { status: data.cobranca.status }),
      );
    } catch {
      toast.error(t("gateway.toast.erroConsultar"));
    }
  }

  async function cancelar() {
    try {
      await financeiroApi.cancelarCobrancaTeste(resultado.cobranca.id);
      toast.success(t("gateway.toast.cancelada"));
      setResultado(null);
    } catch {
      toast.error(t("gateway.toast.erroCancelar"));
    }
  }

  function copiar(texto, rotulo) {
    navigator.clipboard
      .writeText(texto)
      .then(() => toast.success(t("gateway.toast.copiado", { rotulo })))
      .catch(() => toast.error(t("gateway.toast.erroCopiar")));
  }

  if (!status) {
    return <p className="text-on-surface-variant text-sm">{t("gateway.verificando")}</p>;
  }

  if (!status.configurado) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-veu/10">
        <Icone name="key_off" className="text-4xl text-outline-variant" />
        <p className="mt-3 text-on-surface-variant text-sm">
          {t("gateway.semCredencial.titulo")}
        </p>
        <p className="text-xs text-outline-variant mt-1 max-w-md mx-auto">
          {t("gateway.semCredencial.antes")}{" "}
          <code className="text-on-surface">ASAAS_API_KEY</code>{" "}
          {t("gateway.semCredencial.depois")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-surface-container-highest/20">
        <Selo
          icone={status.sandbox ? "science" : "warning"}
          rotulo={t("gateway.ambiente")}
          valor={status.sandbox ? t("gateway.sandbox") : t("gateway.producao")}
          alerta={!status.sandbox}
        />
        <Selo icone="key" rotulo={t("gateway.chave")} valor={`…${status.chaveFinal}`} />
        <p className="text-[11px] text-on-surface-variant ml-auto max-w-xs">
          {status.sandbox
            ? t("gateway.avisoSandbox")
            : t("gateway.avisoProducao")}
        </p>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("gateway.formaPagamento")}
            </label>
            <div className="flex gap-2">
              {["PIX", "BOLETO"].map((f) => (
                <button
                  key={f}
                  onClick={() => setForma(f)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    forma === f
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-container-highest/40 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {f === "PIX" ? "PIX" : t("gateway.boleto")}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("gateway.valor")}
            </label>
            <input
              value={valor}
              inputMode="decimal"
              onChange={(e) => setValor(e.target.value)}
              className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <button
          onClick={emitir}
          disabled={emitindo || !status.sandbox}
          className="px-6 py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {emitindo ? t("gateway.emitindo") : t("gateway.gerar")}
        </button>
      </div>

      {resultado && (
        <div className="glass-panel rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Icone name={resultado.cobranca.forma === "PIX" ? "qr_code_2" : "receipt"} />
            </span>
            <div>
              <p className="font-headline font-bold text-on-surface">
                {resultado.cobranca.valorFormatado}
              </p>
              <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                {resultado.cobranca.forma} · {t("gateway.vence", { data: resultado.cobranca.vencimento })} ·{" "}
                {resultado.cobranca.status}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={conferir}
                className="px-4 py-2 rounded-full bg-veu/5 text-on-surface-variant hover:text-on-surface text-sm font-semibold transition cursor-pointer"
              >
                {t("gateway.conferirStatus")}
              </button>
              <button
                onClick={cancelar}
                className="px-4 py-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 text-sm font-semibold transition cursor-pointer"
              >
                {t("comum:acoes.cancelar")}
              </button>
            </div>
          </div>

          {resultado.aviso && (
            <p className="flex items-start gap-2 text-sm text-error">
              <Icone name="error" className="text-base shrink-0 mt-0.5" />
              {resultado.aviso}
            </p>
          )}

          {resultado.pix && (
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {resultado.pix.imagem && (
                <img
                  src={`data:image/png;base64,${resultado.pix.imagem}`}
                  alt={t("gateway.qrAlt")}
                  className="w-40 h-40 rounded-xl bg-white p-2 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {t("gateway.pixCopiaCola")}
                </p>
                <p className="text-xs text-on-surface-variant break-all bg-surface-container-highest/30 rounded-xl p-3 font-mono">
                  {resultado.pix.payload}
                </p>
                <button
                  onClick={() => copiar(resultado.pix.payload, t("gateway.codigoPix"))}
                  className="flex items-center gap-1.5 text-sm text-primary font-semibold cursor-pointer hover:underline"
                >
                  <Icone name="content_copy" className="text-base" />
                  {t("gateway.copiarCodigo")}
                </button>
              </div>
            </div>
          )}

          {resultado.boleto && (
            <div className="space-y-3">
              {resultado.boleto.linhaDigitavel && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    {t("gateway.linhaDigitavel")}
                  </p>
                  <p className="text-sm text-on-surface break-all bg-surface-container-highest/30 rounded-xl p-3 font-mono">
                    {resultado.boleto.linhaDigitavel}
                  </p>
                  <button
                    onClick={() => copiar(resultado.boleto.linhaDigitavel, t("gateway.linhaDigitavel"))}
                    className="flex items-center gap-1.5 text-sm text-primary font-semibold cursor-pointer hover:underline"
                  >
                    <Icone name="content_copy" className="text-base" />
                    {t("gateway.copiarLinha")}
                  </button>
                </div>
              )}
              {resultado.boleto.url && (
                <a
                  href={resultado.boleto.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                >
                  <Icone name="open_in_new" className="text-base" />
                  {t("gateway.abrirBoleto")}
                </a>
              )}
            </div>
          )}

          {resultado.cobranca.linkPagamento && (
            <a
              href={resultado.cobranca.linkPagamento}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface"
            >
              <Icone name="link" className="text-base" />
              {t("gateway.paginaPagamento")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Selo({ icone, rotulo, valor, alerta }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`p-2 rounded-xl ${
          alerta ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
        }`}
      >
        <Icone name={icone} className="text-lg" />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
          {rotulo}
        </p>
        <p className="font-semibold text-on-surface">{valor}</p>
      </div>
    </div>
  );
}
