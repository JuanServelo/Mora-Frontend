// src/components/financeiro/AbaMinhasMultas.jsx
// Morador: multas da unidade e recurso dentro do prazo (RF-16).
import { useCallback, useEffect, useState } from "react";
import { Icone } from "../icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { financeiroApi } from "../../services/financeiroApi";
import { formatarBRL } from "../../utils/dinheiro";
import { formatarData } from "../../utils/datas";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO, Carregando, Janela, Selo, Vazio } from "../adm/financeiro/comum";
import { mensagemDe, quandoLocal } from "../../utils/financeiroTela";

/** A situação contada do ponto de vista de quem recebeu a multa. */
function situacao(m) {
  if (m.status === "CANCELADA") {
    if (!m.faturaItemId) return { texto: "Cancelada", tom: "ok" };
    return m.estornoFaturaItemId
      ? { texto: "Cancelada · valor devolvido em fatura", tom: "ok" }
      : { texto: "Cancelada · valor devolvido na próxima fatura", tom: "ok" };
  }
  if (m.status === "EM_RECURSO") return { texto: "Recurso em análise", tom: "alerta" };
  if (m.faturaItemId) return { texto: "Cobrada na fatura", tom: "neutro" };
  if (m.podeRecorrer) return { texto: `Você pode recorrer até ${formatarData(m.prazoRecurso)}`, tom: "alerta" };
  return { texto: "Será cobrada na próxima fatura", tom: "erro" };
}

export function AbaMinhasMultas() {
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
      toast.error(mensagemDe(err, "Não foi possível carregar as multas."));
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  async function enviar() {
    setEnviando(true);
    try {
      await financeiroApi.recorrerMulta(recorrendo.id, texto);
      toast.success("Recurso enviado. Enquanto o síndico não decidir, a multa não é cobrada.");
      setRecorrendo(null);
      setTexto("");
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível enviar o recurso."));
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Carregando texto="Carregando multas..." />;
  if (!multas.length) return <Vazio icone="verified" texto="Nenhuma multa para a sua unidade." />;

  return (
    <div className="space-y-3">
      {multas.map((m) => {
        const s = situacao(m);
        return (
          <article key={m.id} className="glass-panel rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface">{m.motivo}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Infração em {formatarData(m.dataInfracao)} · aplicada em {quandoLocal(m.criadoEm)}
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
                <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">Seu recurso</p>
                <p className="text-on-surface whitespace-pre-wrap break-words">{m.recursoTexto}</p>
                {m.julgamentoJustificativa && (
                  <p className="text-xs text-on-surface-variant pt-1">Resposta do síndico: {m.julgamentoJustificativa}</p>
                )}
              </div>
            )}

            {m.podeRecorrer && (
              <div className="flex justify-end">
                <button onClick={() => setRecorrendo(m)} className={BOTAO_SECUNDARIO}>
                  <Icone name="gavel" className="text-base" />
                  Recorrer
                </button>
              </div>
            )}
          </article>
        );
      })}

      {recorrendo && (
        <Janela titulo="Recorrer da multa" aoFechar={() => { setRecorrendo(null); setTexto(""); }}>
          <p className="text-sm text-on-surface-variant">
            {recorrendo.motivo} — {formatarBRL(recorrendo.valorCentavos)}. O recurso é um só: depois de
            julgado, a decisão vale.
          </p>
          <div>
            <label className={ROTULO}>Por que a multa não procede</label>
            <textarea
              rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder="Conte o que aconteceu. Se tiver como comprovar, diga como."
              className={CAMPO}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRecorrendo(null); setTexto(""); }} className={`${BOTAO_SECUNDARIO} flex-1`}>Voltar</button>
            <button onClick={enviar} disabled={enviando || texto.trim().length < 10} className={`${BOTAO_PRIMARIO} flex-1`}>
              {enviando ? "Enviando..." : "Enviar recurso"}
            </button>
          </div>
        </Janela>
      )}
    </div>
  );
}
