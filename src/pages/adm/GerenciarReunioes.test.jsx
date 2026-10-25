import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GerenciarReunioes } from "./GerenciarReunioes";
import { meetingApi } from "../../services/meetingApi";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ usuario: { id: 1, perfil: "ADMIN_SINDICO", condominioId: "tenant-a" } }) }));
vi.mock("../../contexts/ToastContext", () => ({ useToast: () => ({ error: vi.fn(), success: vi.fn() }) }));
vi.mock("../../contexts/ConfirmContext", () => ({ useConfirm: () => vi.fn() }));
vi.mock("../../components/meetings/GoogleMeetConnection", () => ({ GoogleMeetConnection: () => null }));
vi.mock("../../services/api", () => ({ default: { get: vi.fn().mockResolvedValue({ data: { usuarios: [] } }) } }));
vi.mock("../../services/meetingApi", () => ({ meetingApi: { listar: vi.fn(), buscar: vi.fn(), atualizarPresenca: vi.fn() },
  ataApi: { buscar: vi.fn().mockRejectedValue({ response: { status: 404 } }) }, pollApi: { listar: vi.fn().mockResolvedValue({ data: [] }) } }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  meetingApi.listar.mockResolvedValue({ data: [
    { id: 10, titulo: "Assembleia extraordinária", dataHoraInicio: "2099-01-01T10:00:00", dataHoraFim: "2099-01-01T11:00:00", status: "AGENDADA", convidados: [] },
    { id: 11, titulo: "Conselho fiscal", dataHoraInicio: "2099-02-02T10:00:00", dataHoraFim: "2099-02-02T11:00:00", status: "AGENDADA", convidados: [] },
  ] });
});

describe("busca administrativa de reuniões", () => {
  it("atualiza a presença no detalhe quando a administração volta à aba", async () => {
    const lista = (await meetingApi.listar()).data;
    const detalhe = { ...lista[0], convidados: [{ usuarioId: 2, status: "PENDENTE" }] };
    meetingApi.buscar.mockResolvedValueOnce({ data: detalhe });
    render(<GerenciarReunioes />);
    await screen.findByText("Assembleia extraordinária");
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalhes/ })[0]);
    await screen.findByText("Pendente");
    meetingApi.buscar.mockResolvedValue({ data: { ...detalhe, convidados: [{ usuarioId: 2, status: "CONFIRMADO" }] } });
    fireEvent(window, new Event("focus"));
    await screen.findByText("Confirmado");
    expect(screen.queryByText("Pendente")).not.toBeInTheDocument();
  });

  it("mostra todas as reuniões do condomínio e filtra enquanto digita, com data opcional", async () => {
    render(<GerenciarReunioes />);
    await screen.findByText("Conselho fiscal");
    expect(meetingApi.listar).toHaveBeenCalledWith();
    fireEvent.change(screen.getByLabelText("Nome da reunião"), { target: { value: "extraordinaria" } });
    expect(screen.queryByText("Conselho fiscal")).not.toBeInTheDocument();
    expect(screen.getByText("Assembleia extraordinária")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Data (opcional)"), { target: { value: "2099-02-02" } });
    expect(screen.getByText(/Nenhuma reunião encontrada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByText("Conselho fiscal")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Minhas Reuniões da Semana")).not.toBeInTheDocument());
  });
});
