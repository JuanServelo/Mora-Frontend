import { useEffect, useMemo, useState } from "react";
import { Icone } from "../icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { preferenciasApi } from "../../services/preferenciasApi";
import {
  ALTURAS,
  CORES_BLOCO,
  LARGURAS,
  TIPOS_SERIE,
  VERSAO,
  alturaPx,
  classeDaLargura,
  configPadrao,
  hexDaCor,
  iguais,
  mover,
  normalizar,
  paletaAPartirDe,
} from "../../utils/painelPersonalizado";

/**
 * Painel que cada usuário monta do seu jeito.
 *
 * No modo **Personalizar** o usuário mostra ou esconde blocos, muda a ordem
 * (arrastando, ou pelas setas no celular) e, nas opções de cada bloco, a
 * largura, a altura, o tipo de gráfico e a cor — esta só entre as do tema.
 * **Salvar** grava no servidor, por usuário e por painel (`chave`). Quem nunca
 * personalizou vê o padrão da tela.
 *
 * `definicoes`: `[{ id, titulo, tamanho: "kpi" | "grafico" | "secao", tipos?,
 * rotulosTipo?, larguraPadrao?, alturaPadrao?, ocultoPorPadrao?, semCor?,
 * semAltura? (bloco de tamanho de gráfico que não é gráfico: lista, tabela),
 * render }]`. A ordem da lista é a ordem padrão. `render` recebe
 * `{ tipo, cor, paleta, altura }`: `cor` é o hexadecimal escolhido ou `null`
 * (automática), `paleta` a lista categórica começando por ela, `altura` em px.
 */
