import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Controle de Chaves — tela do porteiro.
 *
 * Esta tela já teve um defeito que apagava o histórico: o filtro de data
 * nascia em "hoje a hoje" e tudo que havia sido devolvido sumia no dia
 * seguinte. Por isso os testes cobrem o carregamento, o estado vazio e a
 * mudança de aba, que é onde esse tipo de erro se manifesta.
 */

const toastErro = vi.fn();
const toastSucesso = vi.fn();

let chaves = [];
let falharListagem = false;

const chaveApi = {
  listar: vi.fn(() =>
    falharListagem
      ? Promise.reject(new Error("rede"))
      : Promise.resolve({ data: chaves })),
  listarLocais: vi.fn(() => Promise.resolve({ data: ["Portaria", "Zeladoria"] })),
  cadastrar: vi.fn(() => Promise.resolve({ data: {} })),
  deletar: vi.fn(() => Promise.resolve({ data: {} })),
  retirar: vi.fn(() => Promise.resolve({ data: {} })),
  devolver: vi.fn(() => Promise.resolve({ data: {} })),
  historico: vi.fn(() => Promise.resolve({ data: [] })),
};

const atendimentoApi = { buscar: vi.fn(() => Promise.resolve({ data: [] })) };
const acessoApi = {
  listarUsuariosCondominio: vi.fn(() => Promise.resolve({ data: { usuarios: [] } })),
};

vi.mock("../../services/portariaApi", () => ({ chaveApi, atendimentoApi }));
vi.mock("../../services/acessoApi", () => ({ acessoApi }));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: toastSucesso }),
}));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));

const { Chaves } = await import("./Chaves");

// Campos conforme o ChaveResponseDTO do portaria-service.
const CHAVE = {
  id: "ch-1",
  nomeChave: "Salão de Festas",
  localNome: "Portaria",
  disponivel: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  chaves = [CHAVE];
  falharListagem = false;
});

describe("Chaves — carregamento", () => {
  it("busca as chaves ao abrir", async () => {
    render(<Chaves />);
    await waitFor(() => expect(chaveApi.listar).toHaveBeenCalled());
  });

  it("mostra a chave carregada", async () => {
    render(<Chaves />);
    expect(await screen.findByText("Salão de Festas")).toBeInTheDocument();
  });

  it("sem chaves, explica o vazio em vez de deixar a tela em branco", async () => {
    chaves = [];
    render(<Chaves />);
    expect(await screen.findByText(/Nenhuma chave cadastrada/i)).toBeInTheDocument();
  });

  it("falha na listagem avisa pelo toast", async () => {
    falharListagem = true;
    render(<Chaves />);
    await waitFor(() =>
      expect(toastErro).toHaveBeenCalledWith("Não foi possível carregar as chaves."));
  });

  it("enquanto carrega, mostra o indicador", () => {
    render(<Chaves />);
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });
});

describe("Chaves — contadores", () => {
  it("conta total, disponíveis e retiradas", async () => {
    chaves = [
      { ...CHAVE, id: "a", disponivel: true },
      { ...CHAVE, id: "b", nomeChave: "Academia", disponivel: true },
      { ...CHAVE, id: "c", nomeChave: "Piscina", disponivel: false,
        possuidorNome: "Carlos", possuidorPerfil: "PORTEIRO" },
    ];
    render(<Chaves />);
    await screen.findByText("Academia");

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Disponíveis")).toBeInTheDocument();
    expect(screen.getByText("Retiradas")).toBeInTheDocument();
  });
});

describe("Chaves — abas", () => {
  it("abre na aba de cadastro", async () => {
    render(<Chaves />);
    await screen.findByText("Salão de Festas");
    expect(screen.getByRole("button", { name: /Cadastro de Chaves/i })).toBeInTheDocument();
  });

  it("alterna para o histórico e pede que se escolha uma chave", async () => {
    render(<Chaves />);
    await screen.findByText("Salão de Festas");
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));
    expect(await screen.findByText(/Selecione uma chave acima/i)).toBeInTheDocument();
  });

  it("o histórico não começa filtrado por hoje — era isso que escondia as devoluções", async () => {
    const { container } = render(<Chaves />);
    await screen.findByText("Salão de Festas");
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));

    // Os filtros só aparecem depois de escolher a chave.
    const seletor = container.querySelector("select");
    await userEvent.selectOptions(seletor, "ch-1");

    const datas = container.querySelectorAll('input[type="date"]');
    expect(datas.length).toBeGreaterThan(0);
    // A data inicial precisa nascer VAZIA. Começar em "hoje" fazia toda
    // devolução anterior sumir do histórico no dia seguinte.
    expect(datas[0].value).toBe("");
  });

  it("selecionar a chave dispara a consulta do histórico dela", async () => {
    const { container } = render(<Chaves />);
    await screen.findByText("Salão de Festas");
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));

    await userEvent.selectOptions(container.querySelector("select"), "ch-1");
    await waitFor(() => expect(chaveApi.historico).toHaveBeenCalled());
  });

  it("volta do histórico para o cadastro", async () => {
    render(<Chaves />);
    await screen.findByText("Salão de Festas");
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cadastro de Chaves/i }));
    expect(await screen.findByText("Salão de Festas")).toBeInTheDocument();
  });
});
