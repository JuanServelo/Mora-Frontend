import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { condominiosApi } from "../../services/condominiosApi";
import { gestaoApi } from "../../services/gestaoApi";
import { planApi } from "../../services/planApi";
import { FormCondominio } from "../../components/adm/FormCondominio";
import { CartaoKpi } from "../../components/cards/CartaoKpi";
import { Icone } from "../../components/icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { labelPerfil } from "../../utils/perfis";
import { mascararCnpj, mascararTelefone } from "../../utils/masks";

const ABAS = [
  { id: "dados", label: "Dados", icon: "badge" },
  { id: "usuarios", label: "Usuários", icon: "group" },
  { id: "assinatura", label: "Assinatura", icon: "workspace_premium" },
  { id: "resumo", label: "Resumo", icon: "analytics" },
];

function fmtPreco(valor) {
  if (valor == null) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLE = {
  active: "bg-primary/10 text-primary",
  inactive: "bg-error/10 text-error",
};

export function DetalheCondominio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [condominio, setCondominio] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [aba, setAba] = useState("dados");
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [assinaturas, setAssinaturas] = useState([]);
  const [planosAtivos, setPlanosAtivos] = useState([]);
  const [novoPlanId, setNovoPlanId] = useState("");
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [{ data: c }, { data: r }] = await Promise.all([
        condominiosApi.buscar(id),
        // O resumo é acessório: se falhar, a tela continua utilizável.
        gestaoApi.resumoCondominio(id).catch(() => ({ data: null })),
      ]);
      setCondominio(c.condominio ?? c);
      setResumo(r?.resumo ?? null);
    } catch {
      setErro("Não foi possível carregar este cliente.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (aba !== "usuarios" || usuarios.length) return;
    condominiosApi
      .listarUsuarios(id)
      .then((res) => setUsuarios(res.data.usuarios ?? []))
      .catch(() => toast.error("Não foi possível carregar os usuários."));
  }, [aba, id, usuarios.length, toast]);

  useEffect(() => {
    if (aba !== "assinatura") return;
    
    const carregarAssinatura = async () => {
      try {
        const [resPlanos, resAssinaturas] = await Promise.all([
          planApi.listar(),
          planApi.listarAssinaturas(id)
        ]);
        setPlanosAtivos((resPlanos.data || []).filter(p => p.isActive));
        setAssinaturas(resAssinaturas.data || []);
      } catch (err) {
        toast.error("Não foi possível carregar os dados de assinatura.");
      }
    };
    
    carregarAssinatura();
  }, [aba, id, toast]);

  async function salvar(dados) {
    try {
      const res = await condominiosApi.atualizar(id, dados);
      setCondominio(res.data.condominio ?? { ...condominio, ...dados });
      setEditando(false);
      toast.success("Cliente atualizado.");
    } catch (e) {
      toast.error(e.response?.data?.mensagem ?? "Erro ao salvar.");
    }
  }

  async function alternarStatus() {
    const desativando = condominio.status === "active";
    const ok = await confirm({
      titulo: desativando ? "Desativar cliente" : "Reativar cliente",
      mensagem: desativando
        ? `Desativar "${condominio.nome}"? Os dados são preservados e o acesso é suspenso.`
        : `Reativar "${condominio.nome}"?`,
      confirmarTexto: desativando ? "Desativar" : "Reativar",
      variante: desativando ? "danger" : "default",
    });
    if (!ok) return;

    try {
      const fn = desativando ? condominiosApi.desativar : condominiosApi.ativar;
      await fn(id);
      setCondominio({ ...condominio, status: desativando ? "inactive" : "active" });
      toast.success(desativando ? "Cliente desativado." : "Cliente reativado.");
    } catch {
      toast.error("Não foi possível alterar o status.");
    }
  }

  async function trocarAssinatura(e) {
    e.preventDefault();
    if (!novoPlanId) return;
    setSalvandoAssinatura(true);
    try {
      await planApi.criarAssinatura({ condominioId: id, planId: novoPlanId });
      toast.success("Assinatura atualizada com sucesso!");
      const resAssinaturas = await planApi.listarAssinaturas(id);
      setAssinaturas(resAssinaturas.data || []);
      setNovoPlanId("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao trocar assinatura.");
    } finally {
      setSalvandoAssinatura(false);
    }
  }

  async function cancelarAssinatura(assinaturaId) {
    const ok = await confirm({
      titulo: "Cancelar assinatura",
      mensagem: "Tem certeza que deseja cancelar esta assinatura?",
      confirmarTexto: "Cancelar Assinatura",
      variante: "danger",
    });
    if (!ok) return;

    try {
      await planApi.cancelarAssinatura(assinaturaId);
      toast.success("Assinatura cancelada.");
      const resAssinaturas = await planApi.listarAssinaturas(id);
      setAssinaturas(resAssinaturas.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao cancelar assinatura.");
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="glass-panel rounded-2xl h-28 animate-pulse" />
          <div className="glass-panel rounded-3xl h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (erro || !condominio) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-6">
        <div className="max-w-6xl mx-auto glass-panel rounded-3xl p-8 text-center space-y-4">
          <Icone name="error" className="text-error text-3xl" />
          <p className="text-error font-medium">{erro || "Cliente não encontrado."}</p>
          <button
            type="button"
            onClick={() => navigate("/adm/condominios")}
            className="text-primary font-semibold hover:underline"
          >
            Voltar para a lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => navigate("/adm/condominios")}
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm transition"
        >
          <Icone name="arrow_back" className="text-base" />
          Clientes
        </button>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                {condominio.nome}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  STATUS_STYLE[condominio.status] ?? ""
                }`}
              >
                {condominio.status === "active" ? "ATIVO" : "INATIVO"}
              </span>
            </div>
            <p className="text-on-surface-variant text-sm mt-1 font-mono">{condominio.id}</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAba("dados");
                setEditando((v) => !v);
              }}
              className="px-5 py-3 rounded-2xl border border-primary/30 text-primary hover:bg-primary/10 transition flex items-center gap-2 font-medium"
            >
              <Icone name={editando ? "close" : "edit"} />
              {editando ? "Cancelar" : "Editar"}
            </button>
            <button
              type="button"
              onClick={alternarStatus}
              className={`px-5 py-3 rounded-2xl border transition flex items-center gap-2 font-medium ${
                condominio.status === "active"
                  ? "border-error/30 text-error hover:bg-error/10"
                  : "border-primary/30 text-primary hover:bg-primary/10"
              }`}
            >
              <Icone name={condominio.status === "active" ? "block" : "check_circle"} />
              {condominio.status === "active" ? "Desativar" : "Reativar"}
            </button>
          </div>
        </header>

        {resumo && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CartaoKpi valor={resumo.usuarios.total} label="Usuários" tom="primary" icone="group" />
            <CartaoKpi valor={resumo.usuarios.ativos} label="Ativos" tom="tertiary" icone="check_circle" />
            <CartaoKpi valor={resumo.convitesPendentes} label="Convites pendentes" tom="secondary" icone="mail" />
            <CartaoKpi valor={resumo.ocorrencias} label="Ocorrências" tom="neutro" icone="report" />
          </section>
        )}

        <nav className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                aba === a.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icone name={a.icon} className="text-base" />
              {a.label}
            </button>
          ))}
        </nav>

        {aba === "dados" && (
          <section className="glass-panel rounded-3xl p-6">
            {editando ? (
              <FormCondominio
                inicial={condominio}
                isNovo={false}
                onSalvar={salvar}
                onCancelar={() => setEditando(false)}
              />
            ) : (
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                {[
                  ["Nome", condominio.nome],
                  ["Identificador", condominio.id],
                  ["CNPJ", condominio.cnpj ? mascararCnpj(condominio.cnpj) : "—"],
                  ["E-mail", condominio.email || "—"],
                  ["Telefone", condominio.telefone ? mascararTelefone(condominio.telefone) : "—"],
                  ["Endereço", condominio.endereco || "—"],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">
                      {rotulo}
                    </dt>
                    <dd className="text-on-surface">{valor}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {aba === "usuarios" && (
          <section className="glass-panel rounded-3xl p-6">
            {usuarios.length === 0 ? (
              <p className="text-on-surface-variant text-center py-8">
                Nenhum usuário vinculado a este cliente.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {usuarios.map((u) => (
                  <li key={u.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-on-surface font-medium truncate">{u.nome ?? "—"}</p>
                      <p className="text-on-surface-variant text-sm truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs px-3 py-1 rounded-full bg-surface-container-highest/40 text-on-surface-variant">
                        {labelPerfil(u.perfil)}
                      </span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          u.status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {aba === "assinatura" && (
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-xl font-bold text-on-surface mb-6">Gestão de Plano</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Plano Atual */}
              <div className="space-y-4">
                <h3 className="text-on-surface-variant font-semibold text-sm uppercase tracking-wider">Assinatura Atual</h3>
                {(() => {
                  const ativa = assinaturas.find(a => a.status === "ACTIVE");
                  if (!ativa) {
                    return (
                      <div className="bg-error/10 border border-error/20 rounded-2xl p-6 text-center text-error h-[240px] flex flex-col items-center justify-center">
                        <Icone name="error_outline" className="text-4xl mb-2 opacity-80" />
                        <p className="font-medium">Nenhuma assinatura ativa.</p>
                        <p className="text-sm opacity-80 mt-1">Este condomínio não possui acesso liberado aos módulos.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 relative">
                      <div className="absolute top-4 right-4">
                        <span className="bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">Ativo</span>
                      </div>
                      <h4 className="text-2xl font-bold text-primary mb-1">{ativa.plan.name}</h4>
                      <p className="text-on-surface-variant text-sm mb-4">Desde {fmtData(ativa.startDate)}</p>
                      
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-3xl font-extrabold text-on-surface">{fmtPreco(ativa.plan.monthlyPrice)}</span>
                        <span className="text-on-surface-variant text-sm">/mês</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-[10px] uppercase text-on-surface-variant font-semibold">Máx. Usuários</p>
                          <p className="font-bold text-on-surface flex items-center gap-1"><Icone name="group" className="text-xs text-primary"/> {ativa.plan.maxUsersPerCondominium}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-on-surface-variant font-semibold">Módulos</p>
                          <p className="font-bold text-on-surface">{ativa.plan.activeModules?.length || 0} liberados</p>
                        </div>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => cancelarAssinatura(ativa.id)}
                        className="w-full py-2.5 rounded-xl border border-error/30 text-error hover:bg-error/10 transition font-semibold text-sm cursor-pointer"
                      >
                        Cancelar Assinatura
                      </button>
                    </div>
                  );
                })()}
              </div>
              
              {/* Trocar/Nova Assinatura */}
              <div className="space-y-4">
                <h3 className="text-on-surface-variant font-semibold text-sm uppercase tracking-wider">Trocar / Nova Assinatura</h3>
                <form onSubmit={trocarAssinatura} className="bg-surface-container-highest/30 border border-white/5 rounded-2xl p-6 h-[240px] flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-on-surface mb-4">
                      Ao selecionar um novo plano, a assinatura atual será cancelada imediatamente.
                    </p>
                    
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Selecione o Plano</label>
                      <select
                        value={novoPlanId}
                        onChange={(e) => setNovoPlanId(e.target.value)}
                        className="w-full bg-black/20 border border-outline-variant/30 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
                        required
                      >
                        <option value="">-- Escolha um plano --</option>
                        {planosAtivos.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({fmtPreco(p.monthlyPrice)})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!novoPlanId || salvandoAssinatura}
                    className="w-full flex justify-center items-center gap-2 py-3 rounded-xl bg-primary text-on-primary font-bold transition hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {salvandoAssinatura ? (
                      <Icone name="sync" className="animate-spin text-lg" />
                    ) : (
                      <Icone name="check_circle" className="text-lg" />
                    )}
                    Confirmar Assinatura
                  </button>
                </form>

                {/* Histórico Simples */}
                {assinaturas.filter(a => a.status !== "ACTIVE").length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Histórico</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {assinaturas.filter(a => a.status !== "ACTIVE").map(a => (
                        <div key={a.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center opacity-80">
                          <div>
                            <p className="text-xs font-bold text-on-surface">{a.plan.name}</p>
                            <p className="text-[10px] text-on-surface-variant">{fmtData(a.startDate)} até {fmtData(a.endDate)}</p>
                          </div>
                          <span className="text-[9px] bg-white/10 text-on-surface-variant px-2 py-0.5 rounded-full uppercase font-bold">{a.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {aba === "resumo" && (
          <section className="glass-panel rounded-3xl p-6">
            {resumo ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-on-surface font-semibold mb-3">Usuários por perfil</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(resumo.usuarios.porPerfil).map(([perfil, total]) => (
                      <span
                        key={perfil}
                        className="px-3 py-1.5 rounded-full text-sm bg-surface-container-highest/30 text-on-surface-variant border border-outline-variant/20"
                      >
                        {labelPerfil(perfil)}: <strong className="text-on-surface">{total}</strong>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-on-surface font-semibold mb-3">Usuários por situação</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(resumo.usuarios.porStatus).map(([status, total]) => (
                      <span
                        key={status}
                        className="px-3 py-1.5 rounded-full text-sm bg-surface-container-highest/30 text-on-surface-variant border border-outline-variant/20"
                      >
                        {status}: <strong className="text-on-surface">{total}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-on-surface-variant text-center py-8">
                Resumo indisponível no momento.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default DetalheCondominio;
