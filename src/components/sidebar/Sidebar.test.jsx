import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PERFIS } from "../../utils/perfis";

/**
 * A barra lateral é a navegação de porteiro e síndico — os dois perfis que o
 * pedido nomeia. Ela já perdeu entradas em merge (Espaços no porteiro,
 * Reservas no síndico), deixando telas prontas e inalcançáveis; é isso que
 * estes testes guardam.
 */

const TODOS = ["portaria", "entregas", "chaves", "areas_comuns", "veiculos",
               "reunioes", "reclamacoes", "conhecimento", "comunicacao", "financeiro"];
const BASICO = ["portaria", "veiculos", "chaves"];

let usuario = { nome: "Carlos", perfil: PERFIS.PORTEIRO, condominioId: "cond-a" };
let modulosAtivos = TODOS;

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ usuario, logout: vi.fn() }),
}));

vi.mock("../../contexts/PlanoContext", () => ({
  usePlano: () => ({
    modulosAtivos,
    hasModulo: (slug) => modulosAtivos.includes(slug),
  }),
}));

vi.mock("../../contexts/NotificacoesContext", () => ({
  useNotificacoes: () => ({ naoLidas: 0, conversasNaoLidas: 0 }),
}));

vi.mock("../icones/Icone", () => ({
  Icone: ({ name }) => <span>{name}</span>,
}));

vi.mock("../avatar/FotoUsuario", () => ({
  FotoUsuario: () => <span />,
}));

const { Sidebar } = await import("./Sidebar");

const montar = () =>
  render(
    <MemoryRouter>
      <Sidebar aberta aoFechar={() => {}} />
    </MemoryRouter>,
  );

const temLink = (rotulo) => screen.queryByText(rotulo) !== null;

describe("Sidebar — porteiro", () => {
  beforeEach(() => {
    usuario = { nome: "Carlos", perfil: PERFIS.PORTEIRO, condominioId: "cond-a" };
    modulosAtivos = TODOS;
  });

  it("mostra as telas da portaria", () => {
    montar();
    for (const r of ["Início", "Cadastros", "Entradas e Saídas", "Entregas",
                     "Chaves", "Usuários do Condomínio"]) {
      expect(temLink(r), `faltou ${r}`).toBe(true);
    }
  });

  it("inclui Espaços — o porteiro consulta a agenda no balcão", () => {
    montar();
    expect(temLink("Espaços")).toBe(true);
  });

  it("identifica o painel como Portaria", () => {
    montar();
    expect(screen.getByText("Portaria")).toBeInTheDocument();
  });

  it("esconde o que o plano não inclui", () => {
    modulosAtivos = BASICO;
    montar();
    expect(temLink("Espaços")).toBe(false);
    expect(temLink("Entregas")).toBe(false);
  });

  it("Início e Usuários sobrevivem a qualquer plano", () => {
    modulosAtivos = [];
    montar();
    expect(temLink("Início")).toBe(true);
    expect(temLink("Usuários do Condomínio")).toBe(true);
  });

  it("não recebe telas administrativas", () => {
    montar();
    expect(temLink("Estruturas")).toBe(false);
    expect(temLink("Funcionários")).toBe(false);
  });
});

describe("Sidebar — síndico", () => {
  beforeEach(() => {
    usuario = { nome: "Ana", perfil: PERFIS.ADMIN_SINDICO, condominioId: "cond-a" };
    modulosAtivos = TODOS;
  });

  it("mostra as telas administrativas do condomínio", () => {
    montar();
    for (const r of ["Usuários", "Estruturas", "Funcionários"]) {
      expect(temLink(r), `faltou ${r}`).toBe(true);
    }
  });

  it("inclui Reservas, que leva à fila de aprovação", () => {
    montar();
    expect(temLink("Reservas")).toBe(true);
  });

  it("identifica o painel como Administrativo", () => {
    montar();
    expect(screen.getByText("Administrativo")).toBeInTheDocument();
  });

  it("não recebe os links de operação do porteiro", () => {
    montar();
    expect(temLink("Entradas e Saídas")).toBe(false);
    expect(temLink("Cadastros")).toBe(false);
  });

  it("perde Reservas quando o plano não tem áreas comuns", () => {
    modulosAtivos = BASICO;
    montar();
    expect(temLink("Reservas")).toBe(false);
  });
});

describe("Sidebar — admin geral", () => {
  beforeEach(() => {
    usuario = { nome: "Root", perfil: PERFIS.ADMIN_GERAL, condominioId: "default" };
    modulosAtivos = null;
  });

  it("identifica o painel como Plataforma", () => {
    montar();
    expect(screen.getByText("Plataforma")).toBeInTheDocument();
  });

  it("mostra as telas de plataforma", () => {
    montar();
    expect(temLink("Clientes")).toBe(true);
    expect(temLink("Planos")).toBe(true);
  });
});
