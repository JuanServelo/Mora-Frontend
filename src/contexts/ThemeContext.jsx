// src/contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "theme";
const TEMAS = ["dark", "light"];

function aplicarTema(tema) {
  const root = document.documentElement;
  root.classList.remove(...TEMAS);
  root.classList.add(tema);
}

function temaInicial() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (TEMAS.includes(salvo)) return salvo;
  } catch {
    /* localStorage indisponível */
  }
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(temaInicial);

  useEffect(() => {
    aplicarTema(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignora se localStorage indisponível */
    }
  }, [theme]);

  const setTheme = useCallback((tema) => {
    if (TEMAS.includes(tema)) setThemeState(tema);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}
