// src/components/agenda/ModalFuncionamento.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icone } from "../icones/Icone";
import { Botao } from "../botoes/Botao";
import { funcionamentoApi } from "../../services/portariaApi";
import { useToast } from "../../contexts/ToastContext";

const DIAS = [
  { api: "SUNDAY", rotuloKey: "funcionamento.dias.domingo" },
  { api: "MONDAY", rotuloKey: "funcionamento.dias.segunda" },
  { api: "TUESDAY", rotuloKey: "funcionamento.dias.terca" },
  { api: "WEDNESDAY", rotuloKey: "funcionamento.dias.quarta" },
  { api: "THURSDAY", rotuloKey: "funcionamento.dias.quinta" },
  { api: "FRIDAY", rotuloKey: "funcionamento.dias.sexta" },
  { api: "SATURDAY", rotuloKey: "funcionamento.dias.sabado" },
];

const UTEIS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

const PADRAO = DIAS.map((d) => ({
  diaSemana: d.api, fechado: false, abertura: "10:00", fechamento: "20:00",
}));

function errMsg(err) {
  const d = err?.response?.data;
  return d?.mensagem ?? d?.message ?? d?.erro ?? null;
}

function hhmm(v) {
  return v ? String(v).slice(0, 5) : "";
}

export function ModalFuncionamento({ area, onFechar, onSalvo }) {
  const { t } = useTranslation("reservas");
  const toast = useToast();
  const [modo, setModo] = useState("SEM_RESTRICAO");
  const [dias, setDias] = useState(PADRAO);
  const [aRevisar, setARevisar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ok = true;
    funcionamentoApi.consultar(area.id)
      .then((r) => {
        if (!ok) return;
        const d = r.data;
        setModo(d?.modo || "SEM_RESTRICAO");
        setARevisar(Boolean(d?.aRevisar));
        if (d?.horarios?.length) {
          setDias(DIAS.map((dia) => {
            const h = d.horarios.find((x) => x.diaSemana === dia.api);
            return h
              ? { diaSemana: dia.api, fechado: h.fechado, abertura: hhmm(h.abertura) || "10:00", fechamento: hhmm(h.fechamento) || "20:00" }
              : { diaSemana: dia.api, fechado: true, abertura: "10:00", fechamento: "20:00" };
          }));
        }
      })
      .catch(() => { if (ok) setErro(t("funcionamento.erros.carregar")); })
      .finally(() => { if (ok) setCarregando(false); });
    return () => { ok = false; };
  }, [area.id, t]);

  function alterarDia(api, campo, valor) {
    setDias((prev) => prev.map((d) => d.diaSemana === api ? { ...d, [campo]: valor } : d));
    setErro(null);
  }

  /** Conveniência: sete linhas à mão é onde o cadastro erra. */
  function aplicarATodos() {
    const base = dias.find((d) => !d.fechado) || dias[0];
    setDias((prev) => prev.map((d) => ({
      ...d, fechado: false, abertura: base.abertura, fechamento: base.fechamento,
    })));
    setErro(null);
  }

  function aplicarAosUteis() {
    const base = dias.find((d) => UTEIS.includes(d.diaSemana) && !d.fechado) || dias[1];
    setDias((prev) => prev.map((d) => UTEIS.includes(d.diaSemana)
      ? { ...d, fechado: false, abertura: base.abertura, fechamento: base.fechamento }
      : d));
    setErro(null);
  }

  async function salvar() {
    setErro(null);

    if (modo === "HORARIOS_DEFINIDOS") {
      const abertos = dias.filter((d) => !d.fechado);
      if (abertos.length === 0) {
        setErro(t("funcionamento.erros.umDiaAberto")); return;
      }
      const igual = abertos.find((d) => d.abertura === d.fechamento);
      if (igual) {
        const rotuloKey = DIAS.find((x) => x.api === igual.diaSemana)?.rotuloKey;
        setErro(t("funcionamento.erros.iguais", { dia: rotuloKey ? t(rotuloKey) : igual.diaSemana }));
        return;
      }
    }

    setSalvando(true);
    try {
      await funcionamentoApi.salvar(area.id, {
        modo,
        horarios: modo === "HORARIOS_DEFINIDOS"
          ? dias.map((d) => ({
              diaSemana: d.diaSemana,
              fechado: d.fechado,
              abertura: d.fechado ? null : d.abertura,
              fechamento: d.fechado ? null : d.fechamento,
            }))
          : [],
      });
      toast.success(t("funcionamento.toast.atualizado"));
      onSalvo?.();
      onFechar();
    } catch (err) {
      setErro(errMsg(err) || t("funcionamento.erros.salvar"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-2xl border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">{t("funcionamento.titulo")}</h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">{area.nome}</p>

        {aRevisar && modo === "SEM_RESTRICAO" && (
          <div className="bg-secondary/10 border border-secondary/25 rounded-xl p-3 flex gap-2 text-xs text-on-surface-variant mb-4">
            <Icone name="info" className="text-secondary shrink-0" />
            <p>
              {t("funcionamento.migrado")}
            </p>
          </div>
        )}

        {carregando ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { v: "SEM_RESTRICAO", l: t("funcionamento.modos.semRestricao.titulo"), d: t("funcionamento.modos.semRestricao.descricao") },
                { v: "HORARIOS_DEFINIDOS", l: t("funcionamento.modos.horariosDefinidos.titulo"), d: t("funcionamento.modos.horariosDefinidos.descricao") },
              ].map((o) => (
                <button key={o.v} type="button" onClick={() => { setModo(o.v); setErro(null); }}
                  className={`flex-1 text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                    modo === o.v
                      ? "bg-primary/10 border-primary/40"
                      : "border-outline-variant/30 hover:bg-veu/5"
                  }`}>
                  <p className={`text-sm font-semibold ${modo === o.v ? "text-primary" : "text-on-surface"}`}>{o.l}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{o.d}</p>
                </button>
              ))}
            </div>

            {modo === "HORARIOS_DEFINIDOS" && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={aplicarATodos}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
                    {t("funcionamento.aplicarTodos")}
                  </button>
                  <button type="button" onClick={aplicarAosUteis}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
                    {t("funcionamento.aplicarUteis")}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {dias.map((d) => {
                    const rotuloKey = DIAS.find((x) => x.api === d.diaSemana)?.rotuloKey;
                    const nome = rotuloKey ? t(rotuloKey) : d.diaSemana;
                    const viraDia = !d.fechado && d.abertura && d.fechamento && d.fechamento <= d.abertura;
                    return (
                      <div key={d.diaSemana}
                        className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20">
                        <span className="text-sm text-on-surface w-20 shrink-0">{nome}</span>
                        <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer">
                          <input type="checkbox" checked={d.fechado}
                            onChange={(e) => alterarDia(d.diaSemana, "fechado", e.target.checked)}
                            className="accent-primary w-4 h-4" />
                          {t("funcionamento.fechado")}
                        </label>
                        <input type="time" value={d.abertura} disabled={d.fechado}
                          onChange={(e) => alterarDia(d.diaSemana, "abertura", e.target.value)}
                          className="bg-surface-container-highest/40 border-none rounded-lg py-1.5 px-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-40" />
                        <span className="text-on-surface-variant text-xs">{t("funcionamento.ate")}</span>
                        <input type="time" value={d.fechamento} disabled={d.fechado}
                          onChange={(e) => alterarDia(d.diaSemana, "fechamento", e.target.value)}
                          className="bg-surface-container-highest/40 border-none rounded-lg py-1.5 px-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-40" />
                        {viraDia && (
                          <span className="text-[11px] text-secondary font-semibold">
                            {t("funcionamento.viraDia")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-on-surface-variant">
                  {t("funcionamento.explicacaoMeiaNoite")}
                </p>
              </>
            )}

            {erro && (
              <div className="bg-error/10 border border-error/25 rounded-xl p-3 flex gap-2 text-sm text-error">
                <Icone name="error_outline" className="shrink-0" />
                <p className="whitespace-pre-line">{erro}</p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button type="button" onClick={onFechar}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
                {t("comum:acoes.cancelar")}
              </button>
              <Botao type="button" onClick={salvar} disabled={salvando}>
                {salvando ? t("comum:acoes.salvando") : t("funcionamento.salvar")}
              </Botao>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
