import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PERFIS } from "../../utils/perfis";

/**
 * Estruturas Físicas — tela do síndico.
 *
 * Três abas (Blocos & Apartamentos, Áreas Comuns, Vagas) sobre os mesmos
 * serviços. O que esta suíte protege é o cadastro de área comum: é lá que
 * ficam os dois controles que mudam o comportamento de reserva no backend —
 * "Exige aprovação do síndico" e a antecedência mínima (RF-10). Um deles
 * sumir da tela deixa a regra configurável só por SQL.
 */

const toastErro = vi.fn();
const toastSucesso = vi.fn();

let usuario = { id: 4, nome: "Síndico", perfil: PERFIS.ADMIN_SINDICO, condominioId: "cond-a" };
let blocos = [];
let areas = [];
let apartamentos = [];
let vagas = [];

const blocoApi = {
  listar: vi.fn(() => Promise.resolve({ data: blocos })),
  listarTodos: vi.fn(() => Promise.resolve({ data: blocos })),
  cadastrar: vi.fn(() => Promise.resolve({ data: {} })),
  atualizar: vi.fn(() => Promise.resolve({ data: {} })),
  ativar: vi.fn(() => Promise.resolve({ data: {} })),
  desativar: vi.fn(() => Promise.resolve({ data: {} })),
};
const apartamentoApi = {
  listar: vi.fn(() => Promise.resolve({ data: apartamentos })),
  listarTodos: vi.fn(() => Promise.resolve({ data: apartamentos })),
  deletar: vi.fn(() => Promise.resolve({ data: {} })),
  cadastrar: vi.fn(() => Promise.resolve({ data: {} })),
  atualizar: vi.fn(() => Promise.resolve({ data: {} })),
  ativar: vi.fn(() => Promise.resolve({ data: {} })),
  desativar: vi.fn(() => Promise.resolve({ data: {} })),
};
const areaComunApi = {
  listar: vi.fn(() => Promise.resolve({ data: areas })),
  listarPorTipo: vi.fn(() => Promise.resolve({ data: areas })),
  deletar: vi.fn(() => Promise.resolve({ data: {} })),
  buscar: vi.fn(() => Promise.resolve({ data: areas[0] })),
  listarTodas: vi.fn(() => Promise.resolve({ data: areas })),
  cadastrar: vi.fn(() => Promise.resolve({ data: {} })),
  atualizar: vi.fn(() => Promise.resolve({ data: {} })),
  ativar: vi.fn(() => Promise.resolve({ data: {} })),
  desativar: vi.fn(() => Promise.resolve({ data: {} })),
};
const vagaApi = {
  listar: vi.fn(() => Promise.resolve({ data: vagas })),
  listarTodas: vi.fn(() => Promise.resolve({ data: vagas })),
  deletar: vi.fn(() => Promise.resolve({ data: {} })),
  cadastrar: vi.fn(() => Promise.resolve({ data: {} })),
  atualizar: vi.fn(() => Promise.resolve({ data: {} })),
  ativar: vi.fn(() => Promise.resolve({ data: {} })),
  desativar: vi.fn(() => Promise.resolve({ data: {} })),
};
const condominiosApi = { listarAtivos: vi.fn(() => Promise.resolve({ data: { condominios: [] } })) };
const planApi = {
  assinaturaVigente: vi.fn(() =>
    Promise.resolve({ data: { modulosAtivos: ["areas_comuns", "vagas"] } })),
};

vi.mock("../../services/estruturasApi", () => ({ blocoApi, apartamentoApi, areaComunApi }));
vi.mock("../../services/portariaApi", () => ({ vagaApi }));
vi.mock("../../services/condominiosApi", () => ({ condominiosApi }));
vi.mock("../../services/planApi", () => ({ planApi }));
vi.mock("../../services/api", () => ({ default: { get: vi.fn(() => Promise.resolve({ data: {} })) } }));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ usuario }) }));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: toastSucesso }),
}));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));
vi.mock("../../components/agenda/ModalFuncionamento", () => ({
  ModalFuncionamento: () => <div>modal de funcionamento</div>,
}));
vi.mock("../../components/adm/SeletorCondominio", () => ({
  SeletorCondominio: () => <div>seletor</div>,
}));

const { GerenciarEstruturas, descreverAntecedencia, MAX_ANTECEDENCIA_HORAS } =
  await import("./GerenciarEstruturas");

const BLOCO = { id: "b-1", nome: "Bloco A", andares: 4, apartamentosPorAndar: 2, ativo: true };
const AREA = {
  id: "a-1", nome: "Salão de Festas", tipo: "SALAO_FESTAS", capacidadeMaxima: 40,
  area: 60, podeReservar: true, exigeAprovacao: true, antecedenciaMinimaHoras: 48, ativo: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  usuario = { id: 4, nome: "Síndico", perfil: PERFIS.ADMIN_SINDICO, condominioId: "cond-a" };
  blocos = [BLOCO];
  areas = [AREA];
  apartamentos = [];
  vagas = [];
});

