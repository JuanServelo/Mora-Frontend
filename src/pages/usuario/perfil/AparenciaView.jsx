import { Icone } from "../../../components/icones/Icone";
import { useTema } from "../../../contexts/TemaContext";

const OPCOES = [
  {
    id: "claro",
    icone: "light_mode",
    titulo: "Claro",
    descricao: "Fundo claro, para ambientes bem iluminados",
  },
  {
    id: "escuro",
    icone: "dark_mode",
    titulo: "Escuro",
    descricao: "Fundo escuro, mais confortável à noite",
  },
  {
    id: "sistema",
    icone: "brightness_auto",
    titulo: "Seguir o sistema",
    descricao: "Acompanha a configuração do seu aparelho, e muda junto",
  },
];

export function AparenciaView() {
  const { tema, preferencia, definirPreferencia } = useTema();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-bold text-on-surface">Tema</h3>
        <p className="text-sm text-on-surface-variant mt-0.5">
          A escolha vale só neste aparelho e neste navegador — não viaja com a
          sua conta.
        </p>
      </div>

      <div className="space-y-2">
        {OPCOES.map((o) => {
          const escolhida = preferencia === o.id;
          return (
            <button
              key={o.id}
              onClick={() => definirPreferencia(o.id)}
              aria-pressed={escolhida}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition cursor-pointer ${
                escolhida
                  ? "border-primary/60 bg-primary/10"
                  : "border-veu/10 hover:border-veu/25 bg-surface-container-highest/20"
              }`}
            >
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  escolhida ? "bg-primary/15 text-primary" : "bg-surface-container-highest/50 text-on-surface-variant"
                }`}
              >
                <Icone name={o.icone} />
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-on-surface">{o.titulo}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {o.descricao}
                </p>
              </div>

              {/* Com "sistema" escolhido, dizer qual tema está valendo agora —
                  senão a tela não explica por que está clara ou escura. */}
              {o.id === "sistema" && escolhida && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant shrink-0">
                  agora: {tema}
                </span>
              )}

              {escolhida && (
                <Icone name="check_circle" className="text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
