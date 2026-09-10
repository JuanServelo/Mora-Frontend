import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { gestaoApi } from "../../services/gestaoApi";
import { CartaoKpi } from "../cards/CartaoKpi";
import { CartaoGrafico } from "../charts/CartaoGrafico";
import { Icone } from "../icones/Icone";
import { formatarBRL } from "../../utils/dinheiro";
import { CORES, EIXO_STYLE, PALETA, TOOLTIP_STYLE, rotuloMes } from "../../utils/chartTheme";

/**
 * Receita da plataforma com as assinaturas dos condomínios.
 *
 * É o outro fluxo de dinheiro do Mora: o financeiro-service cuida do que o
 * morador paga ao condomínio; aqui é o que o condomínio paga à plataforma.
 *
 * Busca separada do painel principal de propósito — a agregação percorre todas
 * as assinaturas, e quem quer só os números de uso não deve esperar por ela.
 */
export function SecaoReceita({ meses = 12 }) {
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  // A janela vem do filtro do painel; o plano é escolhido aqui, porque só faz
  // sentido para os gráficos de receita.
  const [plano, setPlano] = useState("todos");

  useEffect(() => {
    gestaoApi
      .receita({ meses, plano })
      .then((r) => {
        setDados(r.data);
        setErro("");
      })
      .catch(() => setErro("Não foi possível carregar a receita das assinaturas."));
  }, [meses, plano]);

  const serie = useMemo(
    () =>
      (dados?.evolucao ?? []).map((p) => ({
        mes: rotuloMes(p.mes),
        receita: p.mrrCentavos / 100,
        clientes: p.clientes,
      })),
    [dados],
  );

  const porPlano = useMemo(
    () =>
      (dados?.porPlano ?? []).map((p) => ({
        nome: p.plano,
        valor: p.mrrCentavos / 100,
        assinaturas: p.assinaturas,
      })),
    [dados],
  );

  if (erro) {
    return (
      <div className="glass-panel rounded-3xl p-6 flex items-center gap-3 text-on-surface-variant">
        <Icone name="error" className="text-error" />
        {erro}
      </div>
    );
  }

  if (!dados) {
    return <p className="text-on-surface-variant text-sm">Carregando receita…</p>;
  }

  const k = dados.indicadores;
  // Crescimento contra o mês anterior — um MRR isolado não diz se sobe ou desce.
  const anterior = dados.evolucao.at(-2)?.mrrCentavos ?? 0;
  const variacao = anterior ? Math.round(((k.mrrCentavos - anterior) / anterior) * 100) : null;

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="p-2.5 rounded-xl bg-tertiary/10 text-tertiary">
          <Icone name="payments" className="text-xl" />
        </span>
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">
            Receita das assinaturas
          </h2>
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
            O que os condomínios pagam à plataforma
          </p>
        </div>

        {/* A lista vem do backend sempre completa, mesmo com filtro ativo —
            montada da base já filtrada, o seletor ficaria preso na escolha. */}
        {dados.planosDisponiveis?.length > 1 && (
          <select
            value={plano}
            onChange={(e) => setPlano(e.target.value)}
            aria-label="Filtrar por plano"
            className="ml-auto bg-surface-container-highest/40 border-none rounded-xl py-2 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="todos">Todos os planos</option>
            {dados.planosDisponiveis.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoKpi
          valor={formatarBRL(k.mrrCentavos)}
          label="Receita mensal"
          sub={
            variacao === null
              ? `${k.clientesAtivos} assinatura${k.clientesAtivos !== 1 ? "s" : ""} ativa${k.clientesAtivos !== 1 ? "s" : ""}`
              : `${variacao >= 0 ? "+" : ""}${variacao}% vs. mês anterior`
          }
          tom="primary"
          icone="account_balance_wallet"
        />
        <CartaoKpi
          valor={formatarBRL(k.arrCentavos)}
          label="Projeção anual"
          sub="Receita mensal × 12"
          tom="tertiary"
          icone="trending_up"
        />
        <CartaoKpi
          valor={formatarBRL(k.ticketMedioCentavos)}
          label="Ticket médio"
          sub="Por cliente ativo"
          tom="neutro"
          icone="analytics"
        />
        {/* Cliente sem plano é receita que existe e não está sendo cobrada —
            por isso vira alerta, e não um número neutro a mais. */}
        <CartaoKpi
          valor={k.clientesSemAssinatura}
          label="Clientes sem plano"
          sub={k.clientesSemAssinatura > 0 ? "Não estão sendo cobrados" : "Todos com assinatura"}
          tom={k.clientesSemAssinatura > 0 ? "error" : "neutro"}
          icone="money_off"
          onClick={() => navigate("/adm/condominios")}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <CartaoGrafico
          titulo="Evolução da receita"
          descricao={`Receita mensal recorrente nos últimos ${dados.filtros?.meses ?? meses} meses`}
          vazio={serie.every((p) => p.receita === 0)}
          mensagemVazio="Nenhuma assinatura ativa no período."
          altura={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CORES.primary} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CORES.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CORES.grid} vertical={false} />
              <XAxis dataKey="mes" {...EIXO_STYLE} />
              <YAxis {...EIXO_STYLE} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, nome) =>
                  nome === "receita"
                    ? [formatarBRL(Math.round(v * 100)), "Receita"]
                    : [v, "Clientes"]
                }
              />
              <Area
                type="monotone"
                dataKey="receita"
                name="receita"
                stroke={CORES.primary}
                strokeWidth={2}
                fill="url(#gradReceita)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CartaoGrafico>

        <CartaoGrafico
          titulo="Receita por plano"
          descricao="Quanto cada plano representa do total"
          vazio={porPlano.length === 0}
          mensagemVazio="Nenhuma assinatura ativa."
          altura={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={porPlano}
                dataKey="valor"
                nameKey="nome"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {porPlano.map((p, i) => (
                  <Cell key={p.nome} fill={PALETA[i % PALETA.length]} />
                ))}
              </Pie>
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, nome, item) => [
                  `${formatarBRL(Math.round(v * 100))} · ${item.payload.assinaturas} assinatura(s)`,
                  nome,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </CartaoGrafico>
      </div>

      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Receita por cliente
          </h3>
          <button
            onClick={() => navigate("/adm/condominios")}
            className="text-sm text-primary font-semibold hover:underline cursor-pointer"
          >
            Ver clientes
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-on-surface-variant">
                <th className="py-2 pr-4 font-semibold">Cliente</th>
                <th className="py-2 pr-4 font-semibold">Plano</th>
                <th className="py-2 pr-4 font-semibold text-right">Mensalidade</th>
                <th className="py-2 pr-4 font-semibold text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {dados.clientes.map((c) => (
                <tr
                  key={c.condominioId}
                  onClick={() => navigate(`/adm/condominios/${c.condominioId}`)}
                  className="border-t border-veu/5 hover:bg-veu/[0.03] cursor-pointer"
                >
                  <td className="py-2.5 pr-4 text-on-surface font-medium">{c.nome}</td>
                  <td className="py-2.5 pr-4">
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      {c.plano}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-on-surface tabular-nums">
                    {formatarBRL(c.mensalidadeCentavos)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-on-surface-variant tabular-nums">
                    {formatarBRL(c.acumuladoCentavos)}
                  </td>
                </tr>
              ))}

              {dados.semAssinatura.map((c) => (
                <tr key={c.condominioId} className="border-t border-veu/5">
                  <td className="py-2.5 pr-4 text-on-surface-variant">{c.nome}</td>
                  <td className="py-2.5 pr-4" colSpan={3}>
                    <span className="px-2 py-0.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                      sem plano contratado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* O acumulado é estimado, e dizer isso na tela evita que alguém o use
            como número de fechamento contábil. */}
        <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
          <Icone name="info" className="text-sm" />
          O acumulado é uma estimativa — mensalidade × meses de vigência. Não há
          histórico de pagamento das assinaturas.
        </p>
      </div>
    </section>
  );
}
