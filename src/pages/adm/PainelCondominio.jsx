// src/pages/adm/PainelCondominio.jsx
// Painéis do síndico (RF-18): operacional, o que pede ação agora; estratégico,
// como o condomínio vem andando mês a mês. Os dois são personalizáveis: cada
// síndico escolhe os blocos, a ordem e o tipo de gráfico, e isso fica salvo.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { gestaoApi } from "../../services/gestaoApi";
import { CartaoKpi } from "../../components/cards/CartaoKpi";
import { CartaoGrafico } from "../../components/charts/CartaoGrafico";
import { GraficoMensal } from "../../components/charts/GraficoMensal";
import { PainelPersonalizavel } from "../../components/painel/PainelPersonalizavel";
import { Icone } from "../../components/icones/Icone";
import { formatarBRL } from "../../utils/dinheiro";
import { formatarData } from "../../utils/datas";
import { CORES, rotuloMes } from "../../utils/chartTheme";
import { rotuloCategoria } from "../../utils/ocorrencias";

const ABAS = [
  { id: "operacional", icone: "bolt" },
  { id: "estrategico", icone: "insights" },
];

const JANELAS = [3, 6, 12];

/** Nome legível de cada fonte, para o aviso de dado faltando (chave em `condominio.fontes`). */
const FONTES = {
  "portaria-service": "portaria",
  "auth-api": "usuarios",
  "ocorrencias-service": "ocorrencias",
  "comunicacao-service": "comunicacao",
  financeiro: "financeiro",
};

/** Número de um bloco, ou "—" quando a fonte não respondeu. */
const n = (valor) => (valor === null || valor === undefined ? "—" : valor);

function AvisoFontes({ fontes }) {
  const { t } = useTranslation("paineis");
  if (!fontes?.length) return null;
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3 border border-secondary/25 bg-secondary/5 text-sm">
      <Icone name="cloud_off" className="text-secondary text-xl shrink-0" />
      <p className="text-on-surface">
        {t("condominio.avisoFontes", {
          fontes: fontes.map((f) => (FONTES[f] ? t(`condominio.fontes.${FONTES[f]}`) : f)).join(", "),
        })}
      </p>
    </div>
  );
}

