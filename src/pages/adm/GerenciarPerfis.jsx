import { useState, useEffect } from "react";
import api from "../../services/api";
import { Icone } from "../../components/icones/Icone";
import { ADM_LINKS, linksDoPerfil } from "../../utils/menuAdmin";

// Mapa local para ícones e cores por perfil (fallback offline)
const PERFIL_META = {
  ADMIN_GERAL:   { icon: "corporate_fare", cor: "primary" },
  ADMIN_SINDICO: { icon: "supervisor_account", cor: "tertiary" },
  PORTEIRO:      { icon: "door_front", cor: "secondary" },
  MORADOR:       { icon: "home", cor: "primary" },
  DONO_ALUGUEL:  { icon: "home_work", cor: "tertiary" },
  CONVIDADO:     { icon: "badge", cor: "outline" },
};

const COR_CLASSE = {
  primary:  "bg-primary/10 text-primary border-primary/20",
  tertiary: "bg-tertiary/10 text-tertiary border-tertiary/20",
  secondary:"bg-secondary/10 text-secondary border-secondary/20",
  outline:  "bg-surface-container-highest/40 text-on-surface-variant border-outline-variant/30",
};

// Abas por perfil: lidas do mapa compartilhado, para não divergir do menu.
const ADMIN_ABAS = ADM_LINKS;
const ACESSO_ADMIN = Object.fromEntries(
  ["ADMIN_GERAL", "ADMIN_SINDICO"].map((p) => [p, linksDoPerfil(p).map((l) => l.label)]),
);


const CATEGORIAS = ["plataforma", "condominio", "unidade"];
const CATEGORIA_LABEL = {
  plataforma:  "Nível Plataforma",
  condominio:  "Nível Condomínio",
  unidade:     "Nível Unidade",
};

