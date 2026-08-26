import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { gestaoApi } from "../../services/gestaoApi";
import { CartaoKpi } from "../../components/cards/CartaoKpi";
import { CartaoGrafico } from "../../components/charts/CartaoGrafico";
import { Icone } from "../../components/icones/Icone";
import { labelPerfil } from "../../utils/perfis";
import { CORES, EIXO_STYLE, PALETA, TOOLTIP_STYLE, rotuloMes } from "../../utils/chartTheme";

export function IndexAdminGeral() {
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    gestaoApi
      .plataforma()
      .then((res) => setDados(res.data))
      .catch(() => setErro("Não foi possível carregar os indicadores da plataforma."))
      .finally(() => setCarregando(false));
  }, []);

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

  if (carregando) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-6">
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
      <div className="min-h-screen w-full pt-4 pb-20 px-6">
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

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
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

        <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <CartaoKpi
            valor={condominios.ativos}
            label="Condomínios ativos"
            sub={`de ${condominios.total} cadastrados`}
            tom="primary"
            icone="domain"
            onClick={() => navigate("/adm/condominios")}
          />
          <CartaoKpi
            valor={condominios.novosUltimos30}
            label="Novos em 30 dias"
            tom="tertiary"
            icone="trending_up"
          />
          <CartaoKpi
            valor={usuarios.ativos}
            label="Usuários ativos"
            sub={`de ${usuarios.total} na plataforma`}
            tom="primary"
            icone="group"
          />
          <CartaoKpi
            valor={mediaUsuarios}
            label="Média por condomínio"
            tom="neutro"
            icone="analytics"
          />
          <CartaoKpi
            valor={usuarios.convitesPendentes}
            label="Convites pendentes"
            tom="secondary"
            icone="mail"
          />
          <CartaoKpi
            valor={ocorrencias.abertas}
            label="Ocorrências abertas"
            sub={`de ${ocorrencias.total} registradas`}
            tom={ocorrencias.abertas > 0 ? "error" : "neutro"}
            icone="report"
          />
        </section>

        <CartaoGrafico
          titulo="Crescimento da carteira"
          descricao="Condomínios criados por mês e total acumulado, últimos 12 meses"
          vazio={serieCondominios.every((p) => p.criados === 0)}
          mensagemVazio="Nenhum condomínio criado nos últimos 12 meses."
          altura={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieCondominios} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={CORES.grid} vertical={false} />
              <XAxis dataKey="mes" {...EIXO_STYLE} />
              <YAxis allowDecimals={false} {...EIXO_STYLE} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: CORES.onSurfaceVariant }} />
              <Bar dataKey="criados" name="Criados no mês" fill={CORES.primary} radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="acumulado"
                name="Acumulado"
                stroke={CORES.secondary}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CartaoGrafico>

        <div className="grid lg:grid-cols-2 gap-6">
          <CartaoGrafico
            titulo="Usuários por perfil"
            descricao="Distribuição entre os seis perfis"
            vazio={porPerfil.length === 0}
            altura={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porPerfil}
                  dataKey="total"
                  nameKey="nome"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  {porPerfil.map((entrada, i) => (
                    <Cell key={entrada.perfil} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: CORES.onSurfaceVariant }} />
              </PieChart>
            </ResponsiveContainer>
          </CartaoGrafico>

          <CartaoGrafico
            titulo="Usuários por condomínio"
            descricao="Dez maiores — clique para abrir o cliente"
            vazio={porCondominio.length === 0}
            mensagemVazio="Nenhum usuário vinculado a condomínio ainda."
            altura={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={porCondominio}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
              >
                <CartesianGrid stroke={CORES.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...EIXO_STYLE} />
                <YAxis type="category" dataKey="nome" width={110} {...EIXO_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar
                  dataKey="total"
                  name="Usuários"
                  fill={CORES.tertiary}
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
        </div>
      </div>
    </div>
  );
}

export default IndexAdminGeral;
