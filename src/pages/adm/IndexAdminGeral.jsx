import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    rosca: { rotuloKey: "tiposSerie.rosca", icone: "donut_large" },
    barras: { rotuloKey: "tiposSerie.barras", icone: "bar_chart" },
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
  const { t } = useTranslation("paineis");
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
      .catch(() => setErro(t("geral.erroCarregar")))
      .finally(() => setCarregando(false));
  }, [filtros, t]);

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
      {receita.erro || t("geral.carregandoReceita")}
    </div>
  );
  const reais = (v) => formatarBRL(Math.round(v * 100));

  // Cada card, gráfico e a tabela são blocos: o Admin Geral escolhe quais vê,
  // a ordem, o tamanho, o formato e a cor, e a escolha fica salva para ele.
  const definicoes = [
    {
      id: "condominios-ativos", titulo: t("geral.blocos.condominiosAtivos"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={condominios.ativos}
          label={t("geral.blocos.condominiosAtivos")}
          sub={t("geral.blocos.condominiosCadastrados", { total: condominios.total })}
          tom="primary"
          icone="domain"
          onClick={() => navigate("/adm/condominios")}
        />
      ),
    },
    {
      id: "novos-30", titulo: t("geral.blocos.novos30"), tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={condominios.novosUltimos30} label={t("geral.blocos.novos30")} tom="tertiary" icone="trending_up" />,
    },
    {
      id: "usuarios-ativos", titulo: t("geral.blocos.usuariosAtivos"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi cor={cor} valor={usuarios.ativos} label={t("geral.blocos.usuariosAtivos")} sub={t("geral.blocos.usuariosNaPlataforma", { total: usuarios.total })} tom="primary" icone="group" />
      ),
    },
    {
      id: "media-usuarios", titulo: t("geral.blocos.mediaPorCondominio"), tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={mediaUsuarios} label={t("geral.blocos.mediaPorCondominio")} tom="neutro" icone="analytics" />,
    },
    {
      id: "convites", titulo: t("geral.blocos.convitesPendentes"), tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={usuarios.convitesPendentes} label={t("geral.blocos.convitesPendentes")} tom="secondary" icone="mail" />,
    },
    {
      id: "ocorrencias", titulo: t("geral.blocos.ocorrenciasAbertas"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={ocorrencias?.abertas ?? "—"}
          label={t("geral.blocos.ocorrenciasAbertas")}
          sub={ocorrencias ? t("geral.blocos.ocorrenciasRegistradas", { total: ocorrencias.total }) : t("geral.blocos.ocorrenciasIndisponivel")}
          tom={ocorrencias?.abertas > 0 ? "error" : "neutro"}
          icone="report"
        />
      ),
    },

    // ── Receita das assinaturas ─────────────────────────────────────────
    {
      id: "receita-mensal", titulo: t("geral.blocos.receitaMensal"), tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi
          cor={cor}
          valor={formatarBRL(k.mrrCentavos)}
          label={t("geral.blocos.receitaMensal")}
          sub={
            variacao === null
              ? t(k.clientesAtivos !== 1 ? "geral.blocos.assinaturasAtivas" : "geral.blocos.assinaturaAtiva", { n: k.clientesAtivos })
              : t("geral.blocos.variacaoMesAnterior", { variacao: `${variacao >= 0 ? "+" : ""}${variacao}` })
          }
          tom="primary"
          icone="account_balance_wallet"
        />
      ) : semReceita()),
    },
    {
      id: "projecao-anual", titulo: t("geral.blocos.projecaoAnual"), tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi cor={cor} valor={formatarBRL(k.arrCentavos)} label={t("geral.blocos.projecaoAnual")} sub={t("geral.blocos.projecaoSub")} tom="tertiary" icone="trending_up" />
      ) : semReceita()),
    },
    {
      id: "ticket-medio", titulo: t("geral.blocos.ticketMedio"), tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi cor={cor} valor={formatarBRL(k.ticketMedioCentavos)} label={t("geral.blocos.ticketMedio")} sub={t("geral.blocos.ticketSub")} tom="neutro" icone="analytics" />
      ) : semReceita()),
    },
    {
      // Cliente sem plano é receita que existe e não está sendo cobrada — por
      // isso o tom automático é de alerta.
      id: "sem-plano", titulo: t("geral.blocos.semPlano"), tamanho: "kpi",
      render: ({ cor }) => (k ? (
        <CartaoKpi
          cor={cor}
          valor={k.clientesSemAssinatura}
          label={t("geral.blocos.semPlano")}
          sub={k.clientesSemAssinatura > 0 ? t("geral.blocos.semPlanoSub") : t("geral.blocos.todosComAssinatura")}
          tom={k.clientesSemAssinatura > 0 ? "error" : "neutro"}
          icone="money_off"
          onClick={() => navigate("/adm/condominios")}
        />
      ) : semReceita()),
    },
    {
      id: "evolucao-receita", titulo: t("geral.blocos.evolucaoReceita"), tamanho: "grafico",
      tipos: ["area", "linhas", "barras"],
      render: ({ tipo, cor, altura }) => (r ? (
        <CartaoGrafico
          titulo={t("geral.blocos.evolucaoReceita")}
          descricao={t("geral.blocos.evolucaoDescricao", { meses: r.filtros?.meses ?? filtros.meses })}
          vazio={serieReceita.every((p) => p.receita === 0)}
          mensagemVazio={t("geral.blocos.evolucaoVazio")}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={serieReceita}
            eixoX="mes"
            series={[{ chave: "receita", nome: t("geral.blocos.serieReceita"), cor: CORES.primary }]}
            formatarTooltip={reais}
          />
        </CartaoGrafico>
      ) : semReceita(altura)),
    },
    {
      id: "receita-por-plano", titulo: t("geral.blocos.receitaPorPlano"), tamanho: "grafico", ...ROSCA_OU_BARRAS,
      render: ({ tipo, paleta, altura }) => (r ? (
        <CartaoGrafico
          titulo={t("geral.blocos.receitaPorPlano")}
          descricao={t("geral.blocos.receitaPorPlanoDescricao")}
          vazio={receitaPorPlano.length === 0}
          mensagemVazio={t("geral.blocos.receitaPorPlanoVazio")}
          altura={altura}
        >
          <GraficoDistribuicao
            tipo={tipo}
            dados={receitaPorPlano}
            chave="valor"
            nome="nome"
            paleta={paleta}
            formatarTooltip={(v, _nome, item) => [t("geral.blocos.tooltipAssinaturas", { valor: reais(v), n: item.payload.assinaturas }), item.payload.nome]}
          />
        </CartaoGrafico>
      ) : semReceita(altura)),
    },
    {
      id: "receita-por-cliente", titulo: t("geral.blocos.receitaPorCliente"), tamanho: "grafico", larguraPadrao: "inteira", semAltura: true,
      render: ({ cor }) => (r ? <TabelaReceitaClientes dados={r} cor={cor} /> : semReceita()),
    },

    // ── Carteira e usuários ─────────────────────────────────────────────
    {
      id: "crescimento", titulo: t("geral.blocos.crescimento"), tamanho: "grafico", larguraPadrao: "inteira",
      tipos: ["combinado", "barras", "linhas", "area"],
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo={t("geral.blocos.crescimento")}
          descricao={t("geral.blocos.crescimentoDescricao")}
          vazio={serieCondominios.every((p) => p.criados === 0)}
          mensagemVazio={t("geral.blocos.crescimentoVazio")}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={serieCondominios}
            eixoX="mes"
            series={[
              { chave: "criados", nome: t("geral.blocos.serieCriados"), cor: CORES.primary },
              { chave: "acumulado", nome: t("geral.blocos.serieAcumulado"), cor: CORES.secondary },
            ]}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "por-perfil", titulo: t("geral.blocos.porPerfil"), tamanho: "grafico", ...ROSCA_OU_BARRAS,
      render: ({ tipo, paleta, altura }) => (
        <CartaoGrafico titulo={t("geral.blocos.porPerfil")} descricao={t("geral.blocos.porPerfilDescricao")} vazio={porPerfil.length === 0} altura={altura}>
          <GraficoDistribuicao tipo={tipo} dados={porPerfil} chave="total" nome="nome" paleta={paleta} />
        </CartaoGrafico>
      ),
    },
    {
      id: "por-condominio", titulo: t("geral.blocos.porCondominio"), tamanho: "grafico",
      render: ({ cor, altura }) => (
        <CartaoGrafico
          titulo={t("geral.blocos.porCondominio")}
          descricao={t("geral.blocos.porCondominioDescricao")}
          vazio={porCondominio.length === 0}
          mensagemVazio={t("geral.blocos.porCondominioVazio")}
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
                name={t("geral.blocos.serieUsuarios")}
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
              {t("geral.cabecalho.sobretitulo")}
            </p>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              {t("geral.cabecalho.titulo")}{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                {t("geral.cabecalho.tituloDestaque")}
              </span>
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              {t("geral.cabecalho.subtitulo")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/adm/condominios")}
            className="px-5 py-3 rounded-2xl border border-primary/30 text-primary hover:bg-primary/10 transition flex items-center gap-2 font-medium"
          >
            <Icone name="domain" />
            {t("geral.cabecalho.gerenciarClientes")}
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
