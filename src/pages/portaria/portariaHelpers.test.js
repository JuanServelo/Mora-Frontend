import { describe, it, expect, vi, afterEach } from "vitest";
import {
  errMsg,
  formatarCpfMask,
  fmtData,
  fmtHora,
  fmtDuracao,
  fmtDuracaoEntre,
  hoje,
  unidadeLabel,
  normalizarPlaca,
  placaValida,
} from "./portariaHelpers";

/**
 * Funções puras da tela de Entradas e Saídas.
 *
 * A que mais importa aqui é `hoje()`: ela existe porque `toISOString()` devolve
 * a data em UTC, e em UTC-3 isso adianta o dia depois das 21h — o filtro de
 * histórico nascia em "amanhã" e a tela aparecia vazia. O bug já apareceu três
 * vezes em telas diferentes, então vale um teste que trave o relógio.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe("hoje", () => {
  it("usa a data local, não a UTC", () => {
    // 21:30 em São Paulo (UTC-3) é 00:30 do dia seguinte em UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T23:30:00-03:00"));

    expect(hoje()).toBe("2026-10-21");
    expect(hoje()).not.toBe(new Date().toISOString().slice(0, 10));
  });

  it("zera à esquerda mês e dia", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 10, 0, 0));
    expect(hoje()).toBe("2026-01-05");
  });

  it("devolve sempre o formato aceito pelo input de data", () => {
    expect(hoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("errMsg", () => {
  it("prefere a mensagem da API", () => {
    expect(errMsg({ response: { data: { mensagem: "Sem permissão." } } })).toBe("Sem permissão.");
  });

  it("aceita os outros nomes de campo que os serviços usam", () => {
    expect(errMsg({ response: { data: { message: "boom" } } })).toBe("boom");
    expect(errMsg({ response: { data: { erro: "falhou" } } })).toBe("falhou");
  });

  it("erro de rede, sem resposta, não quebra", () => {
    expect(errMsg(new Error("Network Error"))).toBeNull();
    expect(errMsg(undefined)).toBeNull();
    expect(errMsg(null)).toBeNull();
  });
});

describe("formatarCpfMask", () => {
  it("aplica a máscara em 11 dígitos", () => {
    expect(formatarCpfMask("52998224725")).toBe("529.982.247-25");
  });

  it("devolve o original quando não são 11 dígitos", () => {
    expect(formatarCpfMask("123")).toBe("123");
  });

  it("não remascara o que já veio mascarado", () => {
    expect(formatarCpfMask("529.982.247-25")).toBe("529.982.247-25");
  });
});

describe("fmtData e fmtHora", () => {
  it("formatam no padrão brasileiro", () => {
    expect(fmtData("2026-10-21T14:30:00")).toBe("21/10/2026");
    expect(fmtHora("2026-10-21T14:30:00")).toBe("14:30");
  });

  it("valor ausente vira travessão, não 'Invalid Date'", () => {
    expect(fmtData(null)).toBe("—");
    expect(fmtHora(null)).toBe("—");
    expect(fmtData(undefined)).toBe("—");
  });
});

describe("fmtDuracao", () => {
  it("abaixo de um minuto, mostra segundos", () => {
    vi.useFakeTimers();
    const agora = new Date("2026-10-21T12:00:30");
    vi.setSystemTime(agora);
    expect(fmtDuracao("2026-10-21T12:00:00")).toBe("30s");
  });

  it("abaixo de uma hora, mostra minutos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:45:00"));
    expect(fmtDuracao("2026-10-21T12:00:00")).toBe("45min");
  });

  it("acima de uma hora, mostra horas e minutos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T14:20:00"));
    expect(fmtDuracao("2026-10-21T12:00:00")).toBe("2h 20min");
  });

  it("hora cheia omite os minutos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T15:00:00"));
    expect(fmtDuracao("2026-10-21T12:00:00")).toBe("3h");
  });
});

describe("fmtDuracaoEntre", () => {
  it("calcula o intervalo entre entrada e saída", () => {
    expect(fmtDuracaoEntre("2026-10-21T12:00:00", "2026-10-21T12:00:45")).toBe("45s");
    expect(fmtDuracaoEntre("2026-10-21T12:00:00", "2026-10-21T12:30:00")).toBe("30min");
    expect(fmtDuracaoEntre("2026-10-21T12:00:00", "2026-10-21T14:15:00")).toBe("2h 15min");
    expect(fmtDuracaoEntre("2026-10-21T12:00:00", "2026-10-21T16:00:00")).toBe("4h");
  });

  it("sem saída registrada, não inventa duração", () => {
    expect(fmtDuracaoEntre("2026-10-21T12:00:00", null)).toBe("—");
    expect(fmtDuracaoEntre(null, "2026-10-21T12:00:00")).toBe("—");
  });

  it("atravessa a meia-noite", () => {
    expect(fmtDuracaoEntre("2026-10-21T23:00:00", "2026-10-22T01:30:00")).toBe("2h 30min");
  });
});

describe("unidadeLabel", () => {
  const mapa = { "u-1": "Bloco B - Apto 202" };

  it("prefere o número que veio no próprio registro", () => {
    expect(unidadeLabel("u-1", null, "101", "Bloco A", mapa)).toBe("Bloco A - Apto 101");
  });

  it("sem bloco, mostra só o apartamento", () => {
    expect(unidadeLabel(null, null, "101", null, mapa)).toBe("Apto 101");
  });

  it("sem número, resolve o UUID pelo mapa de apartamentos", () => {
    expect(unidadeLabel("u-1", null, null, null, mapa)).toBe("Bloco B - Apto 202");
  });

  it("também resolve pelo id do apartamento", () => {
    expect(unidadeLabel(null, "u-1", null, null, mapa)).toBe("Bloco B - Apto 202");
  });

  it("UUID desconhecido vira travessão, não o UUID cru na tela", () => {
    expect(unidadeLabel("u-999", null, null, null, mapa)).toBe("—");
    expect(unidadeLabel(null, null, null, null, {})).toBe("—");
  });
});

describe("placa", () => {
  it("normaliza para maiúsculas e sem separadores", () => {
    expect(normalizarPlaca("abc-1234")).toBe("ABC1234");
    expect(normalizarPlaca("abc 1d23")).toBe("ABC1D23");
  });

  it("corta no sétimo caractere: placa não tem mais que isso", () => {
    expect(normalizarPlaca("ABC12345678")).toBe("ABC1234");
  });

  it("aceita os dois formatos em uso", () => {
    expect(placaValida("ABC1234")).toBe(true);
    expect(placaValida("ABC1D23")).toBe(true);
  });

  it("recusa o que não é placa", () => {
    expect(placaValida("AB1234")).toBe(false);
    expect(placaValida("ABCD123")).toBe(false);
    expect(placaValida("1234ABC")).toBe(false);
    expect(placaValida("")).toBe(false);
  });

  it("normalizar e validar funcionam juntos, como na digitação", () => {
    expect(placaValida(normalizarPlaca("abc-1234"))).toBe(true);
    expect(placaValida(normalizarPlaca("ab-123"))).toBe(false);
  });
});
