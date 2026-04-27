// src/pages/usuario/MinhasReservas.jsx
// Página do USUÁRIO — reservar áreas comuns e gerenciar suas próprias reservas
import { useState } from "react";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

// ─── Mock: áreas disponíveis (viria de GET /areas) ───────────────────────────
const AREAS_MOCK = [
  {
    id: 1,
    nome: "Salão de Festas",
    descricao: "Salão climatizado com cozinha completa",
    capacidade: 80,
    taxaLocacao: 200,
    taxaLimpeza: 50,
    taxaCancelamento: 30,
    horarioSilencio: 22,
    exigeListaConvidados: true,
    regras: "Proibido som acima de 80dB após as 22h.",
    status: "Ativo",
    icon: "celebration",
  },
  {
    id: 2,
    nome: "Churrasqueira",
    descricao: "Área de churrasco coberta com mesas",
    capacidade: 30,
    taxaLocacao: 100,
    taxaLimpeza: 30,
    taxaCancelamento: 20,
    horarioSilencio: 22,
    exigeListaConvidados: false,
    regras: "Limpar a grelha após o uso.",
    status: "Ativo",
    icon: "outdoor_grill",
  },
  {
    id: 3,
    nome: "Academia",
    descricao: "Equipamentos de musculação e cardio",
    capacidade: 15,
    taxaLocacao: 0,
    taxaLimpeza: 0,
    taxaCancelamento: 0,
    horarioSilencio: 22,
    exigeListaConvidados: false,
    regras: "Uso exclusivo de moradores. Trazer toalha.",
    status: "Em Manutenção",
    icon: "fitness_center",
  },
];

// ─── Mock: minhas reservas (viria de GET /locacoes?usuarioId=eu) ──────────────
const MINHAS_RESERVAS_MOCK = [
  {
    id: 1,
    areaId: 1,
    areaNome: "Salão de Festas",
    dataInicio: "2026-05-10T18:00",
    dataFim: "2026-05-10T23:00",
    status: "APROVADA",
    convidados: [
      { id: 1, nome: "Carlos Silva", cpf: "111.222.333-44" },
      { id: 2, nome: "Ana Souza", cpf: "555.666.777-88" },
    ],
  },
];

const statusReservaColor = (s) => {
  if (s === "APROVADA") return "bg-primary/10 text-primary";
  if (s === "CANCELADA") return "bg-error/10 text-error";
  return "bg-tertiary/10 text-tertiary";
};

const areaStatusColor = (s) => {
  if (s === "Ativo") return "bg-primary/10 text-primary";
  if (s === "Em Manutenção") return "bg-tertiary/10 text-tertiary";
  return "bg-error/10 text-error";
};

