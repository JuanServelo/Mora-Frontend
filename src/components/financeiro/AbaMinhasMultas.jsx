// src/components/financeiro/AbaMinhasMultas.jsx
// Morador: multas da unidade e recurso dentro do prazo (RF-16).
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icone } from "../icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { financeiroApi } from "../../services/financeiroApi";
import { formatarBRL } from "../../utils/dinheiro";
import { formatarData } from "../../utils/datas";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO, Carregando, Janela, Selo, Vazio } from "../adm/financeiro/comum";
import { mensagemDe, quandoLocal } from "../../utils/financeiroTela";

/** A situação contada do ponto de vista de quem recebeu a multa. */
function situacao(m, t) {
  if (m.status === "CANCELADA") {
    if (!m.faturaItemId) return { texto: t("minhasMultas.situacao.cancelada"), tom: "ok" };
    return m.estornoFaturaItemId
      ? { texto: t("minhasMultas.situacao.canceladaDevolvida"), tom: "ok" }
      : { texto: t("minhasMultas.situacao.canceladaProxima"), tom: "ok" };
  }
  if (m.status === "EM_RECURSO") return { texto: t("minhasMultas.situacao.emAnalise"), tom: "alerta" };
  if (m.faturaItemId) return { texto: t("minhasMultas.situacao.cobrada"), tom: "neutro" };
  if (m.podeRecorrer) return { texto: t("minhasMultas.situacao.podeRecorrer", { data: formatarData(m.prazoRecurso) }), tom: "alerta" };
  return { texto: t("minhasMultas.situacao.seraCobrada"), tom: "erro" };
}

export function AbaMinhasMultas() {
  const { t } = useTranslation("financeiro");
  const toast = useToast();
  const [multas, setMultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [recorrendo, setRecorrendo] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await financeiroApi.minhasMultas();
      setMultas(data.multas ?? []);
    } catch (err) {
      toast.error(mensagemDe(err, t("multas.toast.erroCarregar")));
    } finally {
      setCarregando(false);
    }
  }, [toast, t]);

  useEffect(() => { carregar(); }, [carregar]);

  async function enviar() {
    setEnviando(true);
    try {
      await financeiroApi.recorrerMulta(recorrendo.id, texto);
      toast.success(t("minhasMultas.toast.enviado"));
      setRecorrendo(null);
      setTexto("");
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, t("minhasMultas.toast.erroEnviar")));
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Carregando texto={t("multas.carregando")} />;
  if (!multas.length) return <Vazio icone="verified" texto={t("minhasMultas.vazio")} />;

  return (
    <div className="space-y-3">
      {multas.map((m) => {
        const s = situacao(m, t);
        return (
          <article key={m.id} className="glass-panel rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface">{m.motivo}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {t("minhasMultas.datas", { infracao: formatarData(m.dataInfracao), aplicada: quandoLocal(m.criadoEm) })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-bold ${m.status === "CANCELADA" ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                  {formatarBRL(m.valorCentavos)}
                </p>
                <Selo texto={s.texto} tom={s.tom} />
              </div>
            </div>

            {m.recursoTexto && (
              <div className="rounded-xl bg-veu/5 p-3 text-sm space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">{t("minhasMultas.seuRecurso")}</p>
                <p className="text-on-surface whitespace-pre-wrap break-words">{m.recursoTexto}</p>
                {m.julgamentoJustificativa && (
                  <p className="text-xs text-on-surface-variant pt-1">{t("minhasMultas.resposta", { texto: m.julgamentoJustificativa })}</p>
                )}
              </div>
            )}

            {m.podeRecorrer && (
              <div className="flex justify-end">
                <button onClick={() => setRecorrendo(m)} className={BOTAO_SECUNDARIO}>
                  <Icone name="gavel" className="text-base" />
                  {t("minhasMultas.recorrer")}
                </button>
              </div>
            )}
          </article>
        );
      })}

      {recorrendo && (
        <Janela titulo={t("minhasMultas.modal.titulo")} aoFechar={() => { setRecorrendo(null); setTexto(""); }}>
          <p className="text-sm text-on-surface-variant">
            {recorrendo.motivo} — {formatarBRL(recorrendo.valorCentavos)}. {t("minhasMultas.modal.aviso")}
          </p>
          <div>
            <label className={ROTULO}>{t("minhasMultas.modal.motivo")}</label>
            <textarea
              rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder={t("minhasMultas.modal.motivoPlaceholder")}
              className={CAMPO}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRecorrendo(null); setTexto(""); }} className={`${BOTAO_SECUNDARIO} flex-1`}>{t("comum:acoes.voltar")}</button>
            <button onClick={enviar} disabled={enviando || texto.trim().length < 10} className={`${BOTAO_PRIMARIO} flex-1`}>
              {enviando ? t("minhasMultas.modal.enviando") : t("minhasMultas.modal.enviar")}
            </button>
          </div>
        </Janela>
      )}
    </div>
  );
}
