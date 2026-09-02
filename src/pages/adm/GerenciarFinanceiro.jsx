// src/pages/adm/GerenciarFinanceiro.jsx
import { useState } from "react";
import { Icone } from "../../components/icones/Icone";
import { PainelConfiguracao } from "../../components/adm/financeiro/PainelConfiguracao";
import { PainelTaxas } from "../../components/adm/financeiro/PainelTaxas";
import { PainelFracoes } from "../../components/adm/financeiro/PainelFracoes";
import { PainelGateway } from "../../components/adm/financeiro/PainelGateway";

/**
 * Configuração financeira do condomínio.
 *
 * As três primeiras abas são passos de um mesmo preparo, e nessa ordem:
 * primeiro decide-se COMO divide, depois O QUE se cobra, depois QUANTO cabe a
 * cada unidade. Ficam numa tela só, e não em itens separados de menu —
 * separadas, o síndico não veria que uma depende da outra.
 *
 * A quarta é de outra natureza: banco de provas da integração de pagamento.
 * Fica aqui porque é onde se pergunta "isso está de pé?" antes de emitir a
 * primeira fatura de verdade.
 */
const ABAS = [
  {
    id: "config",
    label: "Regras",
    icone: "tune",
    descricao: "Como a taxa é dividida e quando vence",
  },
  {
    id: "taxas",
    label: "Taxas",
    icone: "receipt_long",
    descricao: "O que é cobrado todo mês",
  },
  {
    id: "fracoes",
    label: "Fração ideal",
    icone: "pie_chart",
    descricao: "Quanto cabe a cada unidade",
  },
  {
    id: "gateway",
    label: "Teste de cobrança",
    icone: "science",
    descricao: "Emite uma cobrança no sandbox para conferir a integração",
  },
];

export function GerenciarFinanceiro() {
  const [aba, setAba] = useState("config");
  // O modo escolhido nas Regras muda o padrão das outras duas abas, então sobe
  // para cá em vez de cada painel buscar a configuração de novo.
  const [modoRateio, setModoRateio] = useState(null);

  const atual = ABAS.find((a) => a.id === aba);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Síndico
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Configuração{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Financeira
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            O que o sistema precisa saber antes de emitir a primeira fatura.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2">
          {ABAS.map((a) => {
            const ativa = a.id === aba;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer ${
                  ativa
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                }`}
              >
                <Icone name={a.icone} className="text-lg" />
                {a.label}
              </button>
            );
          })}
        </nav>

        <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Icone name={atual.icone} className="text-xl" />
            </span>
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                {atual.label}
              </h2>
              <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                {atual.descricao}
              </p>
            </div>
          </div>

          {aba === "config" && (
            <PainelConfiguracao aoSalvar={(c) => setModoRateio(c.modo)} />
          )}
          {aba === "taxas" && <PainelTaxas modoRateio={modoRateio} />}
          {aba === "fracoes" && <PainelFracoes modoRateio={modoRateio} />}
          {aba === "gateway" && <PainelGateway />}
        </div>
      </div>
    </div>
  );
}
