import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { condominiosApi } from "../../services/condominiosApi";
import { gestaoApi } from "../../services/gestaoApi";
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
  { id: "resumo", label: "Resumo", icon: "analytics" },
];

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
