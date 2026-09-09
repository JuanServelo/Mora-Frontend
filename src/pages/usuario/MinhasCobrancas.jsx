// src/pages/usuario/MinhasCobrancas.jsx
import { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Icone } from "../../components/icones/Icone";
import { CartaoGrafico } from "../../components/charts/CartaoGrafico";
import { financeiroApi } from "../../services/financeiroApi";
import { formatarBRL } from "../../utils/dinheiro";
import { CORES, PALETA, TOOLTIP_STYLE, EIXO_STYLE, rotuloMes } from "../../utils/chartTheme";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"];

function labelCompetencia(dateStr) {
  if (!dateStr) return "";
  const [ano, mes] = String(dateStr).split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

const STATUS_CFG = {
  ABERTA:    { cor: "bg-blue-500/15 text-blue-400 border-blue-500/25",   label: "Em aberto",  icone: "schedule" },
  PAGA:      { cor: "bg-green-500/15 text-green-400 border-green-500/25", label: "Paga",       icone: "check_circle" },
  EM_ATRASO: { cor: "bg-error/15 text-error border-error/25",             label: "Em atraso",  icone: "warning" },
  CANCELADA: { cor: "bg-white/5 text-on-surface-variant border-white/10", label: "Cancelada",  icone: "cancel" },
};

/* ─── Modal de detalhes ────────────────────────────────────────────────── */
function DetalhesFatura({ faturaId, onFechar }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [cobranca, setCobranca] = useState(null);
  const [forma, setForma] = useState("PIX");
  const [gerando, setGerando] = useState(false);
  const [erroGateway, setErroGateway] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    financeiroApi.obterDetalhesFatura(faturaId)
      .then(({ data }) => {
        setDados(data);
        if (data.cobranca) {
          setCobranca(data.cobranca);
          setForma(data.cobranca.billingType ?? "PIX");
        }
      })
      .catch(() => setDados(null))
      .finally(() => setCarregando(false));
  }, [faturaId]);

  async function gerarPagamento() {
    setGerando(true);
    setErroGateway(null);
    try {
      const { data } = await financeiroApi.gerarCobranca(faturaId, forma);
      if (data?.sucesso) setCobranca(data.cobranca);
      else setErroGateway(data?.mensagem ?? "Erro ao gerar cobrança.");
    } catch (e) {
      setErroGateway(e.response?.data?.mensagem ?? "Erro ao gerar cobrança. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar(texto) {
    await navigator.clipboard.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const sc = dados?.fatura ? (STATUS_CFG[dados.fatura.status] ?? STATUS_CFG.ABERTA) : null;
  const podePagar = dados?.fatura && ["ABERTA", "EM_ATRASO"].includes(dados.fatura.status);
  // Reexibir seletor se a cobrança existente for de forma diferente
  const cobrancaAtiva = cobranca && (!podePagar || cobranca.billingType === forma);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
        style={{ background: "rgba(18,18,28,0.98)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/8"
          style={{ background: "rgba(18,18,28,0.98)", backdropFilter: "blur(32px)" }}>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            {carregando ? "Carregando..." : `Fatura ${labelCompetencia(dados?.fatura?.competencia)}`}
          </h3>
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-white/10 transition cursor-pointer">
            <Icone name="close" className="text-lg" />
          </button>
        </div>

        {/* Loading inicial */}
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="text-sm">Carregando fatura...</span>
          </div>
        ) : !dados?.fatura ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            Não foi possível carregar os detalhes.
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* Valor + status */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Valor total</p>
                <p className="text-4xl font-bold text-on-surface">{formatarBRL(dados.fatura.valorCentavos)}</p>
                <p className="text-sm text-on-surface-variant mt-1">Vence em {dados.fatura.vencimento}</p>
              </div>
              <span className={`shrink-0 flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${sc.cor}`}>
                <Icone name={sc.icone} className="text-base" />
                {sc.label}
              </span>
            </div>

            {/* Composição */}
            {dados.itens?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                  Composição da fatura
                </p>
                <div className="rounded-2xl overflow-hidden border border-white/8">
                  {dados.itens.map((item, i) => (
                    <div key={item.id} className={`flex justify-between items-center px-4 py-3 ${i < dados.itens.length - 1 ? "border-b border-white/5" : ""}`}>
                      <p className="text-sm text-on-surface">{item.descricao}</p>
                      <p className={`text-sm font-semibold ${item.valorCentavos < 0 ? "text-green-400" : "text-on-surface"}`}>
                        {formatarBRL(item.valorCentavos)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pago */}
            {dados.fatura.status === "PAGA" && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/15">
                  <Icone name="check_circle" className="text-green-400 text-2xl" />
                </div>
                <div>
                  <p className="text-green-400 font-semibold">Pagamento confirmado</p>
                  {dados.fatura.pagoEm && (
                    <p className="text-on-surface-variant text-xs mt-0.5">
                      {new Date(dados.fatura.pagoEm).toLocaleDateString("pt-BR")} · {dados.fatura.formaBaixa === "MANUAL" ? "Baixa manual" : "Via gateway"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Seção de pagamento */}
            {podePagar && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Forma de pagamento
                </p>

                {/* Seletor PIX / Boleto */}
                {!cobrancaAtiva && (
                  <div className="grid grid-cols-2 gap-2">
                    {["PIX", "BOLETO"].map((f) => (
                      <button
                        key={f}
                        onClick={() => { setForma(f); setErroGateway(null); }}
                        className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold transition cursor-pointer ${
                          forma === f
                            ? "bg-primary/15 border-primary/50 text-primary"
                            : "bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/10"
                        }`}
                      >
                        <Icone name={f === "PIX" ? "qr_code_2" : "receipt"} className="text-xl" />
                        {f === "PIX" ? "PIX" : "Boleto"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Botão gerar / loading */}
                {!cobrancaAtiva && (
                  <button
                    onClick={gerarPagamento}
                    disabled={gerando}
                    className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-60 transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    {gerando ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Gerando {forma === "PIX" ? "QR Code PIX" : "Boleto"}...
                      </>
                    ) : (
                      <>
                        <Icone name={forma === "PIX" ? "qr_code_2" : "receipt"} className="text-lg" />
                        Gerar {forma === "PIX" ? "QR Code PIX" : "Boleto Bancário"}
                      </>
                    )}
                  </button>
                )}

                {/* Erro gateway */}
                {erroGateway && (
                  <div className="bg-error/10 border border-error/20 rounded-2xl p-3 text-xs text-error">
                    {erroGateway}
                  </div>
                )}

                {/* Resultado PIX */}
                {cobrancaAtiva && cobranca.billingType === "PIX" && (
                  <div className="space-y-4">
                    {cobranca.pixQrcode && (
                      <div className="flex justify-center">
                        <div className="p-3 bg-white rounded-2xl">
                          <img src={`data:image/png;base64,${cobranca.pixQrcode}`} alt="QR Code PIX" className="w-44 h-44" />
                        </div>
                      </div>
                    )}
                    {cobranca.pixPayload && (
                      <div>
                        <p className="text-xs text-on-surface-variant mb-2">Código copia e cola</p>
                        <div className="flex gap-2 items-center p-3 rounded-xl border border-white/10 bg-white/5">
                          <code className="flex-1 text-xs text-on-surface-variant break-all font-mono line-clamp-2">
                            {cobranca.pixPayload}
                          </code>
                          <button
                            onClick={() => copiar(cobranca.pixPayload)}
                            className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition cursor-pointer"
                          >
                            <Icone name={copiado ? "check" : "content_copy"} className="text-lg" />
                          </button>
                        </div>
                        {copiado && <p className="text-xs text-green-400 mt-1">Copiado!</p>}
                      </div>
                    )}
                    <button
                      onClick={() => { setCobranca(null); setForma("BOLETO"); }}
                      className="w-full text-xs text-on-surface-variant hover:text-primary transition text-center cursor-pointer"
                    >
                      Prefiro pagar via boleto →
                    </button>
                  </div>
                )}

                {/* Resultado Boleto */}
                {cobrancaAtiva && cobranca.billingType === "BOLETO" && (
                  <div className="space-y-3">
                    {cobranca.pixPayload && (
                      <div>
                        <p className="text-xs text-on-surface-variant mb-2">Linha digitável</p>
                        <div className="flex gap-2 items-center p-3 rounded-xl border border-white/10 bg-white/5">
                          <code className="flex-1 text-xs text-on-surface-variant break-all font-mono">
                            {cobranca.pixPayload}
                          </code>
                          <button
                            onClick={() => copiar(cobranca.pixPayload)}
                            className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition cursor-pointer"
                          >
                            <Icone name={copiado ? "check" : "content_copy"} className="text-lg" />
                          </button>
                        </div>
                        {copiado && <p className="text-xs text-green-400 mt-1">Copiado!</p>}
                      </div>
                    )}
                    {cobranca.urlBoleto && (
                      <a
                        href={cobranca.urlBoleto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition"
                      >
                        <Icone name="open_in_new" className="text-base" />
                        Abrir boleto para imprimir
                      </a>
                    )}
                    <button
                      onClick={() => { setCobranca(null); setForma("PIX"); }}
                      className="w-full text-xs text-on-surface-variant hover:text-primary transition text-center cursor-pointer"
                    >
                      Prefiro pagar via PIX →
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Config de categorias ─────────────────────────────────────────────── */
const CAT = {
  TODOS:      { label: "Todos",       icone: "category",              cor: "text-on-surface-variant", bg: "bg-white/10" },
  CONDOMINIO: { label: "Condomínio",  icone: "apartment",             cor: "text-primary",            bg: "bg-primary/15" },
  AGUA:       { label: "Água",        icone: "water_drop",            cor: "text-blue-400",           bg: "bg-blue-500/15" },
  LUZ:        { label: "Luz",         icone: "bolt",                  cor: "text-yellow-400",         bg: "bg-yellow-500/15" },
  GAS:        { label: "Gás",         icone: "local_fire_department", cor: "text-orange-400",         bg: "bg-orange-500/15" },
  INTERNET:   { label: "Internet",    icone: "wifi",                  cor: "text-purple-400",         bg: "bg-purple-500/15" },
  PLATAFORMA: { label: "Plataforma",  icone: "deployed_code",         cor: "text-teal-400",           bg: "bg-teal-500/15" },
  OUTRO:      { label: "Outro",       icone: "more_horiz",            cor: "text-on-surface-variant", bg: "bg-white/10" },
};

function categorizar(item) {
  if (item.tipo === "TAXA_PLATAFORMA") return "PLATAFORMA";
  if (item.tipo === "TAXA") return "CONDOMINIO";
  const d = (item.descricao ?? "").toUpperCase();
  if (d.startsWith("AGUA")) return "AGUA";
  if (d.startsWith("LUZ"))  return "LUZ";
  if (d.startsWith("GAS"))  return "GAS";
  if (d.startsWith("INTERNET")) return "INTERNET";
  return "OUTRO";
}

const CAT_COR = {
  CONDOMINIO: PALETA[0],
  AGUA:       "#60a5fa",
  LUZ:        "#facc15",
  GAS:        "#fb923c",
  INTERNET:   "#a78bfa",
  PLATAFORMA: PALETA[1],
  OUTRO:      CORES.onSurfaceVariant,
};

/* ─── Aba Gastos ───────────────────────────────────────────────────────── */
function AbaGastos() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [categoriaSel, setCategoriaSel] = useState("TODOS");

  useEffect(() => {
    setCarregando(true);
    financeiroApi.meuGastos(ano)
      .then(({ data }) => setItens(data.itens ?? []))
      .catch(() => setItens([]))
      .finally(() => setCarregando(false));
  }, [ano]);

  const itensCat = itens.map(i => ({ ...i, categoria: categorizar(i) }));

  const totais = {};
  for (const i of itensCat) {
    totais[i.categoria] = (totais[i.categoria] ?? 0) + i.valorCentavos;
  }
  const totalGeral = Object.values(totais).reduce((s, v) => s + v, 0);
  const catsComGasto = Object.keys(CAT).filter(k => k !== "TODOS" && (totais[k] ?? 0) > 0);

  // KPIs
  const competencias = new Set(itensCat.map(i => i.competencia));
  const mediaMensal = competencias.size ? Math.round(totalGeral / competencias.size) : 0;
  const totaisPorMes = {};
  for (const i of itensCat) {
    totaisPorMes[i.competencia] = (totaisPorMes[i.competencia] ?? 0) + i.valorCentavos;
  }
  const mesMaior = Object.entries(totaisPorMes).length > 0
    ? rotuloMes(Object.entries(totaisPorMes).sort(([, a], [, b]) => b - a)[0][0])
    : "–";
  const catPrincipal = catsComGasto.length > 0
    ? CAT[catsComGasto.reduce((a, b) => (totais[a] ?? 0) >= (totais[b] ?? 0) ? a : b)].label
    : "–";

  // Dados para donut
  const dadosPie = catsComGasto.map(cat => ({
    name: CAT[cat].label,
    value: totais[cat],
    color: CAT_COR[cat],
    pct: totalGeral > 0 ? Math.round((totais[cat] / totalGeral) * 100) : 0,
  }));

  // Dados para barras mensais (sem filtro de categoria — visão panorâmica)
  const porMesBruto = {};
  for (const i of itensCat) {
    const k = i.competencia;
    if (!porMesBruto[k]) porMesBruto[k] = { mes: rotuloMes(k), competencia: k };
    porMesBruto[k][i.categoria] = (porMesBruto[k][i.categoria] ?? 0) + i.valorCentavos;
  }
  const dadosBar = Object.values(porMesBruto).sort((a, b) => a.competencia.localeCompare(b.competencia));

  // Lista filtrada por categoria selecionada
  const itensFiltrados = categoriaSel === "TODOS"
    ? itensCat
    : itensCat.filter(i => i.categoria === categoriaSel);
  const porMes = {};
  for (const i of itensFiltrados) {
    const k = i.competencia;
    if (!porMes[k]) porMes[k] = { competencia: k, itens: [], total: 0 };
    porMes[k].itens.push(i);
    porMes[k].total += i.valorCentavos;
  }
  const meses = Object.values(porMes).sort((a, b) => b.competencia.localeCompare(a.competencia));

  return (
    <div className="space-y-6">
      {/* Seletor de ano */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">Resumo de gastos do ano</p>
        <div className="flex items-center gap-1 glass-panel rounded-full px-1 py-1">
          <button
            onClick={() => setAno(a => a - 1)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition cursor-pointer"
          >
            <Icone name="chevron_left" className="text-lg" />
          </button>
          <span className="text-sm font-bold text-on-surface px-2">{ano}</span>
          <button
            onClick={() => setAno(a => a + 1)}
            disabled={ano >= anoAtual}
            className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icone name="chevron_right" className="text-lg" />
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm">Carregando gastos...</span>
        </div>
      ) : itens.length === 0 ? (
        <div className="glass-panel rounded-3xl py-16 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icone name="bar_chart" className="text-primary text-2xl" />
          </div>
          <div>
            <p className="font-semibold text-on-surface mb-1">Sem gastos em {ano}</p>
            <p className="text-xs text-on-surface-variant">Os gastos aparecerão aqui após o fechamento de competências.</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Total {ano}</p>
              <p className="text-lg font-bold text-on-surface">{formatarBRL(totalGeral)}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Média/mês</p>
              <p className="text-lg font-bold text-on-surface">{formatarBRL(mediaMensal)}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Mês maior</p>
              <p className="text-lg font-bold text-primary">{mesMaior}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Categoria</p>
              <p className="text-lg font-bold text-on-surface truncate">{catPrincipal}</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Donut por categoria */}
            <CartaoGrafico titulo="Distribuição" descricao="Por categoria no ano" altura={300}>
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPie}
                        dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius="52%"
                        outerRadius="78%"
                        paddingAngle={3}
                      >
                        {dadosPie.map(e => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} formatter={v => formatarBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center pt-2 flex-shrink-0">
                  {dadosPie.map(e => (
                    <div key={e.name} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                      {e.name} · {e.pct}%
                    </div>
                  ))}
                </div>
              </div>
            </CartaoGrafico>

            {/* Barras mensais empilhadas */}
            <CartaoGrafico titulo="Evolução mensal" descricao="Gasto total por mês" altura={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosBar} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={CORES.grid} vertical={false} />
                  <XAxis dataKey="mes" {...EIXO_STYLE} />
                  <YAxis tickFormatter={v => `R$${(v / 100).toFixed(0)}`} {...EIXO_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => formatarBRL(v)} />
                  {catsComGasto.map((cat, i) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      name={CAT[cat].label}
                      stackId="a"
                      fill={CAT_COR[cat]}
                      radius={i === catsComGasto.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CartaoGrafico>
          </div>

          {/* Chips de filtro */}
          <div className="flex gap-2 flex-wrap">
            {(["TODOS", ...catsComGasto]).map(cat => {
              const cfg = CAT[cat];
              const ativo = categoriaSel === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoriaSel(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                    ativo
                      ? `${cfg.bg} ${cfg.cor} border-white/20`
                      : "bg-white/5 text-on-surface-variant border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Icone name={cfg.icone} className="text-sm" />
                  {cfg.label}
                  {cat !== "TODOS" && (
                    <span className="opacity-60">{formatarBRL(totais[cat] ?? 0)}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Total filtrado */}
          <div className="flex items-baseline justify-between px-1">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">
              {categoriaSel === "TODOS" ? "Total gasto no ano" : `Total ${CAT[categoriaSel].label}`}
            </p>
            <p className="text-xl font-bold text-on-surface">
              {formatarBRL(categoriaSel === "TODOS" ? totalGeral : (totais[categoriaSel] ?? 0))}
            </p>
          </div>

          {/* Histórico por mês */}
          {meses.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-sm">
              Nenhum gasto com este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {meses.map(({ competencia, itens: itensM, total }) => (
                <div key={competencia} className="glass-panel rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-on-surface">{labelCompetencia(competencia)}</p>
                    <p className="text-sm font-bold text-on-surface">{formatarBRL(total)}</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {itensM.map((item) => {
                      const cfg = CAT[item.categoria];
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                            <Icone name={cfg.icone} className={`text-sm ${cfg.cor}`} />
                          </div>
                          <p className="flex-1 text-sm text-on-surface-variant truncate">{item.descricao}</p>
                          <p className="text-sm font-semibold text-on-surface">{formatarBRL(item.valorCentavos)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Aba Faturas ──────────────────────────────────────────────────────── */
function AbaFaturas({ onVerDetalhe }) {
  const [faturas, setFaturas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("TODAS");

  useEffect(() => {
    financeiroApi.listarMinhasFaturas()
      .then(({ data }) => setFaturas(data.faturas ?? []))
      .catch(() => setFaturas([]))
      .finally(() => setCarregando(false));
  }, []);

  const kpis = {
    total:    faturas.reduce((s, f) => s + f.valorCentavos, 0),
    abertas:  faturas.filter(f => f.status === "ABERTA").length,
    emAtraso: faturas.filter(f => f.status === "EM_ATRASO").length,
    pagas:    faturas.filter(f => f.status === "PAGA").length,
  };

  const FILTROS = [
    { id: "TODAS",     label: "Todas",     count: faturas.length },
    { id: "ABERTA",    label: "Em aberto", count: kpis.abertas },
    { id: "EM_ATRASO", label: "Em atraso", count: kpis.emAtraso },
    { id: "PAGA",      label: "Pagas",     count: kpis.pagas },
  ];

  const visíveis = filtro === "TODAS" ? faturas : faturas.filter(f => f.status === filtro);

  if (carregando) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
      <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <span className="text-sm">Carregando faturas...</span>
    </div>
  );

  if (faturas.length === 0) return (
    <div className="glass-panel rounded-3xl py-20 flex flex-col items-center gap-4 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icone name="receipt_long" className="text-primary text-3xl" />
      </div>
      <p className="font-semibold text-on-surface">Nenhuma fatura ainda</p>
      <p className="text-xs text-on-surface-variant">As faturas aparecem aqui após o síndico fechar a competência mensal.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel rounded-2xl p-4 text-center">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Total</p>
          <p className="text-base font-bold text-on-surface">{formatarBRL(kpis.total)}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4 text-center">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Em aberto</p>
          <p className="text-base font-bold text-blue-400">{kpis.abertas}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4 text-center">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Em atraso</p>
          <p className={`text-base font-bold ${kpis.emAtraso > 0 ? "text-error" : "text-on-surface-variant"}`}>{kpis.emAtraso}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4 text-center">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Pagas</p>
          <p className="text-base font-bold text-green-400">{kpis.pagas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              filtro === f.id
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10"
            }`}
          >
            {f.label}
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${filtro === f.id ? "bg-primary text-white" : "bg-white/10"}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {visíveis.length === 0 ? (
        <p className="py-8 text-center text-on-surface-variant text-sm">Nenhuma fatura com este filtro.</p>
      ) : (
        <div className="space-y-3">
          {visíveis.map(fatura => {
            const sc = STATUS_CFG[fatura.status] ?? STATUS_CFG.ABERTA;
            return (
              <button
                key={fatura.id}
                onClick={() => onVerDetalhe(fatura.id)}
                className={`w-full text-left glass-panel rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition cursor-pointer group ${fatura.status === "EM_ATRASO" ? "ring-1 ring-error/20" : ""}`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${sc.cor}`}>
                  <Icone name={sc.icone} className="text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-on-surface text-sm">{labelCompetencia(fatura.competencia)}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sc.cor}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">Vence em {fatura.vencimento}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-on-surface">{formatarBRL(fatura.valorCentavos)}</p>
                  <p className="text-xs text-on-surface-variant group-hover:text-primary transition mt-0.5">Ver detalhes →</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ─────────────────────────────────────────────────── */
export function MinhasCobrancas() {
  const [aba, setAba] = useState("faturas");
  const [detalhe, setDetalhe] = useState(null);

  const ABAS = [
    { id: "faturas", label: "Faturas",  icone: "receipt_long" },
    { id: "gastos",  label: "Gastos",   icone: "bar_chart" },
  ];

  return (
    <div className="min-h-screen w-full pt-4 pb-24 px-4 sm:px-6">
      <div className="w-[80%] mx-auto space-y-6">

        {/* Título */}
        <div className="pt-2">
          <h1 className="font-headline text-3xl font-bold text-on-surface">Financeiro</h1>
          <p className="text-on-surface-variant text-sm mt-1">Faturas e análise de gastos</p>
        </div>

        {/* Abas */}
        <div className="flex gap-1 glass-panel rounded-2xl p-1">
          {ABAS.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                aba === a.id
                  ? "bg-primary/20 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
            >
              <Icone name={a.icone} className="text-base" />
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da aba */}
        {aba === "faturas"
          ? <AbaFaturas onVerDetalhe={setDetalhe} />
          : <AbaGastos />
        }
      </div>

      {detalhe && <DetalhesFatura faturaId={detalhe} onFechar={() => setDetalhe(null)} />}
    </div>
  );
}
