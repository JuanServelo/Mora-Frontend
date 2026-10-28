import { useTranslation } from "react-i18next";
import { Icone } from "../icones/Icone";

/**
 * Filtros do painel do Admin Geral.
 *
 * Cada mudança dispara uma nova consulta ao backend, que agrega já recortado.
 * Nada é filtrado aqui: com dezenas de clientes, trazer a base inteira para a
 * tela peneirar deixaria de funcionar — e os números seriam calculados em dois
 * lugares diferentes, com chance de divergir.
 */

const PERIODOS = [3, 6, 12, 24];

const STATUS = [
  { valor: "todos", rotuloKey: "filtro.status.todos" },
  { valor: "active", rotuloKey: "filtro.status.ativos" },
  { valor: "inactive", rotuloKey: "filtro.status.inativos" },
];

export function FiltroPainel({ filtros, aoMudar, carregando, planos, plano, aoMudarPlano }) {
  const { t } = useTranslation("paineis");
  // Atualização funcional, não `{ ...filtros }`: o objeto do closure é o da
  // renderização anterior, e duas mudanças antes de um novo render fariam a
  // segunda descartar a primeira.
  const alterar = (campo, valor) => aoMudar((atual) => ({ ...atual, [campo]: valor }));

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icone name="filter_alt" className="text-lg" />
        <span className="text-xs font-semibold uppercase tracking-wider">{t("filtro.titulo")}</span>
      </div>

      <Grupo rotulo={t("filtro.periodo")}>
        {PERIODOS.map((p) => (
          <Opcao
            key={p}
            ativa={filtros.meses === p}
            onClick={() => alterar("meses", p)}
          >
            {t("filtro.meses", { n: p })}
          </Opcao>
        ))}
      </Grupo>

      <Grupo rotulo={t("filtro.clientes")}>
        {STATUS.map((s) => (
          <Opcao
            key={s.valor}
            ativa={filtros.status === s.valor}
            onClick={() => alterar("status", s.valor)}
          >
            {t(s.rotuloKey)}
          </Opcao>
        ))}
      </Grupo>

      {/* Só recorta os blocos de receita. A lista vem do backend sempre
          completa, mesmo com filtro ativo — montada da base já filtrada, o
          seletor ficaria preso na escolha. */}
      {planos?.length > 1 && (
        <Grupo rotulo={t("filtro.plano")}>
          <select
            value={plano}
            onChange={(e) => aoMudarPlano(e.target.value)}
            aria-label={t("filtro.planoAria")}
            className="bg-surface-container-highest/40 border-none rounded-lg py-1.5 px-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="todos">{t("filtro.status.todos")}</option>
            {planos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Grupo>
      )}

      {/* Sinaliza que os números na tela ainda são os do filtro anterior. */}
      {carregando && (
        <span className="flex items-center gap-1.5 text-xs text-on-surface-variant ml-auto">
          <Icone name="progress_activity" className="text-base animate-spin" />
          {t("filtro.atualizando")}
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
