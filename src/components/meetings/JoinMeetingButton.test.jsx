import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { JoinMeetingButton } from "./JoinMeetingButton";
import { meetingApi } from "../../services/meetingApi";

vi.mock("../../services/meetingApi", () => ({ meetingApi: { atualizarPresenca: vi.fn() } }));
let aba;
const reuniao = () => ({ id: 10, status: "AGENDADA", googleMeetLink: "https://meet.google.com/test-room",
  dataHoraInicio: new Date(Date.now() - 60000).toISOString(), dataHoraFim: new Date(Date.now() + 3600000).toISOString(),
  convidados: [{ usuarioId: 2, status: "PENDENTE" }] });

beforeEach(() => {
  vi.clearAllMocks();
  aba = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(aba);
});
afterEach(() => vi.restoreAllMocks());

describe("entrada na reunião", () => {
  it("persiste a própria presença antes de navegar e atualiza a tela", async () => {
    let concluir;
    meetingApi.atualizarPresenca.mockReturnValue(new Promise((resolve) => { concluir = resolve; }));
    const atualizar = vi.fn();
    render(<JoinMeetingButton reuniao={reuniao()} usuarioId={2} onPresencaAtualizada={atualizar} />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Google Meet" }));
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(aba.opener).toBeNull();
    expect(meetingApi.atualizarPresenca).toHaveBeenCalledWith(10, 2, "CONFIRMADO");
    expect(aba.location.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
    concluir();
    await waitFor(() => expect(aba.location.replace).toHaveBeenCalledWith("https://meet.google.com/test-room"));
    expect(atualizar).toHaveBeenCalledWith(10, 2);
  });

  it("falha da API mantém aviso e não entra sem registrar presença", async () => {
    meetingApi.atualizarPresenca.mockRejectedValue({ response: { data: { message: "Sessão expirada" } } });
    render(<JoinMeetingButton reuniao={reuniao()} usuarioId={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Google Meet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sessão expirada");
    expect(aba.close).toHaveBeenCalled();
    expect(aba.location.replace).not.toHaveBeenCalled();
  });

  it("popup bloqueado não marca presença sem acesso à reunião", async () => {
    window.open.mockReturnValue(null);
    render(<JoinMeetingButton reuniao={reuniao()} usuarioId={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Google Meet" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Permita a abertura");
    expect(meetingApi.atualizarPresenca).not.toHaveBeenCalled();
  });

  it("organizador que não é convidado entra sem alterar presença de moradores", async () => {
    render(<JoinMeetingButton reuniao={reuniao()} usuarioId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Google Meet" }));
    await waitFor(() => expect(aba.location.replace).toHaveBeenCalled());
    expect(meetingApi.atualizarPresenca).not.toHaveBeenCalled();
  });

  it("morador entra somente a partir de quinze minutos antes do início", () => {
    render(<JoinMeetingButton reuniao={{ ...reuniao(), dataHoraInicio: new Date(Date.now() + 3600000).toISOString() }} usuarioId={2} />);
    expect(screen.getByRole("button", { name: /Disponível 15 minutos/ })).toBeDisabled();
    expect(window.open).not.toHaveBeenCalled();
  });
});
