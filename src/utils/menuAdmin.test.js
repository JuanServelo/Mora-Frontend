import { describe, it, expect } from "vitest";
import { ADM_LINKS, linksDoPerfil, podeAcessarRotaAdmin } from "./menuAdmin";
import { PERFIS } from "./perfis";

/**
 * O menu do síndico é a única porta para as telas administrativas — e já se
 * perdeu duas vezes num merge, deixando a aprovação de reservas implementada e
 * inalcançável. Estes testes existem para que a terceira vez quebre o build.
 */

const TODOS_MODULOS = [
  "portaria", "reunioes", "vagas", "entregas", "areas_comuns", "reclamacoes",
  "conhecimento", "votacoes", "veiculos", "chaves", "comunicacao", "financeiro",
];
const PLANO_BASICO = ["portaria", "veiculos", "chaves"];

const rotas = (links) => links.map((l) => l.to);

describe("linksDoPerfil — síndico", () => {
  it("entrega as telas administrativas do condomínio", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_SINDICO, TODOS_MODULOS);
    expect(rotas(links)).toEqual(expect.arrayContaining([
      "/adm/usuarios", "/adm/estruturas", "/adm/funcionarios", "/adm/reclamacoes",
    ]));
  });

  it("inclui Reservas, a porta para a fila de aprovação", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_SINDICO, TODOS_MODULOS);
    const reservas = links.find((l) => l.to === "/espacos");
    expect(reservas, "sem esta entrada o síndico não alcança as aprovações").toBeDefined();
    expect(reservas.label).toBe("Reservas");
    expect(reservas.modulo).toBe("areas_comuns");
  });

  it("não oferece telas de plataforma", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_SINDICO, TODOS_MODULOS);
    expect(rotas(links)).not.toContain("/adm/condominios");
    expect(rotas(links)).not.toContain("/adm/planos");
  });

  it("não oferece telas de morador", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_SINDICO, TODOS_MODULOS);
    expect(rotas(links)).not.toContain("/meus-convidados");
    expect(rotas(links)).not.toContain("/meus-veiculos");
    expect(rotas(links)).not.toContain("/entregas");
  });

  it("esconde o que o plano não inclui", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_SINDICO, PLANO_BASICO);
    expect(rotas(links)).not.toContain("/espacos");
    expect(rotas(links)).not.toContain("/adm/reunioes");
  });

  it("mantém as telas estruturais mesmo no plano mais enxuto", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_SINDICO, PLANO_BASICO);
    expect(rotas(links)).toEqual(expect.arrayContaining([
      "/adm/usuarios", "/adm/estruturas", "/adm/funcionarios",
    ]));
  });

  it("sem plano, esconde tudo que depende de módulo", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_SINDICO, []);
    expect(links.every((l) => !l.modulo)).toBe(true);
  });
});

describe("linksDoPerfil — admin geral", () => {
  it("vê as telas de plataforma", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_GERAL, null);
    expect(rotas(links)).toEqual(expect.arrayContaining([
      "/adm/geral", "/adm/condominios", "/adm/planos",
    ]));
  });

  it("não é filtrado por plano: ele opera a plataforma, não um condomínio", () => {
    const comPlano = linksDoPerfil(PERFIS.ADMIN_GERAL, []);
    expect(comPlano.length).toBeGreaterThan(0);
  });

  it("não recebe as telas exclusivas do condomínio", () => {
    const links = linksDoPerfil(PERFIS.ADMIN_GERAL, null);
    expect(rotas(links)).not.toContain("/adm/funcionarios");
  });
});

describe("linksDoPerfil — perfis sem painel", () => {
  it.each([PERFIS.MORADOR, PERFIS.PORTEIRO, PERFIS.CONVIDADO])(
    "%s não recebe nada do menu administrativo",
    (perfil) => {
      expect(linksDoPerfil(perfil, TODOS_MODULOS)).toHaveLength(0);
    },
  );
});

describe("podeAcessarRotaAdmin", () => {
  it("libera a rota do próprio perfil", () => {
    expect(podeAcessarRotaAdmin(PERFIS.ADMIN_SINDICO, "/adm/funcionarios", TODOS_MODULOS)).toBe(true);
  });

  it("barra o síndico nas telas de plataforma", () => {
    expect(podeAcessarRotaAdmin(PERFIS.ADMIN_SINDICO, "/adm/planos", TODOS_MODULOS)).toBe(false);
  });

  it("barra rota desconhecida — esconder do menu sem barrar a URL não protege nada", () => {
    expect(podeAcessarRotaAdmin(PERFIS.ADMIN_SINDICO, "/adm/inexistente", TODOS_MODULOS)).toBe(false);
  });

  it("barra quando o módulo não está contratado", () => {
    expect(podeAcessarRotaAdmin(PERFIS.ADMIN_SINDICO, "/adm/reunioes", PLANO_BASICO)).toBe(false);
  });

  it("admin geral entra mesmo sem plano", () => {
    expect(podeAcessarRotaAdmin(PERFIS.ADMIN_GERAL, "/adm/planos", [])).toBe(true);
  });

  it("sem módulos carregados, bloqueia o que depende de módulo", () => {
    expect(podeAcessarRotaAdmin(PERFIS.ADMIN_SINDICO, "/adm/reunioes", null)).toBe(false);
  });
});

describe("integridade da lista", () => {
  it("toda entrada tem rota, rótulo, ícone e perfis", () => {
    for (const l of ADM_LINKS) {
      expect(l.to, JSON.stringify(l)).toBeTruthy();
      expect(l.label, JSON.stringify(l)).toBeTruthy();
      expect(l.icon, JSON.stringify(l)).toBeTruthy();
      expect(Array.isArray(l.perfis), JSON.stringify(l)).toBe(true);
      expect(l.perfis.length).toBeGreaterThan(0);
    }
  });

  it("não há rota duplicada", () => {
    const vistas = rotas(ADM_LINKS);
    expect(new Set(vistas).size).toBe(vistas.length);
  });
});
