import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/**
 * Cadastros na chegada — tela do porteiro.
 *
 * É um fluxo em três passos (Pessoa → Veículo → Confirmar) e a parte mais
 * delicada é a pré-liberação: ao digitar o CPF ou a placa de quem o morador
 * já autorizou, a tela precisa reconhecer e dizer isso. Sem esse aviso o
 * porteiro recadastra alguém que já estava liberado, e o vínculo com a
 * autorização se perde.
 */

const toastErro = vi.fn();
const toastSucesso = vi.fn();

let resultadosBusca = [];
let preAutCpf = [];
let preAutPlaca = [];

const atendimentoApi = {
  buscar: vi.fn(() => Promise.resolve({ data: resultadosBusca })),
  registrar: vi.fn(() => Promise.resolve({ data: { id: "reg-1" } })),
};
const preAutorizacaoApi = {
  porCpf: vi.fn(() => Promise.resolve({ data: preAutCpf })),
  porPlaca: vi.fn(() => Promise.resolve({ data: preAutPlaca })),
};
const apartamentoApi = {
  listar: vi.fn(() => Promise.resolve({
    data: [{ id: "u-1", numero: "101", blocoNome: "Bloco A" }],
  })),
};
const veiculoApi = { listar: vi.fn(() => Promise.resolve({ data: [] })) };
const acessoApi = {
  listarUsuariosCondominio: vi.fn(() => Promise.resolve({ data: { usuarios: [] } })),
  pessoasDaUnidade: vi.fn(() => Promise.resolve({ data: { pessoas: [] } })),
};

vi.mock("../../services/portariaApi", () => ({
  atendimentoApi, preAutorizacaoApi, apartamentoApi, veiculoApi,
}));
vi.mock("../../services/acessoApi", () => ({ acessoApi }));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: toastSucesso }),
}));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));

const { AtendimentoPortaria } = await import("./AtendimentoPortaria");

const montar = (rota = "/atendimento") =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <AtendimentoPortaria />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  resultadosBusca = [];
  preAutCpf = [];
  preAutPlaca = [];
});

describe("AtendimentoPortaria — abertura", () => {
  it("mostra os três passos do fluxo", () => {
    montar();
    expect(screen.getByText("Pessoa")).toBeInTheDocument();
    expect(screen.getByText("Veículo")).toBeInTheDocument();
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
  });

  it("oferece os dois tipos de atendimento", () => {
    montar();
    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("Terceiro / Serviço")).toBeInTheDocument();
  });

  it("carrega os apartamentos depois que o tipo é escolhido", async () => {
    montar();
    expect(apartamentoApi.listar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText("Visitante"));
    await waitFor(() => expect(apartamentoApi.listar).toHaveBeenCalled());
  });

  it("o tipo pode vir pela URL, como nos atalhos da portaria", () => {
    montar("/atendimento?tipo=SERVICO");
    expect(screen.getByText("Terceiro / Serviço")).toBeInTheDocument();
  });
});

describe("AtendimentoPortaria — busca de pessoa", () => {
  const CAMPO = /Ex: João Silva ou/i;

  it("escolher o tipo abre o campo de identificação", async () => {
    montar();
    await userEvent.click(screen.getByText("Visitante"));
    expect(await screen.findByPlaceholderText(CAMPO)).toBeInTheDocument();
  });

  it("digitar dispara a busca, com atraso para não consultar a cada tecla", async () => {
    montar();
    await userEvent.click(screen.getByText("Visitante"));
    await userEvent.type(await screen.findByPlaceholderText(CAMPO), "Maria");

    expect(atendimentoApi.buscar).not.toHaveBeenCalled();
    await waitFor(() => expect(atendimentoApi.buscar).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("a busca leva o tipo escolhido, para não misturar visitante com terceiro", async () => {
    montar();
    await userEvent.click(screen.getByText("Terceiro / Serviço"));
    await userEvent.type(await screen.findByPlaceholderText(CAMPO), "Maria");

    await waitFor(() => expect(atendimentoApi.buscar).toHaveBeenCalled(), { timeout: 3000 });
    expect(atendimentoApi.buscar.mock.calls[0]).toContain("SERVICO");
  });

  it("quem já foi atendido antes aparece como resultado", async () => {
    resultadosBusca = [{ id: "p-1", nome: "Maria Silva", documento: "11144477735" }];
    montar();
    await userEvent.click(screen.getByText("Visitante"));
    await userEvent.type(await screen.findByPlaceholderText(CAMPO), "Maria");

    expect(await screen.findByText("Maria Silva", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("sem resultado, oferece cadastrar — e não deixa o porteiro sem saída", async () => {
    montar();
    await userEvent.click(screen.getByText("Visitante"));
    await userEvent.type(await screen.findByPlaceholderText(CAMPO), "Fulano");

    expect(await screen.findByText(/Cadastrar novo/i, {}, { timeout: 3000 }))
      .toBeInTheDocument();
  });

  it("confirmar a pessoa consulta a pré-liberação pelo CPF dela", async () => {
    resultadosBusca = [{ id: "p-1", nome: "Maria Silva", documento: "52998224725" }];
    montar();
    await userEvent.click(screen.getByText("Visitante"));
    await userEvent.type(await screen.findByPlaceholderText(CAMPO), "Maria");

    await userEvent.click(await screen.findByText("Maria Silva", {}, { timeout: 3000 }));
    await waitFor(() => expect(preAutorizacaoApi.porCpf).toHaveBeenCalledWith("52998224725"));
  });
});

describe("AtendimentoPortaria — pré-liberação", () => {
  it("CPF com autorização ativa é anunciado na tela", async () => {
    resultadosBusca = [{ id: "p-1", nome: "João Entregas", documento: "52998224725" }];
    // O endpoint devolve uma LISTA; a tela usa o primeiro item.
    preAutCpf = [{ id: "pa-1", nomeVisitante: "João Entregas", unidadeId: "u-1" }];

    montar();
    await userEvent.click(screen.getByText("Visitante"));
    await userEvent.type(
      await screen.findByPlaceholderText(/Ex: João Silva ou/i), "João");
    await userEvent.click(await screen.findByText("João Entregas", {}, { timeout: 3000 }));

    expect(await screen.findByText(/Pré-liberação ativa/i)).toBeInTheDocument();
  });

  it("sem autorização, nada é anunciado", async () => {
    resultadosBusca = [{ id: "p-1", nome: "Maria Silva", documento: "52998224725" }];
    preAutCpf = [];

    montar();
    await userEvent.click(screen.getByText("Visitante"));
    await userEvent.type(
      await screen.findByPlaceholderText(/Ex: João Silva ou/i), "Maria");
    await userEvent.click(await screen.findByText("Maria Silva", {}, { timeout: 3000 }));

    expect(screen.queryByText(/Pré-liberação ativa/i)).not.toBeInTheDocument();
  });

  it("documento que não é CPF completo não dispara consulta", async () => {
    resultadosBusca = [{ id: "p-1", nome: "Visita Sem Doc", documento: "123" }];
    montar();
    await userEvent.click(screen.getByText("Visitante"));
    await userEvent.type(
      await screen.findByPlaceholderText(/Ex: João Silva ou/i), "Visita");
    await userEvent.click(await screen.findByText("Visita Sem Doc", {}, { timeout: 3000 }));

    expect(preAutorizacaoApi.porCpf).not.toHaveBeenCalled();
  });
});
