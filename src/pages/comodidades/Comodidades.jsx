// src/pages/comodidades/Comodidades.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";

export function Comodidades() {
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ok = true;
    fetch("/data/comodidades.json")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar");
        return r.json();
      })
      .then((data) => {
        if (ok) setItens(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (ok) {
          setErro("Não foi possível carregar a lista de comodidades.");
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
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Lazer e bem-estar
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Comodidades{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                do condomínio
              </span>
            </h1>
            <p className="text-on-surface-variant text-sm mt-2 max-w-xl">
              Textos institucionais em public/data/comodidades.json. Para áreas reserváveis cadastradas pela gestão, use Espaços.
            </p>
          </div>
          <Link
            to="/espacos"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Icone name="event_available" className="text-xl" />
            Reservar espaços
          </Link>
        </header>

        {erro && (
          <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{erro}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {itens.map((c) => (
            <article
              key={c.titulo}
              className="group glass-panel rounded-3xl p-5 border border-outline-variant/10 hover:border-tertiary/30 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-tertiary/10 flex items-center justify-center group-hover:bg-tertiary/20 transition-colors">
                  <Icone name={c.icon} className="text-tertiary text-2xl" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {c.destaque}
                </span>
              </div>
              <h2 className="font-headline font-bold text-on-surface text-lg mb-2">{c.titulo}</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed flex-1">{c.desc}</p>
            </article>
          ))}
        </div>

        {itens.length === 0 && !erro && (
          <div className="glass-panel rounded-3xl py-16 text-center text-on-surface-variant text-sm">
            Nenhum item em comodidades.json ou arquivo vazio.
          </div>
        )}

        <section className="glass-panel rounded-[2rem] p-8 md:p-10 border border-white/5">
          <div className="flex flex-col md:flex-row gap-8 md:items-center">
            <div className="flex-1 space-y-3">
              <h3 className="font-headline text-xl font-bold text-on-surface">
                Regimento e boa convivência
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Horários e normas de uso seguem o regimento interno e deliberações da assembleia.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap md:justify-end">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-highest/50 text-sm text-on-surface-variant">
                <Icone name="schedule" className="text-primary" />
                Portaria / regulamento
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-highest/50 text-sm text-on-surface-variant">
                <Icone name="groups" className="text-secondary" />
                Assembleias e atas
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
