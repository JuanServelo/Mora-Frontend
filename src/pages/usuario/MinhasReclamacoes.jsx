// src/pages/usuario/MinhasReclamacoes.jsx
import { useState } from "react";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

// ─── helpers ────────────────────────────────
function TextArea({ label, ...props }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      <textarea
        className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all resize-none"
        {...props}
      />
    </div>
  );
}

const CATEGORIAS = [
  "BARULHO",
  "INFRAESTRUTURA",
  "LIMPEZA",
  "GARAGEM",
  "ANIMAIS",
  "ELEVADORES",
  "ILUMINACAO",
  "ELETRICA",
  "HIDRAULICA",
  "PINTURA",
  "JARDINAGEM",
  "SUGESTAO_MELHORIA",
  "OUTROS",
];

const STATUS_COLOR = {
  PENDENTE: "bg-tertiary/10 text-tertiary",
  EM_ANALISE: "bg-primary/10 text-primary",
  RESOLVIDO: "bg-primary/10 text-primary",
};

const STATUS_ICON = {
  PENDENTE: "schedule",
  EM_ANALISE: "manage_search",
  RESOLVIDO: "check_circle",
};

const catLabel = (c) =>
  c
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

// Mock: reclamações já abertas pelo usuário logado
const MINHAS_RECLAMACOES_MOCK = [
  {
    id: 1,
    protocolNumber: "REC-001",
    category: "BARULHO",
    description: "Barulho excessivo no apartamento 301 após as 22h todos os finais de semana.",
    attachmentUrl: null,
    status: "PENDENTE",
    createdAt: "2026-04-20T14:30",
    interactions: [],
  },
  {
    id: 2,
    protocolNumber: "REC-004",
    category: "ELEVADORES",
    description: "Elevador do bloco B está fazendo barulho estranho e travando no 3° andar.",
    attachmentUrl: null,
    status: "EM_ANALISE",
    createdAt: "2026-04-22T10:00",
    interactions: [
      {
        id: 1,
        response: "Técnico agendado para visita na quinta-feira, entre 14h e 18h.",
        status: "EM_ANALISE",
      },
    ],
  },
];

// ─── Aba: Abrir Reclamação ───────────────────
function AbaNovaReclamacao({ onCriada }) {
  const [form, setForm] = useState({
    category: "BARULHO",
    description: "",
    attachmentUrl: "",
  });
  const [enviado, setEnviado] = useState(false);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nova = {
      id: Date.now(),
      protocolNumber: `REC-${String(Math.floor(Math.random() * 900) + 100)}`,
      category: form.category,
      description: form.description,
      attachmentUrl: form.attachmentUrl || null,
      status: "PENDENTE",
      createdAt: new Date().toISOString().slice(0, 16),
      interactions: [],
    };
    onCriada(nova);
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icone name="check_circle" className="text-4xl text-primary" />
        </div>
        <h2 className="font-headline text-2xl font-bold text-on-surface">Reclamação registrada!</h2>
        <p className="text-on-surface-variant text-sm max-w-sm">
          Sua reclamação foi enviada com sucesso. Acompanhe o status pela aba{" "}
          <strong>Minhas Reclamações</strong>.
        </p>
        <Botao
          onClick={() => {
            setEnviado(false);
            setForm({ category: "BARULHO", description: "", attachmentUrl: "" });
          }}
        >
          Abrir outra reclamação
        </Botao>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="font-headline text-xl font-bold text-on-surface">Abrir Reclamação</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Descreva o problema e nossa equipe responderá em breve.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            Categoria
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleForm}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {catLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <TextArea
          label="Descrição"
          name="description"
          value={form.description}
          onChange={handleForm}
          rows={4}
          placeholder="Descreva o problema com o máximo de detalhes possível..."
          required
        />
        <Campo
          label="URL do Anexo (opcional)"
          name="attachmentUrl"
          value={form.attachmentUrl}
          onChange={handleForm}
          placeholder="https://..."
        />
        <div className="flex justify-end pt-2">
          <Botao type="submit">
            <span className="flex items-center gap-2">
              <Icone name="send" className="text-lg" /> Enviar reclamação
            </span>
          </Botao>
        </div>
      </form>
    </div>
  );
}

