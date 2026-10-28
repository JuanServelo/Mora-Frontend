// src/contexts/PlanoContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { planApi } from "../services/planApi";

const PlanoContext = createContext(null);

/**
 * Carrega a assinatura vigente do condomínio e expõe os módulos ativos.
 *
 * Busca o plano para QUALQUER perfil que possua condominioId, pois porteiros
 * e moradores também precisam saber quais módulos estão habilitados para
 * ocultar links de funcionalidades não contratadas.
 *
 * - `modulosAtivos = null`  → ainda carregando (itens opcionais ficam ocultos)
 * - `modulosAtivos = []`    → sem plano contratado (itens opcionais ficam ocultos)
 * - `modulosAtivos = [...]` → plano ativo, só os slugs listados ficam visíveis
 */
export function PlanoProvider({ children }) {
  const { usuario, loading: authLoading } = useAuth();
  const [modulosAtivos, setModulosAtivos] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!usuario?.condominioId) {
      setModulosAtivos(null);
      return;
    }

    setCarregando(true);
    planApi
      .assinaturaVigente(usuario.condominioId)
      .then(({ data }) => setModulosAtivos(data.modulosAtivos ?? []))
      .catch(() => {
        // Sem assinatura ativa → sem módulos habilitados.
        setModulosAtivos([]);
      })
      .finally(() => setCarregando(false));
  }, [usuario?.condominioId, authLoading]);

  /**
   * Retorna `true` se o módulo com o slug fornecido está habilitado no plano.
   * Quando não há plano (null ou []), retorna `false` — itens opcionais ficam ocultos.
   */
  const hasModulo = useCallback(
    (slug) => {
      if (!modulosAtivos || modulosAtivos.length === 0) return false;
      return modulosAtivos.includes(slug);
    },
    [modulosAtivos],
  );

  return (
    <PlanoContext.Provider value={{ modulosAtivos, carregando, hasModulo }}>
      {children}
    </PlanoContext.Provider>
  );
}

export function usePlano() {
  const ctx = useContext(PlanoContext);
  if (!ctx) throw new Error("usePlano deve ser usado dentro de PlanoProvider");
  return ctx;
}

