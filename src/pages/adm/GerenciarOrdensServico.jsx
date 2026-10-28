// src/pages/adm/GerenciarOrdensServico.jsx
// Ordens de serviço (manutenção corretiva e preventiva) e os fornecedores que
// as executam. As OS vêm do ocorrencias-service.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ordensServicoApi,
  fornecedoresApi,
  reclamacoesApi,
  mensagemDeErro,
} from "../../services/ocorrenciasApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { CartaoKpi } from "../../components/cards/CartaoKpi";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { PERFIS } from "../../utils/perfis";
import { formatarData } from "../../utils/datas";
import {
  STATUS_OS,
  PRIORIDADES,
  statusOs,
  prioridade,
  rotuloCategoria,
  dataHora,
  reais,
} from "../../utils/ocorrencias";

const hoje = () => new Date().toLocaleDateString("sv-SE");

const n = (v) => (v === null || v === undefined ? "—" : v);

const CLASSE_SELECT =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all";

function TextArea({ label, ...props }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      <textarea
        className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all resize-none"
        {...props}
      />
    </div>
  );
}

function Rotulo({ children }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{children}</label>
  );
}

// ─── Nova OS ────────────────────────────────
const OS_VAZIA = { descricao: "", prioridade: "MEDIA", prazo: "", responsavel: "", fornecedorId: "" };

function FormNovaOs({ origem, fornecedores, onCriada, onCancelar }) {
  const toast = useToast();
  const [form, setForm] = useState(OS_VAZIA);
  const [enviando, setEnviando] = useState(false);

  const campo = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.responsavel.trim() && !form.fornecedorId) {
      toast.warning("Informe o responsável ou escolha um fornecedor.");
      return;
    }
    setEnviando(true);
    try {
      const res = await ordensServicoApi.abrir({
        descricao: form.descricao.trim(),
        prioridade: form.prioridade,
        prazo: form.prazo,
        responsavel: form.responsavel.trim() || undefined,
        fornecedorId: form.fornecedorId ? Number(form.fornecedorId) : undefined,
        reclamacaoId: origem?.id,
      });
      toast.success(origem ? "OS aberta. O morador foi avisado." : "OS preventiva aberta.");
      setForm(OS_VAZIA);
      onCriada(res.data);
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível abrir a OS."));
    } finally {
      setEnviando(false);
    }
  };

  const ativos = fornecedores.filter((f) => f.ativo);

  return (
    <form onSubmit={enviar} className="glass-panel rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">Nova ordem de serviço</h2>
          {origem ? (
            <p className="text-sm text-on-surface-variant mt-1">
              A partir da ocorrência <span className="font-mono text-on-surface">{origem.protocolo}</span> ·{" "}
              {rotuloCategoria(origem.categoria)}
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant mt-1">Manutenção preventiva, sem ocorrência de origem.</p>
          )}
        </div>
        <button type="button" onClick={onCancelar} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
          <Icone name="close" />
        </button>
      </div>

      {origem?.descricao && (
        <p className="text-sm text-on-surface-variant bg-surface-container-highest/30 rounded-xl p-3 whitespace-pre-line">
          {origem.descricao}
        </p>
      )}

      <TextArea
        label="Descrição do serviço"
        name="descricao"
        value={form.descricao}
        onChange={campo}
        rows={3}
        maxLength={5000}
        required
        placeholder="O que precisa ser feito"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Rotulo>Prioridade</Rotulo>
          <select name="prioridade" value={form.prioridade} onChange={campo} className={CLASSE_SELECT}>
            {Object.entries(PRIORIDADES).map(([p, cfg]) => (
              <option key={p} value={p}>{cfg.rotulo}</option>
            ))}
          </select>
        </div>
        <Campo label="Prazo" name="prazo" type="date" min={hoje()} value={form.prazo} onChange={campo} required />
        <div className="space-y-2">
          <Rotulo>Fornecedor (opcional)</Rotulo>
          <select name="fornecedorId" value={form.fornecedorId} onChange={campo} className={CLASSE_SELECT}>
            <option value="">Nenhum</option>
            {ativos.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}{f.servico ? ` — ${f.servico}` : ""}
              </option>
            ))}
          </select>
        </div>
        <Campo
          label="Responsável"
          name="responsavel"
          value={form.responsavel}
          onChange={campo}
          maxLength={150}
          placeholder={form.fornecedorId ? "Vazio = o fornecedor" : "Quem executa"}
        />
      </div>

      <Botao type="submit" disabled={enviando}>
        <Icone name="add_task" /> {enviando ? "Abrindo…" : "Abrir ordem de serviço"}
      </Botao>
    </form>
  );
}

