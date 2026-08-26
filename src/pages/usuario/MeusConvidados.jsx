import { useState, useEffect, useCallback } from "react";
import { acessoApi } from "../../services/acessoApi";
import { Icone } from "../../components/icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

function formatarCpf(cpf) {
  const d = String(cpf ?? "").replace(/\D/g, "");
  if (d.length !== 11) return cpf ?? "—";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

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
      {/* Identidade */}
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
            dentro
              ? "bg-primary/10 text-primary"
              : "bg-outline-variant/20 text-on-surface-variant"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dentro ? "bg-primary" : "bg-outline-variant"}`} />
          {dentro ? "Dentro" : "Fora"}
        </span>
      </div>

      {/* Controle de permissão */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-outline-variant/10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface">
            Permissão de entrada
          </p>
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

      {/* Última movimentação */}
      {guest.ultimoRegistroEm && (
        <p className="text-xs text-on-surface-variant">
          Último registro:{" "}
          {new Date(guest.ultimoRegistroEm).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

export function MeusConvidados() {
  const toast = useToast();
  const { usuario } = useAuth();
  const [guests, setGuests] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [alterando, setAlterando] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await acessoApi.listarMeusGuests();
      setGuests(res.data.guests || []);
    } catch (err) {
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
        prev.map((g) =>
          g.id === guest.id ? { ...g, entradaPermitida: res.data.entradaPermitida } : g
        )
      );
      toast.success(res.data.mensagem);
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao alterar permissão.");
    } finally {
      setAlterando(null);
    }
  }

  const podeGerenciar = usuario?.responsavelFinanceiro || usuario?.perfil === "MORADOR";

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
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

        {!podeGerenciar && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-error/10 text-error text-sm">
            <Icone name="warning" className="text-base shrink-0 mt-0.5" />
            <span>Apenas o responsável financeiro da unidade pode gerenciar permissões de convidados.</span>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
          <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
          <span>
            Ative a permissão de entrada para que a portaria possa registrar o acesso do seu convidado.
            Convidados bloqueados não poderão entrar no condomínio.
          </span>
        </div>

        {/* Lista */}
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
              {guests.length} convidado{guests.length !== 1 ? "s" : ""} cadastrado{guests.length !== 1 ? "s" : ""}
              {" · "}
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
      </div>
    </div>
  );
}
