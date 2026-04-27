// src/pages/adm/GerenciarEspacos.jsx
// Página ADMIN — gerenciamento de Áreas Comuns (criar, editar, mudar status, excluir)
import { useState } from "react";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

function TextArea({ label, ...props }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      <textarea
        className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all resize-none"
        {...props}
      />
    </div>
  );
}

const STATUS_AREA = ["Ativo", "Em Manutenção", "Desativado"];

const statusColor = (s) => {
  if (s === "Ativo") return "bg-primary/10 text-primary";
  if (s === "Em Manutenção") return "bg-tertiary/10 text-tertiary";
  return "bg-error/10 text-error";
};

const FORM_INICIAL = {
  nome: "",
  descricao: "",
  capacidade: "",
  minDiasAntecedencia: "",
  maxDiasAntecedencia: "",
  taxaLocacao: "",
  taxaLimpeza: "",
  taxaCancelamento: "",
  horarioSilencio: "",
  exigeListaConvidados: false,
  regras: "",
  status: "Ativo",
};

const AREAS_MOCK = [
  {
    id: 1,
    nome: "Salão de Festas",
    descricao: "Salão climatizado com cozinha completa",
    capacidade: 80,
    minDiasAntecedencia: 3,
    maxDiasAntecedencia: 30,
    taxaLocacao: 200,
    taxaLimpeza: 50,
    taxaCancelamento: 30,
    horarioSilencio: 22,
    exigeListaConvidados: true,
    regras: "Proibido som acima de 80dB após as 22h.",
    status: "Ativo",
  },
  {
    id: 2,
    nome: "Churrasqueira",
    descricao: "Área de churrasco coberta com mesas",
    capacidade: 30,
    minDiasAntecedencia: 2,
    maxDiasAntecedencia: 20,
    taxaLocacao: 100,
    taxaLimpeza: 30,
    taxaCancelamento: 20,
    horarioSilencio: 22,
    exigeListaConvidados: false,
    regras: "Limpar a grelha após o uso.",
    status: "Ativo",
  },
  {
    id: 3,
    nome: "Academia",
    descricao: "Equipamentos de musculação e cardio",
    capacidade: 15,
    minDiasAntecedencia: 0,
    maxDiasAntecedencia: 7,
    taxaLocacao: 0,
    taxaLimpeza: 0,
    taxaCancelamento: 0,
    horarioSilencio: 22,
    exigeListaConvidados: false,
    regras: "Uso exclusivo de moradores. Trazer toalha.",
    status: "Em Manutenção",
  },
];

