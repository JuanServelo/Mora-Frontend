// src/pages/adm/PainelCondominio.jsx
// Painéis do síndico (RF-18): operacional, o que pede ação agora; estratégico,
// como o condomínio vem andando mês a mês.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { gestaoApi } from "../../services/gestaoApi";
import { CartaoKpi } from "../../components/cards/CartaoKpi";
import { CartaoGrafico } from "../../components/charts/CartaoGrafico";
import { Icone } from "../../components/icones/Icone";
import { formatarBRL } from "../../utils/dinheiro";
import { formatarData } from "../../utils/datas";
import { CORES, EIXO_STYLE, TOOLTIP_STYLE, rotuloMes } from "../../utils/chartTheme";

const ABAS = [
  { id: "operacional", label: "Operacional", icone: "bolt", descricao: "O que pede ação agora" },
  { id: "estrategico", label: "Estratégico", icone: "insights", descricao: "Como o condomínio vem andando" },
];

const JANELAS = [3, 6, 12];

/** Nome legível de cada fonte, para o aviso de dado faltando. */
const FONTES = {
  "portaria-service": "portaria (entregas, reservas, acessos)",
  "auth-api": "ocorrências e usuários",
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
  const { entregas, reservas, presenca, ocorrencias, conversas, avisos, financeiro } = dados;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoKpi
          valor={n(reservas?.aguardandoAprovacao)}
          label="Reservas para aprovar"
          sub={reservas?.proximoPrazo ? `Primeiro prazo: ${formatarData(reservas.proximoPrazo)}` : undefined}
          tom={reservas?.aguardandoAprovacao ? "secondary" : "neutro"}
          icone="event_available"
          onClick={() => navigate("/espacos")}
        />
        <CartaoKpi
          valor={n(ocorrencias?.abertas)}
          label="Ocorrências abertas"
          sub={ocorrencias ? `${ocorrencias.pendentes} sem atendimento` : undefined}
          tom={ocorrencias?.pendentes ? "error" : "neutro"}
          icone="report"
          onClick={() => navigate("/adm/reclamacoes")}
        />
        <CartaoKpi
          valor={n(conversas?.comMensagemNova)}
          label="Conversas com mensagem nova"
          sub={conversas ? `${conversas.abertas} em aberto` : undefined}
          tom={conversas?.comMensagemNova ? "primary" : "neutro"}
          icone="forum"
          onClick={() => navigate("/conversas")}
        />
        <CartaoKpi
          valor={n(financeiro?.faturasEmAtraso)}
          label="Faturas em atraso no mês"
          sub={financeiro ? `${formatarBRL(financeiro.recebidoCentavos)} recebidos` : undefined}
          tom={financeiro?.faturasEmAtraso ? "error" : "neutro"}
          icone="receipt_long"
          onClick={() => navigate("/adm/financeiro")}
        />
        <CartaoKpi
          valor={n(entregas?.aguardandoRetirada)}
          label="Entregas na portaria"
          sub={entregas?.maisAntigaDesde ? `Mais antiga: ${formatarData(entregas.maisAntigaDesde)}` : undefined}
          icone="inventory_2"
        />
        <CartaoKpi valor={n(presenca?.visitantesDentro)} label="Visitantes no condomínio" icone="badge" />
        <CartaoKpi valor={n(presenca?.atendimentosAbertos)} label="Atendimentos abertos na portaria" icone="door_front" />
        <CartaoKpi valor={n(avisos?.vigentes)} label="Avisos vigentes" icone="campaign" onClick={() => navigate("/adm/comunicados")} />
      </section>

      {avisos?.leitura?.length > 0 && (
        <section className="glass-panel rounded-3xl p-6 space-y-4">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">Leitura dos avisos vigentes</h2>
            <p className="text-xs text-on-surface-variant">
              Quem confirmou a leitura, contra quem deveria ler pelo público do aviso. Os menos lidos primeiro.
            </p>
          </div>
          {avisos.leitura.map((a) => (
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
                  className={`h-full ${a.percentual !== null && a.percentual < 50 ? "bg-secondary" : "bg-primary"}`}
                  style={{ width: `${a.percentual ?? 0}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Estrategico({ dados }) {
  const { reservas, ocorrencias, inadimplencia, multas } = dados;
  const rotulo = (p) => ({ ...p, rotulo: rotuloMes(p.mes) });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CartaoGrafico
        titulo="Reservas por mês"
        descricao="Aprovadas, pendentes e concluídas — canceladas e recusadas ficam de fora"
        vazio={!reservas || reservas.porMes.every((p) => p.total === 0)}
        mensagemVazio={reservas ? "Nenhuma reserva no período." : "Dado indisponível agora."}
        altura={260}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={reservas?.porMes.map(rotulo)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CORES.grid} vertical={false} />
            <XAxis dataKey="rotulo" {...EIXO_STYLE} />
            <YAxis allowDecimals={false} {...EIXO_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="total" name="Reservas" fill={CORES.primary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CartaoGrafico>

      <CartaoGrafico
        titulo="Ocorrências abertas e resolvidas"
        descricao={ocorrencias?.tempoMedioResolucaoDias != null
          ? `Tempo médio até resolver: ${ocorrencias.tempoMedioResolucaoDias} dia(s)`
          : "Abertas pela data de registro, resolvidas pela data da resolução"}
        vazio={!ocorrencias || ocorrencias.porMes.every((p) => p.abertas === 0 && p.resolvidas === 0)}
        mensagemVazio={ocorrencias ? "Nenhuma ocorrência no período." : "Dado indisponível agora."}
        altura={260}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ocorrencias?.porMes.map(rotulo)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CORES.grid} vertical={false} />
            <XAxis dataKey="rotulo" {...EIXO_STYLE} />
            <YAxis allowDecimals={false} {...EIXO_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12, color: CORES.onSurfaceVariant }} />
            <Bar dataKey="abertas" name="Abertas" fill={CORES.error} radius={[6, 6, 0, 0]} />
            <Bar dataKey="resolvidas" name="Resolvidas" fill={CORES.tertiary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CartaoGrafico>

      <CartaoGrafico
        titulo="Inadimplência por competência"
        descricao="Percentual de faturas do mês que estão em atraso"
        vazio={!inadimplencia || inadimplencia.porMes.every((p) => p.taxa === null)}
        mensagemVazio={inadimplencia ? "Nenhuma fatura emitida no período." : "Dado indisponível agora."}
        altura={260}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={inadimplencia?.porMes.map(rotulo)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CORES.grid} vertical={false} />
            <XAxis dataKey="rotulo" {...EIXO_STYLE} />
            <YAxis domain={[0, 100]} unit="%" {...EIXO_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => (v === null ? "—" : `${v}%`)} />
            <Line type="monotone" dataKey="taxa" name="Em atraso" stroke={CORES.secondary} strokeWidth={2} connectNulls dot />
          </LineChart>
        </ResponsiveContainer>
      </CartaoGrafico>

      <CartaoGrafico
        titulo="Multas por mês"
        descricao="Aplicadas e canceladas pela data de aplicação"
        vazio={!multas || multas.porMes.every((p) => p.aplicadas === 0)}
        mensagemVazio={multas ? "Nenhuma multa no período." : "Dado indisponível agora."}
        altura={260}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={multas?.porMes.map(rotulo)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CORES.grid} vertical={false} />
            <XAxis dataKey="rotulo" {...EIXO_STYLE} />
            <YAxis allowDecimals={false} {...EIXO_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12, color: CORES.onSurfaceVariant }} />
            <Bar dataKey="aplicadas" name="Aplicadas" fill={CORES.primary} radius={[6, 6, 0, 0]} />
            <Bar dataKey="canceladas" name="Canceladas" fill={CORES.onSurfaceVariant} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CartaoGrafico>

      {(reservas?.porArea?.length > 0 || ocorrencias?.porCategoria?.length > 0) && (
        <section className="glass-panel rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:col-span-2">
          <Ranking titulo="Áreas mais reservadas" itens={(reservas?.porArea ?? []).map((a) => [a.area, a.total])} />
          <Ranking titulo="Ocorrências por categoria" itens={(ocorrencias?.porCategoria ?? []).map((c) => [c.categoria, c.total])} />
        </section>
      )}
    </div>
  );
}

function Ranking({ titulo, itens }) {
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
            <div className="h-full bg-primary/60" style={{ width: `${(valor / maior) * 100}%` }} />
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
