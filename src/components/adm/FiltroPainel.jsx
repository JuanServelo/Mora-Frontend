import { Icone } from "../icones/Icone";

/**
 * Filtros do painel do Admin Geral.
 *
 * Cada mudança dispara uma nova consulta ao backend, que agrega já recortado.
 * Nada é filtrado aqui: com dezenas de clientes, trazer a base inteira para a
 * tela peneirar deixaria de funcionar — e os números seriam calculados em dois
 * lugares diferentes, com chance de divergir.
 */

const PERIODOS = [
  { valor: 3, rotulo: "3 meses" },
  { valor: 6, rotulo: "6 meses" },
  { valor: 12, rotulo: "12 meses" },
  { valor: 24, rotulo: "24 meses" },
];

const STATUS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "active", rotulo: "Ativos" },
  { valor: "inactive", rotulo: "Inativos" },
];

export function FiltroPainel({ filtros, aoMudar, carregando }) {
  // Atualização funcional, não `{ ...filtros }`: o objeto do closure é o da
  // renderização anterior, e duas mudanças antes de um novo render fariam a
  // segunda descartar a primeira.
  const alterar = (campo, valor) => aoMudar((atual) => ({ ...atual, [campo]: valor }));

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icone name="filter_alt" className="text-lg" />
        <span className="text-xs font-semibold uppercase tracking-wider">Filtros</span>
      </div>

      <Grupo rotulo="Período">
        {PERIODOS.map((p) => (
          <Opcao
            key={p.valor}
            ativa={filtros.meses === p.valor}
            onClick={() => alterar("meses", p.valor)}
          >
            {p.rotulo}
          </Opcao>
        ))}
      </Grupo>

      <Grupo rotulo="Clientes">
        {STATUS.map((s) => (
          <Opcao
            key={s.valor}
            ativa={filtros.status === s.valor}
            onClick={() => alterar("status", s.valor)}
          >
            {s.rotulo}
          </Opcao>
        ))}
      </Grupo>

      {/* Sinaliza que os números na tela ainda são os do filtro anterior. */}
      {carregando && (
        <span className="flex items-center gap-1.5 text-xs text-on-surface-variant ml-auto">
          <Icone name="progress_activity" className="text-base animate-spin" />
          atualizando…
        </span>
      )}
    </div>
  );
}

function Grupo({ rotulo, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
        {rotulo}
      </span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Opcao({ ativa, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativa}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
        ativa
          ? "bg-primary/15 text-primary"
          : "text-on-surface-variant hover:bg-veu/5 hover:text-on-surface"
      }`}
    >
      {children}
    </button>
  );
}
