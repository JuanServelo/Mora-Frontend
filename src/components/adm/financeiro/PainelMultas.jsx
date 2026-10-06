// src/components/adm/financeiro/PainelMultas.jsx
// Síndico: aplicar multa, julgar recurso e cancelar (RF-16).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icone } from "../../icones/Icone";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { financeiroApi } from "../../../services/financeiroApi";
import { apartamentoApi } from "../../../services/estruturasApi";
import { userManagementApi } from "../../../services/userManagementApi";
import { formatarBRL } from "../../../utils/dinheiro";
import { formatarData } from "../../../utils/datas";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO, Carregando, Janela, Selo, Vazio } from "./comum";
import { hojeCampo, mensagemDe, quandoLocal } from "../../../utils/financeiroTela";

const FILTROS = [
  { id: "", label: "Todas" },
  { id: "EM_RECURSO", label: "Em recurso" },
  { id: "APLICADA", label: "Aplicadas" },
  { id: "CANCELADA", label: "Canceladas" },
];

/** Situação da multa em uma linha, do jeito que o síndico pensa nela. */
function situacaoDaMulta(m) {
  if (m.status === "CANCELADA") {
    return m.faturaItemId
      ? { texto: m.estornoFaturaItemId ? "Cancelada · estornada" : "Cancelada · estorno no próximo fechamento", tom: "neutro" }
      : { texto: "Cancelada", tom: "neutro" };
  }
  if (m.status === "EM_RECURSO") return { texto: "Recurso para julgar", tom: "alerta" };
  if (m.faturaItemId) return { texto: "Cobrada", tom: "ok" };
  if (m.aguardandoCobranca) return { texto: "Entra no próximo fechamento", tom: "ok" };
  return { texto: `Prazo de recurso até ${formatarData(m.prazoRecurso)}`, tom: "neutro" };
}

const VAZIO = { unidadeId: "", usuarioId: "", valor: "", dataInfracao: "", motivo: "" };

