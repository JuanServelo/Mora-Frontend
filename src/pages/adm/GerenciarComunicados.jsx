// src/pages/adm/GerenciarComunicados.jsx
// Página ADMIN — Avisos do condomínio: publicar e acompanhar quem leu.
//
// Publicar um aviso é possível em dois lugares, de propósito: aqui e na aba de
// avisos dentro de Conhecimento. O que existe só aqui é a outra metade — quem
// confirmou a leitura —, e é ela que justifica a tela própria: publicar sem
// saber se chegou não é comunicar.
//
// As duas escrevem pelo mesmo cliente (`avisoApi`, em comunicacaoApi), então
// não há dois caminhos para o mesmo dado, só duas portas para a mesma tarefa.
import { useCallback, useEffect, useRef, useState } from "react";
import { avisoApi, comunicacaoApi, urlDaImagem } from "../../services/comunicacaoApi";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { formatarData } from "../../utils/datas";
import { useTranslation } from "react-i18next";
import { idiomaAtual } from "../../i18n";

const ABAS = [
  { id: "avisos", rotuloKey: "admin.abas.avisos", icone: "campaign" },
  { id: "leitura", rotuloKey: "admin.abas.leitura", icone: "fact_check" },
];

export function GerenciarComunicados() {
  const { t } = useTranslation("avisos");
  const [aba, setAba] = useState("avisos");

  // Mesmo invólucro das outras telas administrativas. Sem ele a página colava
  // nas bordas: o AppLayout entrega o <main> sem padding, e é cada tela que
  // define o próprio respiro.
  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            {t("admin.cabecalho.painelAdministrativo")}
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {t("admin.cabecalho.comunicados")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("admin.cabecalho.doCondominio")}
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {t("admin.cabecalho.subtitulo")}
          </p>
        </header>

        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit">
          {ABAS.map((item) => (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === item.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-veu/5"
              }`}
            >
              <Icone name={item.icone} className="text-lg" />
              {t(item.rotuloKey)}
            </button>
          ))}
        </div>

        {aba === "avisos" ? <AbaAvisos /> : <AbaLeitura />}
      </div>
    </div>
  );
}

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


/**
 * Escolha da imagem do aviso — opcional.
 *
 * O arquivo sobe assim que é escolhido, antes de o aviso ser salvo: o upload e
 * o aviso vivem em serviços diferentes, e o que o formulário guarda é só a URL
 * devolvida. Enviar junto com o aviso exigiria o portaria saber receber
 * arquivo, coisa que ele não faz em lugar nenhum.
 */
function CampoImagem({ valor, aoMudar, aoFalhar }) {
  const { t } = useTranslation("avisos");
  const entrada = useRef(null);
  const [enviando, setEnviando] = useState(false);

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviando(true);
    try {
      const { data } = await comunicacaoApi.enviarImagemAviso(arquivo);
      aoMudar(data.url);
      aoFalhar("");
    } catch (err) {
      aoFalhar(err.response?.data?.mensagem || t("admin.imagem.erroEnvio"));
    } finally {
      setEnviando(false);
      // Limpa o campo para que escolher o MESMO arquivo de novo volte a
      // disparar o evento — sem isso, uma segunda tentativa após erro não faz
      // nada e parece que o botão quebrou.
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
        {t("admin.imagem.label")}
      </label>

      {valor ? (
        <div className="relative w-fit">
          <img
            src={urlDaImagem(valor)}
            alt={t("admin.imagem.alt")}
            className="max-h-48 rounded-xl border border-veu/10"
          />
          <button
            type="button"
            onClick={() => aoMudar("")}
            aria-label={t("admin.imagem.remover")}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/90 transition cursor-pointer"
          >
            <Icone name="close" className="text-base" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 py-6 rounded-xl border border-dashed border-veu/15 text-on-surface-variant hover:border-primary/40 hover:text-primary transition disabled:opacity-50 cursor-pointer"
        >
          <Icone name={enviando ? "progress_activity" : "add_photo_alternate"} className={enviando ? "animate-spin" : ""} />
          {enviando ? t("comum:acoes.enviando") : t("admin.imagem.escolher")}
        </button>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={escolher}
        className="hidden"
      />
      <p className="text-[11px] text-on-surface-variant/60 ml-1">{t("admin.imagem.formatos")}</p>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: AVISOS E COMUNICADOS — por condomínio
// ════════════════════════════════════════════
const PUBLICOS = [
  { value: "TODOS", rotuloKey: "publico.todos" },
  { value: "MORADORES", rotuloKey: "publico.moradores" },
  { value: "FUNCIONARIOS", rotuloKey: "publico.funcionarios" },
];
const PUBLICO_LABEL = Object.fromEntries(PUBLICOS.map((p) => [p.value, p.rotuloKey]));

const AVISO_INICIAL = {
  titulo: "",
  mensagem: "",
  dataInicio: "",
  dataFim: "",
  publicoAlvo: "TODOS",
  autor: "",
  imagemUrl: "",
  publicado: false,
};

function vigente(aviso) {
  if (!aviso.publicado) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return aviso.dataInicio <= hoje && aviso.dataFim >= hoje;
}

function AbaAvisos() {
  const { t } = useTranslation("avisos");
  const { usuario } = useAuth();
  const confirm = useConfirm();
  const condominioId = usuario?.condominioId;
  const [avisos, setAvisos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [form, setForm] = useState(AVISO_INICIAL);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarAvisos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  const carregarAvisos = async () => {
    try {
      const res = await avisoApi.listar(condominioId);
      setAvisos(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar avisos:", err);
    } finally {
      setCarregando(false);
    }
  };

  const handleForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    if (form.dataInicio && form.dataFim && form.dataInicio > form.dataFim) {
      setErro(t("admin.form.erroPeriodo"));
      return;
    }
    const payload = { ...form, condominioId };
    try {
      if (editando) {
        const res = await avisoApi.atualizar(editando, payload);
        setAvisos((prev) => prev.map((a) => (a.id === editando ? res.data : a)));
        setEditando(null);
      } else {
        const res = await avisoApi.criar(payload);
        setAvisos((prev) => [res.data, ...prev]);
        setCriando(false);
      }
      setForm(AVISO_INICIAL);
    } catch (err) {
      setErro(err.response?.data?.mensagem || err.response?.data?.message || t("admin.form.erroSalvar"));
    }
  };

  const excluir = async (aviso) => {
    const ok = await confirm({
      titulo: t("admin.excluir.titulo"),
      mensagem: t("admin.excluir.mensagem", { titulo: aviso.titulo }),
      confirmarTexto: t("admin.excluir.confirmar"),
      cancelarTexto: t("comum:acoes.cancelar"),
      variante: "danger",
    });
    if (!ok) return;
    try {
      await avisoApi.excluir(aviso.id);
      setAvisos((prev) => prev.filter((a) => a.id !== aviso.id));
      if (expandido === aviso.id) setExpandido(null);
    } catch (err) {
      console.error("Erro ao excluir aviso:", err);
    }
  };

  const iniciarEdicao = (aviso) => {
    setForm({
      titulo: aviso.titulo,
      mensagem: aviso.mensagem,
      dataInicio: aviso.dataInicio,
      dataFim: aviso.dataFim,
      publicoAlvo: aviso.publicoAlvo,
      autor: aviso.autor || "",
      imagemUrl: aviso.imagemUrl || "",
      publicado: aviso.publicado,
    });
    setEditando(aviso.id);
    setCriando(false);
    setExpandido(null);
  };

  const encerrar = async (aviso) => {
    try {
      const res = await avisoApi.encerrar(aviso.id);
      setAvisos((prev) => prev.map((a) => (a.id === aviso.id ? res.data : a)));
    } catch (err) {
      console.error("Erro ao encerrar aviso:", err);
    }
  };

  if (!condominioId) {
    return (
      <div className="glass-panel rounded-2xl py-16 text-center text-on-surface-variant">
        {t("admin.semCondominio")}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        {!criando && !editando && (
          <Botao onClick={() => { setCriando(true); setForm(AVISO_INICIAL); setErro(""); }}>
            <span className="flex items-center gap-2">
              <Icone name="add" className="text-lg" /> {t("admin.novo")}
            </span>
          </Botao>
        )}
      </div>

      {(criando || editando) && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {editando ? t("admin.editar") : t("admin.novo")}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <Campo label={t("admin.form.titulo")} name="titulo" value={form.titulo} onChange={handleForm} placeholder={t("admin.form.tituloPlaceholder")} required />
            <TextArea label={t("admin.form.mensagem")} name="mensagem" value={form.mensagem} onChange={handleForm} rows={5} placeholder={t("admin.form.mensagemPlaceholder")} required />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("admin.form.inicioExibicao")}</label>
                <input type="date" name="dataInicio" value={form.dataInicio} onChange={handleForm} required className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("admin.form.fimExibicao")}</label>
                <input type="date" name="dataFim" value={form.dataFim} onChange={handleForm} required className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("admin.form.publicoAlvo")}</label>
                <select name="publicoAlvo" value={form.publicoAlvo} onChange={handleForm} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none">
                  {PUBLICOS.map((p) => (<option key={p.value} value={p.value}>{t(p.rotuloKey)}</option>))}
                </select>
              </div>
            </div>
            <Campo label={t("admin.form.autor")} name="autor" value={form.autor} onChange={handleForm} placeholder={t("admin.form.autorPlaceholder")} />

            <CampoImagem
              valor={form.imagemUrl}
              aoMudar={(url) => setForm((f) => ({ ...f, imagemUrl: url }))}
              aoFalhar={setErro}
            />

            <div className="flex items-center gap-3">
              <input type="checkbox" id="aviso-publicado" name="publicado" checked={form.publicado} onChange={handleForm} className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="aviso-publicado" className="text-sm text-on-surface-variant">{t("admin.form.publicar")}</label>
            </div>
            {erro && <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setCriando(false); setEditando(null); setForm(AVISO_INICIAL); setErro(""); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">{t("comum:acoes.cancelar")}</button>
              <Botao type="submit">{editando ? t("admin.form.salvarAlteracoes") : t("admin.form.criar")}</Botao>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t("admin.resumo.total"), valor: avisos.length, icon: "campaign", color: "primary" },
          { label: t("admin.resumo.vigentes"), valor: avisos.filter(vigente).length, icon: "check_circle", color: "primary" },
          { label: t("admin.resumo.encerrados"), valor: avisos.filter((a) => !vigente(a)).length, icon: "history", color: "error" },
        ].map((c) => (
          <div key={c.label} className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${c.color}/10 flex items-center justify-center`}>
              <Icone name={c.icon} className={`text-${c.color} text-2xl`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-on-surface">{c.valor}</p>
              <p className="text-xs text-on-surface-variant">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {avisos.map((aviso) => (
          <div key={aviso.id} className="glass-panel rounded-2xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-veu/5 transition-all" onClick={() => setExpandido(expandido === aviso.id ? null : aviso.id)}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name="campaign" className="text-primary text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{aviso.titulo}</p>
                  <p className="text-xs text-on-surface-variant">
                    {/* `dataInicio` e `dataFim` são datas puras (LocalDate no
                        portaria). Passar por `new Date()` as trata como meia-noite
                        UTC e, em Brasília, joga o dia para trás: um aviso que
                        começa em 01/09 aparecia como 31/08. */}
                    {formatarData(aviso.dataInicio)} – {formatarData(aviso.dataFim)}
                    {" · "}{PUBLICO_LABEL[aviso.publicoAlvo] ? t(PUBLICO_LABEL[aviso.publicoAlvo]) : aviso.publicoAlvo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${vigente(aviso) ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>{vigente(aviso) ? t("admin.status.vigente") : aviso.publicado ? t("admin.status.foraDoPeriodo") : t("admin.status.rascunho")}</span>
                <Icone name={expandido === aviso.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
              </div>
            </button>
            {expandido === aviso.id && (
              <div className="px-6 pb-5 border-t border-veu/5 pt-4 space-y-4">
                <div className="bg-surface-container-highest/30 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t("admin.lista.mensagem")}</p>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words">{aviso.mensagem}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aviso.publicado && (
                    <button onClick={() => encerrar(aviso)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-error/10 text-error border-error/20 hover:bg-error/20 transition-all cursor-pointer">{t("admin.lista.encerrar")}</button>
                  )}
                  <button onClick={() => iniciarEdicao(aviso)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-veu/5 text-on-surface-variant hover:text-on-surface hover:bg-veu/10 transition-all cursor-pointer"><Icone name="edit" className="text-sm" /> {t("comum:acoes.editar")}</button>
                  <button onClick={() => excluir(aviso)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer"><Icone name="delete" className="text-sm" /> {t("comum:acoes.excluir")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {avisos.length === 0 && !carregando && (
          <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="campaign" className="text-5xl opacity-30" />
            <p className="text-sm">{t("admin.lista.vazio")}</p>
          </div>
        )}
        {carregando && (
          <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
            <p className="text-sm">{t("admin.lista.carregando")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quem leu cada comunicado (RF-12).
 *
 * O total de destinatários vem do auth-api, não da contagem de confirmações —
 * "8 confirmaram" sozinho não distingue 8 de 9 de 8 de 80.
 */
function AbaLeitura() {
  const { t } = useTranslation("avisos");
  const [avisos, setAvisos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await comunicacaoApi.panoramaLeituras();
      setAvisos(data.avisos ?? []);
      setErro("");
    } catch (e) {
      setErro(e.response?.data?.mensagem ?? t("admin.leitura.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }, [t]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-6">
      {erro && (
        <div className="glass-panel rounded-2xl p-4 flex items-center gap-3 text-on-surface-variant">
          <Icone name="error" className="text-error" />
          {erro}
        </div>
      )}

      {carregando && <p className="text-sm text-on-surface-variant">{t("comum:estado.carregando")}</p>}

      {!carregando && avisos.length === 0 && !erro && (
        <div className="glass-panel rounded-3xl py-16 flex flex-col items-center gap-3 text-center px-6">
          <Icone name="campaign" className="text-3xl text-on-surface-variant/40" />
          <p className="font-semibold text-on-surface">{t("admin.leitura.vazioTitulo")}</p>
          <p className="text-xs text-on-surface-variant max-w-sm">
            {t("admin.leitura.vazioDescricao")}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {avisos.map((a) => (
          <CartaoAviso
            key={a.id}
            aviso={a}
            aberto={aberto === a.id}
            aoAlternar={() => setAberto(aberto === a.id ? null : a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CartaoAviso({ aviso, aberto, aoAlternar }) {
  const { t } = useTranslation("avisos");
  const [relatorio, setRelatorio] = useState(null);

  useEffect(() => {
    // O detalhe só é buscado quando alguém abre: são N avisos na tela, e cada
    // relatório custa uma consulta ao auth-api para montar a lista de quem falta.
    if (!aberto || relatorio) return;
    comunicacaoApi.relatorioLeitura(aviso.id)
      .then(({ data }) => setRelatorio(data))
      .catch(() => setRelatorio({ erro: true }));
  }, [aberto, aviso.id, relatorio]);

  // Estado derivado, não marcado dentro do efeito: "aberto e ainda sem
  // relatório" já é exatamente a definição de carregando.
  const carregando = aberto && !relatorio;

  return (
    <div className="glass-panel rounded-3xl overflow-hidden">
      <button
        onClick={aoAlternar}
        className="w-full text-left px-6 py-5 flex items-center gap-4 hover:bg-veu/5 transition cursor-pointer"
      >
        <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Icone name="campaign" className="text-xl" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-on-surface truncate">{aviso.titulo}</h2>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            {rotuloPublico(aviso.publicoAlvo, t)} · {t("admin.leitura.ate", { data: formatarData(aviso.dataFim) })}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-on-surface tabular-nums">{aviso.confirmacoes}</p>
          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
            {t("admin.leitura.confirmacoes")}
          </p>
        </div>

        <Icone
          name={aberto ? "expand_less" : "expand_more"}
          className="shrink-0 text-on-surface-variant"
        />
      </button>

      {aberto && (
        <div className="px-6 pb-6 border-t border-veu/5 pt-4">
          {carregando && <p className="text-sm text-on-surface-variant">{t("admin.leitura.carregandoDestinatarios")}</p>}

          {relatorio?.erro && (
            <p className="text-sm text-on-surface-variant">
              {t("admin.leitura.erroRelatorio")}
            </p>
          )}

          {relatorio && !relatorio.erro && (
            <>
              {/* `total` vem nulo quando o auth-api não respondeu. Mostrar uma
                  porcentagem inventada seria pior que não mostrar nenhuma. */}
              {relatorio.total === null ? (
                <p className="text-xs text-on-surface-variant mb-4">
                  {relatorio.observacao}
                </p>
              ) : (
                <div className="mb-4">
                  <div className="flex items-end justify-between mb-1.5">
                    <p className="text-sm text-on-surface">
                      <span className="font-bold">{relatorio.confirmados}</span>
                      <span className="text-on-surface-variant">{t("admin.leitura.deTotalConfirmaram", { total: relatorio.total })}</span>
                    </p>
                    <p className="text-xs text-on-surface-variant tabular-nums">
                      {Math.round((relatorio.confirmados / relatorio.total) * 100)}%
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-veu/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(relatorio.confirmados / relatorio.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <ul className="divide-y divide-veu/5">
                {relatorio.destinatarios?.map((d) => (
                  <li key={d.usuarioId} className="py-2.5 flex items-center gap-3">
                    <Icone
                      name={d.lido ? "check_circle" : "radio_button_unchecked"}
                      className={`text-lg shrink-0 ${d.lido ? "text-green-400" : "text-on-surface-variant/40"}`}
                    />
                    <span className={`text-sm flex-1 min-w-0 truncate ${d.lido ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {d.nome ?? t("admin.leitura.usuario", { id: d.usuarioId })}
                    </span>
                    <span className="text-[11px] text-on-surface-variant/60 shrink-0">
                      {(d.perfil ?? "").replace("_", " ").toLowerCase()}
                    </span>
                    <span className="text-[11px] text-on-surface-variant/60 shrink-0 w-32 text-right tabular-nums">
                      {d.lidoEm
                        ? new Date(d.lidoEm).toLocaleString(idiomaAtual(), {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function rotuloPublico(alvo, t) {
  const chave = { TODOS: "publico.todos", MORADORES: "publico.moradores", FUNCIONARIOS: "publico.funcionarios" }[alvo];
  return chave ? t(chave) : alvo;
}
