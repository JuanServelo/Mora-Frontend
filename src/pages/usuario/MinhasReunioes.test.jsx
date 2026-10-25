import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MinhasReunioes } from "./MinhasReunioes";
import { meetingApi } from "../../services/meetingApi";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ usuario: { id: 2, perfil: "MORADOR", condominioId: "tenant-a" } }) }));
vi.mock("../../contexts/ToastContext", () => ({ useToast: () => ({ error: vi.fn() }) }));
vi.mock("../../services/meetingApi", () => ({ meetingApi: { listar: vi.fn(), atualizarPresenca: vi.fn() } }));

const data = (minutos) => new Date(Date.now() + minutos * 60000).toISOString();
const reuniao = (id, titulo, inicio, fim, status = "AGENDADA") => ({ id, titulo, dataHoraInicio: data(inicio), dataHoraFim: data(fim), status,
  googleMeetLink: "https://meet.google.com/test-room", convidados: [{ usuarioId: 2, status: "PENDENTE" }] });

beforeEach(() => {
  vi.clearAllMocks();
  meetingApi.listar.mockResolvedValue({ data: [
    reuniao(1, "Assembleia extraordinária", 5, 60), reuniao(2, "Conselho fiscal", 1440, 1500),
    reuniao(3, "Reunião antiga", -120, -60), reuniao(4, "Cancelada", 10, 60, "CANCELADA"),
    reuniao(5, "Finalizada", 10, 60, "FINALIZADA"), reuniao(6, "Em curso", -5, 30),
  ] });
});

describe("reuniões do morador", () => {
  it("oculta passadas, finalizadas e canceladas sem esconder a reunião em andamento", async () => {
    render(<MinhasReunioes />);
    await screen.findByText("Assembleia extraordinária");
    expect(screen.getByText("Em curso")).toBeInTheDocument();
    expect(screen.getByText("Conselho fiscal")).toBeInTheDocument();
    for (const titulo of ["Reunião antiga", "Cancelada", "Finalizada"]) expect(screen.queryByText(titulo)).not.toBeInTheDocument();
  });

  it("filtra nome sem exigir acentos, combina data opcional e permite limpar", async () => {
    render(<MinhasReunioes />);
    await screen.findByText("Assembleia extraordinária");
    fireEvent.change(screen.getByLabelText("Nome da reunião"), { target: { value: "EXTRAORDINARIA" } });
    expect(screen.queryByText("Conselho fiscal")).not.toBeInTheDocument();
    expect(screen.getByText("Assembleia extraordinária")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Data (opcional)"), { target: { value: "2099-01-01" } });
    expect(screen.getByText(/Nenhuma reunião encontrada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByText("Conselho fiscal")).toBeInTheDocument();
  });

  it("entrar confirma a presença e atualiza o detalhe visível", async () => {
    const aba = { location: { replace: vi.fn() }, close: vi.fn() };
    const abrir = vi.spyOn(window, "open").mockReturnValue(aba);
    meetingApi.atualizarPresenca.mockResolvedValue({ status: 204 });
    render(<MinhasReunioes />);
    fireEvent.click(await screen.findByRole("button", { name: /Assembleia extraordinária/ }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Google Meet" }));
    await waitFor(() => expect(screen.getByText("Sua presença: Confirmada")).toBeInTheDocument());
    expect(meetingApi.atualizarPresenca).toHaveBeenCalledWith(1, 2, "CONFIRMADO");
    expect(aba.location.replace).toHaveBeenCalled();
    abrir.mockRestore();
  });
});
