// src/pages/usuario/MinhasReservas.jsx
// Áreas: GET via API de estruturas. Reservas: aguardando microsserviço de agendamento (sem dados mock).
import { useState, useEffect } from "react";
import { areaComunApi } from "../../services/estruturasApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

const TIPO_ICONE = {
  PISCINA: "pool",
  SALAO_FESTAS: "celebration",
  ACADEMIA: "fitness_center",
  CHURRASQUEIRA: "outdoor_grill",
  QUADRA: "sports_tennis",
  PLAYGROUND: "child_friendly",
  GYM: "fitness_center",
  OUTRO: "meeting_room",
};

function tipoParaIcone(tipo) {
  return TIPO_ICONE[tipo] || "meeting_room";
}

/** Normaliza registro da API de áreas comuns para exibição */
function mapAreaApi(a) {
  const taxa = Number(a.taxaLocacao);
  const taxaLoc = Number.isFinite(taxa) ? taxa : 0;
  const partesRegras = [a.observacoes, a.politicaCancelamento, a.informacoesLimpeza].filter(Boolean);
  return {
    id: a.id,
    nome: a.nome,
    descricao: a.descricao || "",
    capacidade: a.capacidadeMaxima ?? "—",
    taxaLocacao: taxaLoc,
    taxaLimpeza: 0,
    taxaCancelamento: 0,
    exigeListaConvidados: false,
    regras: partesRegras.length ? partesRegras.join("\n\n") : null,
    status: a.ativo ? "Ativo" : "Inativo",
    icon: tipoParaIcone(a.tipo),
    disponivel: Boolean(a.ativo && a.podeReservar),
    raw: a,
  };
}

const areaStatusColor = (s) => {
  if (s === "Ativo") return "bg-primary/10 text-primary";
  if (s === "Inativo") return "bg-tertiary/10 text-tertiary";
  return "bg-error/10 text-error";
};

export function MinhasReservas() {
  const [aba, setAba] = useState("areas");

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Reservas
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Áreas{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              & Reservas
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Consulte áreas cadastradas pela administração. O histórico de reservas será integrado ao serviço de agendamento.
          </p>
        </header>

        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit">
          {[
            { id: "areas", label: "Áreas Disponíveis", icon: "meeting_room" },
            { id: "minhas", label: "Minhas Reservas", icon: "event_available" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
            >
              <Icone name={tab.icon} className="text-lg" />
              {tab.label}
            </button>
          ))}
        </div>

        {aba === "areas" && <AbaAreas />}
        {aba === "minhas" && <AbaMinhasReservas />}
      </div>
    </div>
  );
}

