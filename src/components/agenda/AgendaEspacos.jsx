// src/components/agenda/AgendaEspacos.jsx
import { useMemo, useRef, useEffect } from "react";
import { Icone } from "../icones/Icone";

// ── datas ────────────────────────────────────────────────────────────────────

const DOW_API = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DOW_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function zerar(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function inicioSemana(d) { const x = zerar(d); x.setDate(x.getDate() - x.getDay()); return x; }
function somarDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function mesmoDia(a, b) { return zerar(a).getTime() === zerar(b).getTime(); }
function hhmm(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Grade do mês: começa no domingo da semana do dia 1 e cobre 6 semanas. */
function gradeDoMes(ref) {
  const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const inicio = inicioSemana(primeiro);
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
}

// ── janelas de funcionamento ─────────────────────────────────────────────────
//
// Espelha a regra do backend: uma janela cujo fechamento é anterior à abertura
// atravessa a meia-noite, e a madrugada pertence à janela aberta no dia
// ANTERIOR. Por isso as candidatas de um dia sempre incluem a véspera.
// O backend continua sendo a autoridade — isto é só para esmaecer a grade.

function horarioDoDia(funcionamento, data) {
  if (!funcionamento?.horarios) return null;
  return funcionamento.horarios.find((h) => h.diaSemana === DOW_API[data.getDay()]) || null;
}

function parseHora(base, hhmmss) {
  if (!hhmmss) return null;
  const [h, m] = String(hhmmss).split(":").map(Number);
  const d = zerar(base);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

function janelaDe(funcionamento, dia) {
  const h = horarioDoDia(funcionamento, dia);
  if (!h || h.fechado || !h.abertura || !h.fechamento) return null;
  const ini = parseHora(dia, h.abertura);
  let fim = parseHora(dia, h.fechamento);
  if (fim <= ini) fim = parseHora(somarDias(dia, 1), h.fechamento); // vira o dia
  return { inicio: ini, fim };
}

function janelasQueTocam(funcionamento, dia) {
  return [janelaDe(funcionamento, somarDias(dia, -1)), janelaDe(funcionamento, dia)]
    .filter(Boolean);
}

function semRestricao(funcionamento) {
  return !funcionamento || funcionamento.modo !== "HORARIOS_DEFINIDOS";
}

/** Dia sem nenhuma janela própria nem herdada da véspera. */
function diaFechado(funcionamento, dia) {
  if (semRestricao(funcionamento)) return false;
  return janelasQueTocam(funcionamento, dia).length === 0;
}

function horaAberta(funcionamento, dia, hora) {
  if (semRestricao(funcionamento)) return true;
  const inst = zerar(dia);
  inst.setHours(hora, 0, 0, 0);
  return janelasQueTocam(funcionamento, dia)
    .some((j) => inst >= j.inicio && inst < j.fim);
}

// ── recorte de reserva por dia (RN-B) ────────────────────────────────────────
//
// A reserva continua sendo UM registro: o que segue é só derivação para desenho.
// Cada dia coberto vira um segmento, recortado pelos limites do dia e pela
// janela daquele dia da semana. Fora da janela a ocupação é real — o espaço
// segue ocupado —, então o segmento aparece marcado, não some.

function limitesDoDia(funcionamento, dia) {
  const ini = zerar(dia);
  const fim = somarDias(ini, 1);
  if (semRestricao(funcionamento)) return { ini, fim, fechado: false };

  const janelas = janelasQueTocam(funcionamento, dia)
    .map((j) => ({ inicio: j.inicio < ini ? ini : j.inicio, fim: j.fim > fim ? fim : j.fim }))
    .filter((j) => j.fim > j.inicio);

  if (janelas.length === 0) return { ini, fim, fechado: true };
  return {
    ini: new Date(Math.min(...janelas.map((j) => j.inicio.getTime()))),
    fim: new Date(Math.max(...janelas.map((j) => j.fim.getTime()))),
    fechado: false,
  };
}

/** Segmentos de exibição de uma reserva, um por dia coberto. */
function segmentosDaReserva(reserva, funcionamento) {
  const inicio = new Date(reserva.inicio);
  const fim = new Date(reserva.fim);
  const segmentos = [];

  for (let dia = zerar(inicio); dia < fim; dia = somarDias(dia, 1)) {
    const primeiro = mesmoDia(dia, inicio);
    const ultimo = mesmoDia(dia, fim) || somarDias(dia, 1) >= fim;
    const lim = limitesDoDia(funcionamento, dia);

    // Nas pontas manda o horário real; no meio, a janela do dia.
    let sIni = primeiro ? inicio : lim.ini;
    let sFim = ultimo ? fim : lim.fim;

    // Término antes da abertura: a ocupação existe, então mostra desde 00:00.
    if (ultimo && sFim < sIni) sIni = zerar(dia);
    if (sFim <= sIni) continue;

    segmentos.push({
      reserva,
      dia: new Date(dia),
      inicio: sIni,
      fim: sFim,
      primeiro,
      ultimo,
      // Fora da janela: ocupado, mas sinalizado (RN-B, casos de borda).
      foraDoFuncionamento: lim.fechado || sIni < lim.ini || sFim > lim.fim,
    });
  }

  // Reserva inteiramente dentro de um dia continua com um único segmento.
  return segmentos.length ? segmentos : [{
    reserva, dia: zerar(inicio), inicio, fim,
    primeiro: true, ultimo: true, foraDoFuncionamento: false,
  }];
}

function periodoCompleto(r) {
  const i = new Date(r.inicio);
  const f = new Date(r.fim);
  const dm = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${dm(i)} ${hhmm(i)} até ${dm(f)} ${hhmm(f)}`;
}

function multiDia(r) {
  return !mesmoDia(new Date(r.inicio), new Date(r.fim));
}

// ── cores por situação ───────────────────────────────────────────────────────
//
// A cor comunica o estado da reserva, não o tipo: amarelo para o que ainda
// depende de aprovação, azul para o que está confirmado. O tipo (evento do
// condomínio) continua legível pelo rótulo dentro do bloco.
// Canceladas e recusadas nem chegam aqui — o backend não as devolve na agenda.

const ESTILO_STATUS = {
  PENDENTE: {
    mes: "bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30",
    semana: "bg-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/35 border-amber-500/40",
  },
  APROVADA: {
    mes: "bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30",
    semana: "bg-blue-500/25 text-blue-700 dark:text-blue-300 hover:bg-blue-500/35 border-blue-500/40",
  },
  CONCLUIDA: {
    mes: "bg-outline-variant/25 text-on-surface-variant hover:bg-outline-variant/35",
    semana: "bg-outline-variant/25 text-on-surface-variant hover:bg-outline-variant/35 border-outline-variant/40",
  },
};

function estiloDe(reserva, visao) {
  return (ESTILO_STATUS[reserva.status] ?? ESTILO_STATUS.PENDENTE)[visao];
}

/** Resumo textual do funcionamento, para o cabeçalho do mês (critério 49). */
function resumoFuncionamento(funcionamento) {
  if (semRestricao(funcionamento)) return "Sem restrição de horário";
  const porDia = DOW_API.map((api, idx) => {
    const h = funcionamento.horarios.find((x) => x.diaSemana === api);
    return {
      curto: DOW_CURTO[idx],
      txt: !h || h.fechado ? "Fechado" : `${h.abertura.slice(0, 5)}–${h.fechamento.slice(0, 5)}`,
    };
  });
  // Agrupa dias consecutivos com o mesmo horário: "Seg–Sex 10:00–20:00".
  const grupos = [];
  for (const d of porDia) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.txt === d.txt) ultimo.fim = d.curto;
    else grupos.push({ ini: d.curto, fim: d.curto, txt: d.txt });
  }
  return grupos
    .filter((g) => g.txt !== "Fechado")
    .map((g) => `${g.ini}${g.fim !== g.ini ? `–${g.fim}` : ""} ${g.txt}`)
    .join(" · ") || "Fechado todos os dias";
}

// ── componente ───────────────────────────────────────────────────────────────

const ALTURA_HORA = 48;

export function AgendaEspacos({
  area,
  funcionamento,
  reservas = [],
  carregando = false,
  erro = null,
  visualizacao,
  onVisualizacao,
  referencia,
  onReferencia,
  onNovaReserva,
  onAbrirReserva,
  onTrocarEspaco,
}) {
  const ehMes = visualizacao === "mes";
  const hoje = new Date();

  const rotulo = useMemo(() => {
    if (ehMes) return `${MESES[referencia.getMonth()]} de ${referencia.getFullYear()}`;
    const ini = inicioSemana(referencia);
    const fim = somarDias(ini, 6);
    const mesIni = MESES[ini.getMonth()];
    const mesFim = MESES[fim.getMonth()];
    return ini.getMonth() === fim.getMonth()
      ? `${ini.getDate()}–${fim.getDate()} de ${mesIni} de ${fim.getFullYear()}`
      : `${ini.getDate()} de ${mesIni} – ${fim.getDate()} de ${mesFim} de ${fim.getFullYear()}`;
  }, [ehMes, referencia]);

  function navegar(passo) {
    const d = new Date(referencia);
    if (ehMes) d.setMonth(d.getMonth() + passo);
    else d.setDate(d.getDate() + passo * 7);
    onReferencia(d);
  }

  // Uma reserva de período corrido vira vários segmentos de exibição, um por
  // dia coberto — por isso a grade agrupa segmentos, não reservas.
  const segmentos = useMemo(
    () => reservas.flatMap((r) => segmentosDaReserva(r, funcionamento)),
    [reservas, funcionamento]
  );

  const porDia = useMemo(() => {
    const mapa = new Map();
    for (const s of segmentos) {
      const chave = s.dia.getTime();
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(s);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.inicio - b.inicio);
    return mapa;
  }, [segmentos]);

  return (
    <div className="space-y-4">
      {/* ── Barra superior (RN-02) ── */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onReferencia(new Date())}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
        >
          Hoje
        </button>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => navegar(-1)} aria-label="Período anterior"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all cursor-pointer">
            <Icone name="chevron_left" className="text-xl" />
          </button>
          <button type="button" onClick={() => navegar(1)} aria-label="Próximo período"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all cursor-pointer">
            <Icone name="chevron_right" className="text-xl" />
          </button>
        </div>

        <p className="font-headline font-bold text-on-surface text-sm sm:text-base capitalize flex-1 min-w-[140px]">
          {rotulo}
        </p>

        <div className="flex rounded-xl bg-surface-container-highest/30 p-0.5">
          {[{ id: "mes", label: "Mês" }, { id: "semana", label: "Semana" }].map((v) => (
            <button key={v.id} type="button" onClick={() => onVisualizacao(v.id)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                visualizacao === v.id ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}>
              {v.label}
            </button>
          ))}
        </div>

        <button type="button" onClick={onNovaReserva}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer">
          <Icone name="add" className="text-base" />Nova reserva
        </button>
      </div>

      {/* ── Espaço em consulta ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="font-semibold text-on-surface text-sm truncate">{area?.nome}</p>
          <p className="text-xs text-on-surface-variant">{resumoFuncionamento(funcionamento)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Legenda: sem ela a cor não diz nada a quem abre a tela pela 1ª vez */}
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <Icone name="hourglass_top" className="text-sm text-amber-600 dark:text-amber-400" />
              Aguardando aprovação
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/60" />Confirmada
            </span>
          </div>
          {onTrocarEspaco && (
            <button type="button" onClick={onTrocarEspaco}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer">
              <Icone name="swap_horiz" className="text-base" />Trocar de espaço
            </button>
          )}
        </div>
      </div>

      {carregando ? (
        <div className="glass-panel rounded-2xl py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : erro ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-error/20 space-y-2">
          <Icone name="error_outline" className="text-error text-4xl" />
          <p className="text-sm text-on-surface-variant">{erro}</p>
        </div>
      ) : ehMes ? (
        <VisaoMes
          referencia={referencia} hoje={hoje} porDia={porDia} funcionamento={funcionamento}
          onAbrirReserva={onAbrirReserva}
          onVerDia={(d) => { onReferencia(d); onVisualizacao("semana"); }}
        />
      ) : (
        <VisaoSemana
          referencia={referencia} hoje={hoje} porDia={porDia} funcionamento={funcionamento}
          onAbrirReserva={onAbrirReserva}
        />
      )}

      {!carregando && !erro && reservas.length === 0 && (
        <p className="text-center text-sm text-on-surface-variant py-2">
          Nenhuma reserva neste período.
        </p>
      )}
    </div>
  );
}

// ── Visualização: mês ────────────────────────────────────────────────────────

function VisaoMes({ referencia, hoje, porDia, funcionamento, onAbrirReserva, onVerDia }) {
  const dias = gradeDoMes(referencia);
  const mesAtual = referencia.getMonth();

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-outline-variant/15 bg-surface-variant/10">
        {DOW_CURTO.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const foraDoMes = dia.getMonth() !== mesAtual;
          const ehHoje = mesmoDia(dia, hoje);
          const fechado = diaFechado(funcionamento, dia);
          const lista = porDia.get(zerar(dia).getTime()) || [];
          const visiveis = lista.slice(0, 2);
          const restantes = lista.length - visiveis.length;

          return (
            <div key={dia.toISOString()}
              className={`min-h-[92px] border-b border-r border-outline-variant/10 p-1.5 space-y-1 ${
                foraDoMes ? "opacity-40" : ""
              } ${fechado ? "bg-surface-variant/20" : ""}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  ehHoje ? "bg-primary text-on-primary" : "text-on-surface-variant"
                }`}>
                  {dia.getDate()}
                </span>
                {fechado && !foraDoMes && (
                  <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase">Fechado</span>
                )}
              </div>

              {visiveis.map((s) => {
                const r = s.reserva;
                // Só as pontas reais são arredondadas (critério 8).
                const cantos = `${s.primeiro ? "rounded-l-md" : ""} ${s.ultimo ? "rounded-r-md" : ""}`;
                const corrido = multiDia(r);
                return (
                  <button key={`${r.id}-${s.dia.getTime()}`} type="button"
                    onClick={() => onAbrirReserva(r)}
                    title={corrido ? `${r.responsavelNome || "—"} · ${periodoCompleto(r)}` : undefined}
                    className={`w-full flex items-center gap-0.5 px-1.5 py-1 text-[11px] leading-tight truncate cursor-pointer transition-colors ${cantos} ${estiloDe(r, "mes")} ${
                      s.foraDoFuncionamento ? "opacity-70 border border-dashed border-current" : ""
                    }`}>
                    {!s.primeiro && <span aria-hidden>←</span>}
                    {r.status === "PENDENTE" && (
                      <Icone name="hourglass_top" className="text-[12px] shrink-0"
                        title="Aguardando aprovação" />
                    )}
                    <span className="truncate flex-1 text-left">
                      {s.primeiro || s.ultimo
                        ? <><span className="font-semibold">{hhmm(s.inicio)}</span> {r.responsavelNome || "—"}</>
                        : <>Dia todo · {r.responsavelNome || "—"}</>}
                    </span>
                    {!s.ultimo && <span aria-hidden>→</span>}
                  </button>
                );
              })}

              {restantes > 0 && (
                <button type="button" onClick={() => onVerDia(dia)}
                  className="w-full text-left px-1.5 text-[11px] font-semibold text-on-surface-variant hover:text-primary cursor-pointer">
                  +{restantes} mais
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Visualização: semana ─────────────────────────────────────────────────────

function VisaoSemana({ referencia, hoje, porDia, funcionamento, onAbrirReserva }) {
  const ini = inicioSemana(referencia);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(ini, i));
  const horas = Array.from({ length: 24 }, (_, i) => i);
  const scrollRef = useRef(null);

  // Abre por volta do horário comercial em vez da madrugada.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * ALTURA_HORA;
  }, []);

  const agora = new Date();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  return (
    // overflow próprio: a página não rola lateralmente (critério 8)
    <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-outline-variant/15 bg-surface-variant/10">
            <div />
            {dias.map((d) => {
              const ehHoje = mesmoDia(d, hoje);
              const fechado = diaFechado(funcionamento, d);
              return (
                <div key={d.toISOString()} className="px-1 py-2 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-on-surface-variant">
                    {DOW_CURTO[d.getDay()]}
                  </p>
                  <p className={`text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                    ehHoje ? "bg-primary text-on-primary" : "text-on-surface"
                  }`}>
                    {d.getDate()}
                  </p>
                  {fechado && (
                    <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase">Fechado</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grade de horas */}
          <div ref={scrollRef} className="relative overflow-y-auto max-h-[560px]">
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              {/* Eixo de horas */}
              <div>
                {horas.map((h) => (
                  <div key={h} style={{ height: ALTURA_HORA }}
                    className="border-b border-outline-variant/10 pr-2 text-right">
                    <span className="text-[10px] text-on-surface-variant relative -top-1.5">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Colunas dos dias */}
              {dias.map((dia) => {
                const doDia = porDia.get(zerar(dia).getTime()) || [];
                return (
                  <div key={dia.toISOString()} className="relative border-l border-outline-variant/10">
                    {horas.map((h) => (
                      <div key={h} style={{ height: ALTURA_HORA }}
                        className={`border-b border-outline-variant/10 ${
                          horaAberta(funcionamento, dia, h) ? "" : "bg-surface-variant/25"
                        }`} />
                    ))}

                    {mesmoDia(dia, hoje) && (
                      <div className="absolute left-0 right-0 pointer-events-none z-10"
                        style={{ top: (minutosAgora / 60) * ALTURA_HORA }}>
                        <div className="h-0.5 bg-error/70" />
                      </div>
                    )}

                    {doDia.map((s) => {
                      const r = s.reserva;
                      // Minutos desde 00:00 do próprio dia: um segmento que
                      // termina em 24:00 fecha no fim da coluna.
                      const base = zerar(s.dia).getTime();
                      const desde = (s.inicio - base) / 60000;
                      const ate = (s.fim - base) / 60000;
                      const top = (desde / 60) * ALTURA_HORA;
                      const altura = (Math.max(30, ate - desde) / 60) * ALTURA_HORA;
                      const evento = r.tipoReserva === "EVENTO_CONDOMINIO";
                      const corrido = multiDia(r);
                      const cantos = `${s.primeiro ? "rounded-t-lg" : ""} ${s.ultimo ? "rounded-b-lg" : ""}`;
                      return (
                        <button key={`${r.id}-${s.dia.getTime()}`} type="button"
                          onClick={() => onAbrirReserva(r)}
                          title={corrido ? `${r.responsavelNome || "—"} · ${periodoCompleto(r)}` : undefined}
                          style={{ top, height: altura }}
                          className={`absolute left-1 right-1 px-1.5 py-1 text-left text-[11px] leading-tight overflow-hidden cursor-pointer transition-colors z-20 ${cantos} ${estiloDe(r, "semana")} ${
                            s.foraDoFuncionamento ? "border border-dashed opacity-80" : "border"
                          }`}>
                          <p className="font-semibold truncate flex items-center gap-0.5">
                            {!s.primeiro && <span aria-hidden>←</span>}
                            {r.status === "PENDENTE" && (
                              <Icone name="hourglass_top" className="text-[12px] shrink-0"
                                title="Aguardando aprovação" />
                            )}
                            {hhmm(s.inicio)}–{s.fim - base >= 1440 * 60000 ? "24:00" : hhmm(s.fim)}
                            {!s.ultimo && <span aria-hidden>→</span>}
                          </p>
                          <p className="truncate">{r.responsavelNome || "—"}</p>
                          {corrido && <p className="truncate opacity-80">{periodoCompleto(r)}</p>}
                          {evento && !corrido && <p className="truncate opacity-80">Evento</p>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
