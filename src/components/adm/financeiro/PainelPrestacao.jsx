// src/components/adm/financeiro/PainelPrestacao.jsx
// Síndico: lançamentos de receita e despesa por competência, e publicação (RF-17).
import { useCallback, useEffect, useState } from "react";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";
import { useConfirm } from "../../../contexts/ConfirmContext";
import { financeiroApi } from "../../../services/financeiroApi";
import { formatarBRL } from "../../../utils/dinheiro";
import { formatarData, formatarCompetencia } from "../../../utils/datas";
import { BOTAO_PRIMARIO, CAMPO, ROTULO, Carregando, Selo, Vazio } from "./comum";
import { hojeCampo, mesAtual, mensagemDe, quandoLocal } from "../../../utils/financeiroTela";

const CATEGORIAS_SUGERIDAS = {
  DESPESA: ["Limpeza", "Manutenção", "Água", "Energia", "Portaria", "Jardinagem", "Seguro", "Administração"],
  RECEITA: ["Aluguel de espaço", "Multas recebidas", "Rendimentos", "Outros"],
};

/**
 * Totais e despesas por categoria. Usado pelo síndico e, igual, pelo morador:
 * o que o síndico vê antes de publicar é exatamente o que o morador vai ver.
 */
export function ResumoPrestacao({ prestacao }) {
  const t = prestacao.totais;
  const maiorDespesa = Math.max(1, ...t.porCategoria.filter((c) => c.tipo === "DESPESA").map((c) => c.valorCentavos));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Receitas</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatarBRL(t.receitasCentavos)}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Despesas</p>
          <p className="text-2xl font-bold text-error mt-1">{formatarBRL(t.despesasCentavos)}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Saldo do mês</p>
          <p className={`text-2xl font-bold mt-1 ${t.saldoCentavos < 0 ? "text-error" : "text-on-surface"}`}>
            {formatarBRL(t.saldoCentavos)}
          </p>
        </div>
      </div>

      {t.porCategoria.length > 0 && (
        <div className="space-y-2">
          <p className={ROTULO}>Por categoria</p>
          {t.porCategoria.map((c) => (
            <div key={`${c.tipo}-${c.categoria}`} className="flex items-center gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${c.tipo === "RECEITA" ? "bg-primary" : "bg-error"}`} />
              <span className="w-40 shrink-0 truncate text-on-surface">
                {c.categoria}
                {c.automatica && <span className="text-on-surface-variant text-xs"> · automática</span>}
              </span>
              <div className="flex-1 h-2 rounded-full bg-veu/5 overflow-hidden">
                {c.tipo === "DESPESA" && (
                  <div className="h-full bg-error/50" style={{ width: `${(c.valorCentavos / maiorDespesa) * 100}%` }} />
                )}
              </div>
              <span className="w-28 text-right font-semibold text-on-surface shrink-0">{formatarBRL(c.valorCentavos)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const VAZIO = { tipo: "DESPESA", categoria: "", descricao: "", valor: "", dataLancamento: "", comprovanteUrl: "" };

export function PainelPrestacao() {
  const toast = useToast();
  const confirm = useConfirm();

  const [competencia, setCompetencia] = useState(mesAtual());
  const [prestacao, setPrestacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await financeiroApi.obterPrestacao(competencia);
      setPrestacao(data.prestacao);
    } catch (err) {
      setPrestacao(null);
      toast.error(mensagemDe(err, "Não foi possível carregar a prestação de contas."));
    } finally {
      setCarregando(false);
    }
  }, [competencia, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  // A data sugerida acompanha a competência: lançamento fora do mês é recusado.
  useEffect(() => {
    const hoje = hojeCampo();
    setForm((f) => ({ ...f, dataLancamento: hoje.startsWith(competencia) ? hoje : `${competencia}-01` }));
  }, [competencia]);

  const publicada = prestacao?.status === "PUBLICADA";

  async function lancar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await financeiroApi.lancar(competencia, { ...form, comprovanteUrl: form.comprovanteUrl || null });
      toast.success("Lançamento registrado.");
      setForm((f) => ({ ...VAZIO, tipo: f.tipo, dataLancamento: f.dataLancamento }));
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível registrar o lançamento."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(l) {
    const ok = await confirm({
      titulo: "Excluir lançamento",
      mensagem: `${l.descricao} — ${formatarBRL(l.valorCentavos)}`,
      confirmarTexto: "Excluir",
      variante: "danger",
    });
    if (!ok) return;
    try {
      await financeiroApi.excluirLancamento(l.id);
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível excluir."));
    }
  }

  async function publicar() {
    const ok = await confirm({
      titulo: "Publicar prestação de contas",
      mensagem: `Os moradores passam a ver a prestação de ${formatarCompetencia(competencia)}. Depois de publicada, ela não aceita mais lançamentos nem exclusões.`,
      confirmarTexto: "Publicar",
    });
    if (!ok) return;
    try {
      await financeiroApi.publicarPrestacao(competencia);
      toast.success("Prestação de contas publicada para os moradores.");
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível publicar."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Competência</label>
          <input
            type="month" value={competencia} onChange={(e) => e.target.value && setCompetencia(e.target.value)}
            className="bg-veu/5 border border-veu/10 rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
          />
          {prestacao && (
            <Selo
              texto={publicada ? `Publicada em ${quandoLocal(prestacao.publicadoEm)}` : "Rascunho"}
              tom={publicada ? "ok" : "neutro"}
            />
          )}
        </div>
        {prestacao && !publicada && (
          <button onClick={publicar} className={BOTAO_PRIMARIO}>
            <Icone name="publish" className="text-lg" />
            Publicar para os moradores
          </button>
        )}
      </div>

      {carregando ? (
        <Carregando texto="Carregando prestação de contas..." />
      ) : prestacao && (
        <>
          <ResumoPrestacao prestacao={prestacao} />

          {prestacao.receitaTaxasCentavos > 0 && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
              <Icone name="info" className="text-sm" />
              A receita de taxas vem das faturas pagas desta competência e entra sozinha.
            </p>
          )}

          {!publicada && (
            <form onSubmit={lancar} className="glass-panel rounded-2xl p-4 space-y-3">
              <p className="font-semibold text-on-surface text-sm">Novo lançamento</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className={ROTULO}>Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value, categoria: "" }))} className={CAMPO}>
                    <option value="DESPESA">Despesa</option>
                    <option value="RECEITA">Receita</option>
                  </select>
                </div>
                <div>
                  <label className={ROTULO}>Categoria</label>
                  <input
                    list="categorias-prestacao" value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                    placeholder="Ex.: Limpeza" className={CAMPO}
                  />
                  <datalist id="categorias-prestacao">
                    {CATEGORIAS_SUGERIDAS[form.tipo].map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className={ROTULO}>Valor (R$)</label>
                  <input type="text" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} className={CAMPO} />
                </div>
                <div>
                  <label className={ROTULO}>Data</label>
                  <input
                    type="date" value={form.dataLancamento}
                    min={`${competencia}-01`} max={`${competencia}-31`}
                    onChange={(e) => setForm((f) => ({ ...f, dataLancamento: e.target.value }))}
                    className={CAMPO}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={ROTULO}>Descrição</label>
                  <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex.: Produtos de limpeza do mês" className={CAMPO} />
                </div>
                <div>
                  <label className={ROTULO}>Link do comprovante (opcional)</label>
                  <input type="url" value={form.comprovanteUrl} onChange={(e) => setForm((f) => ({ ...f, comprovanteUrl: e.target.value }))} placeholder="https://..." className={CAMPO} />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={salvando || !form.categoria.trim() || !form.descricao.trim() || !form.valor || !form.dataLancamento}
                  className={BOTAO_PRIMARIO}
                >
                  <Icone name="add" className="text-lg" />
                  {salvando ? "Lançando..." : "Lançar"}
                </button>
              </div>
            </form>
          )}

          <ListaLancamentos lancamentos={prestacao.lancamentos} aoExcluir={publicada ? null : excluir} />
        </>
      )}
    </div>
  );
}

/** Lançamentos da competência. Sem `aoExcluir`, somente leitura. */
export function ListaLancamentos({ lancamentos, aoExcluir }) {
  if (!lancamentos.length) {
    return <Vazio icone="receipt_long" texto="Nenhum lançamento nesta competência." />;
  }
  return (
    <div className="space-y-2">
      <p className={ROTULO}>Lançamentos</p>
      {lancamentos.map((l) => (
        <div key={l.id} className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3">
          <Icone
            name={l.tipo === "RECEITA" ? "south_west" : "north_east"}
            className={`text-lg ${l.tipo === "RECEITA" ? "text-primary" : "text-error"}`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{l.descricao}</p>
            <p className="text-xs text-on-surface-variant">
              {l.categoria} · {formatarData(l.dataLancamento)}
              {l.comprovanteUrl && (
                <>
                  {" · "}
                  <a href={l.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    comprovante
                  </a>
                </>
              )}
            </p>
          </div>
          <span className={`font-semibold text-sm ${l.tipo === "RECEITA" ? "text-primary" : "text-on-surface"}`}>
            {l.tipo === "RECEITA" ? "+" : "−"} {formatarBRL(l.valorCentavos)}
          </span>
          {aoExcluir && (
            <button
              onClick={() => aoExcluir(l)} aria-label="Excluir lançamento"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition cursor-pointer"
            >
              <Icone name="delete" className="text-lg" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
