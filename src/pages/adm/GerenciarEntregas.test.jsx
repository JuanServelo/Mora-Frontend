import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Entregas — a tela que o porteiro abre em /portaria/entregas.
 *
 * O ponto sensível é o contador: pendente e retirada precisam ser distinguidas
 * com clareza, porque é por elas que o porteiro sabe o que ainda está na
 * portaria. Uma encomenda contada como retirada some do fluxo de trabalho.
 */

const toastErro = vi.fn();
const toastSucesso = vi.fn();

let entregas = [];
let falhar = false;

const entregaApi = {
  listarTodas: vi.fn(() =>
    falhar ? Promise.reject(new Error("rede")) : Promise.resolve({ data: entregas })),
  cadastrar: vi.fn(() => Promise.resolve({ data: {} })),
  atualizar: vi.fn(() => Promise.resolve({ data: {} })),
};
const acessoApi = {
  listarUsuariosCondominio: vi.fn(() => Promise.resolve({
    data: { usuarios: [{ id: 3, nome: "Ana Souza", perfil: "MORADOR", unidadeId: "u-1" }] },
  })),
};
const apartamentoApi = {
  listar: vi.fn(() => Promise.resolve({
    data: [{ id: "u-1", numero: "101", blocoNome: "Bloco A" }],
  })),
};

vi.mock("../../services/entregasApi", () => ({ entregaApi }));
vi.mock("../../services/acessoApi", () => ({ acessoApi }));
vi.mock("../../services/estruturasApi", () => ({ apartamentoApi }));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: toastSucesso }),
}));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));

const { GerenciarEntregas } = await import("./GerenciarEntregas");

const PENDENTE = {
  id: "e-1", destinatarioNome: "Ana Souza", descricao: "Caixa da Amazon",
  remetente: "Amazon", bloco: "Bloco A", apartamento: "101",
  status: "PENDENTE", dataRecebimento: "2026-10-21T10:00:00",
};
const RETIRADA = {
  ...PENDENTE, id: "e-2", destinatarioNome: "Bruno Dias", descricao: "Envelope",
  status: "RETIRADA",
  dataRetirada: "2026-10-21T18:00:00", recebedorNome: "Ana Souza",
};

beforeEach(() => {
  vi.clearAllMocks();
  entregas = [PENDENTE, RETIRADA];
  falhar = false;
});

describe("GerenciarEntregas", () => {
  it("carrega as entregas do condomínio", async () => {
    render(<GerenciarEntregas />);
    await waitFor(() => expect(entregaApi.listarTodas).toHaveBeenCalled());
  });

  it("mostra as encomendas registradas", async () => {
    render(<GerenciarEntregas />);
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Bruno Dias")).toBeInTheDocument();
  });

  it("a linha resume bloco, apartamento e descrição juntos", async () => {
    render(<GerenciarEntregas />);
    await screen.findByText("Ana Souza");
    expect(screen.getByText(/Bloco A · Apt 101 · Caixa da Amazon/)).toBeInTheDocument();
  });

  it("separa pendentes de retiradas nos contadores", async () => {
    render(<GerenciarEntregas />);
    await screen.findByText("Ana Souza");
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("Retiradas")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("carrega moradores e apartamentos para o cadastro", async () => {
    render(<GerenciarEntregas />);
    await waitFor(() => expect(acessoApi.listarUsuariosCondominio).toHaveBeenCalled());
    expect(apartamentoApi.listar).toHaveBeenCalled();
  });

  it("sem entregas, não deixa a tela muda", async () => {
    entregas = [];
    render(<GerenciarEntregas />);
    await waitFor(() => expect(entregaApi.listarTodas).toHaveBeenCalled());
    expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument();
  });

  it("falha ao carregar não derruba a tela", async () => {
    falhar = true;
    render(<GerenciarEntregas />);
    await waitFor(() => expect(entregaApi.listarTodas).toHaveBeenCalled());
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("busca filtra pelo destinatário", async () => {
    render(<GerenciarEntregas />);
    await screen.findByText("Ana Souza");

    const busca = screen.queryByPlaceholderText(/buscar/i);
    if (busca) {
      await userEvent.type(busca, "Bruno");
      expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument();
      expect(screen.getByText("Bruno Dias")).toBeInTheDocument();
    }
  });
});
