// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n.js";
import "./index.css";
import { TemaProvider } from "./contexts/TemaContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ModulesProvider } from "./contexts/ModulesContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import { ConfirmProvider } from "./contexts/ConfirmContext.jsx";
import { NotificacoesProvider } from "./contexts/NotificacoesContext.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TemaProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <ModulesProvider>
              <NotificacoesProvider>
                <App />
              </NotificacoesProvider>
            </ModulesProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </TemaProvider>
  </StrictMode>,
);
