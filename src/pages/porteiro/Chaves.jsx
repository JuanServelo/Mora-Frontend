import { Link } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";

export function Chaves() {
  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Portaria
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Controle de Chaves
            </span>
          </h1>
        </header>

        <div className="glass-panel rounded-3xl p-12 flex flex-col items-center text-center gap-4 border border-outline-variant/15">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icone name="key" className="text-primary text-4xl" />
          </div>
          <h2 className="font-headline text-xl font-bold text-on-surface">
            Funcionalidade em desenvolvimento
          </h2>
          <p className="text-on-surface-variant text-sm max-w-md">
            O controle de chaves estará disponível em breve. Esta área permitirá gerenciar
            chaves de unidades, áreas comuns e acessos do condomínio.
          </p>
          <Link
            to="/inicio"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-all"
          >
            <Icone name="arrow_back" className="text-base" />
            Voltar ao início
          </Link>
        </div>

      </div>
    </div>
  );
}
