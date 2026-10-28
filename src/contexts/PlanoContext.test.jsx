import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PERFIS } from "../utils/perfis";

/**
 * Resolução dos módulos contratados.
 *
 * Este contexto já deixou a aplicação inteira sem menu duas vezes: uma porque
 * chamava um endpoint que não existia, outra porque a assinatura vivia em outra
 * tabela. Nos dois casos a chamada falhava, `modulosAtivos` virava `[]` e todo
 * item com módulo sumia — parecendo bug de permissão, não de integração.
 */

let usuario = null;
let authLoading = false;
let resposta = () => Promise.resolve({ data: { vigente: true, modulosAtivos: ["portaria", "areas_comuns"] } });

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ usuario, loading: authLoading }),
}));

vi.mock("../services/planApi", () => ({
  planApi: { assinaturaVigente: (...a) => resposta(...a) },
}));

const { PlanoProvider, usePlano } = await import("./PlanoContext");

function Sonda() {
  const { modulosAtivos, carregando, hasModulo } = usePlano();
  return (
    <div>
      <span data-testid="modulos">{JSON.stringify(modulosAtivos)}</span>
      <span data-testid="carregando">{String(carregando)}</span>
      <span data-testid="tem-areas">{String(hasModulo("areas_comuns"))}</span>
      <span data-testid="tem-financeiro">{String(hasModulo("financeiro"))}</span>
    </div>
  );
}

const montar = () => render(<PlanoProvider><Sonda /></PlanoProvider>);
const modulos = () => screen.getByTestId("modulos").textContent;

beforeEach(() => {
  vi.clearAllMocks();
  usuario = { perfil: PERFIS.ADMIN_SINDICO, condominioId: "cond-a" };
  authLoading = false;
  resposta = () => Promise.resolve({ data: { vigente: true, modulosAtivos: ["portaria", "areas_comuns"] } });
});

describe("PlanoContext", () => {
  it("não libera módulos de assinatura sem vigência", async () => {
    resposta = () => Promise.resolve({ data: { vigente: false, modulosAtivos: ["portaria"] } });
    montar();
    await waitFor(() => expect(modulos()).toBe("[]"));
  });
  it("expõe os módulos da assinatura vigente", async () => {
    montar();
    await waitFor(() => expect(modulos()).toContain("areas_comuns"));
    expect(screen.getByTestId("tem-areas").textContent).toBe("true");
    expect(screen.getByTestId("tem-financeiro").textContent).toBe("false");
  });

  it("consulta usando o condomínio do usuário", async () => {
    const vistos = [];
    resposta = (id) => {
      vistos.push(id);
      return Promise.resolve({ data: { modulosAtivos: [] } });
    };
    montar();
    await waitFor(() => expect(vistos).toContain("cond-a"));
  });

  it("falha na consulta bloqueia os opcionais, em vez de liberar tudo", async () => {
    resposta = () => Promise.reject(new Error("404"));
    montar();
    await waitFor(() => expect(modulos()).toBe("[]"));
    expect(screen.getByTestId("tem-areas").textContent).toBe("false");
  });

  it("resposta sem o campo não vira undefined", async () => {
    resposta = () => Promise.resolve({ data: {} });
    montar();
    await waitFor(() => expect(modulos()).toBe("[]"));
  });

  it("usuário sem condomínio não dispara consulta", async () => {
    usuario = { perfil: PERFIS.ADMIN_GERAL, condominioId: null };
    let chamou = false;
    resposta = () => {
      chamou = true;
      return Promise.resolve({ data: { modulosAtivos: [] } });
    };
    montar();
    await waitFor(() => expect(screen.getByTestId("carregando").textContent).toBe("false"));
    expect(chamou).toBe(false);
  });

  it("sem usuário, não consulta nada", async () => {
    usuario = null;
    let chamou = false;
    resposta = () => {
      chamou = true;
      return Promise.resolve({ data: { modulosAtivos: [] } });
    };
    montar();
    await waitFor(() => expect(screen.getByTestId("carregando").textContent).toBe("false"));
    expect(chamou).toBe(false);
  });

  it("enquanto a autenticação carrega, não consulta ainda", async () => {
    authLoading = true;
    let chamou = false;
    resposta = () => {
      chamou = true;
      return Promise.resolve({ data: { modulosAtivos: [] } });
    };
    montar();
    expect(chamou).toBe(false);
  });

  it("hasModulo é falso enquanto a lista não chegou", () => {
    montar();
    expect(screen.getByTestId("tem-areas").textContent).toBe("false");
  });

  it("usar usePlano fora do provider falha explicitamente", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Sonda />)).toThrow(/PlanoProvider/);
    } finally {
      console.error = original;
    }
  });
});
