import { useState, useEffect, useCallback } from "react";
import { acessoApi } from "../../services/acessoApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { useToast } from "../../contexts/ToastContext";
import { labelPerfil } from "../../utils/perfis";

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

function CartaoUsuario({ usuario }) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icone name="person" className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface truncate">{usuario.nome}</p>
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
        </div>
      </div>

      {(usuario.bloco || usuario.apartamento) && (
        <div className="text-right shrink-0">
          <p className="text-xs text-on-surface-variant">
            {[usuario.bloco, usuario.apartamento].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

export function UsuariosCondominio() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

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
              <CartaoUsuario key={u.id} usuario={u} />
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
    </div>
  );
}
