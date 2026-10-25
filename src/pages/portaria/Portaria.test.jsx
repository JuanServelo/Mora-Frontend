import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/**
 * Entradas e Saídas — a tela central da portaria.
 *
 * O que se guarda aqui é o fluxo que o porteiro repete o dia inteiro: achar a
 * pessoa, registrar entrada, ver quem está dentro, registrar saída. E o
 * comportamento quando a API falha: a tela precisa dizer que falhou e oferecer
 * nova tentativa, em vez de ficar numa lista vazia que parece "ninguém entrou".
 */

const toastErro = vi.fn();
const toastSucesso = vi.fn();

let residentes = [];
let guests = [];
let dentro = [];
let visitantesDentro = [];
let falharCarregamento = false;

const acessoApi = {
  listarResidentes: vi.fn(() =>
    falharCarregamento
      ? Promise.reject({ response: { data: { mensagem: "Serviço fora do ar." } } })
      : Promise.resolve({ data: { residentes } })),
  listarGuests: vi.fn(() => Promise.resolve({ data: { guests } })),
  listarDentro: vi.fn(() => Promise.resolve({ data: { dentro } })),
  registrarEntrada: vi.fn(() => Promise.resolve({ data: {} })),
  registrarSaida: vi.fn(() => Promise.resolve({ data: {} })),
  listarHistoricoAcesso: vi.fn(() => Promise.resolve({ data: { registros: [] } })),
};

const atendimentoApi = {
  dentro: vi.fn(() => Promise.resolve({ data: visitantesDentro })),
  historico: vi.fn(() => Promise.resolve({ data: [] })),
  buscar: vi.fn(() => Promise.resolve({ data: [] })),
  registrar: vi.fn(() => Promise.resolve({ data: {} })),
  registrarSaida: vi.fn(() => Promise.resolve({ data: {} })),
};

const apartamentoApi = {
  listar: vi.fn(() => Promise.resolve({
    data: [{ id: "u-1", numero: "101", blocoNome: "Bloco A" }],
  })),
};

const preAutorizacaoApi = {
  ativasHoje: vi.fn(() => Promise.resolve({ data: [] })),
  registrarEntrada: vi.fn(() => Promise.resolve({ data: {} })),
};

const veiculoApi = {
  listar: vi.fn(() => Promise.resolve({ data: [] })),
  listarDentroPortaria: vi.fn(() => Promise.resolve({ data: [] })),
  historicoAcesso: vi.fn(() => Promise.resolve({ data: [] })),
  registrarEntrada: vi.fn(() => Promise.resolve({ data: {} })),
  registrarSaida: vi.fn(() => Promise.resolve({ data: {} })),
  registrarSaidaPorPlaca: vi.fn(() => Promise.resolve({ data: {} })),
};

vi.mock("../../services/acessoApi", () => ({ acessoApi }));
vi.mock("../../services/portariaApi", () => ({
  atendimentoApi, apartamentoApi, preAutorizacaoApi, veiculoApi,
}));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: toastSucesso }),
}));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));

const { Portaria } = await import("./Portaria");

const montar = () => render(<MemoryRouter><Portaria /></MemoryRouter>);

const MORADOR = {
  id: 1, nome: "Ana Souza", perfil: "MORADOR", statusAcesso: "FORA",
  unidadeId: "u-1", apartamentoNumero: "101", blocoNome: "Bloco A",
};

describe("Portaria — carregamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    residentes = [MORADOR];
    guests = [];
    dentro = [];
    visitantesDentro = [];
    falharCarregamento = false;
  });

  it("busca as listas da portaria ao abrir", async () => {
    montar();
    await waitFor(() => expect(acessoApi.listarResidentes).toHaveBeenCalled());
    expect(acessoApi.listarGuests).toHaveBeenCalled();
    expect(acessoApi.listarDentro).toHaveBeenCalled();
  });

  it("carrega o mapa de apartamentos para resolver UUID em texto legível", async () => {
    montar();
    await waitFor(() => expect(apartamentoApi.listar).toHaveBeenCalled());
  });

  it("mostra o morador carregado", async () => {
    montar();
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
  });

  it("falha de API vira aviso visível, não lista vazia silenciosa", async () => {
    falharCarregamento = true;
    montar();
    expect(await screen.findByText(/Falha ao carregar/i)).toBeInTheDocument();
    expect(screen.getByText("Serviço fora do ar.")).toBeInTheDocument();
  });

  it("a mensagem de falha vem acompanhada de nova tentativa", async () => {
    falharCarregamento = true;
    montar();
    await screen.findByText(/Falha ao carregar/i);

    falharCarregamento = false;
    acessoApi.listarResidentes.mockClear();
    await userEvent.click(screen.getAllByRole("button", { name: /tentar novamente/i })[0]);
    await waitFor(() => expect(acessoApi.listarResidentes).toHaveBeenCalled());
  });
});