// ─── Detalhe da OS ──────────────────────────
function DetalheOs({ id, podeEditar, onAtualizada }) {
  const toast = useToast();
  const [os, setOs] = useState(null);
  const [andamento, setAndamento] = useState("");
  const [conclusao, setConclusao] = useState({ custo: "", observacoes: "" });
  const [concluindo, setConcluindo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ok = true;
    ordensServicoApi
      .detalhar(id)
      .then((res) => ok && setOs(res.data))
      .catch((err) => toast.error(mensagemDeErro(err, "Não foi possível carregar a OS.")));
    return () => {
      ok = false;
    };
  }, [id, toast]);

  const aplicar = (atual) => {
    setOs(atual);
    onAtualizada(atual);
  };

  const registrarAndamento = async () => {
    if (!andamento.trim()) return;
    setEnviando(true);
    try {
      const res = await ordensServicoApi.registrarAndamento(id, andamento.trim());
      aplicar(res.data);
      setAndamento("");
      toast.success("Andamento registrado.");
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível registrar o andamento."));
    } finally {
      setEnviando(false);
    }
  };

  const concluir = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await ordensServicoApi.concluir(id, {
        custo: Number(String(conclusao.custo).replace(",", ".")),
        observacoes: conclusao.observacoes.trim(),
      });
      aplicar(res.data);
      setConcluindo(false);
      toast.success("OS concluída.");
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível concluir a OS."));
    } finally {
      setEnviando(false);
    }
  };

  if (!os) {
    return <div className="px-6 pb-5 pt-4 text-sm text-on-surface-variant">Carregando…</div>;
  }

  const aberta = os.status !== "CONCLUIDA";

  return (
    <div className="px-6 pb-5 border-t border-veu/5 pt-4 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-highest/30 rounded-xl p-3">
          <p className="text-xs text-on-surface-variant mb-1">Responsável</p>
          <p className="text-sm font-semibold text-on-surface break-words">{os.responsavel}</p>
          {os.fornecedor?.telefone && <p className="text-xs text-on-surface-variant">{os.fornecedor.telefone}</p>}
        </div>
        <div className="bg-surface-container-highest/30 rounded-xl p-3">
          <p className="text-xs text-on-surface-variant mb-1">Origem</p>
          <p className="text-sm font-semibold text-on-surface">
            {os.reclamacao ? `Ocorrência ${os.reclamacao.protocolo}` : "Preventiva"}
          </p>
        </div>
        <div className="bg-surface-container-highest/30 rounded-xl p-3">
          <p className="text-xs text-on-surface-variant mb-1">Aberta em</p>
          <p className="text-sm font-semibold text-on-surface">{dataHora(os.criadoEm)}</p>
          {os.abertaPorEmail && <p className="text-xs text-on-surface-variant break-words">{os.abertaPorEmail}</p>}
        </div>
        <div className="bg-surface-container-highest/30 rounded-xl p-3">
          <p className="text-xs text-on-surface-variant mb-1">{aberta ? "Prazo" : "Concluída em"}</p>
          <p className="text-sm font-semibold text-on-surface">
            {aberta ? formatarData(os.prazo) : dataHora(os.concluidaEm)}
          </p>
          {!aberta && (
            <p className={`text-xs font-semibold ${os.concluidaNoPrazo ? "text-green-400" : "text-error"}`}>
              {os.concluidaNoPrazo ? "No prazo" : `Fora do prazo (${formatarData(os.prazo)})`}
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Descrição</p>
        <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3 whitespace-pre-line">
          {os.descricao}
        </p>
      </div>

      {!aberta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-surface-container-highest/30 rounded-xl p-3">
            <p className="text-xs text-on-surface-variant mb-1">Custo</p>
            <p className="text-sm font-semibold text-on-surface">{reais(os.custo)}</p>
          </div>
          <div className="bg-surface-container-highest/30 rounded-xl p-3 sm:col-span-2">
            <p className="text-xs text-on-surface-variant mb-1">Observações</p>
            <p className="text-sm text-on-surface whitespace-pre-line">{os.observacoes}</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Andamento</p>
        <div className="space-y-2">
          {(os.andamentos ?? []).map((a) => (
            <div key={a.id} className="bg-surface-container-highest/30 rounded-xl p-3 border-l-2 border-primary/40 space-y-1">
              <p className="text-sm text-on-surface whitespace-pre-line">{a.mensagem}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <span>{dataHora(a.criadoEm)}</span>
                <span>· {a.sistema ? "Sistema" : a.autorEmail}</span>
                {a.statusNovo && (
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${statusOs(a.statusNovo).cor}`}>
                    {a.statusAnterior ? `${statusOs(a.statusAnterior).rotulo} → ` : ""}{statusOs(a.statusNovo).rotulo}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {podeEditar && aberta && !concluindo && (
        <div className="space-y-3">
          <TextArea
            label="Registrar andamento"
            value={andamento}
            onChange={(e) => setAndamento(e.target.value)}
            rows={2}
            maxLength={5000}
            placeholder={os.status === "ABERTA" ? "O primeiro andamento põe a OS em execução" : "O que foi feito"}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={registrarAndamento}
              disabled={enviando || !andamento.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Icone name="send" className="text-base" /> Registrar
            </button>
            <button
              type="button"
              onClick={() => setConcluindo(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 text-green-400 font-semibold text-sm hover:bg-green-500/20 transition-all cursor-pointer"
            >
              <Icone name="task_alt" className="text-base" /> Concluir OS
            </button>
          </div>
        </div>
      )}

      {podeEditar && aberta && concluindo && (
        <form onSubmit={concluir} className="space-y-3 bg-surface-container-highest/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-on-surface">Encerramento</p>
          <Campo
            label="Custo (R$)"
            type="number"
            min="0"
            step="0.01"
            value={conclusao.custo}
            onChange={(e) => setConclusao((c) => ({ ...c, custo: e.target.value }))}
            placeholder="0,00"
            required
          />
          <TextArea
            label="Observações"
            value={conclusao.observacoes}
            onChange={(e) => setConclusao((c) => ({ ...c, observacoes: e.target.value }))}
            rows={3}
            maxLength={5000}
            required
            placeholder="O que foi feito, peças trocadas, garantia..."
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/15 text-green-400 font-semibold text-sm hover:bg-green-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Icone name="task_alt" className="text-base" /> {enviando ? "Concluindo…" : "Confirmar conclusão"}
            </button>
            <button
              type="button"
              onClick={() => setConcluindo(false)}
              className="px-4 py-2.5 rounded-xl text-on-surface-variant text-sm hover:bg-veu/5 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Aba: Ordens ────────────────────────────
function AbaOrdens({ podeEditar, fornecedores }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [ordens, setOrdens] = useState([]);
  const [indicadores, setIndicadores] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("TODAS");
  const [expandida, setExpandida] = useState(params.get("os") ? Number(params.get("os")) : null);
  const [origem, setOrigem] = useState(null);
  const [novaAberta, setNovaAberta] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [lista, est] = await Promise.all([ordensServicoApi.listar(), ordensServicoApi.estatisticas()]);
      setOrdens(lista.data || []);
      setIndicadores(est.data);
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível carregar as ordens de serviço."));
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Veio de uma ocorrência ("Abrir ordem de serviço"): o formulário abre já
  // com ela como origem.
  useEffect(() => {
    const reclamacaoId = params.get("reclamacao");
    if (!reclamacaoId || !podeEditar) return;
    reclamacoesApi
      .detalhar(reclamacaoId)
      .then((res) => {
        setOrigem(res.data);
        setNovaAberta(true);
      })
      .catch((err) => toast.error(mensagemDeErro(err, "Ocorrência não encontrada.")));
  }, [params, podeEditar, toast]);

  const fecharForm = () => {
    setNovaAberta(false);
    setOrigem(null);
    if (params.get("reclamacao")) {
      params.delete("reclamacao");
      setParams(params, { replace: true });
    }
  };

  const criada = (os) => {
    fecharForm();
    setExpandida(os.id);
    carregar();
  };

  const atualizada = (os) => {
    setOrdens((prev) => prev.map((o) => (o.id === os.id ? { ...os, andamentos: null } : o)));
    ordensServicoApi.estatisticas().then((r) => setIndicadores(r.data)).catch(() => {});
  };

  const filtradas = filtro === "TODAS" ? ordens : ordens.filter((o) => o.status === filtro);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoKpi
          valor={n(indicadores && indicadores.abertas + indicadores.emExecucao)}
          label="Em aberto"
          sub={indicadores ? `${indicadores.emExecucao} em execução` : undefined}
          icone="assignment"
        />
        <CartaoKpi
          valor={n(indicadores?.atrasadas)}
          label="Atrasadas"
          tom={indicadores?.atrasadas ? "error" : "neutro"}
          icone="alarm"
          onClick={() => setFiltro("ATRASADA")}
        />
        <CartaoKpi
          valor={n(indicadores?.criticasAtrasadas)}
          label="Críticas atrasadas"
          tom={indicadores?.criticasAtrasadas ? "error" : "neutro"}
          icone="priority_high"
        />
        <CartaoKpi
          valor={indicadores?.percentualNoPrazo != null ? `${indicadores.percentualNoPrazo}%` : "—"}
          label="Concluídas no prazo"
          sub={indicadores ? `${indicadores.concluidasNoPrazo} de ${indicadores.concluidas}` : undefined}
          tom="primary"
          icone="task_alt"
        />
      </section>

      {novaAberta ? (
        <FormNovaOs origem={origem} fornecedores={fornecedores} onCriada={criada} onCancelar={fecharForm} />
      ) : (
        podeEditar && (
          <button
            type="button"
            onClick={() => setNovaAberta(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/25 transition-all cursor-pointer"
          >
            <Icone name="add" className="text-lg" /> Nova OS preventiva
          </button>
        )
      )}

      <div className="flex flex-wrap gap-2">
        {["TODAS", ...Object.keys(STATUS_OS)].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltro(s)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtro === s ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-veu/5"
            }`}
          >
            {s === "TODAS" ? "Todas" : STATUS_OS[s].rotulo}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="glass-panel rounded-2xl py-16 text-center text-on-surface-variant text-sm">Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
          <Icone name="construction" className="text-5xl opacity-30" />
          <p className="text-sm">Nenhuma ordem de serviço.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((os) => {
            const st = statusOs(os.status);
            const pr = prioridade(os.prioridade);
            return (
              <div key={os.id} className="glass-panel rounded-2xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left cursor-pointer hover:bg-veu/5 transition-all"
                  onClick={() => setExpandida(expandida === os.id ? null : os.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${st.cor}`}>
                      <Icone name={st.icone} className="text-xl" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-mono text-on-surface">{os.numero}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pr.cor}`}>{pr.rotulo}</span>
                        {os.reclamacao ? (
                          <span className="text-xs text-primary">{os.reclamacao.protocolo}</span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">Preventiva</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-1 max-w-md">{os.descricao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden md:inline text-xs text-on-surface-variant">
                      {os.status === "CONCLUIDA" ? `Concluída ${dataHora(os.concluidaEm).slice(0, 10)}` : `Prazo ${formatarData(os.prazo)}`}
                    </span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${st.cor}`}>{st.rotulo}</span>
                    <Icone name={expandida === os.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
                  </div>
                </button>
                {expandida === os.id && <DetalheOs id={os.id} podeEditar={podeEditar} onAtualizada={atualizada} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Aba: Fornecedores ──────────────────────
const FORNECEDOR_VAZIO = { nome: "", servico: "", telefone: "", email: "", documento: "" };

function AbaFornecedores({ podeEditar, fornecedores, onMudou }) {
  const toast = useToast();
  const [form, setForm] = useState(FORNECEDOR_VAZIO);
  const [editando, setEditando] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const campo = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const editar = (f) => {
    setEditando(f.id);
    setForm({
      nome: f.nome ?? "",
      servico: f.servico ?? "",
      telefone: f.telefone ?? "",
      email: f.email ?? "",
      documento: f.documento ?? "",
    });
  };

  const cancelar = () => {
    setEditando(null);
    setForm(FORNECEDOR_VAZIO);
  };

  const salvar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      if (editando) {
        await fornecedoresApi.atualizar(editando, form);
        toast.success("Fornecedor atualizado.");
      } else {
        await fornecedoresApi.criar(form);
        toast.success("Fornecedor cadastrado.");
      }
      cancelar();
      onMudou();
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível salvar o fornecedor."));
    } finally {
      setEnviando(false);
    }
  };

  const alternarAtivo = async (f) => {
    try {
      await fornecedoresApi.atualizar(f.id, { ...f, ativo: !f.ativo });
      toast.success(f.ativo ? "Fornecedor desativado." : "Fornecedor reativado.");
      onMudou();
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível alterar o fornecedor."));
    }
  };

  return (
    <div className="space-y-6">
      {podeEditar && (
        <form onSubmit={salvar} className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            {editando ? "Editar fornecedor" : "Cadastrar fornecedor"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Nome" name="nome" value={form.nome} onChange={campo} maxLength={150} required />
            <Campo label="Serviço" name="servico" value={form.servico} onChange={campo} maxLength={100} placeholder="Elétrica, elevadores..." />
            <Campo label="Telefone" name="telefone" value={form.telefone} onChange={campo} maxLength={20} />
            <Campo label="E-mail" name="email" type="email" value={form.email} onChange={campo} maxLength={150} />
            <Campo label="CNPJ / CPF" name="documento" value={form.documento} onChange={campo} maxLength={20} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Botao type="submit" disabled={enviando}>
              <Icone name="save" /> {enviando ? "Salvando…" : "Salvar"}
            </Botao>
            {editando && (
              <button type="button" onClick={cancelar} className="px-6 py-3 rounded-full text-on-surface-variant hover:bg-veu/5 cursor-pointer">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {fornecedores.length === 0 ? (
        <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
          <Icone name="handyman" className="text-5xl opacity-30" />
          <p className="text-sm">Nenhum fornecedor cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fornecedores.map((f) => (
            <div key={f.id} className={`glass-panel rounded-2xl p-4 space-y-2 ${f.ativo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface break-words">{f.nome}</p>
                  {f.servico && <p className="text-xs text-on-surface-variant">{f.servico}</p>}
                </div>
                {!f.ativo && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-veu/10 text-on-surface-variant">Inativo</span>}
              </div>
              <div className="text-xs text-on-surface-variant space-y-0.5 break-words">
                {f.telefone && <p>{f.telefone}</p>}
                {f.email && <p>{f.email}</p>}
                {f.documento && <p>{f.documento}</p>}
              </div>
              {podeEditar && (
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => editar(f)} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                    Editar
                  </button>
                  <button type="button" onClick={() => alternarAtivo(f)} className="text-xs font-semibold text-on-surface-variant hover:underline cursor-pointer">
                    {f.ativo ? "Desativar" : "Reativar"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
export function GerenciarOrdensServico() {
  const { usuario } = useAuth();
  const toast = useToast();
  // O Admin Geral acompanha; quem abre e conduz a OS é o síndico.
  const podeEditar = usuario?.perfil === PERFIS.ADMIN_SINDICO;
  const [aba, setAba] = useState("ordens");
  const [fornecedores, setFornecedores] = useState([]);

  const carregarFornecedores = useCallback(() => {
    fornecedoresApi
      .listar()
      .then((res) => setFornecedores(res.data || []))
      .catch((err) => toast.error(mensagemDeErro(err, "Não foi possível carregar os fornecedores.")));
  }, [toast]);

  useEffect(() => {
    carregarFornecedores();
  }, [carregarFornecedores]);

  const tabs = [
    { id: "ordens", label: "Ordens de serviço", icon: "construction" },
    { id: "fornecedores", label: "Fornecedores", icon: "handyman" },
  ];

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Painel Administrativo
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Ordens de{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">Serviço</span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Manutenção corretiva, aberta a partir de uma ocorrência, e preventiva. OS com prazo vencido passam a
            atrasadas todo dia de manhã, e você é avisado.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                aba === t.id ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-veu/5"
              }`}
            >
              <Icone name={t.icon} className="text-lg" />
              {t.label}
            </button>
          ))}
        </div>

        {aba === "ordens" ? (
          <AbaOrdens podeEditar={podeEditar} fornecedores={fornecedores} />
        ) : (
          <AbaFornecedores podeEditar={podeEditar} fornecedores={fornecedores} onMudou={carregarFornecedores} />
        )}
      </div>
    </div>
  );
}
