import { createContext, useContext, useCallback, useEffect, useState } from "react";

/**
 * Tema claro e escuro.
 *
 * O tema vive num atributo `data-tema` no elemento raiz, e a troca acontece
 * inteiramente em CSS: as utilitárias do Tailwind leem `var(--color-*)`, e o
 * bloco `:root[data-tema="claro"]` do index.css redefine essas variáveis. Nenhum
 * componente precisa saber qual tema está ativo.
 *
 * Há duas coisas distintas aqui, e confundi-las causa bug:
 *
 *   `preferencia` — o que o usuário escolheu: "claro", "escuro" ou "sistema"
 *   `tema`        — o que está valendo agora: "claro" ou "escuro"
 *
 * Com a preferência em "sistema", o tema acompanha o sistema operacional em
 * tempo real. Sem essa separação não dá para oferecer "seguir o sistema" como
 * opção — só dá para adivinhar pela ausência de escolha.
 */

const CHAVE = "tema";
const TemaContext = createContext(null);

/** O que o sistema operacional do usuário pede. */
function preferenciaDoSistema() {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "claro"
    : "escuro";
}

function preferenciaSalva() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "claro" || salvo === "escuro") return salvo;
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue o sistema.
  }
  return "sistema";
}

function aplicar(tema) {
  const raiz = document.documentElement;
  raiz.setAttribute("data-tema", tema);
  // Faz o navegador pintar barras de rolagem e campos nativos no tom certo.
  raiz.style.colorScheme = tema === "claro" ? "light" : "dark";
}

export function TemaProvider({ children }) {
  const [preferencia, setPreferencia] = useState(preferenciaSalva);
  const [doSistema, setDoSistema] = useState(preferenciaDoSistema);

  const tema = preferencia === "sistema" ? doSistema : preferencia;

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  useEffect(() => {
    try {
      if (preferencia === "sistema") localStorage.removeItem(CHAVE);
      else localStorage.setItem(CHAVE, preferencia);
    } catch {
      // Sem persistência, a escolha ainda vale para esta sessão.
    }
  }, [preferencia]);

  // Acompanha o sistema em tempo real — só surte efeito quando a preferência
  // é "sistema", porque só aí `doSistema` entra no cálculo de `tema`.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const aoMudar = (e) => setDoSistema(e.matches ? "claro" : "escuro");
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  /**
   * Alterna entre claro e escuro.
   *
   * Sai de "sistema" ao ser usado: quem clica no botão está dizendo qual tema
   * quer, e continuar seguindo o sistema desfaria a escolha na próxima vez que
   * o sistema mudasse.
   */
  const alternar = useCallback(
    () => setPreferencia(tema === "claro" ? "escuro" : "claro"),
    [tema],
  );

  return (
    <TemaContext.Provider
      value={{ tema, preferencia, alternar, definirPreferencia: setPreferencia }}
    >
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema precisa estar dentro de TemaProvider.");
  return ctx;
}
