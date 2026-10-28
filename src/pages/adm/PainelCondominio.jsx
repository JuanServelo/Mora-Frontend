// src/pages/adm/PainelCondominio.jsx
// Painéis do síndico (RF-18): operacional, o que pede ação agora; estratégico,
// como o condomínio vem andando mês a mês. Os dois são personalizáveis: cada
// síndico escolhe os blocos, a ordem e o tipo de gráfico, e isso fica salvo.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  { id: "operacional", label: "Operacional", icone: "bolt", descricao: "O que pede ação agora" },
  { id: "estrategico", label: "Estratégico", icone: "insights", descricao: "Como o condomínio vem andando" },
];

const JANELAS = [3, 6, 12];

/** Nome legível de cada fonte, para o aviso de dado faltando. */
const FONTES = {
  "portaria-service": "portaria (entregas, reservas, acessos)",
  "auth-api": "usuários",
  "ocorrencias-service": "ocorrências e ordens de serviço",
  "comunicacao-service": "avisos e conversas",
  financeiro: "financeiro",
};

/** Número de um bloco, ou "—" quando a fonte não respondeu. */
const n = (valor) => (valor === null || valor === undefined ? "—" : valor);

function AvisoFontes({ fontes }) {
  if (!fontes?.length) return null;
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3 border border-secondary/25 bg-secondary/5 text-sm">
      <Icone name="cloud_off" className="text-secondary text-xl shrink-0" />
      <p className="text-on-surface">
        Parte dos números não pôde ser carregada agora: {fontes.map((f) => FONTES[f] ?? f).join(", ")}.
        O resto do painel está atualizado.
      </p>
    </div>
  );
}

function Operacional({ dados }) {
  const navigate = useNavigate();
  const { entregas, reservas, presenca, ocorrencias, ordensServico, conversas, avisos, financeiro } = dados;

  // Cada card é um bloco: o síndico escolhe quais vê e em que ordem.
  const definicoes = [
    {
      id: "reservas", titulo: "Reservas para aprovar", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(reservas?.aguardandoAprovacao)}
          label="Reservas para aprovar"
          sub={reservas?.proximoPrazo ? `Primeiro prazo: ${formatarData(reservas.proximoPrazo)}` : undefined}
          tom={reservas?.aguardandoAprovacao ? "secondary" : "neutro"}
          icone="event_available"
          onClick={() => navigate("/espacos")}
        />
      ),
    },
    {
      id: "ocorrencias", titulo: "Ocorrências abertas", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(ocorrencias?.abertas)}
          label="Ocorrências abertas"
          sub={ocorrencias ? `${ocorrencias.pendentes} sem atendimento` : undefined}
          tom={ocorrencias?.pendentes ? "error" : "neutro"}
          icone="report"
          onClick={() => navigate("/adm/reclamacoes")}
        />
      ),
    },
    {
      id: "ordens-servico", titulo: "Ordens de serviço atrasadas", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(ordensServico?.atrasadas)}
          label="Ordens de serviço atrasadas"
          sub={ordensServico
            ? `${ordensServico.criticasAtrasadas} crítica(s) · ${
              ordensServico.percentualNoPrazo != null ? `${ordensServico.percentualNoPrazo}% no prazo` : "nenhuma concluída"}`
            : undefined}
          tom={ordensServico?.atrasadas ? "error" : "neutro"}
          icone="construction"
          onClick={() => navigate("/adm/ordens-servico")}
        />
      ),
    },
    {
      id: "conversas", titulo: "Conversas com mensagem nova", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(conversas?.comMensagemNova)}
          label="Conversas com mensagem nova"
          sub={conversas ? `${conversas.abertas} em aberto` : undefined}
          tom={conversas?.comMensagemNova ? "primary" : "neutro"}
          icone="forum"
          onClick={() => navigate("/conversas")}
        />
      ),
    },
    {
      id: "faturas", titulo: "Faturas em atraso", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(financeiro?.faturasEmAtraso)}
          label="Faturas em atraso no mês"
          sub={financeiro ? `${formatarBRL(financeiro.recebidoCentavos)} recebidos` : undefined}
          tom={financeiro?.faturasEmAtraso ? "error" : "neutro"}
          icone="receipt_long"
          onClick={() => navigate("/adm/financeiro")}
        />
      ),
    },
    {
      id: "entregas", titulo: "Entregas na portaria", tamanho: "kpi",
      render: ({ cor }) => (
        <CartaoKpi
          cor={cor}
          valor={n(entregas?.aguardandoRetirada)}
          label="Entregas na portaria"
          sub={entregas?.maisAntigaDesde ? `Mais antiga: ${formatarData(entregas.maisAntigaDesde)}` : undefined}
          icone="inventory_2"
        />
      ),
    },
    {
      id: "visitantes", titulo: "Visitantes no condomínio", tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={n(presenca?.visitantesDentro)} label="Visitantes no condomínio" icone="badge" />,
    },
    {
      id: "atendimentos", titulo: "Atendimentos na portaria", tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={n(presenca?.atendimentosAbertos)} label="Atendimentos abertos na portaria" icone="door_front" />,
    },
    {
      id: "avisos", titulo: "Avisos vigentes", tamanho: "kpi",
      render: ({ cor }) => <CartaoKpi cor={cor} valor={n(avisos?.vigentes)} label="Avisos vigentes" icone="campaign" onClick={() => navigate("/adm/comunicados")} />,
    },
    {
      id: "leitura-avisos", titulo: "Leitura dos avisos", tamanho: "secao",
      render: ({ cor }) => <LeituraAvisos avisos={avisos} cor={cor} />,
    },
  ];

  return <PainelPersonalizavel key="painel.condominio.operacional" chave="painel.condominio.operacional" definicoes={definicoes} />;
}

