import { useEffect, useState } from "react";
import { financeiroApi } from "../../../services/financeiroApi";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";

const MODOS = [
  {
    valor: "FIXO",
    titulo: "Valor fixo por unidade",
    descricao:
      "Todo apartamento paga o mesmo. Simples, e o que a maioria dos condomínios pequenos usa.",
    icone: "grid_view",
  },
  {
    valor: "FRACAO_IDEAL",
    titulo: "Proporcional à fração ideal",
    descricao:
      "Cada unidade paga conforme sua fração na convenção. Exige a fração cadastrada de todas.",
    icone: "pie_chart",
  },
];

export function PainelConfiguracao({ aoSalvar }) {
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await financeiroApi.obterConfig();
        setConfig(data.config);
        // Sobe já na carga: sem isso as abas de Taxas e Fração só saberiam o
        // modo depois que alguém salvasse esta tela.
        aoSalvar?.(data.config);
      } catch {
        toast.error("Não foi possível carregar a configuração financeira.");
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alterar(campo, valor) {
    setConfig((c) => ({ ...c, [campo]: valor }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const { data } = await financeiroApi.salvarConfig(config);
      setConfig(data.config);
      toast.success("Configuração salva.");
      aoSalvar?.(data.config);
    } catch (e) {
      toast.error(e.response?.data?.mensagem || "Erro ao salvar a configuração.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-on-surface-variant text-sm">Carregando…</p>;
  }
  if (!config) return null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          Como a taxa é dividida
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {MODOS.map((m) => {
            const ativo = config.modo === m.valor;
            return (
              <button
                key={m.valor}
                onClick={() => alterar("modo", m.valor)}
                className={`text-left p-5 rounded-2xl border transition cursor-pointer ${
                  ativo
                    ? "border-primary/60 bg-primary/10"
                    : "border-white/10 hover:border-white/25 bg-surface-container-highest/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icone
                    name={m.icone}
                    className={ativo ? "text-primary" : "text-on-surface-variant"}
                  />
                  <span className="font-semibold text-on-surface">{m.titulo}</span>
                  {ativo && (
                    <Icone name="check_circle" className="text-primary text-base ml-auto" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {m.descricao}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          Calendário de cobrança
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <CampoDia
            label="Dia do fechamento"
            ajuda="Quando as faturas do mês são geradas"
            valor={config.diaFechamento}
            aoMudar={(v) => alterar("diaFechamento", v)}
          />
          <CampoDia
            label="Dia do vencimento"
            ajuda="Prazo de pagamento do morador"
            valor={config.diaVencimento}
            aoMudar={(v) => alterar("diaVencimento", v)}
          />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Prazo de recurso
            </label>
            <input
              type="number"
              min={0}
              value={config.diasRecursoMulta}
              onChange={(e) => alterar("diasRecursoMulta", Number(e.target.value))}
              className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-[11px] text-on-surface-variant ml-1">
              Dias que o morador tem para recorrer de uma multa
            </p>
          </div>
        </div>
        {/* O limite não é arbitrário: fevereiro tem 28 dias, e a regra precisa
            valer para os doze meses do ano. */}
        <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
          <Icone name="info" className="text-sm" />
          Os dias vão até 28 para que a regra funcione em todos os meses,
          fevereiro incluído.
        </p>
      </section>

      <div className="flex justify-end">
        <button
          onClick={salvar}
          disabled={salvando}
          className="px-6 py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold cursor-pointer disabled:opacity-60 transition hover:scale-[1.02]"
        >
          {salvando ? "Salvando…" : "Salvar configuração"}
        </button>
      </div>
    </div>
  );
}

function CampoDia({ label, ajuda, valor, aoMudar }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
        {label}
      </label>
      <select
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
      >
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            Dia {d}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-on-surface-variant ml-1">{ajuda}</p>
    </div>
  );
}
