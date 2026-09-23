// src/contexts/NotificacoesContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { comunicacaoApi } from "../services/comunicacaoApi";

const NotificacoesContext = createContext(null);

// Convidado fica de fora: o acesso dele é de visita. O porteiro entra porque
// conversa com a administração como qualquer outro.
const PERFIS_COM_NOTIFICACOES = [
  "ADMIN_SINDICO", "MORADOR", "DONO_ALUGUEL", "PORTEIRO",
];
const POLL_INTERVAL = 60 * 1000; // 1 min

const VAZIO = { usuarioId: null, notificacoes: [], naoLidas: 0, conversasNaoLidas: 0 };

export function NotificacoesProvider({ children }) {
  const { usuario } = useAuth();
  // Um estado só, carimbado com o dono. É o que impede a caixa de um usuário
  // aparecer para o próximo entre o login e a primeira busca — e evita limpar
  // estado dentro do efeito, que dispara renderização em cascata.
  const [dados, setDados] = useState(VAZIO);
  const timerRef = useRef(null);

  const habilitado = Boolean(usuario && PERFIS_COM_NOTIFICACOES.includes(usuario.perfil));

  const buscar = useCallback(async () => {
    if (!usuario || !PERFIS_COM_NOTIFICACOES.includes(usuario.perfil)) return;
    try {
      // O resumo vem junto porque o sino soma duas coisas: notificação não lida
      // e conversa com mensagem nova. A primeira mensagem de um morador para a
      // administração não gera notificação — não há participante da gestão a
      // quem endereçar — e sem a segunda contagem nada acenderia para o síndico.
      const [lista, resumo] = await Promise.all([
        comunicacaoApi.listarNotificacoes(),
        comunicacaoApi.resumo().catch(() => null),
      ]);

      if (!lista.data?.sucesso) return;

      setDados({
        usuarioId: usuario.id,
        // O serviço devolve `lidaEm` (data ou null); a tela pensa em booleano.
        notificacoes: (lista.data.notificacoes ?? []).map((n) => ({ ...n, lida: Boolean(n.lidaEm) })),
        naoLidas: lista.data.naoLidas ?? 0,
        conversasNaoLidas: resumo?.data?.conversasNaoLidas ?? 0,
      });
    } catch {
      // silencioso — serviço pode estar indisponível
    }
  }, [usuario]);

  useEffect(() => {
    if (!habilitado) return;

    // A primeira busca sai do corpo do efeito de propósito: chamada ali, ela
    // atualiza estado no mesmo commit que montou o provider e encadeia uma
    // renderização extra em toda a árvore. Adiada, o resultado é o mesmo e a
    // primeira pintura não espera.
    const primeira = setTimeout(buscar, 0);
    timerRef.current = setInterval(buscar, POLL_INTERVAL);

    return () => {
      clearTimeout(primeira);
      clearInterval(timerRef.current);
    };
  }, [habilitado, buscar]);

  const marcarLida = useCallback(async (id) => {
    // Atualiza a tela antes da resposta: marcar como lida não é operação que o
    // usuário precise esperar, e o resultado visível é o mesmo se falhar.
    setDados((d) => ({
      ...d,
      notificacoes: d.notificacoes.map((n) =>
        n.id === id ? { ...n, lida: true, lidaEm: n.lidaEm ?? new Date().toISOString() } : n,
      ),
      naoLidas: Math.max(0, d.naoLidas - 1),
    }));
    try {
      await comunicacaoApi.marcarNotificacaoLida(id);
    } catch { /* silencioso */ }
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    try {
      await comunicacaoApi.marcarTodasNotificacoesLidas();
      const agora = new Date().toISOString();
      setDados((d) => ({
        ...d,
        notificacoes: d.notificacoes.map((n) => ({ ...n, lida: true, lidaEm: n.lidaEm ?? agora })),
        naoLidas: 0,
      }));
    } catch { /* silencioso */ }
  }, []);

  // Só entrega o que for do usuário atual. Sem esta comparação, quem entrasse
  // logo depois de outro veria a caixa alheia até a primeira busca responder.
  const meus = habilitado && dados.usuarioId === usuario.id ? dados : VAZIO;

  return (
    <NotificacoesContext.Provider
      value={{
        notificacoes: meus.notificacoes,
        naoLidas: meus.naoLidas,
        conversasNaoLidas: meus.conversasNaoLidas,
        // O que o sino mostra. Somado aqui para navbar e tela não divergirem.
        totalPendente: meus.naoLidas + meus.conversasNaoLidas,
        carregando: habilitado && dados.usuarioId !== usuario.id,
        buscar,
        marcarLida,
        marcarTodasLidas,
      }}
    >
      {children}
    </NotificacoesContext.Provider>
  );
}

export const useNotificacoes = () => {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error("useNotificacoes deve ser usado dentro de NotificacoesProvider");
  return ctx;
};
