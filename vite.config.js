import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Cobertura de testes. `npm run test:cov` grava coverage/ e falha se as
  // telas de síndico e portaria caírem do mínimo — relatório sem limiar não
  // impede regressão, só documenta que ela aconteceu.
  // Os arquivos de teste também usam JSX; sem isto o esbuild os compila no
  // runtime clássico e `React is not defined` quebra todo render.
  esbuild: { jsx: "automatic" },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",

      // A medição cobre TODA a superfície que porteiro e síndico alcançam —
      // as telas, a navegação que decide o que cada um vê e os guardas de
      // rota. `all: true` é o que importa: sem ele, um arquivo sem nenhum
      // teste simplesmente não aparece no relatório, e a cobertura parece
      // alta porque só o que foi testado foi medido.
      all: true,
      include: [
        // telas do porteiro
        "src/pages/porteiro/**/*.jsx",
        "src/pages/portaria/**/*.{js,jsx}",
        // telas do síndico
        "src/pages/adm/**/*.jsx",
        // telas que os dois alcançam pelo menu
        "src/pages/usuario/MinhasReservas.jsx",
        "src/pages/usuario/Conversas.jsx",
        "src/pages/usuario/Avisos.jsx",
        "src/pages/inicio/Inicio.jsx",
        // navegação, permissão e guardas de rota
        "src/components/sidebar/Sidebar.jsx",
        "src/components/navbar/Navbar.jsx",
        "src/routes/AdminRoute.jsx",
        "src/routes/DoormanRoute.jsx",
        "src/contexts/PlanoContext.jsx",
        "src/utils/menuAdmin.js",
        "src/utils/perfis.js",
      ],
      exclude: ["**/*.test.{js,jsx}", "src/pages/adm/IndexAdminGeralLazy.jsx"],

      // Piso global no nível REAL medido hoje. Ele não finge que a suíte
      // está completa — trava a regressão do conjunto e sobe a cada tela
      // coberta. Número aspiracional aqui só faria o build nascer vermelho.
      thresholds: {
        statements: 22,
        branches: 65,
        functions: 34,
        lines: 22,

        // Onde já há teste, o piso é o nível atingido menos uma folga
        // pequena — cair daqui é regressão, não variação de medição.
        "src/utils/menuAdmin.js": { statements: 98, branches: 87, functions: 95 },
        "src/utils/perfis.js": { statements: 98, branches: 95, functions: 95 },
        "src/pages/porteiro/InicioDoorman.jsx": { statements: 98, branches: 95, functions: 95 },
        "src/pages/portaria/portariaHelpers.js": { statements: 98, branches: 95, functions: 95 },
        "src/components/sidebar/Sidebar.jsx": { statements: 81, branches: 55, functions: 45 },
        "src/pages/portaria/Portaria.jsx": { statements: 46, branches: 57, functions: 48 },
        "src/routes/AdminRoute.jsx": { statements: 98, branches: 95, functions: 95 },
        "src/routes/DoormanRoute.jsx": { statements: 98, branches: 95, functions: 95 },
        "src/contexts/PlanoContext.jsx": { statements: 98, branches: 95, functions: 95 },
        "src/pages/porteiro/Chaves.jsx": { statements: 53, branches: 59, functions: 17 },
        "src/pages/porteiro/UsuariosCondominio.jsx": { statements: 83, branches: 50, functions: 75 },
        "src/pages/porteiro/AtendimentoPortaria.jsx": { statements: 34, branches: 57, functions: 15 },
        "src/pages/usuario/MinhasReservas.jsx": { statements: 39, branches: 66, functions: 35 },
        "src/pages/adm/GerenciarEstruturas.jsx": { statements: 24, branches: 61, functions: 9 },
        "src/pages/adm/GerenciarFuncionarios.jsx": { statements: 37, branches: 66, functions: 23 },
        "src/pages/adm/GerenciarEntregas.jsx": { statements: 35, branches: 41, functions: 2 },
      },
    },
  },

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
      // O ia-service (Python): previsão de inadimplência e assistente do síndico.
      "/ia-api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ia-api/, ""),
      },
    },
  },
});