export function PainelPersonalizavel({ chave, definicoes }) {
  const toast = useToast();
  const porId = useMemo(() => new Map(definicoes.map((d) => [d.id, d])), [definicoes]);
  const padrao = useMemo(() => configPadrao(definicoes), [definicoes]);

  const [salvo, setSalvo] = useState(null);
  const [carregado, setCarregado] = useState(false);
  const [rascunho, setRascunho] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [arrastando, setArrastando] = useState(null);
  const [opcoesAbertas, setOpcoesAbertas] = useState(null);

  // Preferência que não carrega não impede o painel: ele aparece no padrão.
  useEffect(() => {
    let vivo = true;
    preferenciasApi
      .ler(chave)
      .then(({ data }) => vivo && setSalvo(data.valor))
      .catch(() => vivo && setSalvo(null))
      .finally(() => vivo && setCarregado(true));
    return () => {
      vivo = false;
    };
  }, [chave]);

  const atuais = useMemo(() => normalizar(salvo, definicoes), [salvo, definicoes]);
  const editando = rascunho !== null;
  const blocos = editando ? rascunho : atuais;

  const alterar = (id, mudanca) =>
    setRascunho((r) => r.map((b) => (b.id === id ? { ...b, ...mudanca } : b)));

  const sairDaEdicao = () => {
    setRascunho(null);
    setOpcoesAbertas(null);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      // Igual ao padrão: apaga a preferência, para o usuário voltar a seguir o
      // padrão da tela se ele mudar.
      if (iguais(rascunho, padrao)) {
        await preferenciasApi.remover(chave);
        setSalvo(null);
      } else {
        const valor = { versao: VERSAO, blocos: rascunho };
        await preferenciasApi.salvar(chave, valor);
        setSalvo(valor);
      }
      sairDaEdicao();
      toast.success("Painel salvo. Ele vai aparecer assim sempre que você entrar.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Não foi possível salvar o painel.");
    } finally {
      setSalvando(false);
    }
  };

  const soltar = (destino) => {
    if (arrastando === null) return;
    setRascunho((r) => mover(r, arrastando, destino));
    setArrastando(null);
  };

  const visiveis = blocos.filter((b) => b.visivel).length;

  if (!carregado) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra do modo de edição */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          editando ? "glass-panel rounded-2xl px-4 py-3 border border-primary/30" : ""
        }`}
      >
        {editando ? (
          <p className="text-sm text-on-surface flex flex-wrap items-center gap-x-2 gap-y-1">
            <Icone name="tune" className="text-primary" />
            Arraste para reordenar. Em <Icone name="settings" className="text-base" /> mude tamanho, gráfico e cor.
          </p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {editando ? (
            <>
              <button
                type="button"
                onClick={() => setRascunho(padrao)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 cursor-pointer"
              >
                <Icone name="restart_alt" className="text-base" /> Restaurar padrão
              </button>
              <button
                type="button"
                onClick={sairDaEdicao}
                disabled={salvando}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer disabled:opacity-50"
              >
                <Icone name="save" className="text-base" /> {salvando ? "Salvando…" : "Salvar"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRascunho(atuais)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 border border-veu/10 cursor-pointer"
            >
              <Icone name="dashboard_customize" className="text-base" /> Personalizar
            </button>
          )}
        </div>
      </div>

      {!editando && visiveis === 0 ? (
        <div className="glass-panel rounded-3xl py-14 flex flex-col items-center gap-3 text-on-surface-variant">
          <Icone name="visibility_off" className="text-4xl opacity-40" />
          <p className="text-sm">Todos os blocos estão escondidos. Clique em <strong>Personalizar</strong> para escolher o que ver.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {blocos.map((bloco, indice) => {
            const def = porId.get(bloco.id);
            if (!editando && !bloco.visivel) return null;
            const conteudo = def.render({
              tipo: bloco.tipo,
              cor: hexDaCor(bloco.cor),
              paleta: paletaAPartirDe(bloco.cor),
              altura: alturaPx(bloco, def),
            });

            if (!editando) {
              return (
                <div key={bloco.id} className={`${classeDaLargura(def, bloco)} min-w-0`}>
                  {conteudo}
                </div>
              );
            }

            const abertas = opcoesAbertas === bloco.id;
            return (
              <div
                key={bloco.id}
                draggable={!abertas}
                onDragStart={() => setArrastando(indice)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => soltar(indice)}
                onDragEnd={() => setArrastando(null)}
                className={`${classeDaLargura(def, bloco)} min-w-0 rounded-3xl border-2 border-dashed transition ${
                  arrastando === indice ? "border-primary opacity-50" : abertas ? "border-primary" : "border-primary/30"
                } ${bloco.visivel ? "" : "opacity-50"}`}
              >
                <BarraDoBloco
                  def={def}
                  bloco={bloco}
                  primeiro={indice === 0}
                  ultimo={indice === blocos.length - 1}
                  abertas={abertas}
                  onOpcoes={() => setOpcoesAbertas(abertas ? null : bloco.id)}
                  onMover={(passo) => setRascunho((r) => mover(r, indice, indice + passo))}
                  onAlterar={(mudanca) => alterar(bloco.id, mudanca)}
                />
                {abertas && <OpcoesDoBloco def={def} bloco={bloco} onAlterar={(m) => alterar(bloco.id, m)} />}
                {/* O conteúdo não responde a clique na edição: um card que navega
                    tiraria o usuário da tela no meio da montagem. */}
                <div className={`pointer-events-none select-none ${bloco.visivel ? "" : "grayscale"}`}>
                  {conteudo}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BotaoIcone({ icone, titulo, onClick, disabled, ativo }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        ativo ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-veu/10"
      }`}
    >
      <Icone name={icone} className="text-base" />
    </button>
  );
}

