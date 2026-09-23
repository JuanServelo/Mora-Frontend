# Mora — Frontend

Interface web do sistema de gestão condominial **Mora**. SPA em React 19 + Vite 8, falando com os
sete microsserviços do [Mora-Backend](../Mora-Backend/README.md).

Projeto acadêmico de Bacharelado em Sistemas de Informação — PUCPR.

---

## Como a tela decide o que mostrar

Três mecanismos se somam, e confundi-los é a origem mais comum de "sumiu um menu":

**1. Perfil** — `AppLayout` usa a **mesma barra lateral para todo perfil**, e é a `Sidebar` que
troca o conjunto de links conforme quem está logado. A `Navbar` continua no repositório, mas
nenhum arquivo a importa.

**2. Módulo contratado** — `ModulesContext` carrega os módulos do plano do condomínio, e
`utils/modulosPlano.js` mapeia módulo → rotas. Isso **não é só cosmético**: `ProtectedRoute` usa
`rotaLiberada()` como trava de navegação, então rota que não está no `MAPA_MODULOS` nem em
`ROTAS_LIVRES` fica inalcançável mesmo digitando a URL.

**3. Vínculo com unidade** — usuário sem `unidadeId` não tem o que operar. `isUsuarioRestrito()`
esvazia o menu, e a tela inicial explica que falta o vínculo em vez de oferecer atalhos que levam
a telas vazias.

---

## Estrutura

```
src/
  contexts/      Auth, Modules (plano), Notificacoes, Tema, Toast, Confirm
  layouts/       AppLayout — casca única, com a Sidebar
  components/    Sidebar, ícones, avatar, painéis reutilizáveis
  pages/
    inicio/      Tela inicial do morador e do porteiro
    adm/         Telas de gestão (/adm/*)
    usuario/     Avisos, cobranças, entregas, reclamações, reservas, perfil
    portaria/    Atendimento e movimentação
    porteiro/    Chaves, usuários do condomínio
  services/      Um client axios por serviço do backend
  routes/        Definição de rotas + ProtectedRoute
  utils/         perfis, modulosPlano, datas, notificações, avatar
  locales/       pt-BR e en
```

Cada serviço do backend tem **seu próprio client axios** — `comunicacaoApi`, `financeiroApi`,
`portariaApi`, `planApi`, `gestaoApi`, `userManagementApi`, `acessoApi`. São portas diferentes;
uma instância só obrigaria a montar URL absoluta em cada chamada.

---

## Temas

Tema claro, escuro ou o do sistema, trocado em Perfil → Aparência e guardado no navegador.

A implementação é por token CSS com `data-tema` no `<html>`. **Cor fixa não acompanha o tema:**
`bg-white/5` é branco nos dois modos e some no claro. Para borda e superfície translúcida existe
o token `veu`, que muda junto — `bg-veu/5`, `border-veu/5`.

Ao trazer tela de outra branch, é esse o detalhe que passa batido.

---

## Datas

`utils/datas.js` existe por um bug que reapareceu três vezes.

**Coluna `DATE` não pode atravessar `new Date()`.** `new Date("2026-09-01")` é lido como
meia-noite UTC; em UTC−3 isso vira 31/08 às 21h, e a tela mostra o dia anterior. Use
`formatarData()`, que recorta o ISO sem converter fuso.

**Instante com fuso é o caso oposto:** `criadoEm`, `lidoEm` e afins são momentos reais e **devem**
passar por `toLocaleString`, senão aparecem em UTC — três horas à frente, e o dia errado perto da
meia-noite.

---

## Como rodar

Requisitos: Node 20+, npm 10+, e o backend de pé.

```bash
npm install
npm run dev
```

Sobe em `http://localhost:5173`.

### Variáveis de ambiente

Todas com prefixo `VITE_`, num `.env` na raiz.

| Variável | Padrão | Serviço |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | auth-api |
| `VITE_GESTAO_API_URL` | `http://localhost:3002` | gestao-geral |
| `VITE_FINANCEIRO_API_URL` | `http://localhost:3004` | financeiro |
| `VITE_COMUNICACAO_API_URL` | ausente → proxy `/comunicacao-api` | comunicacao-service |

O `vite.config.js` faz proxy de `/portaria-api` para a 8090 e de `/comunicacao-api` para a 8094.
Definir `VITE_COMUNICACAO_API_URL` **desliga o proxy** para esse serviço — só faça isso apontando
para a porta certa, senão a tela fala com uma porta que não existe. Em produção, configure o mesmo
redirecionamento no reverse proxy.

### Comandos

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | ESLint |

---

## Stack

| | |
|---|---|
| React | 19 |
| Vite | 8 |
| Tailwind CSS | 4 — via `@tailwindcss/vite`, sem `tailwind.config` |
| React Router | 7 — roteador por objeto, não por JSX |
| Axios | 1.15 |
| i18next | 26 |

---

## Limitações conhecidas

- **Não há testes automatizados.** O backend tem suíte de contrato no `auth-api`; aqui não existe
  nada além de `lint` e `build`.
- **O lint acusa 38 erros** — `no-unused-vars`, `react-hooks/set-state-in-effect` e
  `react-hooks/refs`. São anteriores à integração das branches e ainda não foram tratados.
- **O bundle passa de 1,5 MB** sem code splitting.
- **`GerenciarEntregas` filtra o destinatário por `u.bloco && u.apartamento`**, colunas que já não
  existem em `users` — na prática, registrar entrega por essa tela é impossível.
