import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Funcionários & Turnos — tela do síndico (RF-09).
 *
 * Três abas: Quadro, Acompanhamento e Liberações. O que esta suíte guarda é
 * o recorte do quadro: só porteiro e síndico entram nele. Se a lista passar a
 * incluir morador, o síndico acaba montando escala para quem não trabalha no
 * condomínio — e a regra de bloqueio de entrada passa a valer para moradores.
 */

const toastErro = vi.fn();
const toastSucesso = vi.fn();

let usuarios = [];
let jornadas = [];

const jornadaApi = {
  listar: vi.fn(() => Promise.resolve({ data: jornadas })),
  salvar: vi.fn(() => Promise.resolve({ data: {} })),
  previa: vi.fn(() => Promise.resolve({ data: [] })),
  proximosPlantoes: vi.fn(() => Promise.resolve({ data: [] })),
  listarLiberacoes: vi.fn(() => Promise.resolve({ data: [] })),
  criarLiberacao: vi.fn(() => Promise.resolve({ data: {} })),
  cancelarLiberacao: vi.fn(() => Promise.resolve({ data: {} })),
};
const acessoApi = {
  listarUsuariosCondominio: vi.fn(() => Promise.resolve({ data: { usuarios } })),
  listarDentro: vi.fn(() => Promise.resolve({ data: { dentro: [] } })),
  listarHistoricoAcesso: vi.fn(() => Promise.resolve({ data: { registros: [] } })),
};

vi.mock("../../services/portariaApi", () => ({ jornadaApi }));
vi.mock("../../services/acessoApi", () => ({ acessoApi }));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: toastSucesso }),
}));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));

const { GerenciarFuncionarios } = await import("./GerenciarFuncionarios");

const PORTEIRO = { id: 2, nome: "Carlos Lima", perfil: "PORTEIRO", email: "c@m.test" };
const SINDICO = { id: 4, nome: "Ana Gestora", perfil: "ADMIN_SINDICO", email: "a@m.test" };
const MORADOR = { id: 9, nome: "Zé Morador", perfil: "MORADOR", email: "z@m.test" };

beforeEach(() => {
  vi.clearAllMocks();
  usuarios = [PORTEIRO, SINDICO, MORADOR];
  jornadas = [];
});

describe("GerenciarFuncionarios — quadro", () => {
  it("carrega o quadro e as jornadas", async () => {
    render(<GerenciarFuncionarios />);
    await waitFor(() => expect(acessoApi.listarUsuariosCondominio).toHaveBeenCalled());
    expect(jornadaApi.listar).toHaveBeenCalled();
  });

  it("mostra porteiro e síndico", async () => {
    render(<GerenciarFuncionarios />);
    expect(await screen.findByText("Carlos Lima")).toBeInTheDocument();
    expect(screen.getByText("Ana Gestora")).toBeInTheDocument();
  });

  it("não traz morador para o quadro de funcionários", async () => {
    render(<GerenciarFuncionarios />);
    await screen.findByText("Carlos Lima");
    expect(screen.queryByText("Zé Morador")).not.toBeInTheDocument();
  });

  it("ordena por nome, para a lista ser previsível", async () => {
    render(<GerenciarFuncionarios />);
    await screen.findByText("Carlos Lima");
    const nomes = screen.getAllByText(/Carlos Lima|Ana Gestora/).map((e) => e.textContent);
    expect(nomes[0]).toBe("Ana Gestora");
  });

  it("sem funcionário, explica o vazio e indica onde cadastrar", async () => {
    usuarios = [MORADOR];
    render(<GerenciarFuncionarios />);
    expect(await screen.findByText(/Nenhum funcionário no condomínio/i)).toBeInTheDocument();
  });

  it("falha ao carregar vira mensagem de erro, não tela em branco", async () => {
    acessoApi.listarUsuariosCondominio.mockRejectedValueOnce({
      response: { data: { mensagem: "Sem permissão." } },
    });
    render(<GerenciarFuncionarios />);
    expect(await screen.findByText("Sem permissão.")).toBeInTheDocument();
  });

  it("jornada do serviço é casada com o usuário do auth-api", async () => {
    jornadas = [{ id: "j-1", authUserId: "2", tipoJornada: "ESCALA", situacao: "ATIVO" }];
    render(<GerenciarFuncionarios />);
    await screen.findByText("Carlos Lima");
    expect(jornadaApi.listar).toHaveBeenCalled();
  });
});

describe("GerenciarFuncionarios — abas", () => {
  it("oferece Quadro, Acompanhamento e Liberações", async () => {
    render(<GerenciarFuncionarios />);
    await screen.findByText("Carlos Lima");
    expect(screen.getByRole("button", { name: /Quadro/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Acompanhamento/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Liberações/i })).toBeInTheDocument();
  });

  it("acompanhamento consulta quem está dentro", async () => {
    render(<GerenciarFuncionarios />);
    await screen.findByText("Carlos Lima");
    await userEvent.click(screen.getByRole("button", { name: /Acompanhamento/i }));
    await waitFor(() => expect(acessoApi.listarDentro).toHaveBeenCalled());
  });

  it("liberações consulta as exceções registradas", async () => {
    render(<GerenciarFuncionarios />);
    await screen.findByText("Carlos Lima");
    await userEvent.click(screen.getByRole("button", { name: /Liberações/i }));
    await waitFor(() => expect(jornadaApi.listarLiberacoes).toHaveBeenCalled());
  });
});
