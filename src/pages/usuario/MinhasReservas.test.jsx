import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PERFIS } from "../../utils/perfis";

/**
 * Reservas de espaços — tela compartilhada por morador, porteiro e síndico.
 *
 * O que muda entre os perfis é justamente o que precisa de teste: só quem
 * aprova vê a fila de pendentes e os botões de decidir. Essa aba já ficou
 * implementada e inalcançável duas vezes por perda de entrada de menu; aqui
 * se garante ao menos que ela só aparece para quem deve.
 */

const toastErro = vi.fn();
const toastSucesso = vi.fn();

let usuario = { id: 3, nome: "Ana", perfil: PERFIS.MORADOR, unidadeId: "u-1" };
let areas = [];
let pendentes = [];
let agenda = [];

const areaComunApi = { listar: vi.fn(() => Promise.resolve({ data: areas })) };
const reservaApi = {
  agenda: vi.fn(() => Promise.resolve({ data: agenda })),
  pendentes: vi.fn(() => Promise.resolve({ data: pendentes })),
  listar: vi.fn(() => Promise.resolve({ data: [] })),
  listarMinhas: vi.fn(() => Promise.resolve({ data: [] })),
  solicitar: vi.fn(() => Promise.resolve({ data: { status: "APROVADA" } })),
  aprovar: vi.fn(() => Promise.resolve({ data: {} })),
  aprovarLote: vi.fn(() => Promise.resolve({ data: { aprovadas: ["r-1"], falhas: [] } })),
  recusar: vi.fn(() => Promise.resolve({ data: {} })),
  cancelar: vi.fn(() => Promise.resolve({ data: {} })),
  auditoria: vi.fn(() => Promise.resolve({ data: [] })),
  funcionarios: vi.fn(() => Promise.resolve({ data: [] })),
};
const funcionamentoApi = { consultar: vi.fn(() => Promise.resolve({ data: null })) };
const apartamentoApi = { listar: vi.fn(() => Promise.resolve({ data: [] })) };
const acessoApi = { listarResidentes: vi.fn(() => Promise.resolve({ data: { residentes: [] } })) };

vi.mock("../../services/estruturasApi", () => ({ areaComunApi }));
vi.mock("../../services/portariaApi", () => ({ reservaApi, funcionamentoApi, apartamentoApi }));
vi.mock("../../services/acessoApi", () => ({ acessoApi }));
vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ error: toastErro, success: toastSucesso }),
}));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ usuario }) }));
vi.mock("../../components/icones/Icone", () => ({
  Icone: ({ name }) => <span aria-hidden>{name}</span>,
}));
vi.mock("../../components/agenda/AgendaEspacos", () => ({
  AgendaEspacos: ({ area }) => <div>agenda de {area?.nome}</div>,
}));

const { MinhasReservas } = await import("./MinhasReservas");

// A tela lê ?aba=aprovacoes para abrir direto na fila, então precisa de Router.
const montar = (rota = "/espacos") =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <MinhasReservas />
    </MemoryRouter>,
  );

const AREA = { id: "a-1", nome: "Salão de Festas", ativo: true, podeReservar: true };
const PENDENTE = {
  id: "r-1", areaComumNome: "Salão de Festas", responsavelNome: "Ana Souza",
  inicio: "2026-12-01T14:00:00", fim: "2026-12-01T17:00:00",
  status: "PENDENTE", prazoDecisao: "2026-11-30T14:00:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  usuario = { id: 3, nome: "Ana", perfil: PERFIS.MORADOR, unidadeId: "u-1" };
  areas = [AREA];
  pendentes = [];
  agenda = [];
});

describe("MinhasReservas — morador", () => {
  it("carrega as áreas reserváveis", async () => {
    montar();
    expect(await screen.findByText("Salão de Festas")).toBeInTheDocument();
  });

  it("sem área disponível, explica o vazio", async () => {
    areas = [];
    montar();
    expect(await screen.findByText(/Nenhuma área comum disponível/i)).toBeInTheDocument();
  });

  it("filtra áreas inativas ou que não aceitam reserva", async () => {
    areas = [
      AREA,
      { id: "a-2", nome: "Depósito", ativo: true, podeReservar: false },
      { id: "a-3", nome: "Obra", ativo: false, podeReservar: true },
    ];
    montar();
    await screen.findByText("Salão de Festas");
    expect(screen.queryByText("Depósito")).not.toBeInTheDocument();
    expect(screen.queryByText("Obra")).not.toBeInTheDocument();
  });

  it("não vê abas de operação", async () => {
    montar();
    await screen.findByText("Salão de Festas");
    expect(screen.queryByText("Aprovações")).not.toBeInTheDocument();
    expect(screen.queryByText("Histórico")).not.toBeInTheDocument();
  });

  it("não consulta a fila de pendentes", async () => {
    montar();
    await screen.findByText("Salão de Festas");
    expect(reservaApi.pendentes).not.toHaveBeenCalled();
  });

  it("escolher o espaço abre a agenda dele", async () => {
    montar();
    await userEvent.click(await screen.findByText("Salão de Festas"));
    expect(await screen.findByText(/agenda de Salão de Festas/)).toBeInTheDocument();
  });
});