function Operacional({ dados }) {
  const { t } = useTranslation("paineis");
  const navigate = useNavigate();
  const { entregas, reservas, presenca, ocorrencias, ordensServico, conversas, avisos, financeiro } = dados;

  // Cada card é um bloco: o síndico escolhe quais vê e em que ordem.
  const definicoes = [
    {
      id: "reservas", titulo: t("condominio.operacional.reservasAprovar"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(reservas?.aguardandoAprovacao)}
          label={t("condominio.operacional.reservasAprovar")}
          sub={reservas?.proximoPrazo ? t("condominio.operacional.primeiroPrazo", { data: formatarData(reservas.proximoPrazo) }) : undefined}
          tom={reservas?.aguardandoAprovacao ? "secondary" : "neutro"}
          icone="event_available"
          onClick={() => navigate("/espacos")}
        />
      ),
    },
    {
      id: "ocorrencias", titulo: t("condominio.operacional.ocorrenciasAbertas"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(ocorrencias?.abertas)}
          label={t("condominio.operacional.ocorrenciasAbertas")}
          sub={ocorrencias ? t("condominio.operacional.semAtendimento", { n: ocorrencias.pendentes }) : undefined}
          tom={ocorrencias?.pendentes ? "error" : "neutro"}
          icone="report"
          onClick={() => navigate("/adm/reclamacoes")}
        />
      ),
    },
    {
      id: "ordens-servico", titulo: t("condominio.operacional.osAtrasadas"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(ordensServico?.atrasadas)}
          label={t("condominio.operacional.osAtrasadas")}
          sub={ordensServico
            ? t("condominio.operacional.osSub", {
              criticas: ordensServico.criticasAtrasadas,
              prazo: ordensServico.percentualNoPrazo != null
                ? t("condominio.operacional.noPrazo", { percentual: ordensServico.percentualNoPrazo })
                : t("condominio.operacional.nenhumaConcluida"),
            })
            : undefined}
          tom={ordensServico?.atrasadas ? "error" : "neutro"}
          icone="construction"
          onClick={() => navigate("/adm/ordens-servico")}
        />
      ),
    },
    {
      id: "conversas", titulo: t("condominio.operacional.conversasNova"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(conversas?.comMensagemNova)}
          label={t("condominio.operacional.conversasNova")}
          sub={conversas ? t("condominio.operacional.emAberto", { n: conversas.abertas }) : undefined}
          tom={conversas?.comMensagemNova ? "primary" : "neutro"}
          icone="forum"
          onClick={() => navigate("/conversas")}
        />
      ),
    },
    {
      id: "faturas", titulo: t("condominio.operacional.faturasAtraso"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(financeiro?.faturasEmAtraso)}
          label={t("condominio.operacional.faturasAtrasoMes")}
          sub={financeiro ? t("condominio.operacional.recebidos", { valor: formatarBRL(financeiro.recebidoCentavos) }) : undefined}
          tom={financeiro?.faturasEmAtraso ? "error" : "neutro"}
          icone="receipt_long"
          onClick={() => navigate("/adm/financeiro")}
        />
      ),
    },
    {
      id: "entregas", titulo: t("condominio.operacional.entregas"), tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(entregas?.aguardandoRetirada)}
          label={t("condominio.operacional.entregas")}
          sub={entregas?.maisAntigaDesde ? t("condominio.operacional.maisAntiga", { data: formatarData(entregas.maisAntigaDesde) }) : undefined}
          icone="inventory_2"
        />
      ),
    },
    {
      id: "visitantes", titulo: t("condominio.operacional.visitantes"), tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={n(presenca?.visitantesDentro)} label={t("condominio.operacional.visitantes")} icone="badge" />,
    },
    {
      id: "atendimentos", titulo: t("condominio.operacional.atendimentos"), tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={n(presenca?.atendimentosAbertos)} label={t("condominio.operacional.atendimentosAbertos")} icone="door_front" />,
    },
    {
      id: "avisos", titulo: t("condominio.operacional.avisos"), tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={n(avisos?.vigentes)} label={t("condominio.operacional.avisos")} icone="campaign" onClick={() => navigate("/adm/comunicados")} />,
    },
    {
      id: "leitura-avisos", titulo: t("condominio.operacional.leituraAvisos"), tamanho: "secao",
      render: ({ cor }) => <LeituraAvisos avisos={avisos} cor={cor} />,
    },
  ];

  return <PainelPersonalizavel key="painel.condominio.operacional" chave="painel.condominio.operacional" definicoes={definicoes} />;
}

