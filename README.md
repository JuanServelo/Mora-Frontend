# Mora — Frontend

Interface web do sistema de gestão condominial **Mora**, desenvolvida com React e Vite.

---

## Sobre o projeto

O frontend do Mora é uma SPA (Single Page Application) que oferece painéis distintos para moradores e administradores do condomínio. Funcionalidades principais:

- Autenticação com e-mail/senha e Google OAuth
- Painel do morador: perfil, reclamações, reservas de áreas comuns, reuniões
- Painel administrativo: gestão de blocos, apartamentos, vagas, entregas e moradores
- Internacionalização (pt-BR / en)

---

## Tecnologias

| Tecnologia | Versão |
|---|---|
| React | 19 |
| Vite | 8 |
| Tailwind CSS | 4 |
| React Router DOM | 7 |
| Axios | 1.15 |
| i18next | 26 |

---

## Pré-requisitos

- **Node.js** 20 ou superior
- **npm** 10 ou superior
- Backend em execução (ver [Mora-Backend](../Mora-Backend/README.md))

---

## Configuração

Crie um arquivo `.env` na raiz do projeto com base no exemplo abaixo:

```env
VITE_API_URL=http://localhost:3001
```

> A variável `VITE_API_URL` aponta para a Auth API. O Portaria Service é acessado via proxy do Vite (configurado em `vite.config.js`) na rota `/portaria-api → http://localhost:8090`.

---

## Como executar

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em **http://localhost:5173**.

### Produção

```bash
# Gerar build otimizado
npm run build

# Pré-visualizar o build localmente
npm run preview
```

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com HMR |
| `npm run build` | Gera o build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |
| `npm run lint` | Executa o ESLint no código-fonte |

---

## Estrutura de diretórios

```
Mora-Frontend/
├── public/                  # Arquivos estáticos públicos
└── src/
    ├── assets/              # Imagens e recursos estáticos
    ├── components/          # Componentes reutilizáveis
    │   ├── botoes/
    │   ├── campos/
    │   ├── cards/
    │   ├── icones/
    │   └── navbar/
    ├── contexts/            # Contextos React (AuthContext)
    ├── layouts/             # Layouts de página
    ├── locales/             # Traduções (pt-BR, en)
    ├── pages/               # Páginas da aplicação
    │   ├── adm/             # Painel administrativo
    │   ├── auth/            # Login e registro
    │   ├── comodidades/     # Reservas de áreas comuns
    │   ├── inicio/          # Home
    │   ├── servicos/        # Serviços do condomínio
    │   └── usuario/         # Perfil do morador
    ├── routes/              # Configuração de rotas e rotas protegidas
    └── services/            # Clientes HTTP (Axios)
        ├── api.js           # Auth API (VITE_API_URL)
        ├── entregasApi.js   # Entregas (Portaria Service)
        ├── estruturasApi.js # Blocos, apartamentos e vagas
        ├── meetingApi.js    # Reuniões
        ├── portariaApi.js   # Portaria geral
        └── reclamacoesApi.js
```

---

## Proxy de desenvolvimento

O Vite está configurado para redirecionar chamadas ao Portaria Service sem expor a URL do backend diretamente:

```
/portaria-api/* → http://localhost:8090/*
```

Esse proxy é ativado apenas no ambiente de desenvolvimento (`npm run dev`). Em produção, configure um reverse proxy (Nginx, etc.) com a mesma regra.

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | URL base da Auth API |

> Todas as variáveis expostas ao browser devem ter prefixo `VITE_`.
