// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n.js";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
