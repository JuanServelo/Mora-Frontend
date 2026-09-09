import { useState, useEffect, useCallback } from "react";
import { acessoApi } from "../../services/acessoApi";
import { apartamentoApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { useToast } from "../../contexts/ToastContext";
import { labelPerfil, PERFIS } from "../../utils/perfis";
import { formatarUnidade } from "../../utils/unidades";

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  active: "bg-primary/10 text-primary",
  pending_activation: "bg-secondary/10 text-secondary",
  inactive: "bg-outline-variant/20 text-on-surface-variant",
};

const STATUS_LABEL = {
  active: "Ativo",
  pending_activation: "Pendente",
  inactive: "Inativo",
};

function mascaraCpfLista(cpf) {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

function mascaraCpfFull(cpf) {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── CartaoUsuario ────────────────────────────────────────────────────────────

function CartaoUsuario({ usuario, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(usuario)}
      className="w-full text-left glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary/30 border border-outline-variant/10 transition-all group"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icone name="person" className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">{usuario.nome}</p>
        <p className="text-xs text-on-surface-variant truncate">{usuario.email}</p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-highest/40 text-on-surface-variant">
            {labelPerfil(usuario.perfil)}
          </span>
          {usuario.status && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                STATUS_STYLE[usuario.status] ?? STATUS_STYLE.inactive
              }`}
            >
              {STATUS_LABEL[usuario.status] ?? usuario.status}
            </span>
          )}
          {usuario.cpf && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono bg-surface-container-highest/40 text-on-surface-variant">
              {mascaraCpfLista(usuario.cpf)}
            </span>
          )}
        </div>
      </div>

      {(usuario.bloco || usuario.apartamento) && (
        <div className="text-right shrink-0">
          <p className="text-xs text-on-surface-variant">
            {[usuario.bloco, usuario.apartamento].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}

      <Icone name="chevron_right" className="text-outline-variant group-hover:text-primary transition-colors text-lg hidden sm:block shrink-0" />
    </button>
  );
}

// ─── DetalheUsuario ───────────────────────────────────────────────────────────

function LinhaDetalhe({ icone, label, valor }) {
  if (!valor) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-surface-container-highest/40 flex items-center justify-center shrink-0">
        <Icone name={icone} className="text-outline-variant text-base" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-outline-variant">{label}</p>
        <p className="text-sm text-on-surface mt-0.5">{valor}</p>
      </div>
    </div>
  );
}

function DetalheUsuario({ usuario, apartamentoMap, onFechar }) {
  if (!usuario) return null;

  const unidadeLabel = (() => {
    if (usuario.unidadeId && apartamentoMap[usuario.unidadeId]) {
      return apartamentoMap[usuario.unidadeId];
    }
    if (usuario.bloco || usuario.apartamento) {
      return [usuario.bloco, usuario.apartamento].filter(Boolean).join(" · ");
    }
    return null;
  })();

  const perfilLabel = labelPerfil(usuario.perfil);
  const isUnidade = [PERFIS.MORADOR, PERFIS.DONO_ALUGUEL, PERFIS.CONVIDADO].includes(usuario.perfil);
  const isStaff = [PERFIS.PORTEIRO, PERFIS.ADMIN_SINDICO, PERFIS.ADMIN_GERAL].includes(usuario.perfil);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-outline-variant/15 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="person" className="text-primary text-xl" />
            </div>
            <div>
              <p className="font-headline font-bold text-on-surface text-lg leading-tight">{usuario.nome}</p>
              <p className="text-xs text-on-surface-variant">{perfilLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="text-outline-variant hover:text-on-surface transition-colors p-1"
          >
            <Icone name="close" className="text-xl" />
          </button>
        </div>

        {/* Status */}
        {usuario.status && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_STYLE[usuario.status] ?? STATUS_STYLE.inactive}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {STATUS_LABEL[usuario.status] ?? usuario.status}
            </span>
          </div>
        )}

        {/* Dados comuns */}
        <div className="space-y-3 border-t border-outline-variant/15 pt-4">
          <LinhaDetalhe icone="mail" label="E-mail" valor={usuario.email} />
          <LinhaDetalhe icone="badge" label="CPF" valor={mascaraCpfFull(usuario.cpf)} />
          <LinhaDetalhe icone="phone" label="Telefone" valor={usuario.telefone} />
        </div>

        {/* Dados por perfil */}
        {(isUnidade || isStaff) && (
          <div className="space-y-3 border-t border-outline-variant/15 pt-4">
            {/* MORADOR / DONO_ALUGUEL / CONVIDADO */}
            {isUnidade && (
              <>
                <LinhaDetalhe icone="home" label="Unidade" valor={unidadeLabel} />
                {usuario.perfil === PERFIS.DONO_ALUGUEL && (
                  <div className="rounded-xl bg-surface-container-highest/30 px-3 py-2 text-xs text-on-surface-variant">
                    Dono não residente — proprietário do imóvel
                  </div>
                )}
                {usuario.perfil === PERFIS.CONVIDADO && (
                  <LinhaDetalhe icone="waving_hand" label="Tipo" valor="Visitante pré-autorizado" />
                )}
                {usuario.responsavelFinanceiro && (
                  <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-xs text-primary font-semibold">
                    <Icone name="star" className="text-sm" />
                    Responsável financeiro da unidade
                  </div>
                )}
              </>
            )}

            {/* PORTEIRO / ADMIN_SINDICO / ADMIN_GERAL */}
            {isStaff && (
              <>
                {usuario.perfil === PERFIS.PORTEIRO && (
                  <LinhaDetalhe icone="security" label="Função" valor="Operador de portaria" />
                )}
                {usuario.perfil === PERFIS.ADMIN_SINDICO && (
                  <LinhaDetalhe icone="manage_accounts" label="Função" valor="Administrador do condomínio" />
                )}
                {usuario.perfil === PERFIS.ADMIN_GERAL && (
                  <LinhaDetalhe icone="admin_panel_settings" label="Função" valor="Administrador geral da plataforma" />
                )}
              </>
            )}

            {/* TERCEIRO */}
            {usuario.perfil === PERFIS.TERCEIRO && (
              <>
                <LinhaDetalhe icone="business" label="Empresa" valor={usuario.empresa} />
                <LinhaDetalhe icone="engineering" label="Tipo" valor="Prestador de serviço" />
              </>
            )}
          </div>
        )}

        {/* Acesso ao sistema */}
        <div className="border-t border-outline-variant/15 pt-4">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
            usuario.semAcessoSistema
              ? "bg-surface-container-highest/30 text-on-surface-variant"
              : "bg-primary/5 text-primary"
          }`}>
            <Icone name={usuario.semAcessoSistema ? "lock" : "lock_open"} className="text-sm" />
            {usuario.semAcessoSistema ? "Sem acesso ao sistema" : "Com acesso ao sistema"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function UsuariosCondominio() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [apartamentoMap, setApartamentoMap] = useState({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await acessoApi.listarUsuariosCondominio();
      setUsuarios(res.data.usuarios || []);
    } catch {
      toast.error("Erro ao carregar usuários do condomínio.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    apartamentoApi.listar().then((r) => {
      const map = {};
      (r.data || []).forEach((a) => {
        const bloco = a.blocoNome || a.bloco?.nome || "";
        map[a.id] = formatarUnidade(bloco, a.numero);
      });
      setApartamentoMap(map);
    }).catch(() => {});
  }, []);

  const filtrados = usuarios.filter((u) => {
    const q = busca.toLowerCase();
    return (
      u.nome?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.cpf?.includes(q)
    );
  });

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Portaria
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Usuários do Condomínio
              </span>
            </h1>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-primary">{usuarios.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
          </div>
        </header>

        <div className="max-w-sm">
          <Campo
            id="busca"
            placeholder="Buscar por nome, e-mail ou CPF..."
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {carregando ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            Carregando...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            {busca ? "Nenhum resultado encontrado." : "Nenhum usuário cadastrado neste condomínio."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((u) => (
              <CartaoUsuario
                key={u.id}
                usuario={u}
                onSelect={setSelectedUser}
              />
            ))}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            <Icone name="refresh" className="text-base" />
            Atualizar
          </button>
        </div>

      </div>

      {selectedUser && (
        <DetalheUsuario
          usuario={selectedUser}
          apartamentoMap={apartamentoMap}
          onFechar={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
