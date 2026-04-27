// src/pages/adm/GerenciarEspacos.jsx
// Página ADMIN — gerenciamento de Áreas Comuns (criar, editar, mudar status, excluir)
import { useState, useEffect } from "react";
import { areaComunApi } from "../../services/estruturasApi";
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

const statusColor = (ativo) => {
  if (ativo) return "bg-primary/10 text-primary";
  return "bg-error/10 text-error";
};

const FORM_INICIAL = {
  nome: "",
  descricao: "",
  tipo: "",
  localizacao: "",
  capacidadeMaxima: "",
  area: "",
  podeReservar: false,
  taxaLocacao: "",
  informacoesLimpeza: "",
  politicaCancelamento: "",
  observacoes: "",
};

const TIPOS_AREA = ["PISCINA", "SALAO_FESTAS", "ACADEMIA", "CHURRASQUEIRA", "QUADRA", "PLAYGROUND", "GYM", "OUTRO"];

export function GerenciarEspacos() {
  const [areas, setAreas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  useEffect(() => {
    carregarAreas();
  }, []);

  const carregarAreas = async () => {
    try {
      const res = await areaComunApi.listarTodas();
      setAreas(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar áreas comuns:", err);
    } finally {
      setCarregando(false);
    }
  };

  const handleForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await areaComunApi.atualizar(editando, form);
        setAreas((prev) =>
          prev.map((a) => (a.id === editando ? { ...form, id: editando } : a))
        );
        setEditando(null);
      } else {
        const res = await areaComunApi.cadastrar(form);
        setAreas((prev) => [res.data, ...prev]);
        setCriando(false);
      }
      setForm(FORM_INICIAL);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  const excluir = async (id) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await areaComunApi.desativar(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
      if (expandido === id) setExpandido(null);
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  };

  const iniciarEdicao = (area) => {
    setForm({ ...area });
    setEditando(area.id);
    setCriando(false);
  };

  const mudarStatus = async (id, novoAtivo) => {
    try {
      if (novoAtivo) {
        await areaComunApi.ativar(id);
      } else {
        await areaComunApi.desativar(id);
      }
      setAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ativo: novoAtivo } : a))
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
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
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Tipo</label>
                  <select name="tipo" value={form.tipo} onChange={handleForm} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all" required>
                    <option value="">Selecione um tipo</option>
                    {TIPOS_AREA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <TextArea label="Descrição" name="descricao" value={form.descricao} onChange={handleForm} rows={2} placeholder="Descreva o espaço..." />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Localização" name="localizacao" value={form.localizacao} onChange={handleForm} placeholder="Ex: Térreo - Bloco A" />
                <Campo label="Capacidade máxima (pessoas)" name="capacidadeMaxima" type="number" value={form.capacidadeMaxima} onChange={handleForm} placeholder="80" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Campo label="Área (m²)" name="area" type="number" value={form.area} onChange={handleForm} placeholder="150" />
                <Campo label="Taxa locação (R$)" name="taxaLocacao" type="number" step="0.01" value={form.taxaLocacao} onChange={handleForm} placeholder="200.00" />
              </div>
              <TextArea label="Informações de limpeza" name="informacoesLimpeza" value={form.informacoesLimpeza} onChange={handleForm} rows={2} placeholder="Descreva regras de limpeza..." />
              <TextArea label="Política de cancelamento" name="politicaCancelamento" value={form.politicaCancelamento} onChange={handleForm} rows={2} placeholder="Descreva a política de cancelamento..." />
              <TextArea label="Observações" name="observacoes" value={form.observacoes} onChange={handleForm} rows={2} placeholder="Observações adicionais..." />
              <div className="flex items-center gap-3">
                <input type="checkbox" id="podeReservar" name="podeReservar" checked={form.podeReservar} onChange={handleForm} className="w-4 h-4 accent-primary rounded" />
                <label htmlFor="podeReservar" className="text-sm text-on-surface-variant">Permite reservas</label>
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
            { label: "Ativas", valor: areas.filter((a) => a.ativo).length, icon: "check_circle", color: "primary" },
            { label: "Inativas", valor: areas.filter((a) => !a.ativo).length, icon: "block", color: "error" },
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
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(area.ativo)}`}>{area.ativo ? "Ativo" : "Inativo"}</span>
                  <Icone name={expandido === area.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
                </div>
              </button>

              {expandido === area.id && (
                <div className="px-6 pb-5 border-t border-white/5 pt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Tipo", valor: area.tipo },
                      { label: "Localização", valor: area.localizacao },
                      { label: "Capacidade", valor: `${area.capacidadeMaxima} pessoas` },
                      { label: "Área", valor: `${area.area}m²` },
                      { label: "Taxa Locação", valor: `R$ ${area.taxaLocacao?.toFixed(2) || "0.00"}` },
                      { label: "Reservas", valor: area.podeReservar ? "Sim" : "Não" },
                    ].map((item) => (
                      <div key={item.label} className="bg-surface-container-highest/30 rounded-xl p-3">
                        <p className="text-xs text-on-surface-variant mb-1">{item.label}</p>
                        <p className="text-sm font-semibold text-on-surface">{item.valor}</p>
                      </div>
                    ))}
                  </div>
                  {area.informacoesLimpeza && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Informações de Limpeza</p>
                      <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3">{area.informacoesLimpeza}</p>
                    </div>
                  )}
                  {area.politicaCancelamento && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Política de Cancelamento</p>
                      <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3">{area.politicaCancelamento}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => mudarStatus(area.id, !area.ativo)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${statusColor(!area.ativo)} border-current/20 hover:opacity-80`}>
                      Marcar como {!area.ativo ? "Ativo" : "Inativo"}
                    </button>
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

          {areas.length === 0 && !carregando && (
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
