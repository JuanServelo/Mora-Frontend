// src/pages/usuario/Avisos.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icone } from "../../components/icones/Icone";
import { comunicacaoApi, urlDaImagem } from "../../services/comunicacaoApi";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { formatarData } from "../../utils/datas";

const FILTROS = [
  { id: "novos", rotulo: "Novos" },
  { id: "lidos", rotulo: "Já lidos" },
  { id: "todos", rotulo: "Todos" },
];

/**
 * Avisos do condomínio, com confirmação de leitura (RF-12).
 *
 * O aviso vem do portaria-service, onde sempre esteve; o "já li" vem do
 * comunicacao-service. A junção acontece no backend — se a tela cruzasse as
 * duas fontes, cada tela cruzaria de um jeito.
 *
 * **Abrir é ler.** O comunicado se registra ao ser aberto, e sai da lista de
 * novos. Quem quiser rever procura em "Já lidos": a lista principal mostra o
 * que ainda exige atenção, não o histórico inteiro.
 */
export function Avisos() {
  const { buscar: recarregarSino } = useNotificacoes();

  const [avisos, setAvisos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("novos");
  const [aberto, setAberto] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await comunicacaoApi.listarAvisos();
      setAvisos(data.avisos ?? []);
      setErro("");
    } catch (e) {
      setErro(e.response?.data?.mensagem ?? "Não foi possível carregar os avisos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const pendentes = avisos.filter((a) => !a.lido).length;

  // Recorte de tela sobre a lista que já veio inteira — são os avisos ativos de
  // um condomínio, não uma base que justifique nova consulta.
  const visiveis = useMemo(() => {
    const combina = (a) =>
      filtro === "lidos" ? a.lido : filtro === "todos" ? true : !a.lido;

    // O aviso aberto fica, mesmo que já não case com o filtro. Sem esta
    // exceção, abrir um aviso em "Novos" o marcava como lido e ele sumia no
    // mesmo instante — o usuário clicava e o texto desaparecia antes de ser
    // lido. Ele sai da lista quando for fechado, ou ao abrir outro.
    return avisos.filter((a) => combina(a) || a.id === aberto);
  }, [avisos, filtro, aberto]);

  /**
   * Abrir registra a leitura.
   *
   * A lista local é atualizada na hora, mas o aviso **não** é retirado de
   * `visiveis` enquanto estiver aberto: sumir debaixo do dedo de quem acabou de
   * clicar é desorientador. Ele sai quando o usuário fecha ou abre outro.
   */
  async function alternar(aviso) {
    if (aberto === aviso.id) {
      // Fechar basta: a lista local já sabe que o aviso virou lido, e o filtro
      // volta a valer sozinho. Recarregar do servidor aqui só piscaria a tela.
      setAberto(null);
      return;
    }

    setAberto(aviso.id);
    if (aviso.lido) return;

    try {
      const { data } = await comunicacaoApi.confirmarLeitura(aviso.id);
      setAvisos((lista) =>
        lista.map((a) =>
          a.id === aviso.id ? { ...a, lido: true, lidoEm: data.leitura?.confirmadaEm } : a,
        ),
      );
      recarregarSino();
    } catch (e) {
      setErro(e.response?.data?.mensagem ?? "Não foi possível registrar a leitura.");
    }
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-24 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="pt-2">
          <h1 className="font-headline text-3xl font-bold text-on-surface">Avisos</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {pendentes > 0
              ? `${pendentes} aviso${pendentes > 1 ? "s" : ""} que você ainda não abriu`
              : "Você está em dia com os comunicados"}
          </p>
        </header>

        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFiltro(f.id); setAberto(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                filtro === f.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-veu/5"
              }`}
            >
              {f.rotulo}
              {f.id === "novos" && pendentes > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                  {pendentes}
                </span>
              )}
            </button>
          ))}
        </div>

        {erro && (
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3 text-on-surface-variant">
            <Icone name="error" className="text-error" />
            {erro}
          </div>
        )}

        {carregando && <p className="text-sm text-on-surface-variant">Carregando…</p>}

        {!carregando && visiveis.length === 0 && !erro && (
          <div className="glass-panel rounded-3xl py-20 flex flex-col items-center gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icone name={filtro === "novos" ? "task_alt" : "campaign"} className="text-primary text-3xl" />
            </div>
            <div>
              <p className="font-semibold text-on-surface mb-1">
                {filtro === "novos"
                  ? "Nenhum aviso novo"
                  : filtro === "lidos"
                    ? "Você ainda não leu nenhum aviso"
                    : "Nenhum aviso ativo"}
              </p>
              <p className="text-xs text-on-surface-variant">
                {filtro === "novos"
                  ? "Os que você já abriu ficam em “Já lidos”."
                  : "Comunicados da administração aparecem aqui."}
              </p>
            </div>
          </div>
        )}

        {visiveis.map((a) => (
          <CartaoAviso
            key={a.id}
            aviso={a}
            aberto={aberto === a.id}
            aoAlternar={() => alternar(a)}
          />
        ))}
      </div>
    </div>
  );
}

function CartaoAviso({ aviso, aberto, aoAlternar }) {
  return (
    <article
      className={`glass-panel rounded-3xl overflow-hidden transition ${
        !aviso.lido ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <button
        onClick={aoAlternar}
        className="w-full text-left flex items-start gap-3 p-5 hover:bg-veu/[0.03] transition cursor-pointer"
      >
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            aviso.lido ? "bg-veu/10 text-on-surface-variant" : "bg-primary/15 text-primary"
          }`}
        >
          <Icone name="campaign" className="text-xl" />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className={`font-headline text-lg leading-snug ${
              aviso.lido ? "font-semibold text-on-surface-variant" : "font-bold text-on-surface"
            }`}
          >
            {aviso.titulo}
          </h2>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            {aviso.autor ? `${aviso.autor} · ` : ""}
            até {formatarData(aviso.dataFim)}
            {aviso.imagemUrl && " · com imagem"}
          </p>
        </div>

        <Icone
          name={aberto ? "expand_less" : "expand_more"}
          className="shrink-0 text-on-surface-variant mt-2"
        />
      </button>

      {aberto && (
        <div className="px-5 pb-5 space-y-4 border-t border-veu/5 pt-4">
          {aviso.imagemUrl && (
            <img
              src={urlDaImagem(aviso.imagemUrl)}
              alt=""
              // Teto de altura: sem ele uma foto em retrato empurra o texto do
              // comunicado para fora da tela, e o que importa é a mensagem.
              className="w-full max-h-[28rem] object-contain rounded-2xl border border-veu/10 bg-surface-container-low"
            />
          )}

          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words">
            {aviso.mensagem}
          </p>

          {aviso.lidoEm && (
            <p className="text-xs text-green-400 flex items-center gap-1.5 pt-1">
              <Icone name="check_circle" className="text-base" />
              {/* `lidoEm` é um instante com fuso, diferente de dataInicio e
                  dataFim, que são datas puras. Recortar o ISO de um timestamp
                  mostraria a hora em UTC — três horas à frente, e o dia errado
                  perto da meia-noite. */}
              Leitura registrada em{" "}
              {new Date(aviso.lidoEm).toLocaleString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
