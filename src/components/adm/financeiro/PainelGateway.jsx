import { useEffect, useState } from "react";
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
      else toast.success("Cobrança de teste criada no sandbox.");
    } catch (e) {
      toast.error(e.response?.data?.mensagem || "Erro ao falar com o gateway.");
    } finally {
      setEmitindo(false);
    }
  }

  async function conferir() {
    try {
      const { data } = await financeiroApi.consultarCobrancaTeste(resultado.cobranca.id);
      toast.success(
        `Status: ${data.cobranca.status}${data.cobranca.pagoEm ? ` · pago em ${data.cobranca.pagoEm}` : ""}`,
      );
    } catch {
      toast.error("Não foi possível consultar a cobrança.");
    }
  }

  async function cancelar() {
    try {
      await financeiroApi.cancelarCobrancaTeste(resultado.cobranca.id);
      toast.success("Cobrança de teste cancelada.");
      setResultado(null);
    } catch {
      toast.error("Não foi possível cancelar a cobrança.");
    }
  }

  function copiar(texto, rotulo) {
    navigator.clipboard
      .writeText(texto)
      .then(() => toast.success(`${rotulo} copiado.`))
      .catch(() => toast.error("Não foi possível copiar."));
  }

  if (!status) {
    return <p className="text-on-surface-variant text-sm">Verificando o gateway…</p>;
  }

  if (!status.configurado) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
        <Icone name="key_off" className="text-4xl text-outline-variant" />
        <p className="mt-3 text-on-surface-variant text-sm">
          Nenhuma credencial de gateway configurada.
        </p>
        <p className="text-xs text-outline-variant mt-1 max-w-md mx-auto">
          Defina <code className="text-on-surface">ASAAS_API_KEY</code> no ambiente
          do serviço para habilitar as cobranças.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-surface-container-highest/20">
        <Selo
          icone={status.sandbox ? "science" : "warning"}
          rotulo="Ambiente"
          valor={status.sandbox ? "Sandbox" : "PRODUÇÃO"}
          alerta={!status.sandbox}
        />
        <Selo icone="key" rotulo="Chave" valor={`…${status.chaveFinal}`} />
        <p className="text-[11px] text-on-surface-variant ml-auto max-w-xs">
          {status.sandbox
            ? "Cobranças criadas aqui são fictícias e não movimentam dinheiro."
            : "Fora do sandbox esta tela não emite cobrança."}
        </p>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Forma de pagamento
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
                  {f === "PIX" ? "PIX" : "Boleto"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Valor
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
          {emitindo ? "Emitindo…" : "Gerar cobrança"}
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
                {resultado.cobranca.forma} · vence {resultado.cobranca.vencimento} ·{" "}
                {resultado.cobranca.status}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={conferir}
                className="px-4 py-2 rounded-full bg-white/5 text-on-surface-variant hover:text-on-surface text-sm font-semibold transition cursor-pointer"
              >
                Conferir status
              </button>
              <button
                onClick={cancelar}
                className="px-4 py-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 text-sm font-semibold transition cursor-pointer"
              >
                Cancelar
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
                  alt="QR Code do PIX de teste"
                  className="w-40 h-40 rounded-xl bg-white p-2 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  PIX copia e cola
                </p>
                <p className="text-xs text-on-surface-variant break-all bg-surface-container-highest/30 rounded-xl p-3 font-mono">
                  {resultado.pix.payload}
                </p>
                <button
                  onClick={() => copiar(resultado.pix.payload, "Código PIX")}
                  className="flex items-center gap-1.5 text-sm text-primary font-semibold cursor-pointer hover:underline"
                >
                  <Icone name="content_copy" className="text-base" />
                  Copiar código
                </button>
              </div>
            </div>
          )}

          {resultado.boleto && (
            <div className="space-y-3">
              {resultado.boleto.linhaDigitavel && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Linha digitável
                  </p>
                  <p className="text-sm text-on-surface break-all bg-surface-container-highest/30 rounded-xl p-3 font-mono">
                    {resultado.boleto.linhaDigitavel}
                  </p>
                  <button
                    onClick={() => copiar(resultado.boleto.linhaDigitavel, "Linha digitável")}
                    className="flex items-center gap-1.5 text-sm text-primary font-semibold cursor-pointer hover:underline"
                  >
                    <Icone name="content_copy" className="text-base" />
                    Copiar linha
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
                  Abrir boleto
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
              Página de pagamento do gateway
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
