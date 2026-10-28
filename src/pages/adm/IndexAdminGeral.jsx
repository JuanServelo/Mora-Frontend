import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { gestaoApi } from "../../services/gestaoApi";
import { useReceitaPlataforma } from "../../hooks/useReceitaPlataforma";
import { CartaoKpi } from "../../components/cards/CartaoKpi";
import { CartaoGrafico } from "../../components/charts/CartaoGrafico";
import { GraficoMensal } from "../../components/charts/GraficoMensal";
import { PainelPersonalizavel } from "../../components/painel/PainelPersonalizavel";
import { TabelaReceitaClientes } from "../../components/adm/TabelaReceitaClientes";
import { FiltroPainel } from "../../components/adm/FiltroPainel";
import { Icone } from "../../components/icones/Icone";
import { labelPerfil } from "../../utils/perfis";
import { formatarBRL } from "../../utils/dinheiro";
import { CORES, EIXO_STYLE, TOOLTIP_STYLE, rotuloMes } from "../../utils/chartTheme";

/** Formatos de "fatias de um todo": rosca ou barras. */
const ROSCA_OU_BARRAS = {
  tipos: ["rosca", "barras"],
  rotulosTipo: {
    rosca: { rotulo: "Rosca", icone: "donut_large" },
    barras: { rotulo: "Barras", icone: "bar_chart" },
  },
};

