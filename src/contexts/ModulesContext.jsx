// src/contexts/ModulesContext.jsx
//
// Busca os módulos contratados pelo condomínio do usuário logado.
// ADMIN_GERAL não é filtrado (activeModules = null = tudo liberado).
// Se não houver assinatura, activeModules = [] (bloqueia tudo).

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { planApi } from "../services/planApi";
import { PERFIS } from "../utils/perfis";

const ModulesContext = createContext(null);

export function ModulesProvider({ children }) {
  // null = sem filtragem (ADMIN_GERAL ou loading)
  // []   = bloqueado (sem assinatura)
  // [...]= lista de slugs contratados
  const [activeModules, setActiveModules] = useState(null);
  const [modulesLoading, setModulesLoading] = useState(true);

  const { usuario, loading: authLoading } = useAuth();

  useEffect(() => {
    // Ainda carregando auth
    if (authLoading) return;

    // Sem usuário logado — limpa
    if (!usuario) {
      setActiveModules(null);
      setModulesLoading(false);
      return;
    }

    // ADMIN_GERAL opera a plataforma, não um condomínio — vê tudo
    if (usuario.perfil === PERFIS.ADMIN_GERAL) {
      setActiveModules(null);
      setModulesLoading(false);
      return;
    }

    // Sem condominioId — não dá pra buscar assinatura
    if (!usuario.condominioId) {
      setActiveModules([]);
      setModulesLoading(false);
      return;
    }

    // Busca módulos da assinatura
    setModulesLoading(true);
    planApi
      .buscarModulosCondominio(usuario.condominioId)
      .then((res) => {
        const modules = res.data;
        // API retorna [] se não houver assinatura → bloqueia tudo
        setActiveModules(Array.isArray(modules) ? modules : []);
      })
      .catch(() => {
        // Erro na API → bloqueia tudo (seguro)
        setActiveModules([]);
      })
      .finally(() => setModulesLoading(false));
  }, [usuario, authLoading]);

  return (
    <ModulesContext.Provider value={{ activeModules, modulesLoading }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error("useModules deve ser usado dentro de ModulesProvider");
  return ctx;
}