function AbaAreas() {
  const [areas, setAreas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [form, setForm] = useState({ dataInicio: "", dataFim: "" });
  const [convidados, setConvidados] = useState([]);
  const [convidadoForm, setConvidadoForm] = useState({ nome: "", cpf: "" });
  const [avisoReserva, setAvisoReserva] = useState(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const res = await areaComunApi.listar();
        const lista = Array.isArray(res.data) ? res.data : res.data?.areas || [];
        if (ok) setAreas(lista.map(mapAreaApi));
      } catch (e) {
        console.error(e);
        if (ok) {
          setErro("Não foi possível carregar as áreas. Verifique se a API de estruturas está disponível.");
          setAreas([]);
        }
      } finally {
        if (ok) setCarregando(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const area = areas.find((a) => a.id === selecionada);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const adicionarConvidado = () => {
    if (!convidadoForm.nome) return;
    setConvidados((prev) => [...prev, { id: Date.now(), ...convidadoForm }]);
    setConvidadoForm({ nome: "", cpf: "" });
  };

  const removerConvidado = (id) => {
    setConvidados((prev) => prev.filter((c) => c.id !== id));
  };

  const confirmarReserva = (e) => {
    e.preventDefault();
    setAvisoReserva(
      "A confirmação de reserva será enviada ao serviço de agendamento quando este estiver integrado. Os dados exibidos vêm do cadastro administrativo de áreas comuns.",
    );
  };

  const custoTotal = area ? Number(area.taxaLocacao) + Number(area.taxaLimpeza) : 0;

  if (carregando) {
    return (
      <div className="glass-panel rounded-2xl py-20 flex justify-center text-on-surface-variant">
        Carregando áreas…
      </div>
    );
  }

  if (erro) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-error/20 text-on-surface-variant text-sm">
        {erro}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {areas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => a.disponivel && setSelecionada(a.id === selecionada ? null : a.id)}
            disabled={!a.disponivel}
            className={`glass-panel rounded-2xl p-5 text-left transition-all duration-200 space-y-3
              ${a.disponivel ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : "opacity-50 cursor-not-allowed"}
              ${selecionada === a.id ? "ring-2 ring-primary" : ""}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icone name={a.icon} className="text-primary text-2xl" />
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${areaStatusColor(a.status)}`}>
                {a.status}
              </span>
            </div>
            <div>
              <p className="font-bold text-on-surface">{a.nome}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{a.descricao}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Icone name="group" className="text-sm" /> {a.capacidade} pessoas
              </span>
              {a.taxaLocacao > 0 ? (
                <span className="font-semibold text-on-surface">R$ {a.taxaLocacao}</span>
              ) : (
                <span className="text-primary font-semibold">Gratuito</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {areas.length === 0 && (
        <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
          <Icone name="meeting_room" className="text-5xl opacity-30" />
          <p className="text-sm text-center max-w-md">
            Nenhuma área comum cadastrada ou disponível. Quando a administração cadastrar áreas no painel, elas aparecerão aqui.
          </p>
        </div>
      )}

      {selecionada && area && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icone name={area.icon} className="text-primary text-2xl" />
            </div>
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Reservar — {area.nome}</h2>
              <p className="text-xs text-on-surface-variant">{area.descricao}</p>
            </div>
          </div>

          {area.regras && (
            <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4 flex gap-3">
              <Icone name="info" className="text-tertiary text-xl shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-tertiary mb-1">Regras e informações</p>
                <p className="text-sm text-on-surface-variant whitespace-pre-line">{area.regras}</p>
              </div>
            </div>
          )}

          {avisoReserva && (
            <div className="bg-primary/10 border border-primary/25 rounded-xl p-4 flex gap-3 text-sm text-on-surface">
              <Icone name="info" className="text-primary shrink-0" />
              <p>{avisoReserva}</p>
            </div>
          )}

          <form onSubmit={confirmarReserva} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo
                label="Data/hora de início"
                name="dataInicio"
                type="datetime-local"
                value={form.dataInicio}
                onChange={handleForm}
                required
              />
              <Campo
                label="Data/hora de término"
                name="dataFim"
                type="datetime-local"
                value={form.dataFim}
                onChange={handleForm}
                required
              />
            </div>

            {area.exigeListaConvidados && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Lista de convidados
                </p>
                {convidados.length > 0 && (
                  <div className="space-y-2">
                    {convidados.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between bg-surface-container-highest/30 rounded-xl px-4 py-2.5"
                      >
                        <div>
                          <span className="text-sm font-medium text-on-surface">{c.nome}</span>
                          {c.cpf && <span className="text-xs text-on-surface-variant ml-2">{c.cpf}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removerConvidado(c.id)}
                          className="text-error hover:text-error/70 transition-colors cursor-pointer"
                        >
                          <Icone name="person_remove" className="text-lg" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Campo
                      label="Nome do convidado"
                      value={convidadoForm.nome}
                      onChange={(e) => setConvidadoForm((f) => ({ ...f, nome: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="flex-1">
                    <Campo
                      label="CPF"
                      value={convidadoForm.cpf}
                      onChange={(e) => setConvidadoForm((f) => ({ ...f, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={adicionarConvidado}
                    className="shrink-0 px-4 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all cursor-pointer"
                  >
                    <Icone name="person_add" className="text-xl" />
                  </button>
                </div>
              </div>
            )}

            {custoTotal > 0 && (
              <div className="bg-surface-container-highest/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                  Resumo de valores (referência do cadastro)
                </p>
                {area.taxaLocacao > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Taxa de locação</span>
                    <span className="text-on-surface font-medium">R$ {area.taxaLocacao}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-on-surface">Total estimado</span>
                  <span className="text-primary">R$ {custoTotal}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelecionada(null);
                  setAvisoReserva(null);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <Botao type="submit">
                <span className="flex items-center gap-2">
                  <Icone name="event_available" className="text-lg" /> Solicitar reserva
                </span>
              </Botao>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AbaMinhasReservas() {
  return (
    <div className="glass-panel rounded-2xl py-20 flex flex-col items-center gap-4 text-on-surface-variant px-6 text-center">
      <Icone name="event_busy" className="text-5xl opacity-30" />
      <p className="text-sm max-w-md">
        Não há reservas listadas. O histórico será carregado automaticamente quando o microsserviço de agendamento estiver
        conectado a esta tela.
      </p>
    </div>
  );
}
