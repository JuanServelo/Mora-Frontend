import { useEffect, useState } from "react";
import { financeiroApi } from "../../../services/financeiroApi";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";
import { milesimosParaPercentual } from "../../../utils/dinheiro";

const SOMA_ESPERADA = 1000;

export function PainelFracoes({ modoRateio }) {
  const toast = useToast();

  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [rascunho, setRascunho] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await financeiroApi.listarFracoes();
      setItens(data.itens || []);
      setResumo(data.resumo);
      setRascunho({});
    } catch (e) {
      toast.error(
        e.response?.data?.mensagem || "Não foi possível carregar as unidades.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O valor em edição vem do rascunho; o que já está salvo, do servidor.
  const valorDe = (u) =>
    rascunho[u.id] !== undefined ? rascunho[u.id] : (u.milesimos ?? "");

  const somaAtual = itens.reduce((acc, u) => {
    const v = Number(valorDe(u));
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);

  const alterados = Object.keys(rascunho).length;
  const fecha = somaAtual === SOMA_ESPERADA;

  async function propor() {
    try {
      const { data } = await financeiroApi.proporPorArea();
      const proposto = {};
      data.proposta.forEach((p) => {
        proposto[p.id] = p.milesimos;
      });
      setRascunho(proposto);
      toast.success("Proposta calculada. Confira antes de aplicar.");
    } catch (e) {
      toast.error(e.response?.data?.mensagem || "Erro ao calcular a proposta.");
    }
  }

  async function aplicar() {
    const fracoes = Object.entries(rascunho)
      .filter(([, v]) => v !== "" && Number(v) > 0)
      .map(([unidadeId, milesimos]) => ({ unidadeId, milesimos: Number(milesimos) }));

    if (!fracoes.length) return;

    setSalvando(true);
    try {
      await financeiroApi.aplicarFracoes(fracoes);
      toast.success(`${fracoes.length} fração(ões) salva(s).`);
      carregar();
    } catch (e) {
      toast.error(e.response?.data?.mensagem || "Erro ao salvar as frações.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-on-surface-variant text-sm">Carregando unidades…</p>;
  }

  if (!itens.length) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
        <Icone name="apartment" className="text-4xl text-outline-variant" />
        <p className="mt-3 text-on-surface-variant text-sm">
          Nenhuma unidade cadastrada neste condomínio.
        </p>
        <p className="text-xs text-outline-variant mt-1 max-w-md mx-auto">
          A fração ideal é por apartamento. Cadastre blocos e apartamentos em
          Estruturas antes de configurar o rateio proporcional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* O modo fixo não usa fração — dizer isso evita o síndico preencher
          200 campos que não mudam nada na cobrança. */}
      {modoRateio === "FIXO" && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-tertiary/10 border border-tertiary/20">
          <Icone name="info" className="text-tertiary shrink-0 mt-0.5" />
          <p className="text-sm text-on-surface-variant">
            O rateio deste condomínio está em{" "}
            <strong className="text-on-surface">valor fixo por unidade</strong>,
            que não usa a fração ideal. O cadastro aqui fica guardado para quando
            mudar para proporcional.
          </p>
        </div>
      )}

      <div className="glass-panel rounded-3xl p-5 flex flex-wrap items-center gap-6">
        <Indicador
          rotulo="Unidades"
          valor={resumo.unidades}
          icone="apartment"
        />
        <Indicador
          rotulo="Com fração"
          valor={`${resumo.comFracao} de ${resumo.unidades}`}
          icone="task_alt"
          alerta={resumo.faltando > 0}
        />
        <Indicador
          rotulo="Soma"
          valor={`${somaAtual} / ${SOMA_ESPERADA}`}
          icone={fecha ? "check_circle" : "error"}
          alerta={!fecha}
        />

        <div className="ml-auto flex gap-2">
          <button
            onClick={propor}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 text-sm font-semibold transition cursor-pointer"
            title="Calcula uma proposta a partir da área de cada apartamento"
          >
            <Icone name="calculate" className="text-lg" />
            Sugerir pela área
          </button>
          <button
            onClick={aplicar}
            disabled={salvando || !alterados}
            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {salvando ? "Salvando…" : `Salvar ${alterados || ""}`.trim()}
          </button>
        </div>
      </div>

      {/* A soma não fechar não impede salvar, mas impede fechar o mês: o
          preflight do faturamento recusa e lista o que falta. */}
      {!fecha && (
        <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <Icone name="warning" className="text-sm text-error" />
          As frações precisam somar {SOMA_ESPERADA} milésimos para o fechamento
          proporcional rodar. Faltam {SOMA_ESPERADA - somaAtual} milésimos.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-on-surface-variant">
              <th className="py-2 px-3 font-semibold">Unidade</th>
              <th className="py-2 px-3 font-semibold">Bloco</th>
              <th className="py-2 px-3 font-semibold text-right">Área</th>
              <th className="py-2 px-3 font-semibold text-right">Milésimos</th>
              <th className="py-2 px-3 font-semibold text-right">Equivale a</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((u) => {
              const valor = valorDe(u);
              const mudou = rascunho[u.id] !== undefined;
              const vazio = valor === "" || valor === null;
              return (
                <tr
                  key={u.id}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="py-2.5 px-3 text-on-surface font-medium">
                    {u.numero}
                  </td>
                  <td className="py-2.5 px-3 text-on-surface-variant">
                    {u.blocoNome || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant">
                    {u.area ? `${u.area} m²` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min={1}
                      value={valor}
                      placeholder="—"
                      onChange={(e) =>
                        setRascunho((r) => ({ ...r, [u.id]: e.target.value }))
                      }
                      className={`w-24 text-right bg-surface-container-highest/40 rounded-lg py-1.5 px-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        mudou ? "ring-1 ring-primary/40" : ""
                      } ${vazio ? "ring-1 ring-error/40" : ""}`}
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant tabular-nums">
                    {vazio ? "—" : milesimosParaPercentual(Number(valor))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Indicador({ rotulo, valor, icone, alerta }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`p-2 rounded-xl ${
          alerta ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
        }`}
      >
        <Icone name={icone} className="text-lg" />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
          {rotulo}
        </p>
        <p className="font-headline font-bold text-on-surface tabular-nums">
          {valor}
        </p>
      </div>
    </div>
  );
}