// ─── Aba: Minhas Reclamações ─────────────────
function AbaMinhasReclamacoes({ reclamacoes }) {
  const [expandido, setExpandido] = useState(null);

  if (reclamacoes.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
        <Icone name="inbox" className="text-5xl opacity-30" />
        <p className="text-sm">Você ainda não abriu nenhuma reclamação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reclamacoes.map((rec) => (
        <div key={rec.id} className="glass-panel rounded-2xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-white/5 transition-all"
            onClick={() => setExpandido(expandido === rec.id ? null : rec.id)}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${STATUS_COLOR[rec.status]}`}
              >
                <Icone name={STATUS_ICON[rec.status]} className="text-xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-on-surface">{catLabel(rec.category)}</p>
                  <span className="text-xs text-on-surface-variant font-mono">{rec.protocolNumber}</span>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-1 max-w-md">{rec.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[rec.status]}`}
              >
                {rec.status.replace("_", " ")}
              </span>
              <Icone
                name={expandido === rec.id ? "expand_less" : "expand_more"}
                className="text-on-surface-variant text-xl"
              />
            </div>
          </button>

          {expandido === rec.id && (
            <div className="px-6 pb-5 border-t border-white/5 pt-4 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-highest/30 rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant mb-1">Protocolo</p>
                  <p className="text-sm font-semibold text-on-surface font-mono">{rec.protocolNumber}</p>
                </div>
                <div className="bg-surface-container-highest/30 rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant mb-1">Registrada em</p>
                  <p className="text-sm font-semibold text-on-surface">
                    {rec.createdAt?.replace("T", " ")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Descrição
                </p>
                <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3">
                  {rec.description}
                </p>
              </div>

              {rec.attachmentUrl && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Anexo
                  </p>
                  <a
                    href={rec.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Ver arquivo
                  </a>
                </div>
              )}

              {/* Respostas do admin */}
              {rec.interactions.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Respostas da administração
                  </p>
                  <div className="space-y-2">
                    {rec.interactions.map((i) => (
                      <div
                        key={i.id}
                        className="bg-surface-container-highest/30 rounded-xl p-3 border-l-2 border-primary/40"
                      >
                        <p className="text-sm text-on-surface">{i.response}</p>
                        <span
                          className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[i.status]}`}
                        >
                          {i.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-highest/20 rounded-xl p-3 flex items-center gap-2 text-on-surface-variant">
                  <Icone name="hourglass_empty" className="text-lg opacity-50" />
                  <p className="text-sm">Aguardando resposta da administração.</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
export function MinhasReclamacoes() {
  const [aba, setAba] = useState("nova");
  const [reclamacoes, setReclamacoes] = useState(MINHAS_RECLAMACOES_MOCK);

  const handleCriada = (nova) => {
    setReclamacoes((prev) => [nova, ...prev]);
    setAba("minhas");
  };

  const tabs = [
    { id: "nova", label: "Abrir Reclamação", icon: "add_circle" },
    { id: "minhas", label: "Minhas Reclamações", icon: "list_alt" },
  ];

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Área do Morador
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Minhas{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Reclamações
            </span>
          </h1>
        </header>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                aba === t.id
                  ? "bg-primary/20 text-primary"
                  : "text-on-surface-variant hover:bg-white/5"
              }`}
            >
              <Icone name={t.icon} className="text-lg" />
              {t.label}
              {t.id === "minhas" && reclamacoes.length > 0 && (
                <span className="ml-1 text-xs bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full">
                  {reclamacoes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {aba === "nova" ? (
          <AbaNovaReclamacao onCriada={handleCriada} />
        ) : (
          <AbaMinhasReclamacoes reclamacoes={reclamacoes} />
        )}
      </div>
    </div>
  );
}
