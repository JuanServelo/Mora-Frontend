import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoogleMeetConnection } from "./GoogleMeetConnection";
import { meetingApi } from "../../services/meetingApi";

let usuario;
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ usuario }) }));
vi.mock("../../services/meetingApi", () => ({ meetingApi: { googleStatus: vi.fn(), conectarGoogle: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/adm/reunioes");
  usuario = { id: 1, perfil: "ADMIN_SINDICO", condominioId: "tenant-a" };
  meetingApi.conectarGoogle.mockRejectedValue({ response: { data: { message: "Autorização indisponível" } } });
});

describe("conexão Google Meet", () => {
  it("reexibe o aviso se a conexão falhar depois de estar conectada", async () => {
    meetingApi.googleStatus.mockResolvedValueOnce({ data: { configured: true, connected: true } });
    render(<GoogleMeetConnection />);
    await waitFor(() => expect(meetingApi.googleStatus).toHaveBeenCalledOnce());
    meetingApi.googleStatus.mockResolvedValue({ data: { configured: true, connected: false, message: "Conecte sua conta novamente." } });
    fireEvent(window, new Event("google-meet-connection-changed"));
    await screen.findByText("Conecte sua conta novamente.");
    expect(screen.getByRole("button", { name: "Conectar Google Meet" })).toBeInTheDocument();
  });

  it("inicia autorização na primeira visita e permite tentar novamente em caso de falha", async () => {
    meetingApi.googleStatus.mockResolvedValue({ data: { configured: true, connected: false, message: "Conecte sua conta" } });
    render(<GoogleMeetConnection />);
    await screen.findByText("Autorização indisponível");
    expect(meetingApi.conectarGoogle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Conectar Google Meet" }));
    await waitFor(() => expect(meetingApi.conectarGoogle).toHaveBeenCalledTimes(2));
  });

  it("reutiliza a autorização persistida sem redirecionar", async () => {
    meetingApi.googleStatus.mockResolvedValue({ data: { configured: true, connected: true, message: "Google Meet conectado." } });
    render(<GoogleMeetConnection />);
    await waitFor(() => expect(meetingApi.googleStatus).toHaveBeenCalledOnce());
    expect(meetingApi.conectarGoogle).not.toHaveBeenCalled();
    expect(screen.queryByText("Google Meet conectado.")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("credenciais ausentes não bloqueiam a tela nem disparam autorização automática", async () => {
    meetingApi.googleStatus.mockResolvedValue({ data: { configured: false, connected: false, message: "Google Meet indisponível." } });
    render(<GoogleMeetConnection />);
    await screen.findByText("Google Meet indisponível.");
    expect(meetingApi.conectarGoogle).not.toHaveBeenCalled();
  });

  it("cancelar consentimento não causa um ciclo de redirecionamentos", async () => {
    window.history.replaceState(null, "", "/adm/reunioes?googleMeet=error");
    meetingApi.googleStatus.mockResolvedValue({ data: { configured: true, connected: false } });
    render(<GoogleMeetConnection />);
    await screen.findByText(/conexão com o Google não foi concluída/);
    await waitFor(() => expect(meetingApi.googleStatus).toHaveBeenCalledOnce());
    expect(meetingApi.conectarGoogle).not.toHaveBeenCalled();
  });

  it("uma tentativa anterior não repete automaticamente ao voltar à tela", async () => {
    sessionStorage.setItem("google-meet-attempt:1:tenant-a", "1");
    meetingApi.googleStatus.mockResolvedValue({ data: { configured: true, connected: false, message: "Conecte sua conta" } });
    render(<GoogleMeetConnection />);
    await screen.findByText("Conecte sua conta");
    expect(meetingApi.conectarGoogle).not.toHaveBeenCalled();
  });

  it("moradores não autorizam a conta de reuniões do condomínio", () => {
    usuario = { ...usuario, perfil: "MORADOR" };
    render(<GoogleMeetConnection />);
    expect(meetingApi.googleStatus).not.toHaveBeenCalled();
    expect(meetingApi.conectarGoogle).not.toHaveBeenCalled();
  });
});
