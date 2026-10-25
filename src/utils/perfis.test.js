import { describe, it, expect } from "vitest";
import {
  PERFIS,
  PERFIS_APROVAM_RESERVA,
  PERFIS_FUNCIONARIO,
  podeAprovarReserva,
  podeAcessarAdmin,
  podeAcessarPortaria,
  podeGerenciarOcupantes,
  perfisCadastroDisponiveis,
  isPerfilCondominio,
  isUsuarioRestrito,
  labelPerfil,
  redirectPorPerfil,
  podeCadastrarPerfil,
} from "./perfis";

/**
 * Quem pode o quê. É a cópia, no frontend, das constantes do backend — e o
 * critério obrigatório 6 exige perfil validado nos dois lados. Se estas listas
 * divergirem do Java, a tela oferece um botão que o servidor recusa, ou esconde
 * uma ação que a pessoa teria direito de fazer.
 */

describe("aprovação de reserva", () => {
  it("espelha PERFIS_APROVAM do ReservaService: síndico e admin geral", () => {
    expect(PERFIS_APROVAM_RESERVA).toEqual(
      expect.arrayContaining([PERFIS.ADMIN_SINDICO, PERFIS.ADMIN_GERAL]),
    );
    expect(PERFIS_APROVAM_RESERVA).toHaveLength(2);
  });

  it("porteiro registra reserva, mas não decide a dos outros", () => {
    expect(podeAprovarReserva(PERFIS.PORTEIRO)).toBe(false);
  });

  it("morador não aprova nada", () => {
    expect(podeAprovarReserva(PERFIS.MORADOR)).toBe(false);
    expect(podeAprovarReserva(PERFIS.DONO_ALUGUEL)).toBe(false);
  });

  it("síndico e admin geral aprovam", () => {
    expect(podeAprovarReserva(PERFIS.ADMIN_SINDICO)).toBe(true);
    expect(podeAprovarReserva(PERFIS.ADMIN_GERAL)).toBe(true);
  });

  it("perfil ausente não aprova, e não quebra", () => {
    expect(podeAprovarReserva(undefined)).toBe(false);
    expect(podeAprovarReserva(null)).toBe(false);
  });
});

describe("acesso ao painel administrativo", () => {
  it.each([PERFIS.ADMIN_GERAL, PERFIS.ADMIN_SINDICO])("%s entra", (p) => {
    expect(podeAcessarAdmin(p)).toBe(true);
  });

  it.each([PERFIS.PORTEIRO, PERFIS.MORADOR, PERFIS.CONVIDADO])("%s não entra", (p) => {
    expect(podeAcessarAdmin(p)).toBe(false);
  });
});

describe("acesso às telas de portaria", () => {
  it.each([PERFIS.ADMIN_GERAL, PERFIS.ADMIN_SINDICO, PERFIS.PORTEIRO])("%s opera", (p) => {
    expect(podeAcessarPortaria(p)).toBe(true);
  });

  it("morador não opera a portaria", () => {
    expect(podeAcessarPortaria(PERFIS.MORADOR)).toBe(false);
  });
});

describe("perfis de condomínio x de unidade", () => {
  it("quem atua no condomínio não depende de unidade", () => {
    expect(isPerfilCondominio(PERFIS.PORTEIRO)).toBe(true);
    expect(isPerfilCondominio(PERFIS.ADMIN_SINDICO)).toBe(true);
    expect(isPerfilCondominio(PERFIS.MORADOR)).toBe(false);
  });

  it("morador sem unidade é restrito: a navegação dele fica vazia", () => {
    expect(isUsuarioRestrito({ perfil: PERFIS.MORADOR })).toBe(true);
  });

  it("morador com unidade não é restrito", () => {
    expect(isUsuarioRestrito({ perfil: PERFIS.MORADOR, unidadeId: "u-1" })).toBe(false);
  });

  it("bloco e apartamento também valem como vínculo", () => {
    expect(isUsuarioRestrito({ perfil: PERFIS.MORADOR, bloco: "A", apartamento: "101" }))
      .toBe(false);
  });

  it("porteiro nunca é restrito, mesmo sem unidade", () => {
    expect(isUsuarioRestrito({ perfil: PERFIS.PORTEIRO })).toBe(false);
  });

  it("sem usuário não há restrição a aplicar", () => {
    expect(isUsuarioRestrito(null)).toBe(false);
  });
});