describe("MinhasReservas — porteiro", () => {
  beforeEach(() => {
    usuario = { id: 2, nome: "Carlos", perfil: PERFIS.PORTEIRO };
  });

  it("vê a aba de histórico, que é da operação", async () => {
    montar();
    expect(await screen.findByText("Histórico")).toBeInTheDocument();
  });

  it("não vê a aba de aprovações — porteiro não decide reserva alheia", async () => {
    montar();
    await screen.findByText("Histórico");
    expect(screen.queryByText("Aprovações")).not.toBeInTheDocument();
  });

  it("o histórico consulta as reservas do condomínio", async () => {
    montar();
    await userEvent.click(await screen.findByText("Histórico"));
    await waitFor(() => expect(reservaApi.listar).toHaveBeenCalled());
  });
});

describe("MinhasReservas — síndico", () => {
  beforeEach(() => {
    usuario = { id: 4, nome: "Síndico", perfil: PERFIS.ADMIN_SINDICO };
  });

  it("vê a aba de aprovações", async () => {
    montar();
    expect(await screen.findByText("Aprovações")).toBeInTheDocument();
  });

  it("consulta a fila de pendentes ao abrir", async () => {
    montar();
    await waitFor(() => expect(reservaApi.pendentes).toHaveBeenCalled());
  });

  it("a aba mostra quantas solicitações aguardam decisão", async () => {
    pendentes = [PENDENTE, { ...PENDENTE, id: "r-2" }];
    montar();
    const aba = await screen.findByRole("button", { name: /Aprovações/i });
    await waitFor(() => expect(aba.textContent).toContain("2"));
  });

  it("fila vazia é dita em palavras", async () => {
    montar();
    await userEvent.click(await screen.findByText("Aprovações"));
    expect(await screen.findByText(/Nenhuma solicitação aguardando aprovação/i))
      .toBeInTheDocument();
  });

  it("lista a solicitação pendente com espaço e responsável", async () => {
    pendentes = [PENDENTE];
    montar();
    await userEvent.click(await screen.findByText("Aprovações"));
    expect(await screen.findByText(/Ana Souza/)).toBeInTheDocument();
  });

  it("aprovar em lote usa o endpoint de lote, não um a um", async () => {
    pendentes = [PENDENTE];
    montar();
    await userEvent.click(await screen.findByText("Aprovações"));
    await screen.findByText(/Ana Souza/);

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /Aprovar/i }));

    await waitFor(() => expect(reservaApi.aprovarLote).toHaveBeenCalledWith(["r-1"]));
    expect(reservaApi.aprovar).not.toHaveBeenCalled();
  });

  it("falha parcial do lote chega ao síndico com o motivo", async () => {
    pendentes = [PENDENTE];
    reservaApi.aprovarLote.mockResolvedValueOnce({
      data: { aprovadas: [], falhas: [{ reservaId: "r-1", motivo: "Horário já ocupado." }] },
    });
    montar();
    await userEvent.click(await screen.findByText("Aprovações"));
    await screen.findByText(/Ana Souza/);

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /Aprovar/i }));

    await waitFor(() => expect(toastErro).toHaveBeenCalledWith("Horário já ocupado."));
  });

  it("selecionar todas marca a fila inteira", async () => {
    pendentes = [PENDENTE, { ...PENDENTE, id: "r-2" }];
    montar();
    await userEvent.click(await screen.findByText("Aprovações"));
    await screen.findAllByText(/Ana Souza/);

    await userEvent.click(screen.getByRole("button", { name: /Selecionar todas/i }));
    screen.getAllByRole("checkbox").forEach((c) => expect(c).toBeChecked());
  });

  it("a notificação leva direto à fila: ?aba=aprovacoes abre nas aprovações", async () => {
    pendentes = [PENDENTE];
    montar("/espacos?aba=aprovacoes");

    // A fila está aberta: a solicitação pendente aparece sem nenhum clique.
    expect(await screen.findByText(/Ana Souza/)).toBeInTheDocument();
    expect(screen.getByText(/Decidir até/i)).toBeInTheDocument();
  });

  it("sem o parâmetro, abre na agenda como antes", async () => {
    montar("/espacos");
    await screen.findByText("Aprovações");
    expect(screen.getByText("Salão de Festas")).toBeInTheDocument();
  });
});