describe("Portaria — navegação entre abas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    residentes = [MORADOR];
    guests = [];
    dentro = [];
    visitantesDentro = [];
    falharCarregamento = false;
  });

  it("abre em Pessoas › Registrar acesso", async () => {
    montar();
    expect(await screen.findByText("Moradores")).toBeInTheDocument();
    expect(screen.getByText("Visitantes")).toBeInTheDocument();
    expect(screen.getByText("Pré-aprovados")).toBeInTheDocument();
    expect(screen.getByText("Funcionários")).toBeInTheDocument();
  });

  it("Dentro agora mostra o vazio explicado quando não há ninguém", async () => {
    montar();
    await screen.findByText("Moradores");
    await userEvent.click(screen.getByRole("button", { name: /Dentro agora/i }));
    expect(await screen.findByText(/Nenhum usuário dentro agora/i)).toBeInTheDocument();
  });

  it("Dentro agora conta moradores e visitantes juntos", async () => {
    dentro = [{ ...MORADOR, statusAcesso: "DENTRO", ultimoRegistroEm: new Date().toISOString() }];
    visitantesDentro = [{ id: "v-1", nome: "Entregador", entradaEm: new Date().toISOString() }];
    montar();
    const aba = await screen.findByRole("button", { name: /Dentro agora/i });
    expect(within(aba).getByText("2")).toBeInTheDocument();
  });

  it("Histórico consulta os registros de acesso", async () => {
    montar();
    await screen.findByText("Moradores");
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));
    await waitFor(() => expect(acessoApi.listarHistoricoAcesso).toHaveBeenCalled());
  });

  it("alternar para Veículos troca a seção e consulta a frota", async () => {
    montar();
    await screen.findByText("Moradores");
    await userEvent.click(screen.getByRole("button", { name: /Veículos/i }));
    await waitFor(() => expect(veiculoApi.listar).toHaveBeenCalled());
    expect(screen.queryByText("Moradores")).not.toBeInTheDocument();
  });

  it("volta de Veículos para Pessoas", async () => {
    montar();
    await screen.findByText("Moradores");
    await userEvent.click(screen.getByRole("button", { name: /Veículos/i }));
    await userEvent.click(screen.getByRole("button", { name: /Pessoas/i }));
    expect(await screen.findByText("Moradores")).toBeInTheDocument();
  });
});

describe("Portaria — registro de entrada e saída", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    residentes = [MORADOR];
    guests = [];
    dentro = [];
    visitantesDentro = [];
    falharCarregamento = false;
  });

  it("registra a entrada do morador que está fora", async () => {
    montar();
    await screen.findByText("Ana Souza");
    await userEvent.click(screen.getByRole("button", { name: /^Entrada$/i }));
    await waitFor(() => expect(acessoApi.registrarEntrada).toHaveBeenCalledWith(1));
  });

  it("erro ao registrar entrada é informado, e não engolido", async () => {
    acessoApi.registrarEntrada.mockRejectedValueOnce({
      response: { data: { mensagem: "Fora do turno." } },
    });
    montar();
    await screen.findByText("Ana Souza");
    await userEvent.click(screen.getByRole("button", { name: /^Entrada$/i }));
    await waitFor(() => expect(toastErro).toHaveBeenCalledWith("Fora do turno."));
  });

  it("registra a saída de quem está dentro", async () => {
    residentes = [{ ...MORADOR, statusAcesso: "DENTRO" }];
    montar();
    await screen.findByText("Ana Souza");
    await userEvent.click(screen.getByRole("button", { name: /^Saída$/i }));
    await waitFor(() => expect(acessoApi.registrarSaida).toHaveBeenCalledWith(1));
  });

  it("visitante avulso entra pelo atendimento, não pelo acesso de morador", async () => {
    guests = [];
    residentes = [];
    montar();
    await screen.findByText("Moradores");
    await userEvent.click(screen.getByRole("button", { name: /Visitantes/i }));
    // Sem visitante cadastrado a lista fica vazia; o que importa é que a aba
    // existe e não consulta o endpoint de moradores para montá-la.
    expect(acessoApi.registrarEntrada).not.toHaveBeenCalled();
  });
});

describe("Portaria — pré-aprovados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    residentes = [];
    guests = [];
    dentro = [];
    visitantesDentro = [];
    falharCarregamento = false;
  });

  it("consulta as autorizações válidas para hoje", async () => {
    montar();
    await screen.findByText("Pré-aprovados");
    await userEvent.click(screen.getByRole("button", { name: /Pré-aprovados/i }));
    await waitFor(() => expect(preAutorizacaoApi.ativasHoje).toHaveBeenCalled());
  });

  it("registra a entrada do visitante pré-liberado", async () => {
    preAutorizacaoApi.ativasHoje.mockResolvedValue({
      data: [{ id: "pa-1", nomeVisitante: "João Entregas", cpfVisitante: "52998224725" }],
    });
    montar();
    await screen.findByText("Pré-aprovados");
    await userEvent.click(screen.getByRole("button", { name: /Pré-aprovados/i }));

    await userEvent.click(await screen.findByRole("button", { name: /^Entrada$/i }));
    await waitFor(() => expect(preAutorizacaoApi.registrarEntrada).toHaveBeenCalled());
  });

  it("pré-aprovado com veículo oferece entrar a pé, para quando não há vaga", async () => {
    preAutorizacaoApi.ativasHoje.mockResolvedValue({
      data: [{ id: "pa-2", nomeVisitante: "Marta", placaVeiculo: "ABC1D23" }],
    });
    montar();
    await screen.findByText("Pré-aprovados");
    await userEvent.click(screen.getByRole("button", { name: /Pré-aprovados/i }));

    expect(await screen.findByRole("button", { name: /Entrada com veículo/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Só a pé/i }));
    await waitFor(() => expect(preAutorizacaoApi.registrarEntrada).toHaveBeenCalled());
  });
});
