// src/pages/adm/GerenciarFinanceiro.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icone } from "../../components/icones/Icone";
import { PainelConfiguracao } from "../../components/adm/financeiro/PainelConfiguracao";
import { PainelTaxas } from "../../components/adm/financeiro/PainelTaxas";
import { PainelFracoes } from "../../components/adm/financeiro/PainelFracoes";
import { PainelGateway } from "../../components/adm/financeiro/PainelGateway";
import { PainelContas } from "../../components/adm/financeiro/PainelContas";
import { PainelFaturas } from "../../components/adm/financeiro/PainelFaturas";
import { PainelMultas } from "../../components/adm/financeiro/PainelMultas";
import { PainelContratos } from "../../components/adm/financeiro/PainelContratos";
import { PainelPrestacao } from "../../components/adm/financeiro/PainelPrestacao";

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
    icone: "tune",
  },
  {
    id: "taxas",
    icone: "receipt_long",
  },
  {
    id: "fracoes",
    icone: "pie_chart",
  },
  {
    id: "contas",
    icone: "water_drop",
  },
  {
    id: "faturas",
    icone: "receipt_long",
  },
  {
    id: "multas",
    icone: "gavel",
  },
  {
    id: "contratos",
    icone: "contract",
  },
  {
    id: "prestacao",
    icone: "account_balance",
  },
  {
    id: "gateway",
    icone: "science",
    destaque: true,
  },
];

export function GerenciarFinanceiro() {
  const { t } = useTranslation("financeiro");
  const [aba, setAba] = useState("config");
  const [modoRateio, setModoRateio] = useState(null);

  const atual = ABAS.find((a) => a.id === aba);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            {t("tela.sobretitulo")}
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {t("tela.titulo")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("tela.tituloDestaque")}
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            {t("tela.descricao")}
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
                  a.destaque
                    ? ativa
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "text-yellow-500/70 hover:bg-yellow-500/10 hover:text-yellow-400"
                    : ativa
                      ? "bg-primary/15 text-primary"
                      : "text-on-surface-variant hover:bg-veu/5 hover:text-on-surface"
                }`}
              >
                <Icone name={a.icone} className="text-lg" />
                {t(`abas.${a.id}.rotulo`)}
              </button>
            );
          })}
        </nav>

        <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-veu/5">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Icone name={atual.icone} className="text-xl" />
            </span>
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                {t(`abas.${atual.id}.rotulo`)}
              </h2>
              <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                {t(`abas.${atual.id}.descricao`)}
              </p>
            </div>
          </div>

          {aba === "config" && (
            <PainelConfiguracao aoSalvar={(c) => setModoRateio(c.modo)} />
          )}
          {aba === "taxas" && <PainelTaxas modoRateio={modoRateio} />}
          {aba === "fracoes" && <PainelFracoes modoRateio={modoRateio} />}
          {aba === "gateway" && <PainelGateway />}
          {aba === "contas" && <PainelContas />}
          {aba === "faturas" && <PainelFaturas />}
          {aba === "multas" && <PainelMultas />}
          {aba === "contratos" && <PainelContratos />}
          {aba === "prestacao" && <PainelPrestacao />}
        </div>
      </div>
    </div>
  );
}