describe("rótulo e rota inicial", () => {
  it("traduz o perfil para leitura humana", () => {
    expect(labelPerfil(PERFIS.ADMIN_SINDICO)).toBe("Admin Síndico");
    expect(labelPerfil(PERFIS.CONVIDADO)).toBe("Convidado");
  });

  it("perfil desconhecido não aparece como undefined na tela", () => {
    expect(labelPerfil("ALGO_NOVO")).toBe("ALGO NOVO");
    expect(labelPerfil(null)).toBe("—");
  });

  it("porteiro cai na portaria; admin geral, na plataforma", () => {
    expect(redirectPorPerfil(PERFIS.PORTEIRO)).toBe("/portaria");
    expect(redirectPorPerfil(PERFIS.ADMIN_GERAL)).toBe("/adm/geral");
  });

  it("os demais caem no início", () => {
    expect(redirectPorPerfil(PERFIS.MORADOR)).toBe("/inicio");
    expect(redirectPorPerfil(PERFIS.ADMIN_SINDICO)).toBe("/inicio");
  });
});

describe("matriz de cadastro", () => {
  it("síndico cadastra a equipe e os moradores", () => {
    expect(podeCadastrarPerfil(PERFIS.ADMIN_SINDICO, PERFIS.PORTEIRO)).toBe(true);
    expect(podeCadastrarPerfil(PERFIS.ADMIN_SINDICO, PERFIS.MORADOR)).toBe(true);
  });

  it("síndico não cria outro síndico nem admin geral", () => {
    expect(podeCadastrarPerfil(PERFIS.ADMIN_SINDICO, PERFIS.ADMIN_SINDICO)).toBe(false);
    expect(podeCadastrarPerfil(PERFIS.ADMIN_SINDICO, PERFIS.ADMIN_GERAL)).toBe(false);
  });

  it("morador só convida visitante", () => {
    expect(podeCadastrarPerfil(PERFIS.MORADOR, PERFIS.CONVIDADO)).toBe(true);
    expect(podeCadastrarPerfil(PERFIS.MORADOR, PERFIS.MORADOR)).toBe(false);
  });

  it("porteiro não cadastra ninguém por convite", () => {
    expect(podeCadastrarPerfil(PERFIS.PORTEIRO, PERFIS.MORADOR)).toBe(false);
  });
});

describe("gestão de ocupantes da unidade", () => {
  it("morador e dono do aluguel gerenciam quem mora na unidade", () => {
    expect(podeGerenciarOcupantes(PERFIS.MORADOR)).toBe(true);
    expect(podeGerenciarOcupantes(PERFIS.DONO_ALUGUEL)).toBe(true);
  });

  it("porteiro e síndico não gerenciam ocupantes por esta via", () => {
    expect(podeGerenciarOcupantes(PERFIS.PORTEIRO)).toBe(false);
    expect(podeGerenciarOcupantes(PERFIS.ADMIN_SINDICO)).toBe(false);
  });
});

describe("perfis oferecidos no convite", () => {
  it("o síndico recebe uma lista com rótulo, pronta para o select", () => {
    const opcoes = perfisCadastroDisponiveis(PERFIS.ADMIN_SINDICO);
    expect(opcoes.length).toBeGreaterThan(0);
    for (const o of opcoes) {
      expect(o).toHaveProperty("value");
      expect(o).toHaveProperty("label");
    }
  });

  it("quem não cadastra ninguém recebe lista vazia", () => {
    expect(perfisCadastroDisponiveis(PERFIS.PORTEIRO)).toHaveLength(0);
  });
});

describe("PERFIS_FUNCIONARIO", () => {
  it("espelha a constante do auth-api: porteiro e síndico", () => {
    expect(PERFIS_FUNCIONARIO).toEqual([PERFIS.PORTEIRO, PERFIS.ADMIN_SINDICO]);
  });
});