export function MinhasReservas() {
  const [aba, setAba] = useState("areas");

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
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
            Reserve áreas comuns do condomínio e gerencie seus agendamentos.
          </p>
        </header>

        {/* Abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit">
          {[
            { id: "areas", label: "Áreas Disponíveis", icon: "meeting_room" },
            { id: "minhas", label: "Minhas Reservas", icon: "event_available" },
          ].map((tab) => (
            <button
              key={tab.id}
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

// ════════════════════════════════════════════
// ABA: ÁREAS DISPONÍVEIS + FORMULÁRIO DE RESERVA
// ════════════════════════════════════════════
function AbaAreas() {
  const [selecionada, setSelecionada] = useState(null);
  const [form, setForm] = useState({ dataInicio: "", dataFim: "" });
  const [convidados, setConvidados] = useState([]);
  const [convidadoForm, setConvidadoForm] = useState({ nome: "", cpf: "" });
  const [sucesso, setSucesso] = useState(false);

  const area = AREAS_MOCK.find((a) => a.id === selecionada);

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
    // Aqui chamaria POST /locacoes com { areaId, dataInicio, dataFim, convidados }
    setSucesso(true);
    setTimeout(() => {
      setSucesso(false);
      setSelecionada(null);
      setForm({ dataInicio: "", dataFim: "" });
      setConvidados([]);
    }, 2500);
  };

  const custoTotal = area
    ? Number(area.taxaLocacao) + Number(area.taxaLimpeza)
    : 0;

  return (
    <div className="space-y-6">
      {/* Grid de áreas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AREAS_MOCK.map((a) => {
          const disponivel = a.status === "Ativo";
          return (
            <button
              key={a.id}
              onClick={() => disponivel && setSelecionada(a.id === selecionada ? null : a.id)}
              disabled={!disponivel}
              className={`glass-panel rounded-2xl p-5 text-left transition-all duration-200 space-y-3
                ${disponivel ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : "opacity-50 cursor-not-allowed"}
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
          );
        })}
      </div>

      {/* Painel de reserva */}
      {selecionada && area && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icone name={area.icon} className="text-primary text-2xl" />
            </div>
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Reservar — {area.nome}
              </h2>
              <p className="text-xs text-on-surface-variant">{area.descricao}</p>
            </div>
          </div>

          {/* Regras */}
          {area.regras && (
            <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4 flex gap-3">
              <Icone name="info" className="text-tertiary text-xl shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-tertiary mb-1">Regras de uso</p>
                <p className="text-sm text-on-surface-variant">{area.regras}</p>
              </div>
            </div>
          )}

          {sucesso ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icone name="check_circle" className="text-primary text-4xl" />
              </div>
              <p className="font-headline text-xl font-bold text-on-surface">Reserva realizada!</p>
              <p className="text-sm text-on-surface-variant">Seu agendamento foi enviado com sucesso.</p>
            </div>
          ) : (
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

              {/* Convidados */}
              {area.exigeListaConvidados && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Lista de convidados
                  </p>
                  {convidados.length > 0 && (
                    <div className="space-y-2">
                      {convidados.map((c) => (
                        <div key={c.id} className="flex items-center justify-between bg-surface-container-highest/30 rounded-xl px-4 py-2.5">
                          <div>
                            <span className="text-sm font-medium text-on-surface">{c.nome}</span>
                            {c.cpf && <span className="text-xs text-on-surface-variant ml-2">{c.cpf}</span>}
                          </div>
                          <button type="button" onClick={() => removerConvidado(c.id)} className="text-error hover:text-error/70 transition-colors cursor-pointer">
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
                        name="nomeConvidado"
                        value={convidadoForm.nome}
                        onChange={(e) => setConvidadoForm((f) => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="flex-1">
                      <Campo
                        label="CPF"
                        name="cpfConvidado"
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

              {/* Resumo de custos */}
              {custoTotal > 0 && (
                <div className="bg-surface-container-highest/30 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                    Resumo de valores
                  </p>
                  {area.taxaLocacao > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Taxa de locação</span>
                      <span className="text-on-surface font-medium">R$ {area.taxaLocacao}</span>
                    </div>
                  )}
                  {area.taxaLimpeza > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Taxa de limpeza</span>
                      <span className="text-on-surface font-medium">R$ {area.taxaLimpeza}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-on-surface">Total</span>
                    <span className="text-primary">R$ {custoTotal}</span>
                  </div>
                  {area.taxaCancelamento > 0 && (
                    <p className="text-xs text-on-surface-variant">
                      * Taxa de cancelamento: R$ {area.taxaCancelamento}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelecionada(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <Botao type="submit">
                  <span className="flex items-center gap-2">
                    <Icone name="event_available" className="text-lg" /> Confirmar reserva
                  </span>
                </Botao>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: MINHAS RESERVAS
// ════════════════════════════════════════════
function AbaMinhasReservas() {
  const [reservas, setReservas] = useState(MINHAS_RESERVAS_MOCK);
  const [expandido, setExpandido] = useState(null);
  const [convidadoForm, setConvidadoForm] = useState({ nome: "", cpf: "" });

  const cancelar = (id) => {
    setReservas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "CANCELADA" } : r))
    );
  };

  const adicionarConvidado = (reservaId) => {
    if (!convidadoForm.nome) return;
    setReservas((prev) =>
      prev.map((r) =>
        r.id === reservaId
          ? { ...r, convidados: [...r.convidados, { id: Date.now(), ...convidadoForm }] }
          : r
      )
    );
    setConvidadoForm({ nome: "", cpf: "" });
  };

  const removerConvidado = (reservaId, convidadoId) => {
    setReservas((prev) =>
      prev.map((r) =>
        r.id === reservaId
          ? { ...r, convidados: r.convidados.filter((c) => c.id !== convidadoId) }
          : r
      )
    );
  };

  if (reservas.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-20 flex flex-col items-center gap-3 text-on-surface-variant">
        <Icone name="event_busy" className="text-5xl opacity-30" />
        <p className="text-sm">Você não tem reservas.</p>
        <p className="text-xs opacity-60">Vá em "Áreas Disponíveis" para fazer sua primeira reserva.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservas.map((reserva) => {
        const area = AREAS_MOCK.find((a) => a.id === reserva.areaId);
        return (
          <div key={reserva.id} className="glass-panel rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-white/5 transition-all"
              onClick={() => setExpandido(expandido === reserva.id ? null : reserva.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name={area?.icon || "meeting_room"} className="text-primary text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{reserva.areaNome}</p>
                  <p className="text-xs text-on-surface-variant">
                    {reserva.dataInicio?.replace("T", " ")} → {reserva.dataFim?.replace("T", " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusReservaColor(reserva.status)}`}>
                  {reserva.status}
                </span>
                <Icone
                  name={expandido === reserva.id ? "expand_less" : "expand_more"}
                  className="text-on-surface-variant text-xl"
                />
              </div>
            </button>

            {expandido === reserva.id && (
              <div className="px-6 pb-5 border-t border-white/5 pt-4 space-y-4">
                {/* Convidados */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Convidados ({reserva.convidados.length})
                  </p>
                  {reserva.convidados.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {reserva.convidados.map((c) => (
                        <div key={c.id} className="flex items-center justify-between bg-surface-container-highest/30 rounded-xl px-4 py-2.5">
                          <div>
                            <span className="text-sm font-medium text-on-surface">{c.nome}</span>
                            {c.cpf && <span className="text-xs text-on-surface-variant ml-2">{c.cpf}</span>}
                          </div>
                          {reserva.status === "APROVADA" && (
                            <button
                              onClick={() => removerConvidado(reserva.id, c.id)}
                              className="text-error hover:text-error/70 transition-colors cursor-pointer"
                            >
                              <Icone name="person_remove" className="text-lg" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant mb-3">Nenhum convidado adicionado.</p>
                  )}

                  {reserva.status === "APROVADA" && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Campo
                          label=""
                          name="nome"
                          value={convidadoForm.nome}
                          onChange={(e) => setConvidadoForm((f) => ({ ...f, nome: e.target.value }))}
                          placeholder="Nome do convidado"
                        />
                      </div>
                      <div className="flex-1">
                        <Campo
                          label=""
                          name="cpf"
                          value={convidadoForm.cpf}
                          onChange={(e) => setConvidadoForm((f) => ({ ...f, cpf: e.target.value }))}
                          placeholder="CPF"
                        />
                      </div>
                      <button
                        onClick={() => adicionarConvidado(reserva.id)}
                        className="shrink-0 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all cursor-pointer"
                      >
                        <Icone name="person_add" className="text-xl" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Ação cancelar */}
                {reserva.status === "APROVADA" && (
                  <button
                    onClick={() => cancelar(reserva.id)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer"
                  >
                    <Icone name="cancel" className="text-sm" /> Cancelar reserva
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
