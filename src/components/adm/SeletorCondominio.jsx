import { Icone } from "../icones/Icone";

const SELECT_CLS =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";

/**
 * Exibe um <select> quando há mais de um condomínio disponível, ou um campo
 * somente leitura quando há zero ou um. Centraliza a regra de "condomínio único
 * → readonly" para que os dois pontos de uso (FormNovoUsuario e GerenciarEstruturas)
 * nunca divirjam.
 *
 * @param {object[]} condominios   - Lista de condomínios disponíveis
 * @param {string}   value         - ID do condomínio selecionado
 * @param {function} onChange      - Callback (id: string) chamado ao trocar seleção
 * @param {string}   [selectClassName] - Classe CSS extra para o <select>
 * @param {string}   [readonlyClassName] - Quando informado, o modo readonly renderiza
 *   um <p> com essa classe, em vez do div estilizado padrão (útil em contextos de card).
 * @param {string}   [nomeAlternativo] - Nome a exibir quando o condomínio não estiver
 *   na lista (ex: usuário sem permissão de admin). Fallback final: o próprio ID.
 */
export function SeletorCondominio({
  condominios,
  value,
  onChange,
  selectClassName,
  readonlyClassName,
  nomeAlternativo,
}) {
  const nomeSelecionado =
    condominios.find((c) => c.id === value)?.nome ?? nomeAlternativo ?? value ?? "—";

  if (condominios.length <= 1) {
    if (readonlyClassName) {
      return <p className={readonlyClassName}>{nomeSelecionado}</p>;
    }
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30">
        <Icone name="domain" className="text-primary text-base shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mr-1">
          Condomínio:
        </span>
        <span className="text-sm font-semibold text-on-surface">{nomeSelecionado}</span>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className={selectClassName ?? SELECT_CLS}
    >
      <option value="">— Selecione o condomínio —</option>
      {condominios.map((c) => (
        <option key={c.id} value={c.id}>{c.nome}</option>
      ))}
    </select>
  );
}