export function PainelMultas() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [filtro, setFiltro] = useState("");
  const [multas, setMultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [unidades, setUnidades] = useState([]);

  const [aplicando, setAplicando] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [moradores, setMoradores] = useState([]);
  const [salvando, setSalvando] = useState(false);

  // { multa, acao: "aceitar" | "recusar" | "cancelar" }
  const [decisao, setDecisao] = useState(null);
  const [justificativa, setJustificativa] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await financeiroApi.listarMultas(filtro ? { status: filtro } : {});
      setMultas(data.multas ?? []);
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível carregar as multas."));
    } finally {
      setCarregando(false);
    }
  }, [filtro, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!usuario?.condominioId) return;
    apartamentoApi.listarTodos(usuario.condominioId)
      .then(({ data }) => setUnidades(Array.isArray(data) ? data : []))
      .catch(() => setUnidades([]));
  }, [usuario?.condominioId]);

  const nomeUnidade = useMemo(() => {
    const mapa = new Map(unidades.map((u) => [u.id, `Apto ${u.numero}${u.blocoNome ? ` · ${u.blocoNome}` : ""}`]));
    return (id) => mapa.get(id) ?? "Unidade";
  }, [unidades]);

  async function escolherUnidade(unidadeId) {
    setForm((f) => ({ ...f, unidadeId, usuarioId: "" }));
    setMoradores([]);
    if (!unidadeId) return;
    try {
      const { data } = await userManagementApi.listarResidentes(unidadeId);
      setMoradores(data.moradores ?? []);
    } catch {
      setMoradores([]);
    }
  }

  async function aplicar() {
    setSalvando(true);
    try {
      await financeiroApi.aplicarMulta({
        unidadeId: form.unidadeId,
        usuarioId: form.usuarioId || null,
        valor: form.valor,
        dataInfracao: form.dataInfracao,
        motivo: form.motivo,
      });
      toast.success("Multa aplicada. O morador a vê no financeiro dele e pode recorrer dentro do prazo.");
      setAplicando(false);
      setForm(VAZIO);
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível aplicar a multa."));
    } finally {
      setSalvando(false);
    }
  }

  async function decidir() {
    const { multa, acao } = decisao;
    setSalvando(true);
    try {
      if (acao === "cancelar") {
        const { data } = await financeiroApi.cancelarMulta(multa.id, justificativa);
        toast.success(data.multa?.estornoNoProximoFechamento
          ? "Multa cancelada. Como já foi cobrada, o estorno entra no próximo fechamento."
          : "Multa cancelada.");
      } else {
        await financeiroApi.julgarRecurso(multa.id, acao === "aceitar", justificativa);
        toast.success(acao === "aceitar" ? "Recurso aceito: multa cancelada." : "Recurso recusado: multa mantida.");
      }
      setDecisao(null);
      setJustificativa("");
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível registrar a decisão."));
    } finally {
      setSalvando(false);
    }
  }

  const emRecurso = multas.filter((m) => m.status === "EM_RECURSO").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                filtro === f.id ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-veu/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setForm({ ...VAZIO, dataInfracao: hojeCampo() }); setAplicando(true); }} className={BOTAO_PRIMARIO}>
          <Icone name="gavel" className="text-lg" />
          Aplicar multa
        </button>
      </div>

      {!filtro && emRecurso > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3 border border-secondary/25 bg-secondary/5 text-sm">
          <Icone name="pending_actions" className="text-secondary text-xl" />
          <span className="text-on-surface">
            {emRecurso} recurso{emRecurso > 1 ? "s" : ""} aguardando julgamento. Enquanto não for julgada, a multa não é cobrada.
          </span>
        </div>
      )}

      {carregando ? (
        <Carregando texto="Carregando multas..." />
      ) : multas.length === 0 ? (
        <Vazio icone="gavel" texto={filtro ? "Nenhuma multa com este status." : "Nenhuma multa aplicada."} />
      ) : (
        <div className="space-y-3">
          {multas.map((m) => {
            const situacao = situacaoDaMulta(m);
            const aberta = m.status === "APLICADA" || m.status === "EM_RECURSO";
            return (
              <article key={m.id} className="glass-panel rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-on-surface">{m.motivo}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {nomeUnidade(m.unidadeId)} · infração em {formatarData(m.dataInfracao)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${m.status === "CANCELADA" ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                      {formatarBRL(m.valorCentavos)}
                    </p>
                    <Selo texto={situacao.texto} tom={situacao.tom} />
                  </div>
                </div>

                {m.recursoTexto && (
                  <div className="rounded-xl bg-veu/5 p-3 text-sm">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Recurso do morador · {quandoLocal(m.recursoEm)}
                    </p>
                    <p className="text-on-surface whitespace-pre-wrap break-words">{m.recursoTexto}</p>
                    {m.julgamentoJustificativa && (
                      <p className="text-on-surface-variant text-xs mt-2">
                        Decisão: {m.julgamentoJustificativa}
                      </p>
                    )}
                  </div>
                )}

                {aberta && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {m.status === "EM_RECURSO" && (
                      <>
                        <button onClick={() => setDecisao({ multa: m, acao: "recusar" })} className={BOTAO_SECUNDARIO}>
                          Recusar recurso
                        </button>
                        <button onClick={() => setDecisao({ multa: m, acao: "aceitar" })} className={BOTAO_PRIMARIO}>
                          Aceitar recurso
                        </button>
                      </>
                    )}
                    {m.status === "APLICADA" && (
                      <button onClick={() => setDecisao({ multa: m, acao: "cancelar" })} className={BOTAO_SECUNDARIO}>
                        <Icone name="block" className="text-base" />
                        Cancelar multa
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {aplicando && (
        <Janela titulo="Aplicar multa" aoFechar={() => setAplicando(false)}>
          <div>
            <label className={ROTULO}>Unidade</label>
            <select value={form.unidadeId} onChange={(e) => escolherUnidade(e.target.value)} className={CAMPO}>
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{nomeUnidade(u.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={ROTULO}>Morador (opcional)</label>
            <select
              value={form.usuarioId}
              onChange={(e) => setForm((f) => ({ ...f, usuarioId: e.target.value }))}
              disabled={!form.unidadeId}
              className={CAMPO}
            >
              <option value="">A infração é da unidade</option>
              {moradores.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ROTULO}>Valor (R$)</label>
              <input
                type="text" inputMode="decimal" placeholder="0,00" value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                className={CAMPO}
              />
            </div>
            <div>
              <label className={ROTULO}>Data da infração</label>
              <input
                type="date" max={hojeCampo()} value={form.dataInfracao}
                onChange={(e) => setForm((f) => ({ ...f, dataInfracao: e.target.value }))}
                className={CAMPO}
              />
            </div>
          </div>
          <div>
            <label className={ROTULO}>Motivo</label>
            <textarea
              rows={3} placeholder="O que aconteceu e qual regra do regimento foi descumprida"
              value={form.motivo}
              onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
              className={CAMPO}
            />
          </div>
          <p className="text-xs text-on-surface-variant">
            O morador recebe o aviso e pode recorrer no prazo definido nas regras do financeiro.
            A multa só entra na fatura depois que o prazo vence.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setAplicando(false)} className={`${BOTAO_SECUNDARIO} flex-1`}>Cancelar</button>
            <button
              onClick={aplicar}
              disabled={salvando || !form.unidadeId || !form.valor || !form.dataInfracao || !form.motivo.trim()}
              className={`${BOTAO_PRIMARIO} flex-1`}
            >
              {salvando ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        </Janela>
      )}

      {decisao && (
        <Janela
          titulo={{
            aceitar: "Aceitar recurso",
            recusar: "Recusar recurso",
            cancelar: "Cancelar multa",
          }[decisao.acao]}
          aoFechar={() => { setDecisao(null); setJustificativa(""); }}
        >
          <p className="text-sm text-on-surface-variant">
            {decisao.acao === "aceitar" && "A multa será cancelada e não será cobrada."}
            {decisao.acao === "recusar" && "A multa volta a valer e entra no próximo fechamento depois do prazo."}
            {decisao.acao === "cancelar" && (decisao.multa.faturaItemId
              ? "A multa já foi cobrada: o valor será estornado no próximo fechamento."
              : "A multa deixa de valer e não será cobrada.")}
          </p>
          <div>
            <label className={ROTULO}>Justificativa</label>
            <textarea
              rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
              placeholder="O morador verá esta explicação"
              className={CAMPO}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setDecisao(null); setJustificativa(""); }} className={`${BOTAO_SECUNDARIO} flex-1`}>
              Voltar
            </button>
            <button onClick={decidir} disabled={salvando || justificativa.trim().length < 5} className={`${BOTAO_PRIMARIO} flex-1`}>
              {salvando ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </Janela>
      )}
    </div>
  );
}
