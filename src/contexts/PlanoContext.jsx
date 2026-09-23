// src/contexts/PlanoContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { planApi } from "../services/planApi";
import { PERFIS } from "../utils/perfis";

const PlanoContext = createContext(null);

/**
 * Carrega a assinatura vigente do condomínio e expõe os módulos ativos.
 *
 * Apenas o ADMIN_SINDICO tem restrição de módulos — para ele, `modulosAtivos`
 * será um array de slugs. Para os demais perfis (e enquanto a requisição está
 * em andamento), `modulosAtivos` fica `null`, o que significa "sem restrição".
 */
export function PlanoProvider({ children }) {
  const { usuario, loading: authLoading } = useAuth();
  const [modulosAtivos, setModulosAtivos] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    // Só busca se for síndico e tiver condominioId.
    if (authLoading) return;
    if (usuario?.perfil !== PERFIS.ADMIN_SINDICO || !usuario?.condominioId) {
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
  }, [usuario?.perfil, usuario?.condominioId, authLoading]);

  return (
    <PlanoContext.Provider value={{ modulosAtivos, carregando }}>
      {children}
    </PlanoContext.Provider>
  );
}

export function usePlano() {
  const ctx = useContext(PlanoContext);
  if (!ctx) throw new Error("usePlano deve ser usado dentro de PlanoProvider");
  return ctx;
}
