import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/portaria-api": {
        target: "http://localhost:8090",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/portaria-api/, ""),
      },
      // O comunicacao-service em Java. O prefixo é removido antes de
      // encaminhar, como no portaria: o Traefik faz o mesmo em produção, então
      // os caminhos do client são os mesmos nos dois ambientes.
      "/comunicacao-api": {
        target: "http://localhost:8094",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/comunicacao-api/, ""),
      },
    },
  },
});