function LeituraAvisos({ avisos, cor }) {
  const { t } = useTranslation("paineis");
  return (
    <section className="glass-panel rounded-3xl p-6 space-y-4">
      <div>
        <h2 className="font-headline text-lg font-bold text-on-surface">{t("condominio.leitura.titulo")}</h2>
        <p className="text-xs text-on-surface-variant">
          {t("condominio.leitura.descricao")}
        </p>
      </div>
      {!avisos?.leitura?.length ? (
        <p className="text-sm text-on-surface-variant">
          {avisos ? t("condominio.leitura.nenhumAviso") : t("comum:estado.indisponivel")}
        </p>
      ) : avisos.leitura.map((a) => (
        <div key={a.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-on-surface font-medium truncate">{a.titulo}</span>
            <span className="text-on-surface-variant shrink-0">
              {a.percentual !== null
                ? t("condominio.leitura.percentual", { leituras: a.leituras, destinatarios: a.destinatarios, percentual: a.percentual })
                : t("condominio.leitura.leituras", { n: n(a.leituras) })}
            </span>
          </div>
          <div className="h-2 rounded-full bg-veu/5 overflow-hidden">
            <div
              className={`h-full ${cor ? "" : a.percentual !== null && a.percentual < 50 ? "bg-secondary" : "bg-primary"}`}
              style={{ width: `${a.percentual ?? 0}%`, ...(cor ? { background: cor } : {}) }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}

/** Formatos dos gráficos mensais que o síndico pode escolher. */
const SERIE = ["barras", "linhas", "area"];

function Estrategico({ dados }) {
  const { t } = useTranslation("paineis");
  const { reservas, ocorrencias, inadimplencia, multas } = dados;
  const rotulo = (p) => ({ ...p, rotulo: rotuloMes(p.mes) });

  const definicoes = [
    {
      id: "reservas", titulo: t("condominio.estrategico.reservas"), tamanho: "grafico", tipos: SERIE,
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo={t("condominio.estrategico.reservas")}
          descricao={t("condominio.estrategico.reservasDescricao")}
          vazio={!reservas || reservas.porMes.every((p) => p.total === 0)}
          mensagemVazio={reservas ? t("condominio.estrategico.reservasVazio") : t("comum:estado.indisponivel")}
          altura={altura}
        >
          <GraficoMensal tipo={tipo} cor={cor} dados={reservas?.porMes.map(rotulo)} series={[{ chave: "total", nome: t("condominio.estrategico.serieReservas"), cor: CORES.primary }]} />
        </CartaoGrafico>
      ),
    },
    {
      id: "ocorrencias", titulo: t("condominio.estrategico.ocorrencias"), tamanho: "grafico", tipos: SERIE,
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo={t("condominio.estrategico.ocorrencias")}
          descricao={ocorrencias?.tempoMedioResolucaoDias != null
            ? t("condominio.estrategico.tempoMedio", { dias: ocorrencias.tempoMedioResolucaoDias })
            : t("condominio.estrategico.ocorrenciasDescricao")}
          vazio={!ocorrencias || ocorrencias.porMes.every((p) => p.abertas === 0 && p.resolvidas === 0)}
          mensagemVazio={ocorrencias ? t("condominio.estrategico.ocorrenciasVazio") : t("comum:estado.indisponivel")}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={ocorrencias?.porMes.map(rotulo)}
            series={[
              { chave: "abertas", nome: t("condominio.estrategico.serieAbertas"), cor: CORES.error },
              { chave: "resolvidas", nome: t("condominio.estrategico.serieResolvidas"), cor: CORES.tertiary },
            ]}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "inadimplencia", titulo: t("condominio.estrategico.inadimplencia"), tamanho: "grafico", tipos: ["linhas", "barras", "area"],
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo={t("condominio.estrategico.inadimplencia")}
          descricao={t("condominio.estrategico.inadimplenciaDescricao")}
          vazio={!inadimplencia || inadimplencia.porMes.every((p) => p.taxa === null)}
          mensagemVazio={inadimplencia ? t("condominio.estrategico.inadimplenciaVazio") : t("comum:estado.indisponivel")}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={inadimplencia?.porMes.map(rotulo)}
            series={[{ chave: "taxa", nome: t("condominio.estrategico.serieEmAtraso"), cor: CORES.secondary }]}
            eixoY={{ domain: [0, 100], unit: "%" }}
            formatarTooltip={(v) => (v === null ? "—" : `${v}%`)}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "multas", titulo: t("condominio.estrategico.multas"), tamanho: "grafico", tipos: SERIE,
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo={t("condominio.estrategico.multas")}
          descricao={t("condominio.estrategico.multasDescricao")}
          vazio={!multas || multas.porMes.every((p) => p.aplicadas === 0)}
          mensagemVazio={multas ? t("condominio.estrategico.multasVazio") : t("comum:estado.indisponivel")}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={multas?.porMes.map(rotulo)}
            series={[
              { chave: "aplicadas", nome: t("condominio.estrategico.serieAplicadas"), cor: CORES.primary },
              { chave: "canceladas", nome: t("condominio.estrategico.serieCanceladas"), cor: CORES.onSurfaceVariant },
            ]}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "areas", titulo: t("condominio.estrategico.areas"), tamanho: "grafico", semAltura: true,
      render: ({ cor }) => (
        <section className="glass-panel rounded-3xl p-6">
          <Ranking titulo={t("condominio.estrategico.areas")} cor={cor} itens={(reservas?.porArea ?? []).map((a) => [a.area, a.total])} />
        </section>
      ),
    },
    {
      id: "categorias", titulo: t("condominio.estrategico.categorias"), tamanho: "grafico", semAltura: true,
      render: ({ cor }) => (
        <section className="glass-panel rounded-3xl p-6">
          <Ranking
            titulo={t("condominio.estrategico.categorias")}
            cor={cor}
            itens={(ocorrencias?.porCategoria ?? []).map((c) => [rotuloCategoria(c.categoria), c.total])}
          />
        </section>
      ),
    },
  ];

  return <PainelPersonalizavel key="painel.condominio.estrategico" chave="painel.condominio.estrategico" definicoes={definicoes} />;
}

function Ranking({ titulo, itens, cor }) {
  const { t } = useTranslation("paineis");
  const maior = Math.max(1, ...itens.map(([, v]) => v));
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("condominio.estrategico.rankingVazio")}</p>
      ) : itens.map(([nome, valor]) => (
        <div key={nome} className="flex items-center gap-3 text-sm">
          <span className="w-32 truncate text-on-surface">{nome}</span>
          <div className="flex-1 h-2 rounded-full bg-veu/5 overflow-hidden">
            <div
              className={`h-full ${cor ? "" : "bg-primary/60"}`}
              style={{ width: `${(valor / maior) * 100}%`, ...(cor ? { background: cor, opacity: 0.8 } : {}) }}
            />
          </div>
          <span className="w-8 text-right font-semibold text-on-surface">{valor}</span>
        </div>
      ))}
    </div>
  );
}

export function PainelCondominio() {
  const { t } = useTranslation("paineis");
  const [aba, setAba] = useState("operacional");
  const [meses, setMeses] = useState(6);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = aba === "operacional"
        ? await gestaoApi.painelOperacional()
        : await gestaoApi.painelEstrategico(meses);
      setDados(data);
    } catch (err) {
      setDados(null);
      setErro(err.response?.data?.mensagem || t("condominio.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }, [aba, meses, t]);

  useEffect(() => { carregar(); }, [carregar]);

  const atual = ABAS.find((a) => a.id === aba);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">{t("condominio.cabecalho.sobretitulo")}</p>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              {t("condominio.cabecalho.titulo")}{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">{t("condominio.cabecalho.tituloDestaque")}</span>
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">{t(`condominio.abas.${atual.id}.descricao`)}</p>
          </div>
          <button
            onClick={carregar}
            disabled={carregando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 disabled:opacity-50 cursor-pointer"
          >
            <Icone name="refresh" className={`text-lg ${carregando ? "animate-spin" : ""}`} />
            {t("comum:acoes.atualizar")}
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex gap-1 glass-panel rounded-2xl p-1">
            {ABAS.map((a) => (
              <button
                key={a.id}
                onClick={() => { setDados(null); setAba(a.id); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  aba === a.id ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-veu/5"
                }`}
              >
                <Icone name={a.icone} className="text-base" />
                {t(`condominio.abas.${a.id}.label`)}
              </button>
            ))}
          </nav>
          {aba === "estrategico" && (
            <div className="flex items-center gap-1 glass-panel rounded-2xl p-1">
              {JANELAS.map((j) => (
                <button
                  key={j}
                  onClick={() => setMeses(j)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    meses === j ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-veu/5"
                  }`}
                >
                  {t("condominio.janela", { n: j })}
                </button>
              ))}
            </div>
          )}
        </div>

        {erro ? (
          <div className="glass-panel rounded-3xl p-8 text-center text-on-surface-variant">
            <Icone name="error" className="text-3xl text-error mb-2" />
            <p>{erro}</p>
          </div>
        ) : !dados ? (
          <div className="flex items-center justify-center py-16 text-on-surface-variant">
            <Icone name="sync" className="text-3xl animate-spin mr-3" />
            {t("condominio.carregando")}
          </div>
        ) : (
          <>
            <AvisoFontes fontes={dados.fontesIndisponiveis} />
            {aba === "operacional" ? <Operacional dados={dados} /> : <Estrategico dados={dados} />}
          </>
        )}
      </div>
    </div>
  );
}
