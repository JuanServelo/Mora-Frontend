import { useState, useEffect, useCallback } from "react";
import { acessoApi } from "../../services/acessoApi";
import { preAutorizacaoApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

function formatarCpf(cpf) {
  const d = String(cpf ?? "").replace(/\D/g, "");
  if (d.length !== 11) return cpf ?? "—";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function fmtData(iso) {
  if (!iso) return "—";
  const parts = String(iso).split("T")[0].split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function MeusConvidados() {
  const { usuario } = useAuth();
  const [aba, setAba] = useState("convidados");
  const podeGerenciar = usuario?.responsavelFinanceiro || usuario?.perfil === "MORADOR";

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Minha Unidade
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Meus{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Convidados
            </span>
          </h1>
        </header>

        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "convidados", label: "Convidados", icon: "person" },
            { id: "pre-autorizacoes", label: "Pré-autorizações", icon: "how_to_reg" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
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

        {!podeGerenciar && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-error/10 text-error text-sm">
            <Icone name="warning" className="text-base shrink-0 mt-0.5" />
            <span>Apenas o responsável financeiro da unidade pode gerenciar permissões de convidados.</span>
          </div>
        )}

        {aba === "convidados" && <AbaConvidados podeGerenciar={podeGerenciar} />}
        {aba === "pre-autorizacoes" && <AbaPreAutorizacoes podeGerenciar={podeGerenciar} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: CONVIDADOS (visitantes cadastrados)
// ════════════════════════════════════════════
function TogglePermissao({ ativo, onChange, desabilitado }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={desabilitado}
      className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        ativo ? "bg-secondary" : "bg-outline-variant/40"
      }`}
      aria-label={ativo ? "Bloquear entrada" : "Permitir entrada"}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          ativo ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function CartaoConvidado({ guest, onToggle, alterando }) {
  const dentro = guest.statusAcesso === "DENTRO";
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icone name="person_outline" className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-on-surface">{guest.nome}</p>
          <p className="text-xs text-on-surface-variant">CPF: {formatarCpf(guest.cpf)}</p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            dentro ? "bg-primary/10 text-primary" : "bg-outline-variant/20 text-on-surface-variant"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dentro ? "bg-primary" : "bg-outline-variant"}`} />
          {dentro ? "Dentro" : "Fora"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-outline-variant/10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface">Permissão de entrada</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {guest.entradaPermitida
              ? "Portaria pode registrar a entrada"
              : "Portaria não pode registrar a entrada"}
          </p>
        </div>
        <TogglePermissao
          ativo={guest.entradaPermitida}
          onChange={() => onToggle(guest)}
          desabilitado={alterando}
        />
      </div>
      {guest.ultimoRegistroEm && (
        <p className="text-xs text-on-surface-variant">
          Último registro:{" "}
          {new Date(guest.ultimoRegistroEm).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

function AbaConvidados({ podeGerenciar }) {
  const toast = useToast();
  const [guests, setGuests] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [alterando, setAlterando] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await acessoApi.listarMeusGuests();
      setGuests(res.data.guests || []);
    } catch {
      toast.error("Erro ao carregar convidados.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleToggle(guest) {
    setAlterando(guest.id);
    try {
      const res = await acessoApi.alterarPermissao(guest.id, !guest.entradaPermitida);
      setGuests((prev) =>
        prev.map((g) => g.id === guest.id ? { ...g, entradaPermitida: res.data.entradaPermitida } : g)
      );
      toast.success(res.data.mensagem);
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao alterar permissão.");
    } finally {
      setAlterando(null);
    }
  }

  return (
    <>
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
        <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
        <span>
          Ative a permissão de entrada para que a portaria possa registrar o acesso do seu convidado.
        </span>
      </div>

      {carregando ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
          Carregando convidados...
        </div>
      ) : guests.length === 0 ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center space-y-3">
          <Icone name="person_outline" className="text-4xl text-on-surface-variant mx-auto block" />
          <p className="text-on-surface-variant">Você não possui convidados cadastrados.</p>
          <p className="text-xs text-on-surface-variant">
            Solicite ao administrador o cadastro de convidados para sua unidade.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            {guests.length} convidado{guests.length !== 1 ? "s" : ""} ·{" "}
            {guests.filter((g) => g.entradaPermitida).length} autorizado{guests.filter((g) => g.entradaPermitida).length !== 1 ? "s" : ""}
          </p>
          {guests.map((guest) => (
            <CartaoConvidado
              key={guest.id}
              guest={guest}
              onToggle={handleToggle}
              alterando={alterando === guest.id || !podeGerenciar}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════
// ABA: PRÉ-AUTORIZAÇÕES (RF-6)
// ════════════════════════════════════════════
const PA_INICIAL = {
  nomeVisitante: "",
  cpfVisitante: "",
  validadeInicio: "",
  validadeFim: "",
  observacoes: "",
};

function AbaPreAutorizacoes({ podeGerenciar }) {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(PA_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [revogando, setRevogando] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await preAutorizacaoApi.minhas();
      setLista(res.data || []);
    } catch {
      // silent
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErro("");
  };

  async function handleSalvar(e) {
    e.preventDefault();
    setErro("");
    if (form.validadeInicio && form.validadeFim && form.validadeInicio > form.validadeFim) {
      setErro("A data de fim não pode ser anterior à data de início.");
      return;
    }
    setSalvando(true);
    try {
      const res = await preAutorizacaoApi.cadastrar({
        nomeVisitante: form.nomeVisitante,
        cpfVisitante: form.cpfVisitante || null,
        validadeInicio: form.validadeInicio,
        validadeFim: form.validadeFim,
        observacoes: form.observacoes || null,
      });
      setLista((prev) => [res.data, ...prev]);
      setCriando(false);
      setForm(PA_INICIAL);
      toast.success("Pré-autorização cadastrada com sucesso.");
    } catch (err) {
      setErro(err.response?.data?.mensagem || err.response?.data?.message || "Erro ao cadastrar pré-autorização.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleRevogar(id) {
    if (!confirm("Tem certeza que deseja revogar esta pré-autorização?")) return;
    setRevogando(id);
    try {
      await preAutorizacaoApi.revogar(id);
      setLista((prev) => prev.filter((p) => p.id !== id));
      toast.success("Pré-autorização revogada.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao revogar pré-autorização.");
    } finally {
      setRevogando(null);
    }
  }

  const hoje = new Date().toISOString().split("T")[0];
  const ativas = lista.filter((p) => p.ativo && p.validadeFim >= hoje);
  const expiradas = lista.filter((p) => !p.ativo || p.validadeFim < hoje);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
        <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
        <span>
          Pré-autorizações permitem que a portaria libere a entrada de um visitante específico durante o período indicado,
          sem precisar da sua presença na hora.
        </span>
      </div>

      {podeGerenciar && !criando && (
        <div className="flex justify-end">
          <Botao onClick={() => setCriando(true)}>
            <span className="flex items-center gap-2">
              <Icone name="add" className="text-lg" /> Nova pré-autorização
            </span>
          </Botao>
        </div>
      )}

      {criando && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="font-headline text-lg font-bold text-on-surface">Nova pré-autorização</h2>
          <form onSubmit={handleSalvar} className="space-y-4">
            <Campo
              label="Nome do visitante *"
              name="nomeVisitante"
              value={form.nomeVisitante}
              onChange={handleForm}
              placeholder="Nome completo"
              required
            />
            <Campo
              label="CPF do visitante"
              name="cpfVisitante"
              value={form.cpfVisitante}
              onChange={handleForm}
              placeholder="000.000.000-00 (opcional)"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                label="Válido a partir de *"
                name="validadeInicio"
                type="date"
                value={form.validadeInicio}
                onChange={handleForm}
                required
              />
              <Campo
                label="Válido até *"
                name="validadeFim"
                type="date"
                value={form.validadeFim}
                onChange={handleForm}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Observações <span className="font-normal text-on-surface-variant/60">(opcional)</span>
              </label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleForm}
                rows={2}
                placeholder="Ex: visita de médico, prestador de serviço..."
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all resize-none"
              />
            </div>
            {erro && <p className="text-xs text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setCriando(false); setErro(""); setForm(PA_INICIAL); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <Botao type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar"}
              </Botao>
            </div>
          </form>
        </div>
      )}

      {carregando ? (
        <div className="glass-panel rounded-2xl py-14 flex justify-center text-on-surface-variant">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-on-surface-variant text-center px-4">
          <Icone name="how_to_reg" className="text-5xl opacity-30" />
          <p className="text-sm">Nenhuma pré-autorização cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {ativas.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Ativas ({ativas.length})
              </p>
              {ativas.map((pa) => (
                <div key={pa.id} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-on-surface">{pa.nomeVisitante}</p>
                      {pa.cpfVisitante && (
                        <p className="text-xs text-on-surface-variant">CPF: {formatarCpf(pa.cpfVisitante)}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
                      Ativa
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Válida de {fmtData(pa.validadeInicio)} até {fmtData(pa.validadeFim)}
                  </p>
                  {pa.observacoes && (
                    <p className="text-xs text-on-surface-variant bg-surface-container-highest/20 rounded-xl px-3 py-2">
                      {pa.observacoes}
                    </p>
                  )}
                  {podeGerenciar && (
                    <button
                      type="button"
                      onClick={() => handleRevogar(pa.id)}
                      disabled={revogando === pa.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {revogando === pa.id ? "Revogando…" : "Revogar"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {expiradas.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Expiradas / Revogadas ({expiradas.length})
              </p>
              {expiradas.map((pa) => (
                <div key={pa.id} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-1 opacity-60">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-on-surface">{pa.nomeVisitante}</p>
                    <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-outline-variant/20 text-on-surface-variant">
                      {pa.ativo ? "Expirada" : "Revogada"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {fmtData(pa.validadeInicio)} → {fmtData(pa.validadeFim)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
