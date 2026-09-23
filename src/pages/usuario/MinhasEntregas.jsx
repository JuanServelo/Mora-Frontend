// src/pages/usuario/MinhasEntregas.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { entregaApi } from "../../services/entregasApi";
import { acessoApi } from "../../services/acessoApi";
import { Icone } from "../../components/icones/Icone";
import { Botao } from "../../components/botoes/Botao";
import { Campo } from "../../components/campos/Campo";
import { PERFIS, PERFIS_FUNCIONARIO } from "../../utils/perfis";

// ─── helpers ─────────────────────────────────
const STATUS = {
  PENDENTE: { label: "Pendente", color: "bg-secondary/10 text-secondary", icon: "schedule" },
  RETIRADA: { label: "Retirada", color: "bg-primary/10 text-primary",   icon: "check_circle" },
};

function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

// Data local: toISOString() devolveria UTC e adiantaria o dia em UTC-3.
function hoje() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")].join("-");
}

const inputCls =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all";

const selectCls =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all";

// ════════════════════════════════════════════
export function MinhasEntregas() {
  const { usuario } = useAuth();
  const [todasEntregas, setTodasEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [modalRetirada, setModalRetirada] = useState(null);
  const [erroRetirada, setErroRetirada] = useState("");

  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");

  // Porteiro e síndico operam a portaria: registram a chegada e veem tudo.
  const ehOperador = [PERFIS.PORTEIRO, PERFIS.ADMIN_SINDICO, PERFIS.ADMIN_GERAL]
    .includes(usuario?.perfil);
  const [registrando, setRegistrando] = useState(false);
  const [usuariosCondo, setUsuariosCondo] = useState([]);

  // Devolve a promise e não mexe em `carregando`: quem chama decide se isso
  // é a carga inicial (com spinner) ou um refresh silencioso após registrar.
  const carregar = useCallback(() => {
    return entregaApi
      .listarTodas()
      .then((res) => setTodasEntregas(res.data || []))
      .catch((err) => console.error("Erro ao carregar entregas:", err));
  }, []);

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  // Destinatários possíveis; só o operador precisa da lista.
  useEffect(() => {
    if (!ehOperador) return;
    acessoApi.listarUsuariosCondominio()
      .then((res) => setUsuariosCondo(res.data?.usuarios || []))
      .catch(() => setUsuariosCondo([]));
  }, [ehOperador]);

  // Morador vê o que é dele; operador vê o condomínio inteiro.
  const minhasEntregas = useMemo(() => {
    if (ehOperador) return todasEntregas;
    return todasEntregas.filter((e) => {
      const porId = usuario?.id && e.destinatarioId === usuario.id;
      const porApt =
        usuario?.bloco &&
        usuario?.apartamento &&
        e.bloco === usuario.bloco &&
        e.apartamento === usuario.apartamento;
      return porId || porApt;
    });
  }, [todasEntregas, usuario, ehOperador]);

  const filtradas = useMemo(() => {
    return minhasEntregas.filter((e) => {
      if (filtroStatus !== "TODOS" && e.status !== filtroStatus) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (
          !e.descricao?.toLowerCase().includes(q) &&
          !e.remetente?.toLowerCase().includes(q) &&
          !e.destinatarioNome?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [minhasEntregas, filtroStatus, busca]);

  async function handleConfirmarRetirada(entrega, dataRetirada) {
    setErroRetirada("");
    try {
      const res = await entregaApi.atualizar(entrega.id, {
        ...entrega,
        status: "RETIRADA",
        dataRetirada,
        recebedorNome: usuario?.nome ?? entrega.destinatarioNome,
      });
      setTodasEntregas((prev) =>
        prev.map((e) => (e.id === entrega.id ? res.data : e)),
      );
      setModalRetirada(null);
      setExpandido(null);
    } catch (err) {
      setErroRetirada("Não foi possível marcar como retirada. Tente novamente.");
      console.error(err);
    }
  }

  const contadores = {
    total:    minhasEntregas.length,
    pendente: minhasEntregas.filter((e) => e.status === "PENDENTE").length,
    retirada: minhasEntregas.filter((e) => e.status === "RETIRADA").length,
  };

  const temFiltro = filtroStatus !== "TODOS" || busca;

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Serviços
          </p>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
                {ehOperador ? "Controle de " : "Minhas "}
                <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                  Encomendas
                </span>
              </h1>
              {ehOperador ? (
                <p className="text-on-surface-variant text-sm mt-1">
                  Registre a chegada de encomendas para moradores e funcionários.
                </p>
              ) : usuario?.bloco && usuario?.apartamento ? (
                <p className="text-on-surface-variant text-sm mt-1">
                  {usuario.bloco} · Apt {usuario.apartamento}
                </p>
              ) : null}
            </div>
            {ehOperador && (
              <Botao onClick={() => setRegistrando(true)}>
                <span className="flex items-center gap-2">
                  <Icone name="add" className="text-lg" />Registrar entrega
                </span>
              </Botao>
            )}
          </div>
        </header>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {[
            { label: "Total",      value: contadores.total,    color: "text-on-surface" },
            { label: "Pendentes",  value: contadores.pendente, color: "text-secondary"  },
            { label: "Retiradas",  value: contadores.retirada, color: "text-primary"    },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 min-w-[80px]"
            >
              <p className={`text-2xl font-headline font-bold ${s.color}`}>{s.value}</p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              <Icone name="filter_list" className="text-base" /> Filtros
            </p>
            {temFiltro && (
              <button
                onClick={() => { setFiltroStatus("TODOS"); setBusca(""); }}
                className="text-xs text-error hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Busca */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Buscar
              </label>
              <div className="relative">
                <Icone
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Descrição ou remetente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className={inputCls}
              >
                <option value="TODOS">Todas</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="RETIRADA">Retiradas</option>
              </select>
            </div>
          </div>
        </div>

        {temFiltro && (
          <p className="text-xs text-on-surface-variant -mt-4">
            Exibindo{" "}
            <strong className="text-on-surface">{filtradas.length}</strong> de{" "}
            {minhasEntregas.length} encomendas
          </p>
        )}

        {/* Lista */}
        {carregando ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            Carregando...
          </div>
        ) : minhasEntregas.length === 0 ? (
          <div className="glass-panel rounded-3xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="inventory_2" className="text-5xl opacity-30" />
            <p className="text-sm font-semibold">Nenhuma encomenda encontrada.</p>
            <p className="text-xs opacity-60">
              Quando uma encomenda for registrada para o seu apartamento, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.length === 0 && (
              <div className="glass-panel rounded-3xl py-12 flex flex-col items-center gap-2 text-on-surface-variant">
                <Icone name="search_off" className="text-4xl opacity-30" />
                <p className="text-sm">Nenhuma encomenda corresponde aos filtros.</p>
              </div>
            )}

            {filtradas.map((entrega) => {
              const cfg = STATUS[entrega.status] ?? STATUS.PENDENTE;
              return (
                <div key={entrega.id} className="glass-panel rounded-3xl overflow-hidden">
                  {/* Linha clicável */}
                  <button
                    onClick={() =>
                      setExpandido((p) => (p === entrega.id ? null : entrega.id))
                    }
                    className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-veu/5 transition-all cursor-pointer"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}
                    >
                      <Icone name={cfg.icon} className="text-xl" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-semibold truncate">
                        {entrega.descricao || "Encomenda"}
                      </p>
                      <p className="text-on-surface-variant text-sm truncate">
                        {[
                          entrega.remetente,
                          `Recebida em ${fmtData(entrega.dataRecebimento)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>

                    <Icone
                      name="expand_more"
                      className={`text-outline shrink-0 transition-transform duration-300 ${
                        expandido === entrega.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Painel expandido */}
                  {expandido === entrega.id && (
                    <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5 space-y-4">
                      {/* Detalhes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: "Remetente",   value: entrega.remetente        || "—" },
                          { label: "Recebida em", value: fmtData(entrega.dataRecebimento) },
                          { label: "Retirada em", value: fmtData(entrega.dataRetirada)    },
                          { label: "Descrição",   value: entrega.descricao        || "—" },
                          { label: "Observações", value: entrega.observacoes      || "—" },
                          ...(entrega.status === "RETIRADA"
                            ? [{ label: "Recebida por", value: entrega.recebedorNome || "—" }]
                            : []),
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="bg-surface-container-highest/20 rounded-xl p-3"
                          >
                            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">
                              {item.label}
                            </p>
                            <p className="text-on-surface font-semibold text-sm">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Ação */}
                      {entrega.status === "PENDENTE" && (
                        <button
                          onClick={() => { setModalRetirada(entrega); setErroRetirada(""); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
                        >
                          <Icone name="check_circle" className="text-lg" />
                          Marcar como retirada
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmação de retirada */}
      {modalRetirada && (
        <PopupConfirmarRetirada
          entrega={modalRetirada}
          usuarioNome={usuario?.nome}
          erro={erroRetirada}
          onConfirmar={(dataRetirada) =>
            handleConfirmarRetirada(modalRetirada, dataRetirada)
          }
          onCancelar={() => { setModalRetirada(null); setErroRetirada(""); }}
        />
      )}

      {registrando && (
        <ModalRegistrarEntrega
          usuarios={usuariosCondo}
          onFechar={() => setRegistrando(false)}
          onSalvo={() => { setRegistrando(false); carregar(); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// REGISTRO DE ENTREGA (porteiro)
//
// O destinatário é um usuário do auth-api — vale tanto morador quanto
// funcionário. Bloco e apartamento vêm do cadastro dele e são gravados como
// cópia, para a entrega continuar localizável se o vínculo mudar depois.
// ════════════════════════════════════════════

function ModalRegistrarEntrega({ usuarios, onFechar, onSalvo }) {
  const [tipo, setTipo] = useState("MORADOR");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [remetente, setRemetente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(hoje());
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const candidatos = useMemo(() => {
    const ativos = usuarios.filter((u) => u.status === "active");
    const lista = tipo === "MORADOR"
      ? ativos.filter((u) => [PERFIS.MORADOR, PERFIS.DONO_ALUGUEL].includes(u.perfil))
      : ativos.filter((u) => PERFIS_FUNCIONARIO.includes(u.perfil));
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [usuarios, tipo]);

  const selecionado = candidatos.find((u) => String(u.id) === destinatarioId);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    if (!destinatarioId || !selecionado) {
      setErro("Selecione o destinatário da encomenda."); return;
    }
    if (!descricao.trim()) {
      setErro("Descreva a encomenda (ex.: caixa, envelope)."); return;
    }

    setSalvando(true);
    try {
      await entregaApi.cadastrar({
        destinatarioId: Number(selecionado.id),
        destinatarioNome: selecionado.nome,
        bloco: selecionado.bloco || null,
        apartamento: selecionado.apartamento || null,
        descricao: descricao.trim(),
        remetente: remetente.trim() || null,
        observacoes: observacoes.trim() || null,
        dataRecebimento,
      });
      onSalvo();
    } catch (err) {
      const d = err?.response?.data;
      setErro(d?.mensagem || d?.message || d?.erro || "Não foi possível registrar a entrega.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-lg border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline text-lg font-bold text-on-surface">Registrar entrega</h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>

        <form onSubmit={salvar} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Destinatário <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {[
                { v: "MORADOR", l: "Morador" },
                { v: "FUNCIONARIO", l: "Funcionário" },
              ].map((t) => (
                <button key={t.v} type="button"
                  onClick={() => { setTipo(t.v); setDestinatarioId(""); setErro(""); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    tipo === t.v
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-white/5"
                  }`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          <select
            value={destinatarioId}
            onChange={(e) => { setDestinatarioId(e.target.value); setErro(""); }}
            className={selectCls}
          >
            <option value="">
              {candidatos.length === 0
                ? `Nenhum ${tipo === "MORADOR" ? "morador" : "funcionário"} ativo`
                : "Selecione…"}
            </option>
            {candidatos.map((u) => {
              const loc = [u.bloco, u.apartamento].filter(Boolean).join(" / ");
              return (
                <option key={u.id} value={String(u.id)}>
                  {u.nome}{loc ? ` — ${loc}` : ""}
                </option>
              );
            })}
          </select>

          {selecionado && tipo === "MORADOR" && !selecionado.apartamento && (
            <p className="text-xs text-on-surface-variant flex items-start gap-1.5 ml-1">
              <Icone name="info" className="text-sm shrink-0 mt-0.5" />
              Este morador não tem unidade no cadastro; a entrega ficará vinculada apenas ao nome.
            </p>
          )}

          <Campo id="descricao" label="Descrição" value={descricao}
            onChange={(e) => { setDescricao(e.target.value); setErro(""); }}
            placeholder="Ex.: caixa média, envelope" required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo id="remetente" label="Remetente" optional value={remetente}
              onChange={(e) => setRemetente(e.target.value)} placeholder="Ex.: Correios" />
            <Campo id="dataRecebimento" label="Recebida em" type="date" value={dataRecebimento}
              max={hoje()} onChange={(e) => setDataRecebimento(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Observações <span className="font-normal text-on-surface-variant/60">(opcional)</span>
            </label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2}
              placeholder="Ex.: volume frágil, deixado na guarita"
              className={`${inputCls} resize-none`} />
          </div>

          {erro && (
            <div className="bg-error/10 border border-error/25 rounded-xl p-3 flex gap-2 text-sm text-error">
              <Icone name="error_outline" className="shrink-0" />
              <p>{erro}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-1">
            <button type="button" onClick={onFechar}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer">
              Cancelar
            </button>
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Registrando…" : "Registrar entrega"}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// POPUP DE CONFIRMAÇÃO
// ════════════════════════════════════════════
function PopupConfirmarRetirada({ entrega, usuarioNome, erro, onConfirmar, onCancelar }) {
  const minData = entrega.dataRecebimento?.split("T")[0] || "";
  const [dataRetirada, setDataRetirada] = useState(hoje());
  const [erroLocal, setErroLocal] = useState("");

  function handleConfirmar() {
    setErroLocal("");
    if (!dataRetirada) {
      setErroLocal("Informe a data de retirada.");
      return;
    }
    if (dataRetirada > hoje()) {
      setErroLocal("A data de retirada não pode ser futura.");
      return;
    }
    if (minData && dataRetirada < minData) {
      setErroLocal("A data de retirada não pode ser anterior à data de recebimento.");
      return;
    }
    onConfirmar(dataRetirada);
  }

  const erroExibido = erroLocal || erro;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border border-primary/20 space-y-5">
        {/* Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icone name="check_circle" className="text-primary text-xl" />
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">
              Confirmar retirada
            </h2>
            <p className="text-on-surface-variant text-xs">
              {entrega.descricao || "Encomenda"}
              {entrega.remetente ? ` · ${entrega.remetente}` : ""}
            </p>
          </div>
        </div>

        {/* Quem está retirando */}
        <div className="bg-surface-container-highest/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Icone name="person" className="text-on-surface-variant text-lg shrink-0" />
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">Retirada por</p>
            <p className="text-on-surface font-semibold text-sm">{usuarioNome || "—"}</p>
          </div>
        </div>

        {/* Data de retirada */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            Data de retirada <span className="text-error">*</span>
          </label>
          <input
            type="date"
            value={dataRetirada}
            min={minData}
            max={hoje()}
            onChange={(e) => { setDataRetirada(e.target.value); setErroLocal(""); }}
            className={selectCls}
          />
          {minData && (
            <p className="text-xs text-on-surface-variant ml-1">
              Recebida em {fmtData(entrega.dataRecebimento)} — data não pode ser anterior.
            </p>
          )}
        </div>

        {erroExibido && (
          <p className="text-error text-xs bg-error/10 rounded-xl px-4 py-2">{erroExibido}</p>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Botao type="button" onClick={handleConfirmar}>
            Confirmar retirada
          </Botao>
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 font-semibold text-sm transition-all cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