export function GerenciarEspacos() {
  const [areas, setAreas] = useState(AREAS_MOCK);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const handleForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const salvar = (e) => {
    e.preventDefault();
    if (editando) {
      setAreas((prev) => prev.map((a) => (a.id === editando ? { ...form, id: editando } : a)));
      setEditando(null);
    } else {
      setAreas((prev) => [...prev, { ...form, id: Date.now() }]);
      setCriando(false);
    }
    setForm(FORM_INICIAL);
  };

  const excluir = (id) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
    if (expandido === id) setExpandido(null);
  };

  const iniciarEdicao = (area) => {
    setForm({ ...area });
    setEditando(area.id);
    setCriando(false);
  };

  const mudarStatus = (id, novoStatus) => {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a)));
  };

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Áreas{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Comuns
              </span>
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Cadastre e gerencie as áreas disponíveis para reserva pelos moradores.
            </p>
          </div>
          {!criando && !editando && (
            <Botao onClick={() => { setCriando(true); setForm(FORM_INICIAL); }}>
              <span className="flex items-center gap-2">
                <Icone name="add" className="text-lg" /> Nova Área
              </span>
            </Botao>
          )}
        </header>

        {(criando || editando) && (
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <h2 className="font-headline text-xl font-bold text-on-surface">
              {editando ? "Editar Área" : "Nova Área Comum"}
            </h2>
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Nome" name="nome" value={form.nome} onChange={handleForm} placeholder="Ex: Salão de Festas" required />
                <Campo label="Capacidade (pessoas)" name="capacidade" type="number" value={form.capacidade} onChange={handleForm} placeholder="80" />
              </div>
              <TextArea label="Descrição" name="descricao" value={form.descricao} onChange={handleForm} rows={2} placeholder="Descreva o espaço..." />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Campo label="Min. dias antecedência" name="minDiasAntecedencia" type="number" value={form.minDiasAntecedencia} onChange={handleForm} placeholder="2" />
                <Campo label="Máx. dias antecedência" name="maxDiasAntecedencia" type="number" value={form.maxDiasAntecedencia} onChange={handleForm} placeholder="30" />
                <Campo label="Taxa locação (R$)" name="taxaLocacao" type="number" value={form.taxaLocacao} onChange={handleForm} placeholder="200" />
                <Campo label="Taxa limpeza (R$)" name="taxaLimpeza" type="number" value={form.taxaLimpeza} onChange={handleForm} placeholder="50" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Campo label="Taxa cancelamento (R$)" name="taxaCancelamento" type="number" value={form.taxaCancelamento} onChange={handleForm} placeholder="30" />
                <Campo label="Horário silêncio (h)" name="horarioSilencio" type="number" value={form.horarioSilencio} onChange={handleForm} placeholder="22" />
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Status</label>
                  <select name="status" value={form.status} onChange={handleForm} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all">
                    {STATUS_AREA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <TextArea label="Regras de uso" name="regras" value={form.regras} onChange={handleForm} rows={3} placeholder="Descreva as regras de uso..." />
              <div className="flex items-center gap-3">
                <input type="checkbox" id="exigeConvidados" name="exigeListaConvidados" checked={form.exigeListaConvidados} onChange={handleForm} className="w-4 h-4 accent-primary rounded" />
                <label htmlFor="exigeConvidados" className="text-sm text-on-surface-variant">Exige lista de convidados</label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setCriando(false); setEditando(null); setForm(FORM_INICIAL); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer">Cancelar</button>
                <Botao type="submit">{editando ? "Salvar alterações" : "Criar área"}</Botao>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total de áreas", valor: areas.length, icon: "meeting_room", color: "primary" },
            { label: "Ativas", valor: areas.filter((a) => a.status === "Ativo").length, icon: "check_circle", color: "primary" },
            { label: "Em manutenção", valor: areas.filter((a) => a.status === "Em Manutenção").length, icon: "construction", color: "tertiary" },
          ].map((c) => (
            <div key={c.label} className="glass-panel rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${c.color}/10 flex items-center justify-center`}>
                <Icone name={c.icon} className={`text-${c.color} text-2xl`} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-on-surface">{c.valor}</p>
                <p className="text-xs text-on-surface-variant">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {areas.map((area) => (
            <div key={area.id} className="glass-panel rounded-2xl overflow-hidden">
              <button className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-white/5 transition-all" onClick={() => setExpandido(expandido === area.id ? null : area.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icone name="meeting_room" className="text-primary text-xl" />
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{area.nome}</p>
                    <p className="text-xs text-on-surface-variant">{area.descricao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(area.status)}`}>{area.status}</span>
                  <Icone name={expandido === area.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
                </div>
              </button>

              {expandido === area.id && (
                <div className="px-6 pb-5 border-t border-white/5 pt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Capacidade", valor: `${area.capacidade} pessoas` },
                      { label: "Taxa Locação", valor: `R$ ${area.taxaLocacao}` },
                      { label: "Taxa Limpeza", valor: `R$ ${area.taxaLimpeza}` },
                      { label: "Taxa Cancelamento", valor: `R$ ${area.taxaCancelamento}` },
                      { label: "Antecedência mín.", valor: `${area.minDiasAntecedencia} dias` },
                      { label: "Antecedência máx.", valor: `${area.maxDiasAntecedencia} dias` },
                      { label: "Horário silêncio", valor: `${area.horarioSilencio}h` },
                      { label: "Lista de convidados", valor: area.exigeListaConvidados ? "Obrigatória" : "Não exigida" },
                    ].map((item) => (
                      <div key={item.label} className="bg-surface-container-highest/30 rounded-xl p-3">
                        <p className="text-xs text-on-surface-variant mb-1">{item.label}</p>
                        <p className="text-sm font-semibold text-on-surface">{item.valor}</p>
                      </div>
                    ))}
                  </div>
                  {area.regras && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Regras</p>
                      <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3">{area.regras}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {STATUS_AREA.filter((s) => s !== area.status).map((s) => (
                      <button key={s} onClick={() => mudarStatus(area.id, s)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${statusColor(s)} border-current/20 hover:opacity-80`}>
                        Marcar como {s}
                      </button>
                    ))}
                    <button onClick={() => iniciarEdicao(area)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-all cursor-pointer">
                      <Icone name="edit" className="text-sm" /> Editar
                    </button>
                    <button onClick={() => excluir(area.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer">
                      <Icone name="delete" className="text-sm" /> Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {areas.length === 0 && (
            <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
              <Icone name="meeting_room" className="text-5xl opacity-30" />
              <p className="text-sm">Nenhuma área cadastrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
