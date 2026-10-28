// src/pages/adm/AssistenteIA.jsx
import { useEffect, useRef, useState } from "react";
import { Icone } from "../../components/icones/Icone";
import { iaApi } from "../../services/iaApi";

/**
 * Assistente do síndico: perguntas em português sobre o risco de atraso das
 * unidades, respondidas pelo Gemini com dados do modelo de previsão.
 *
 * O Gemini não lê o banco: ele escolhe entre funções do ia-service, e todo
 * percentual da resposta precisa ter vindo delas. A tela mostra as funções
 * consultadas e se a resposta passou na conferência — o síndico vê de onde
 * veio cada número.
 */

const SUGESTOES = [
  "Quais são as 5 unidades com maior risco no próximo mês?",
  "Quantas unidades alugadas estão em risco alto?",
  "A A-507 é alugada? Quem paga a taxa e qual o risco dela?",
  "O modelo é confiável? Há diferença entre alugadas e próprias?",
];

const FONTES = {
  gemini: { rotulo: "Conferida", icone: "verified", classe: "text-primary border-primary/30 bg-primary/10" },
  dados: { rotulo: "Só os dados consultados", icone: "rule", classe: "text-secondary border-secondary/30 bg-secondary/10" },
  indisponivel: { rotulo: "Indisponível", icone: "cloud_off", classe: "text-error border-error/30 bg-error/10" },
};

/** `**negrito**` do Gemini vira <b>, sem injetar HTML. */
function TextoComNegrito({ texto }) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith("**") && parte.endsWith("**")
      ? <b key={i} className="text-on-surface">{parte.slice(2, -2)}</b>
      : <span key={i}>{parte}</span>
  );
}

function Resposta({ r }) {
  const fonte = FONTES[r.fonte] ?? FONTES.indisponivel;
  return (
    <div className="rounded-2xl p-5 border border-veu/10 bg-surface-container/60 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Icone name="smart_toy" className="text-primary" />
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${fonte.classe}`}>
          <Icone name={fonte.icone} className="text-sm" />
          {fonte.rotulo}
        </span>
        {r.modelo && <span className="text-xs text-on-surface-variant">{r.modelo}</span>}
      </div>

      <div className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
        <TextoComNegrito texto={r.resposta ?? ""} />
      </div>

      {r.fonte === "dados" && r.motivo && (
        <p className="text-xs text-secondary">A resposta escrita foi descartada: {r.motivo}.</p>
      )}

      {r.chamadas?.length > 0 && (
        <div className="pt-2 border-t border-veu/5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Consultou</p>
          {r.chamadas.map((c, i) => (
            <code key={i} className="block text-xs text-on-surface-variant break-all">
              {c.ferramenta}({Object.keys(c.argumentos ?? {}).length ? JSON.stringify(c.argumentos) : ""})
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function AssistenteIA() {
  const [pergunta, setPergunta] = useState("");
  const [conversa, setConversa] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const fim = useRef(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversa, carregando]);

  async function enviar(texto) {
    const q = (texto ?? pergunta).trim();
    if (!q || carregando) return;
    setPergunta("");
    setCarregando(true);
    try {
      const { data } = await iaApi.perguntar(q);
      setConversa((c) => [...c, { pergunta: q, resposta: data }]);
    } catch {
      setConversa((c) => [...c, {
        pergunta: q,
        resposta: { fonte: "indisponivel", resposta: "Não foi possível falar com o ia-service. Ele está rodando na porta 8000?", chamadas: [] },
      }]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">Mora Inteligente</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Assistente{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">IA</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            Pergunte sobre o risco de atraso das unidades na próxima competência. O Gemini responde com os dados
            do modelo de previsão, e cada número da resposta é conferido contra as funções que ele consultou.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={carregando}
              onClick={() => enviar(s)}
              className="text-xs px-3 py-2 rounded-full border border-veu/10 text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {conversa.map((item, i) => (
            <div key={i} className="space-y-3">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm bg-primary/15 text-on-surface">
                  {item.pergunta}
                </p>
              </div>
              <Resposta r={item.resposta} />
            </div>
          ))}
          {carregando && (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <Icone name="progress_activity" className="animate-spin text-primary" />
              Consultando o modelo e o Gemini…
            </div>
          )}
          <div ref={fim} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); enviar(); }}
          className="flex items-end gap-2 rounded-2xl border border-veu/10 bg-surface-container/60 p-2"
        >
          <textarea
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
            }}
            rows={2}
            maxLength={500}
            placeholder="Ex.: quais unidades alugadas têm mais risco?"
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none"
          />
          <button
            type="submit"
            disabled={carregando || !pergunta.trim()}
            aria-label="Enviar pergunta"
            className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-primary-container text-on-primary-container cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icone name="send" />
          </button>
        </form>

        <p className="text-xs text-on-surface-variant/70">
          Dados sintéticos de demonstração. A previsão é um apoio à gestão: não aparece para o morador e não muda a cobrança.
        </p>
      </div>
    </div>
  );
}