function LeituraAvisos({ avisos, cor }) {
  return (
    <section className="glass-panel rounded-3xl p-6 space-y-4">
      <div>
        <h2 className="font-headline text-lg font-bold text-on-surface">Leitura dos avisos vigentes</h2>
        <p className="text-xs text-on-surface-variant">
          Quem confirmou a leitura, contra quem deveria ler pelo público do aviso. Os menos lidos primeiro.
        </p>
      </div>
      {!avisos?.leitura?.length ? (
        <p className="text-sm text-on-surface-variant">
          {avisos ? "Nenhum aviso vigente agora." : "Dado indisponível agora."}
        </p>
      ) : avisos.leitura.map((a) => (
        <div key={a.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-on-surface font-medium truncate">{a.titulo}</span>
            <span className="text-on-surface-variant shrink-0">
              {a.percentual !== null
                ? `${a.leituras} de ${a.destinatarios} · ${a.percentual}%`
                : `${n(a.leituras)} leituras`}
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
  const { reservas, ocorrencias, inadimplencia, multas } = dados;
  const rotulo = (p) => ({ ...p, rotulo: rotuloMes(p.mes) });

  const definicoes = [
    {
      id: "reservas", titulo: "Reservas por mês", tamanho: "grafico", tipos: SERIE,
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo="Reservas por mês"
          descricao="Aprovadas, pendentes e concluídas — canceladas e recusadas ficam de fora"
          vazio={!reservas || reservas.porMes.every((p) => p.total === 0)}
          mensagemVazio={reservas ? "Nenhuma reserva no período." : "Dado indisponível agora."}
          altura={altura}
        >
          <GraficoMensal tipo={tipo} cor={cor} dados={reservas?.porMes.map(rotulo)} series={[{ chave: "total", nome: "Reservas", cor: CORES.primary }]} />
        </CartaoGrafico>
      ),
    },
    {
      id: "ocorrencias", titulo: "Ocorrências abertas e resolvidas", tamanho: "grafico", tipos: SERIE,
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo="Ocorrências abertas e resolvidas"
          descricao={ocorrencias?.tempoMedioResolucaoDias != null
            ? `Tempo médio até resolver: ${ocorrencias.tempoMedioResolucaoDias} dia(s)`
            : "Abertas pela data de registro, resolvidas pela data da resolução"}
          vazio={!ocorrencias || ocorrencias.porMes.every((p) => p.abertas === 0 && p.resolvidas === 0)}
          mensagemVazio={ocorrencias ? "Nenhuma ocorrência no período." : "Dado indisponível agora."}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={ocorrencias?.porMes.map(rotulo)}
            series={[
              { chave: "abertas", nome: "Abertas", cor: CORES.error },
              { chave: "resolvidas", nome: "Resolvidas", cor: CORES.tertiary },
            ]}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "inadimplencia", titulo: "Inadimplência por competência", tamanho: "grafico", tipos: ["linhas", "barras", "area"],
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo="Inadimplência por competência"
          descricao="Percentual de faturas do mês que estão em atraso"
          vazio={!inadimplencia || inadimplencia.porMes.every((p) => p.taxa === null)}
          mensagemVazio={inadimplencia ? "Nenhuma fatura emitida no período." : "Dado indisponível agora."}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={inadimplencia?.porMes.map(rotulo)}
            series={[{ chave: "taxa", nome: "Em atraso", cor: CORES.secondary }]}
            eixoY={{ domain: [0, 100], unit: "%" }}
            formatarTooltip={(v) => (v === null ? "—" : `${v}%`)}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "multas", titulo: "Multas por mês", tamanho: "grafico", tipos: SERIE,
      render: ({ tipo, cor, altura }) => (
        <CartaoGrafico
          titulo="Multas por mês"
          descricao="Aplicadas e canceladas pela data de aplicação"
          vazio={!multas || multas.porMes.every((p) => p.aplicadas === 0)}
          mensagemVazio={multas ? "Nenhuma multa no período." : "Dado indisponível agora."}
          altura={altura}
        >
          <GraficoMensal
            tipo={tipo}
            cor={cor}
            dados={multas?.porMes.map(rotulo)}
            series={[
              { chave: "aplicadas", nome: "Aplicadas", cor: CORES.primary },
              { chave: "canceladas", nome: "Canceladas", cor: CORES.onSurfaceVariant },
            ]}
          />
        </CartaoGrafico>
      ),
    },
    {
      id: "areas", titulo: "Áreas mais reservadas", tamanho: "grafico", semAltura: true,
      render: ({ cor }) => (
        <section className="glass-panel rounded-3xl p-6">
          <Ranking titulo="Áreas mais reservadas" cor={cor} itens={(reservas?.porArea ?? []).map((a) => [a.area, a.total])} />
        </section>
      ),
    },
    {
      id: "categorias", titulo: "Ocorrências por categoria", tamanho: "grafico", semAltura: true,
      render: ({ cor }) => (
        <section className="glass-panel rounded-3xl p-6">
          <Ranking
            titulo="Ocorrências por categoria"
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
  const maior = Math.max(1, ...itens.map(([, v]) => v));
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Sem registros no período.</p>
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
      setErro(err.response?.data?.mensagem || "Não foi possível carregar o painel.");
    } finally {
      setCarregando(false);
    }
  }, [aba, meses]);

  useEffect(() => { carregar(); }, [carregar]);

  const atual = ABAS.find((a) => a.id === aba);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">Síndico</p>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Painel do{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">condomínio</span>
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">{atual.descricao}</p>
          </div>
          <button
            onClick={carregar}
            disabled={carregando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 disabled:opacity-50 cursor-pointer"
          >
            <Icone name="refresh" className={`text-lg ${carregando ? "animate-spin" : ""}`} />
            Atualizar
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
                {a.label}
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
                  {j} meses
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
            Carregando painel...
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