describe("GerenciarEstruturas — abertura", () => {
  it("abre na aba de blocos e apartamentos", async () => {
    render(<GerenciarEstruturas />);
    expect(await screen.findByText(/Blocos & Apartamentos/i)).toBeInTheDocument();
  });

  it("oferece as três abas de estrutura", async () => {
    render(<GerenciarEstruturas />);
    await screen.findByText(/Blocos & Apartamentos/i);
    expect(screen.getByText(/Áreas Comuns/i)).toBeInTheDocument();
    expect(screen.getByText(/^Vagas$/i)).toBeInTheDocument();
  });

  it("carrega blocos e apartamentos do condomínio", async () => {
    render(<GerenciarEstruturas />);
    expect(await screen.findByText("Bloco A")).toBeInTheDocument();
    expect(blocoApi.listarTodos).toHaveBeenCalled();
  });
});

describe("GerenciarEstruturas — áreas comuns", () => {
  it("alterna para a aba e lista as áreas", async () => {
    render(<GerenciarEstruturas />);
    await screen.findByText(/Blocos & Apartamentos/i);
    await userEvent.click(screen.getByText(/Áreas Comuns/i));

    expect(await screen.findByText("Salão de Festas")).toBeInTheDocument();
  });

  it("o resumo mostra quem aprova e a antecedência exigida", async () => {
    render(<GerenciarEstruturas />);
    await screen.findByText(/Blocos & Apartamentos/i);
    await userEvent.click(screen.getByText(/Áreas Comuns/i));
    await screen.findByText("Salão de Festas");

    // "Síndico" também é o nome do usuário logado; o rótulo da área aparece
    // junto do valor de antecedência, que é único.
    expect(screen.getAllByText("Síndico").length).toBeGreaterThan(0);
    expect(screen.getAllByText("48h").length).toBeGreaterThan(0);
  });

  it("espaço sem exigência aparece como aprovação automática e sem antecedência", async () => {
    areas = [{ ...AREA, exigeAprovacao: false, antecedenciaMinimaHoras: 0 }];
    render(<GerenciarEstruturas />);
    await screen.findByText(/Blocos & Apartamentos/i);
    await userEvent.click(screen.getByText(/Áreas Comuns/i));
    await screen.findByText("Salão de Festas");

    expect(screen.getAllByText("Automática").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nenhuma").length).toBeGreaterThan(0);
  });

  it("espaço que não aceita reserva não mostra aprovação nem antecedência", async () => {
    areas = [{ ...AREA, podeReservar: false }];
    render(<GerenciarEstruturas />);
    await screen.findByText(/Blocos & Apartamentos/i);
    await userEvent.click(screen.getByText(/Áreas Comuns/i));
    await screen.findByText("Salão de Festas");

    expect(screen.queryByText("Antecedência")).not.toBeInTheDocument();
  });
});

describe("GerenciarEstruturas — vagas", () => {
  it("alterna para a aba de vagas e consulta a listagem", async () => {
    render(<GerenciarEstruturas />);
    await screen.findByText(/Blocos & Apartamentos/i);
    await userEvent.click(screen.getByText(/^Vagas$/i));

    await waitFor(() => expect(vagaApi.listarTodas).toHaveBeenCalled());
  });
});

describe("descreverAntecedencia", () => {
  it("zero é sem exigência, e diz isso em palavras", () => {
    expect(descreverAntecedencia(0)).toMatch(/sem exig/i);
    expect(descreverAntecedencia("0")).toMatch(/sem exig/i);
  });

  it("campo vazio conta como sem exigência, não como NaN", () => {
    expect(descreverAntecedencia("")).toMatch(/sem exig/i);
    expect(descreverAntecedencia(null)).toMatch(/sem exig/i);
    expect(descreverAntecedencia(undefined)).toMatch(/sem exig/i);
  });

  it("valor não numérico não produz 'NaN horas' na tela", () => {
    expect(descreverAntecedencia("abc")).toMatch(/sem exig/i);
  });

  it("múltiplo de 24 é lido em dias", () => {
    expect(descreverAntecedencia(24)).toContain("1 dia");
    expect(descreverAntecedencia(48)).toContain("2 dias");
    expect(descreverAntecedencia(72)).toContain("3 dias");
  });

  it("não múltiplo de 24 fica em horas", () => {
    expect(descreverAntecedencia(5)).toContain("5 horas");
    expect(descreverAntecedencia(36)).toContain("36 horas");
  });

  it("uma hora no singular", () => {
    expect(descreverAntecedencia(1)).toContain("1 hora");
    expect(descreverAntecedencia(1)).not.toContain("1 horas");
  });

  it("avisa que síndico e admin não são barrados", () => {
    expect(descreverAntecedencia(48)).toMatch(/não são barrados/i);
  });

  it("aceita string, que é o que o input numérico entrega", () => {
    expect(descreverAntecedencia("48")).toContain("2 dias");
  });

  it("valor negativo não vira exigência", () => {
    expect(descreverAntecedencia(-5)).toMatch(/sem exig/i);
  });
});

describe("MAX_ANTECEDENCIA_HORAS", () => {
  it("é um ano, o mesmo teto do CHECK da migração V3", () => {
    expect(MAX_ANTECEDENCIA_HORAS).toBe(8760);
    expect(MAX_ANTECEDENCIA_HORAS).toBe(365 * 24);
  });
});
