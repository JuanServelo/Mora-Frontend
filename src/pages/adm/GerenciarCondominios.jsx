import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { condominiosApi } from "../../services/condominiosApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS } from "../../utils/perfis";
import { FormCondominio } from "../../components/adm/FormCondominio";

const STATUS_STYLE = {
  active:   "bg-primary/10 text-primary",
  inactive: "bg-error/10 text-error",
};

export function GerenciarCondominios() {
  const navigate = useNavigate();
  const toast = useToast();
  const { usuario } = useAuth();
  const [condominios, setCondominios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState("");

  const isGerente = usuario?.perfil === PERFIS.ADMIN_GERAL;

  useEffect(() => {
    condominiosApi.listar()
      .then((res) => setCondominios(res.data.condominios || []))
      .catch(() => toast.error("Erro ao carregar clientes."))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = condominios.filter(
    (c) =>
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.id?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpj?.includes(busca),
  );


  async function criarCondominio(dados) {
    try {
      const res = await condominiosApi.criar(dados);
      setCondominios((cs) => [res.data.condominio, ...cs]);
      setCriando(false);
      toast.success("Cliente criado com sucesso.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao criar cliente.");
    }
  }



  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Gerenciar{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Clientes
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-4 shrink-0 flex-wrap">
            {isGerente && (
              <button
                onClick={() => setCriando((c) => !c)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
                  criando
                    ? "border-error/30 text-error hover:bg-error/10"
                    : "border-primary/30 text-primary hover:bg-primary/10"
                }`}
              >
                <Icone name={criando ? "close" : "add_business"} className="text-xl" />
                {criando ? "Cancelar" : "Novo Cliente"}
              </button>
            )}

            <div className="flex gap-3">
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-on-surface">{condominios.length}</p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
              </div>
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-primary">
                  {condominios.filter((c) => c.status === "active").length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">Ativos</p>
              </div>
            </div>
          </div>
        </header>

        {/* Form de criação */}
        {criando && (
          <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icone name="add_business" className="text-primary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Novo Cliente</h2>
            </div>
            <FormCondominio onSalvar={criarCondominio} onCancelar={() => setCriando(false)} isNovo />
          </div>
        )}

        {/* Busca */}
        <div className="max-w-md">
          <Campo
            id="busca-cond"
            placeholder="Buscar por nome, ID ou CNPJ..."
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* Lista */}
        {carregando && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glass-panel rounded-3xl p-5 animate-pulse h-20" />
            ))}
          </div>
        )}

        {!carregando && filtrados.length === 0 && (
          <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">
            Nenhum cliente encontrado.
          </div>
        )}

        <div className="space-y-3">
          {filtrados.map((cond) => (
            <div key={cond.id} className="glass-panel rounded-3xl overflow-hidden">
              {/* Linha principal */}
              <button
                onClick={() => navigate(`/adm/condominios/${cond.id}`)}
                className="w-full flex items-center gap-4 p-5 text-left group hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="domain" className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{cond.nome}</p>
                  <p className="text-on-surface-variant text-sm font-mono truncate">{cond.id}</p>
                </div>

                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "CNPJ", value: cond.cnpj || "—" },
                    { label: "E-mail", value: cond.email || "—" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold text-sm truncate max-w-[140px]">{col.value}</p>
                    </div>
                  ))}
                </div>

                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[cond.status]}`}>
                  {cond.status === "active" ? "ativo" : "inativo"}
                </span>

                <Icone name="chevron_right" className="text-outline shrink-0" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
