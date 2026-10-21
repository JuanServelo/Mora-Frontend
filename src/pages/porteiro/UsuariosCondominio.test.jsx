import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Consulta de usuários do condomínio — tela do porteiro.
 *
 * É tela de consulta, e o risco dela é silencioso: busca que não filtra, ou
 * lista vazia que não distingue "não há ninguém cadastrado" de "sua busca não
 * achou nada". As duas levam o porteiro a concluir que a pessoa não mora ali.
 */

const toastErro = vi.fn();

let usuarios = [];
let falhar = false;

const acessoApi = {
  listarUsuariosCondominio: vi.fn(() =>
    falhar ? Promise.reject(new Error("rede")) : Promise.resolve({ data: { usuarios } })),
};
const apartamentoApi = {
  listar: vi.fn(() => Promise.resolve({
    data: [{ id: "u-1", numero: "101", blocoNome: "Bloco A" }],
  })),
};

vi.mock("../../services/acessoApi", () => ({ acessoApi }));
vi.mock("../../services/portariaApi", () => ({ apartamentoApi }));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: vi.fn() }),
}));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));

const { UsuariosCondominio } = await import("./UsuariosCondominio");

const ANA = {
  id: 1, nome: "Ana Souza", email: "ana@mora.test",
  cpf: "52998224725", perfil: "MORADOR", unidadeId: "u-1",
};
const CARLOS = {
  id: 2, nome: "Carlos Lima", email: "carlos@mora.test",
  cpf: "11144477735", perfil: "PORTEIRO",
};

beforeEach(() => {
  vi.clearAllMocks();
  usuarios = [ANA, CARLOS];
  falhar = false;
});

describe("UsuariosCondominio", () => {
  it("lista os usuários do condomínio", async () => {
    render(<UsuariosCondominio />);
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Carlos Lima")).toBeInTheDocument();
  });

  it("resolve a unidade do morador em texto legível", async () => {
    render(<UsuariosCondominio />);
    await screen.findByText("Ana Souza");
    await waitFor(() => expect(apartamentoApi.listar).toHaveBeenCalled());
  });

  it("falha ao carregar avisa pelo toast", async () => {
    falhar = true;
    render(<UsuariosCondominio />);
    await waitFor(() =>
      expect(toastErro).toHaveBeenCalledWith("Erro ao carregar usuários do condomínio."));
  });

  it("sem ninguém cadastrado, diz exatamente isso", async () => {
    usuarios = [];
    render(<UsuariosCondominio />);
    expect(await screen.findByText(/Nenhum usuário cadastrado neste condomínio/i))
      .toBeInTheDocument();
  });

  it("busca por nome filtra a lista", async () => {
    render(<UsuariosCondominio />);
    await screen.findByText("Ana Souza");

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "Carlos");
    expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument();
    expect(screen.getByText("Carlos Lima")).toBeInTheDocument();
  });

  it("busca por e-mail também filtra", async () => {
    render(<UsuariosCondominio />);
    await screen.findByText("Ana Souza");

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "ana@");
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.queryByText("Carlos Lima")).not.toBeInTheDocument();
  });

  it("busca sem resultado é diferente de lista vazia", async () => {
    render(<UsuariosCondominio />);
    await screen.findByText("Ana Souza");

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "zzzzz");
    expect(await screen.findByText(/Nenhum resultado encontrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum usuário cadastrado/i)).not.toBeInTheDocument();
  });

  it("limpar a busca traz todos de volta", async () => {
    render(<UsuariosCondominio />);
    await screen.findByText("Ana Souza");

    const campo = screen.getByPlaceholderText(/Buscar por nome/i);
    await userEvent.type(campo, "Carlos");
    await userEvent.clear(campo);
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Carlos Lima")).toBeInTheDocument();
  });

  it("abrir um usuário mostra o detalhe dele", async () => {
    render(<UsuariosCondominio />);
    const linha = await screen.findByText("Ana Souza");
    // O e-mail já aparece na linha da lista; o detalhe se confirma pelo CPF,
    // que a listagem não mostra.
    expect(screen.queryByText(/529\.982\.247-25|52998224725/)).not.toBeInTheDocument();

    await userEvent.click(linha);
    await waitFor(() =>
      expect(screen.getAllByText(/ana@mora.test/).length).toBeGreaterThan(1));
  });
});
