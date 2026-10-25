import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Painel inicial da portaria.
 *
 * O que se testa aqui é o recorte por plano: oferecer um card que o condomínio
 * não contratou leva o porteiro a uma tela que não abre. E "Usuários do
 * Condomínio" precisa sobreviver a qualquer plano, senão o painel pode ficar
 * vazio.
 */

const TODOS = ["portaria", "entregas", "chaves", "areas_comuns", "veiculos"];
const BASICO = ["portaria", "veiculos", "chaves"];

let modulosAtivos = TODOS;

let usuario = { nome: "Carlos Silva", condominioId: "cond-a" };

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ usuario }),
}));

vi.mock("../../contexts/PlanoContext", () => ({
  usePlano: () => ({
    modulosAtivos,
    hasModulo: (slug) => modulosAtivos.includes(slug),
  }),
}));

let respostaCondominio = () =>
  Promise.resolve({ data: { condominio: { nome: "Edifício Teste" } } });

vi.mock("../../services/condominiosApi", () => ({
  condominiosApi: { buscar: (...a) => respostaCondominio(...a) },
}));

vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span data-testid="icone">{name}</span>,
}));

const { InicioDoorman } = await import("./InicioDoorman");

function montar() {
  return render(
    <MemoryRouter>
      <InicioDoorman />
    </MemoryRouter>,
  );
}

describe("InicioDoorman", () => {
  beforeEach(() => {
    modulosAtivos = TODOS;
    usuario = { nome: "Carlos Silva", condominioId: "cond-a" };
    respostaCondominio = () =>
      Promise.resolve({ data: { condominio: { nome: "Edifício Teste" } } });
  });

  it("saúda o porteiro pelo primeiro nome", () => {
    montar();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("com plano completo, mostra os seis cards de operação", () => {
    montar();
    for (const rotulo of [
      "Cadastros",
      "Controle de Acesso",
      "Controle de Entregas",
      "Controle de Chaves",
      "Espaços",
      "Usuários do Condomínio",
    ]) {
      expect(screen.getByText(rotulo), `faltou o card ${rotulo}`).toBeInTheDocument();
    }
  });

  it("esconde Entregas e Espaços no plano que não os inclui", () => {
    modulosAtivos = BASICO;
    montar();
    expect(screen.queryByText("Controle de Entregas")).not.toBeInTheDocument();
    expect(screen.queryByText("Espaços")).not.toBeInTheDocument();
  });

  it("mantém Chaves e Controle de Acesso no plano enxuto", () => {
    modulosAtivos = BASICO;
    montar();
    expect(screen.getByText("Controle de Chaves")).toBeInTheDocument();
    expect(screen.getByText("Controle de Acesso")).toBeInTheDocument();
  });

  it("Usuários do Condomínio não depende de plano: o painel nunca fica vazio", () => {
    modulosAtivos = [];
    montar();
    expect(screen.getByText("Usuários do Condomínio")).toBeInTheDocument();
  });

  it("não oferece gestão de veículos — saiu da portaria", () => {
    montar();
    expect(screen.queryByText("Veículos de Serviço")).not.toBeInTheDocument();
  });

  it("cada card aponta para a rota correspondente", () => {
    montar();
    const esperado = {
      Cadastros: "/atendimento",
      "Controle de Acesso": "/entradas-e-saidas",
      "Controle de Entregas": "/portaria/entregas",
      "Controle de Chaves": "/chaves",
      "Espaços": "/espacos",
      "Usuários do Condomínio": "/usuarios",
    };
    for (const [rotulo, rota] of Object.entries(esperado)) {
      const link = screen.getByText(rotulo).closest("a");
      expect(link, `${rotulo} deveria ser um link`).not.toBeNull();
      expect(link.getAttribute("href")).toBe(rota);
    }
  });

  it("usuário sem nome cai no rótulo genérico", () => {
    usuario = { condominioId: "cond-a" };
    montar();
    expect(screen.getByText("Porteiro")).toBeInTheDocument();
  });

  it("sem condomínio vinculado, não consulta o nome e mostra o rótulo padrão", () => {
    usuario = { nome: "Carlos Silva" };
    let chamou = false;
    respostaCondominio = () => {
      chamou = true;
      return Promise.resolve({ data: {} });
    };
    montar();
    expect(chamou, "não deveria consultar sem condominioId").toBe(false);
    // "Condomínio" sozinho também casa com o card de usuários; o que prova o
    // caminho é o nome buscado NÃO aparecer.
    expect(screen.queryByText(/Edifício Teste/)).not.toBeInTheDocument();
  });

  it("falha ao buscar o condomínio não derruba o painel", async () => {
    respostaCondominio = () => Promise.reject(new Error("rede"));
    montar();
    await Promise.resolve();
    expect(screen.getByText("Cadastros")).toBeInTheDocument();
  });

  it("resposta sem nome de condomínio não exibe 'undefined'", async () => {
    respostaCondominio = () => Promise.resolve({ data: { condominio: {} } });
    montar();
    await Promise.resolve();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