function BarraDoBloco({ def, bloco, primeiro, ultimo, abertas, onOpcoes, onMover, onAlterar }) {
  const temOpcoes = def.tamanho === "grafico" || def.tipos?.length > 1 || !def.semCor;
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 pt-2 pb-1">
      <Icone name="drag_indicator" className="text-on-surface-variant cursor-grab text-lg" />
      <span className="text-xs font-semibold text-on-surface truncate flex-1 min-w-[4rem]" title={def.titulo}>
        {def.titulo}
      </span>
      <BotaoIcone icone="arrow_back" titulo="Mover para antes" onClick={() => onMover(-1)} disabled={primeiro} />
      <BotaoIcone icone="arrow_forward" titulo="Mover para depois" onClick={() => onMover(1)} disabled={ultimo} />
      {temOpcoes && <BotaoIcone icone="settings" titulo="Opções do bloco" ativo={abertas} onClick={onOpcoes} />}
      <BotaoIcone
        icone={bloco.visivel ? "visibility" : "visibility_off"}
        titulo={bloco.visivel ? "Esconder" : "Mostrar"}
        ativo={bloco.visivel}
        onClick={() => onAlterar({ visivel: !bloco.visivel })}
      />
    </div>
  );
}

function Grupo({ titulo, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Opcao({ ativo, onClick, icone, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
        ativo ? "bg-primary/20 text-primary" : "bg-veu/5 text-on-surface-variant hover:bg-veu/10"
      }`}
    >
      {icone && <Icone name={icone} className="text-sm" />}
      {children}
    </button>
  );
}

/** As opções de um bloco, abertas pela engrenagem. Só aparece o que se aplica. */
function OpcoesDoBloco({ def, bloco, onAlterar }) {
  const rotuloTipo = (t) => def.rotulosTipo?.[t] ?? TIPOS_SERIE[t] ?? { rotulo: t, icone: "insert_chart" };

  return (
    <div className="mx-2 mb-2 p-3 rounded-2xl bg-surface-container-highest/60 grid gap-3 sm:grid-cols-2">
      {def.tamanho === "grafico" && (
        <Grupo titulo="Largura">
          {Object.entries(LARGURAS).map(([id, cfg]) => (
            <Opcao key={id} icone={cfg.icone} ativo={bloco.largura === id} onClick={() => onAlterar({ largura: id })}>
              {cfg.rotulo}
            </Opcao>
          ))}
        </Grupo>
      )}
      {def.tamanho === "grafico" && !def.semAltura && (
        <Grupo titulo="Altura">
          {Object.entries(ALTURAS).map(([id, cfg]) => (
            <Opcao key={id} ativo={bloco.altura === id} onClick={() => onAlterar({ altura: id })}>
              {cfg.rotulo}
            </Opcao>
          ))}
        </Grupo>
      )}
      {def.tipos?.length > 1 && (
        <Grupo titulo="Tipo de gráfico">
          {def.tipos.map((t) => (
            <Opcao key={t} icone={rotuloTipo(t).icone} ativo={bloco.tipo === t} onClick={() => onAlterar({ tipo: t })}>
              {rotuloTipo(t).rotulo}
            </Opcao>
          ))}
        </Grupo>
      )}
      {!def.semCor && (
        <Grupo titulo="Cor">
          <button
            type="button"
            title="Automática"
            aria-label="Cor automática"
            onClick={() => onAlterar({ cor: null })}
            className={`h-7 px-2 rounded-full text-[11px] font-semibold border cursor-pointer ${
              bloco.cor === null ? "border-primary text-primary" : "border-veu/20 text-on-surface-variant"
            }`}
          >
            Auto
          </button>
          {Object.entries(CORES_BLOCO).map(([id, cfg]) => (
            <button
              key={id}
              type="button"
              title={cfg.rotulo}
              aria-label={`Cor ${cfg.rotulo}`}
              onClick={() => onAlterar({ cor: id })}
              className={`w-7 h-7 rounded-full cursor-pointer transition ${
                bloco.cor === id ? "ring-2 ring-offset-2 ring-offset-surface ring-on-surface scale-110" : "hover:scale-110"
              }`}
              style={{ background: cfg.hex }}
            />
          ))}
        </Grupo>
      )}
    </div>
  );
}