/** Fatias por categoria, em rosca ou barras, colorindo cada uma pela paleta. */
function GraficoDistribuicao({ tipo, dados, chave, nome, paleta, formatarTooltip, legenda = true }) {
  const fatias = dados.map((d, i) => <Cell key={d[nome]} fill={paleta[i % paleta.length]} />);
  const tooltip = <Tooltip {...TOOLTIP_STYLE} {...(formatarTooltip ? { formatter: formatarTooltip } : {})} />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      {tipo === "barras" ? (
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid stroke={CORES.grid} vertical={false} />
          <XAxis dataKey={nome} {...EIXO_STYLE} />
          <YAxis allowDecimals={false} {...EIXO_STYLE} />
          {tooltip}
          <Bar dataKey={chave} radius={[6, 6, 0, 0]}>{fatias}</Bar>
        </BarChart>
      ) : (
        <PieChart>
          <Pie data={dados} dataKey={chave} nameKey={nome} innerRadius="45%" outerRadius="75%" paddingAngle={2} stroke="none">
            {fatias}
          </Pie>
          {tooltip}
          {legenda && <Legend wrapperStyle={{ fontSize: 12, color: CORES.onSurfaceVariant }} />}
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}

export function IndexAdminGeral() {
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtros, setFiltros] = useState({ meses: 12, status: "todos" });
  const [plano, setPlano] = useState("todos");
  const receita = useReceitaPlataforma(filtros.meses, plano);

  // Cada mudança de filtro refaz a consulta: quem recorta é o backend.
  // `dados` continua na tela durante a busca, para o painel não piscar vazio a
  // cada clique.
  useEffect(() => {
    gestaoApi
      .plataforma(filtros)
      .then((res) => {
        setDados(res.data);
        setErro("");
      })
      .catch(() => setErro("Não foi possível carregar os indicadores da plataforma."))
      .finally(() => setCarregando(false));
  }, [filtros]);

  // Derivado, não um estado à parte: o backend ecoa o filtro que aplicou, então
  // "os números na tela ainda são de outro filtro" é uma comparação, não algo a
  // sincronizar. Evita marcar estado dentro do efeito.
  const atualizando =
    dados != null &&
    (dados.filtros?.meses !== filtros.meses ||
      dados.filtros?.status !== filtros.status);

  const serieCondominios = useMemo(() => {
    const meses = dados?.condominios?.criadosPorMes ?? [];
    return meses.reduce((serie, m) => {
      const anterior = serie[serie.length - 1]?.acumulado ?? 0;
      serie.push({
        mes: rotuloMes(m.mes),
        criados: m.total,
        acumulado: anterior + m.total,
      });
      return serie;
    }, []);
  }, [dados]);

  const porPerfil = useMemo(() => {
    const mapa = dados?.usuarios?.porPerfil ?? {};
    return Object.entries(mapa)
      .map(([perfil, total]) => ({ perfil, nome: labelPerfil(perfil), total }))
      .sort((a, b) => b.total - a.total);
  }, [dados]);

  const porCondominio = useMemo(
    () => (dados?.usuarios?.porCondominio ?? []).slice(0, 10),
    [dados],
  );

  const serieReceita = useMemo(
    () =>
      (receita.dados?.evolucao ?? []).map((p) => ({
        mes: rotuloMes(p.mes),
        receita: p.mrrCentavos / 100,
      })),
    [receita.dados],
  );

  const receitaPorPlano = useMemo(
    () =>
      (receita.dados?.porPlano ?? []).map((p) => ({
        nome: p.plano,
        valor: p.mrrCentavos / 100,
        assinaturas: p.assinaturas,
      })),
    [receita.dados],
  );

  if (carregando) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="glass-panel rounded-2xl h-24 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
          <div className="glass-panel rounded-3xl h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-panel rounded-3xl p-8 text-center space-y-3">
            <Icone name="error" className="text-error text-3xl" />
            <p className="text-error font-medium">{erro}</p>
          </div>
        </div>
      </div>
    );
  }

  const { condominios, usuarios, ocorrencias } = dados;
  const mediaUsuarios = condominios.ativos
    ? Math.round(usuarios.total / condominios.ativos)
    : 0;

  // Receita: cada bloco aguarda a busca própria, sem segurar o resto do painel.
  const r = receita.dados;
  const k = r?.indicadores;
  // Crescimento contra o mês anterior — uma receita isolada não diz se sobe ou desce.
  const mrrAnterior = r?.evolucao?.at(-2)?.mrrCentavos ?? 0;
  const variacao = k && mrrAnterior ? Math.round(((k.mrrCentavos - mrrAnterior) / mrrAnterior) * 100) : null;
  const semReceita = (altura = null) => (
    <div
      className="glass-panel rounded-2xl p-5 flex items-center gap-2 text-sm text-on-surface-variant h-full"
      style={altura ? { minHeight: altura } : undefined}
    >
      <Icone name={receita.erro ? "error" : "progress_activity"} className={receita.erro ? "text-error" : "animate-spin"} />
      {receita.erro || "Carregando receita…"}
    </div>
  );
  const reais = (v) => formatarBRL(Math.round(v * 100));

  // Cada card, gráfico e a tabela são blocos: o Admin Geral escolhe quais vê,
  // a ordem, o tamanho, o formato e a cor, e a escolha fica salva para ele.
  const definicoes = [
    {
      id: "condominios-ativos", titulo: "Condomínios ativos", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={condominios.ativos}
          label="Condomínios ativos"
          sub={`de ${condominios.total} cadastrados`}
          tom="primary"
          icone="domain"
          onClick={() => navigate("/adm/condominios")}
        />
      ),
    },
    {
      id: "novos-30", titulo: "Novos em 30 dias", tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={condominios.novosUltimos30} label="Novos em 30 dias" tom="tertiary" icone="trending_up" />,
    },
    {
      id: "usuarios-ativos", titulo: "Usuários ativos", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi cor={cor} valor={usuarios.ativos} label="Usuários ativos" sub={`de ${usuarios.total} na plataforma`} tom="primary" icone="group" />
      ),
    },
    {
      id: "media-usuarios", titulo: "Média por condomínio", tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={mediaUsuarios} label="Média por condomínio" tom="neutro" icone="analytics" />,
    },
    {
      id: "convites", titulo: "Convites pendentes", tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={usuarios.convitesPendentes} label="Convites pendentes" tom="secondary" icone="mail" />,
    },
    {
      id: "ocorrencias", titulo: "Ocorrências abertas", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={ocorrencias?.abertas ?? "—"}
          label="Ocorrências abertas"
          sub={ocorrencias ? `de ${ocorrencias.total} registradas` : "ocorrencias-service indisponível"}
          tom={ocorrencias?.abertas > 0 ? "error" : "neutro"}
          icone="report"
        />
      ),
    },

    // ── Receita das assinaturas ─────────────────────────────────────────
    {
      id: "receita-mensal", titulo: "Receita mensal", tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi
          cor={cor}
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
      ) : semReceita()),
    },
    {
      id: "projecao-anual", titulo: "Projeção anual", tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi cor={cor} valor={formatarBRL(k.arrCentavos)} label="Projeção anual" sub="Receita mensal × 12" tom="tertiary" icone="trending_up" />
      ) : semReceita()),
    },
    {
      id: "ticket-medio", titulo: "Ticket médio", tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi cor={cor} valor={formatarBRL(k.ticketMedioCentavos)} label="Ticket médio" sub="Por cliente ativo" tom="neutro" icone="analytics" />
      ) : semReceita()),
    },
    {
      // Cliente sem plano é receita que existe e não está sendo cobrada — por
      // isso o tom automático é de alerta.
      id: "sem-plano", titulo: "Clientes sem plano", tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi
          cor={cor}
          valor={k.clientesSemAssinatura}
          label="Clientes sem plano"
          sub={k.clientesSemAssinatura > 0 ? "Não estão sendo cobrados" : "Todos com assinatura"}
          tom={k.clientesSemAssinatura > 0 ? "error" : "neutro"}
          icone="money_off"
          onClick={() => navigate("/adm/condominios")}
        />
      ) : semReceita()),
    },
    {
      id: "evolucao-receita", titulo: "Evolução da receita", tamanho: "grafico",
      tipos: ["area", "linhas", "barras"],
      render: ({ tipo, cor, altura }) => (r ? (
        <CartaoGrafico
          titulo="Evolução da receita"
          descricao={`Receita mensal recorrente nos últimos ${r.filtros?.meses ?? filtros.meses} meses`}
          vazio={serieReceita.every((p) => p.receita === 0)}
          mensagemVazio="Nenhuma assinatura ativa no período."
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={serieReceita}
            eixoX="mes"
            series={[{ chave: "receita", nome: "Receita", cor: CORES.primary }]}
            formatarTooltip={reais}
          />
        </CartaoGrafico>
      ) : semReceita(altura)),
    },
    {
      id: "receita-por-plano", titulo: "Receita por plano", tamanho: "grafico", ...ROSCA_OU_BARRAS,
      render: ({ tipo, paleta, altura }) => (r ? (
        <CartaoGrafico
          titulo="Receita por plano"
          descricao="Quanto cada plano representa do total"
          vazio={receitaPorPlano.length === 0}
          mensagemVazio="Nenhuma assinatura ativa."
          altura={altura}
        >
          <GraficoDistribuicao
            tipo={tipo}
            dados={receitaPorPlano}
            chave="valor"
            nome="nome"
            paleta={paleta}
            formatarTooltip={(v, _nome, item) => [`${reais(v)} · ${item.payload.assinaturas} assinatura(s)`, item.payload.nome]}
          />
        </CartaoGrafico>
      ) : semReceita(altura)),
    },
    {
      id: "receita-por-cliente", titulo: "Receita por cliente", tamanho: "grafico", larguraPadrao: "inteira", semAltura: true,
      render: ({ cor }) => (r ? <TabelaReceitaClientes dados={r} cor={cor} /> : semReceita()),
    },

    // ── Carteira e usuários ─────────────────────────────────────────────
    {
      id: "crescimento", titulo: "Crescimento da carteira", tamanho: "grafico", larguraPadrao: "inteira",
      tipos: ["combinado", "barras", "linhas", "area"],
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo="Crescimento da carteira"
          descricao="Condomínios criados por mês e total acumulado"
          vazio={serieCondominios.every((p) => p.criados === 0)}
          mensagemVazio="Nenhum condomínio criado no período."
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={serieCondominios}
            eixoX="mes"
            series={[
              { chave: "criados", nome: "Criados no mês", cor: CORES.primary },
              { chave: "acumulado", nome: "Acumulado", cor: CORES.secondary },
            ]}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "por-perfil", titulo: "Usuários por perfil", tamanho: "grafico", ...ROSCA_OU_BARRAS,
      render: ({ tipo, paleta, altura }) => (
        <CartaoGrafico titulo="Usuários por perfil" descricao="Distribuição entre os perfis" vazio={porPerfil.length === 0} altura={altura}>
          <GraficoDistribuicao tipo={tipo} dados={porPerfil} chave="total" nome="nome" paleta={paleta} />
        </CartaoGrafico>
      ),
    },
    {
      id: "por-condominio", titulo: "Usuários por condomínio", tamanho: "grafico",
      render: ({ cor, altura }) => (
        <CartaoGrafico
          titulo="Usuários por condomínio"
          descricao="Dez maiores — clique para abrir o cliente"
          vazio={porCondominio.length === 0}
          mensagemVazio="Nenhum usuário vinculado a condomínio ainda."
          altura={altura}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porCondominio} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={CORES.grid} horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...EIXO_STYLE} />
              <YAxis type="category" dataKey="nome" width={110} {...EIXO_STYLE} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar
                dataKey="total"
                name="Usuários"
                fill={cor ?? CORES.tertiary}
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={(barra) =>
                  barra?.payload?.condominioId &&
                  navigate(`/adm/condominios/${barra.payload.condominioId}`)
                }
              />
            </BarChart>
          </ResponsiveContainer>
        </CartaoGrafico>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Visão{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Geral
              </span>
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Indicadores de todos os condomínios da plataforma.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/adm/condominios")}
            className="px-5 py-3 rounded-2xl border border-primary/30 text-primary hover:bg-primary/10 transition flex items-center gap-2 font-medium"
          >
            <Icone name="domain" />
            Gerenciar clientes
          </button>
        </header>

        <FiltroPainel
          filtros={filtros}
          aoMudar={setFiltros}
          carregando={atualizando}
          planos={r?.planosDisponiveis}
          plano={plano}
          aoMudarPlano={setPlano}
        />

        <PainelPersonalizavel chave="painel.geral" definicoes={definicoes} />
      </div>
    </div>
  );
}

export default IndexAdminGeral;
