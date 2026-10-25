import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PERFIS } from "../utils/perfis";

/**
 * Guardas de rota do porteiro e do síndico.
 *
 * Esconder um item do menu não protege nada: basta digitar a URL. São estes
 * dois componentes que de fato barram, e por isso eles merecem teste mesmo
 * sendo pequenos — um `if` invertido aqui abre a administração do condomínio
 * para qualquer pessoa autenticada.
 */

let usuario = null;
let authLoading = false;
let modulosAtivos = ["portaria", "areas_comuns", "reunioes"];
let planoCarregando = false;

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ usuario, loading: authLoading }),
}));

vi.mock("../contexts/PlanoContext", () => ({
  usePlano: () => ({ modulosAtivos, carregando: planoCarregando }),
}));

const { AdminRoute } = await import("./AdminRoute");
const { DoormanRoute } = await import("./DoormanRoute");

const Protegida = () => <div>conteúdo protegido</div>;
const Destino = ({ nome }) => <div>redirecionou para {nome}</div>;

function montarAdmin(rota) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path={rota} element={<AdminRoute><Protegida /></AdminRoute>} />
        <Route path="/login" element={<Destino nome="login" />} />
        <Route path="/inicio" element={<Destino nome="inicio" />} />
        <Route path="/portaria" element={<Destino nome="portaria" />} />
        <Route path="/adm/geral" element={<Destino nome="adm-geral" />} />
      </Routes>
    </MemoryRouter>,
  );
}

function montarPorteiro() {
  return render(
    <MemoryRouter initialEntries={["/atendimento"]}>
      <Routes>
        <Route path="/atendimento" element={<DoormanRoute><Protegida /></DoormanRoute>} />
        <Route path="/inicio" element={<Destino nome="inicio" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const passou = () => screen.queryByText("conteúdo protegido") !== null;

beforeEach(() => {
  usuario = null;
  authLoading = false;
  planoCarregando = false;
  modulosAtivos = ["portaria", "areas_comuns", "reunioes"];
});

describe("AdminRoute", () => {
  it("síndico abre a tela administrativa do condomínio", () => {
    usuario = { perfil: PERFIS.ADMIN_SINDICO };
    montarAdmin("/adm/funcionarios");
    expect(passou()).toBe(true);
  });

  it("porteiro digitando a URL é devolvido à própria tela inicial", () => {
    usuario = { perfil: PERFIS.PORTEIRO };
    montarAdmin("/adm/funcionarios");
    expect(passou()).toBe(false);
    expect(screen.getByText(/redirecionou para portaria/)).toBeInTheDocument();
  });

  it("morador digitando a URL é devolvido ao início", () => {
    usuario = { perfil: PERFIS.MORADOR };
    montarAdmin("/adm/estruturas");
    expect(passou()).toBe(false);
    expect(screen.getByText(/redirecionou para inicio/)).toBeInTheDocument();
  });

  it("sem autenticação vai para o login", () => {
    usuario = null;
    montarAdmin("/adm/estruturas");
    expect(screen.getByText(/redirecionou para login/)).toBeInTheDocument();
  });

  it("síndico é barrado nas telas de plataforma", () => {
    usuario = { perfil: PERFIS.ADMIN_SINDICO };
    montarAdmin("/adm/planos");
    expect(passou()).toBe(false);
  });

  it("módulo não contratado barra mesmo o síndico", () => {
    usuario = { perfil: PERFIS.ADMIN_SINDICO };
    modulosAtivos = ["portaria"];
    montarAdmin("/adm/reunioes");
    expect(passou()).toBe(false);
  });

  it("enquanto auth carrega, não decide nada ainda", () => {
    usuario = null;
    authLoading = true;
    montarAdmin("/adm/estruturas");
    expect(screen.getByText(/Carregando/)).toBeInTheDocument();
    expect(screen.queryByText(/redirecionou/)).not.toBeInTheDocument();
  });

  it("enquanto o plano carrega, também espera — senão barraria por engano", () => {
    usuario = { perfil: PERFIS.ADMIN_SINDICO };
    planoCarregando = true;
    montarAdmin("/adm/reunioes");
    expect(screen.getByText(/Carregando/)).toBeInTheDocument();
  });

  it("admin geral entra nas telas de plataforma", () => {
    usuario = { perfil: PERFIS.ADMIN_GERAL };
    montarAdmin("/adm/planos");
    expect(passou()).toBe(true);
  });
});

describe("DoormanRoute", () => {
  it.each([PERFIS.PORTEIRO, PERFIS.ADMIN_SINDICO, PERFIS.ADMIN_GERAL])(
    "%s opera as telas da portaria",
    (perfil) => {
      usuario = { perfil };
      montarPorteiro();
      expect(passou()).toBe(true);
    },
  );

  it.each([PERFIS.MORADOR, PERFIS.CONVIDADO, PERFIS.TERCEIRO])(
    "%s é devolvido ao início",
    (perfil) => {
      usuario = { perfil };
      montarPorteiro();
      expect(passou()).toBe(false);
      expect(screen.getByText(/redirecionou para inicio/)).toBeInTheDocument();
    },
  );

  it("sem usuário não entra", () => {
    usuario = null;
    montarPorteiro();
    expect(passou()).toBe(false);
  });

  it("enquanto carrega, não redireciona", () => {
    usuario = null;
    authLoading = true;
    montarPorteiro();
    expect(screen.getByText(/Carregando/)).toBeInTheDocument();
    expect(screen.queryByText(/redirecionou/)).not.toBeInTheDocument();
  });
});