export function GerenciarPerfis() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState("plataforma");
  const [abaMatriz, setAbaMatriz] = useState(false);

  useEffect(() => {
    api.get("/api/perfis/info")
      .then((res) => setDados(res.data))
      .catch(() => setDados(null))
      .finally(() => setCarregando(false));
  }, []);

  // Agrupa perfis por categoria
  const perfisPorCategoria = {};
  if (dados?.categorias) {
    for (const cat of dados.categorias) {
      perfisPorCategoria[cat.categoria] = cat.perfis;
    }
  }

  const perfisAba = perfisPorCategoria[aba] || [];

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              Gerenciar{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Perfis
              </span>
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Visualize as permissões e responsabilidades de cada perfil de usuário.
            </p>
          </div>

          <button
            onClick={() => setAbaMatriz((v) => !v)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
              abaMatriz
                ? "border-tertiary/30 text-tertiary bg-tertiary/10"
                : "border-outline-variant/30 text-on-surface-variant hover:border-primary/30 hover:text-primary"
            }`}
          >
            <Icone name="grid_on" className="text-xl" />
            Matriz de Acesso
          </button>
        </header>

        {/* Sub-navbar de abas */}
        {!abaMatriz && (
          <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setAba(cat)}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  aba === cat
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                }`}
              >
                {CATEGORIA_LABEL[cat]}
              </button>
            ))}
          </div>
        )}

        {/* Matriz de Acesso */}
        {abaMatriz && (
          <MatrizAcesso />
        )}

        {/* Cards de perfis */}
        {!abaMatriz && (
          <>
            {carregando && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-panel rounded-3xl p-6 animate-pulse h-48" />
                ))}
              </div>
            )}

            {!carregando && perfisAba.length === 0 && (
              <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
                Nenhum perfil encontrado nesta categoria.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {perfisAba.map((p) => (
                <CardPerfil key={p.chave} perfil={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CardPerfil({ perfil }) {
  const meta = PERFIL_META[perfil.chave] || { icon: "person", cor: "outline" };
  const corClasse = COR_CLASSE[meta.cor];
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
      {/* Topo do card */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-start gap-4 p-6 text-left hover:bg-white/3 transition-all cursor-pointer group"
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${corClasse}`}>
          <Icone name={meta.icon} className="text-2xl" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-headline text-lg font-bold text-on-surface">
              {perfil.label}
            </h3>
            {perfil.semAcessoSistema && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error/10 text-error border border-error/20">
                Sem acesso ao sistema
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {perfil.descricao}
          </p>
        </div>

        <Icone
          name="expand_more"
          className={`text-outline shrink-0 mt-1 transition-transform duration-300 ${expandido ? "rotate-180" : ""}`}
        />
      </button>

      {/* Detalhes expansíveis */}
      {expandido && (
        <div className="border-t border-outline-variant/15 px-6 pb-6 pt-5 space-y-5">

          {/* Permissões */}
          {perfil.permissoes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                O que pode fazer
              </p>
              <ul className="space-y-2">
                {perfil.permissoes.map((perm, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                    <Icone name="check_circle" className="text-primary text-base shrink-0 mt-0.5" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pode cadastrar */}
          {perfil.podeCadastrar?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                Pode cadastrar
              </p>
              <div className="flex flex-wrap gap-2">
                {perfil.podeCadastrarLabels?.map((label, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-surface-container-highest/40 text-on-surface border border-outline-variant/20"
                  >
                    <Icone name="person_add" className="text-primary text-sm" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Acesso admin */}
          {ACESSO_ADMIN[perfil.chave] && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                Abas administrativas liberadas
              </p>
              <div className="flex flex-wrap gap-2">
                {ADMIN_ABAS.map((aba) => {
                  const temAcesso = ACESSO_ADMIN[perfil.chave]?.includes(aba.label);
                  return (
                    <span
                      key={aba.label}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        temAcesso
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-surface-container-highest/20 text-on-surface-variant/40 border border-outline-variant/10 line-through"
                      }`}
                    >
                      <Icone name={aba.icon} className="text-sm" />
                      {aba.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatrizAcesso() {
  const perfisAdmin = ["ADMIN_GERAL", "ADMIN_SINDICO"];

  const labelCurto = {
    ADMIN_GERAL:   "Admin Geral",
    ADMIN_SINDICO: "Admin Síndico",
  };

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-tertiary/10 flex items-center justify-center">
          <Icone name="grid_on" className="text-tertiary" />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline text-lg font-bold text-on-surface">Matriz de Acesso ao Admin</h2>
          <p className="text-on-surface-variant text-sm">Quais perfis acessam cada aba administrativa</p>
        </div>
      </div>

      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-y-1">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant py-2 pr-4 min-w-[140px]">
              Aba
            </th>
            {perfisAdmin.map((p) => (
              <th key={p} className="text-center text-xs font-semibold text-on-surface-variant py-2 px-3 min-w-[110px]">
                {labelCurto[p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ADMIN_ABAS.map((aba) => (
            <tr key={aba.label} className="group">
              <td className="py-2 pr-4">
                <span className="flex items-center gap-2 text-on-surface font-medium">
                  <Icone name={aba.icon} className="text-base text-primary" />
                  {aba.label}
                </span>
              </td>
              {perfisAdmin.map((p) => {
                const temAcesso = ACESSO_ADMIN[p]?.includes(aba.label);
                return (
                  <td key={p} className="text-center py-2 px-3">
                    {temAcesso ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/15">
                        <Icone name="check" className="text-primary text-base" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-error/10">
                        <Icone name="close" className="text-error/60 text-base" />
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Perfis de nível unidade */}
      <div className="mt-6 pt-5 border-t border-outline-variant/15">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
          Perfis de nível Unidade (sem acesso ao painel admin)
        </p>
        <div className="flex flex-wrap gap-2">
          {["MORADOR","DONO_ALUGUEL","CONVIDADO"].map((p) => {
            const meta = PERFIL_META[p];
            return (
              <span key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-surface-container-highest/30 text-on-surface-variant border border-outline-variant/20">
                <Icone name={meta.icon} className="text-sm" />
                {p.replace(/_/g, " ")}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
