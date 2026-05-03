// src/pages/servicos/Servicos.jsx
import { useState, useEffect } from "react";
import { Icone } from "../../components/icones/Icone";

export function Servicos() {
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ok = true;
    fetch("/data/servicos.json")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar");
        return r.json();
      })
      .then((data) => {
        if (ok) setItens(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (ok) {
          setErro("Não foi possível carregar a lista de serviços.");
          setItens([]);
        }
      });
    return () => {
      ok = false;
    };
  }, []);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Condomínio
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Serviços{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              do prédio
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            Conteúdo carregado de public/data/servicos.json (edição sem alterar componentes). Detalhes oficiais: administração e
            assembleia.
          </p>
        </header>

        {erro && (
          <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{erro}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {itens.map((s) => (
            <article
              key={s.titulo}
              className="glass-panel rounded-3xl p-6 lg:p-8 border border-outline-variant/10 hover:border-primary/25 transition-colors flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name={s.icon} className="text-primary text-2xl" />
                </div>
                <div>
                  <h2 className="font-headline text-xl font-bold text-on-surface">{s.titulo}</h2>
                  <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">{s.descricao}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-outline-variant/10">
                {(s.tags || []).map((t) => (
                  <span
                    key={t}
                    className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-surface-container-highest/60 text-on-surface-variant"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        {itens.length === 0 && !erro && (
          <div className="glass-panel rounded-3xl py-16 text-center text-on-surface-variant text-sm">
            Nenhum item em servicos.json ou arquivo vazio.
          </div>
        )}

        <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between border border-secondary/15">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
              <Icone name="info" className="text-secondary text-2xl" />
            </div>
            <div>
              <p className="font-headline font-bold text-on-surface mb-1">Dúvidas ou solicitações?</p>
              <p className="text-on-surface-variant text-sm">
                Abra uma reclamação na área dedicada ou use os canais oficiais do condomínio.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
