// src/pages/usuario/MeusVeiculos.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { meusVeiculosApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { usePlano } from "../../contexts/PlanoContext";

// ── helpers ──────────────────────────────────────────────────────────────────

function errMsg(err) {
  const d = err?.response?.data;
  return d?.mensagem ?? d?.message ?? d?.erro ?? null;
}

const PLACA_REGEX = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

function normalizarPlaca(v) {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function placaValida(p) {
  return PLACA_REGEX.test(p);
}

function Vazio({ icone, children }) {
  return (
    <div className="glass-panel rounded-2xl py-12 px-4 flex flex-col items-center gap-3 text-center text-on-surface-variant">
      <Icone name={icone} className="text-5xl opacity-30" />
      <p className="text-sm max-w-md">{children}</p>
    </div>
  );
}

function Carregando() {
  return (
    <div className="glass-panel rounded-2xl py-16 flex justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function Erro({ mensagem, onTentar }) {
  const { t } = useTranslation("veiculos");
  return (
    <div className="glass-panel rounded-2xl p-8 text-center border border-error/20 space-y-3">
      <Icone name="error_outline" className="text-error text-4xl" />
      <p className="text-sm text-on-surface-variant">{mensagem}</p>
      {onTentar && (
        <button
          onClick={onTentar}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold cursor-pointer"
        >
          <Icone name="refresh" className="text-base" />{t("comum:acoes.tentarNovamente")}
        </button>
      )}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export function MeusVeiculos() {
  const { t } = useTranslation("veiculos");
  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            {t("meus.cabecalho.sobretitulo")}
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            {t("meus.cabecalho.titulo")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("meus.cabecalho.tituloDestaque")}
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {t("meus.cabecalho.descricao")}
          </p>
        </header>

        {/* RN-01: a pré-liberação virou um fluxo só, em Meus convidados. */}
        <Link
          to="/meus-convidados"
          className="glass-panel rounded-2xl p-4 flex items-center gap-3 border border-outline-variant/15 hover:border-primary/35 hover:bg-white/[0.03] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icone name="how_to_reg" className="text-primary text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface">
              {t("meus.convidados.titulo")}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {t("meus.convidados.descricao")}
            </p>
          </div>
          <Icone name="chevron_right" className="text-on-surface-variant group-hover:text-primary transition-colors text-xl shrink-0" />
        </Link>

        <AbaVeiculos />
      </div>
    </div>
  );
}

// ── Aba: veículos + vagas (RN-02) ────────────────────────────────────────────

function AbaVeiculos() {
  const { t } = useTranslation("veiculos");
  const toast = useToast();
  const { hasModulo } = usePlano();
  const [dados, setDados] = useState({ veiculos: [], vagas: [] });
  const [pessoas, setPessoas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [acao, setAcao] = useState(null);
  const [form, setForm] = useState(null);      // null | "novo" | veiculo
  const [gerindo, setGerindo] = useState(null); // veículo cujas pessoas estão sendo geridas

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await meusVeiculosApi.listar();
      setDados({
        veiculos: res.data?.veiculos ?? [],
        vagas: res.data?.vagas ?? [],
      });
    } catch (err) {
      setErro(errMsg(err) || t("meus.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }, [t]);

  useEffect(() => { carregar(); }, [carregar]);

  // Lista de pessoas só é necessária nos formulários; carrega junto e falha calada.
  useEffect(() => {
    meusVeiculosApi.pessoasUnidade()
      .then((r) => setPessoas(r.data ?? []))
      .catch(() => setPessoas([]));
  }, []);

  async function desvincular(veiculo) {
    const ultimo = (veiculo.pessoas?.length ?? 0) <= 1;
    // RN-05: o morador precisa saber, antes de confirmar, se sai do carro
    // ou apaga o cadastro dele.
    const aviso = ultimo
      ? t("meus.desvincular.confirmarUltimo", { placa: veiculo.placa })
      : t("meus.desvincular.confirmarApenasMeu", { placa: veiculo.placa });
    if (!window.confirm(aviso)) return;

    setAcao(veiculo.id);
    try {
      const res = await meusVeiculosApi.desvincular(veiculo.id);
      toast.success(res.data?.mensagem || t("meus.desvincular.sucesso"));
      await carregar();
    } catch (err) {
      toast.error(errMsg(err) || t("meus.desvincular.erro"));
    } finally {
      setAcao(null);
    }
  }

  if (carregando) return <Carregando />;
  if (erro) return <Erro mensagem={erro} onTentar={carregar} />;

  return (
    <div className="space-y-10">
      {/* ── Conjunto 1: meus veículos ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-headline font-bold text-on-surface text-lg">
            {t("meus.lista.titulo")}
            <span className="ml-2 text-xs font-normal text-on-surface-variant">
              ({dados.veiculos.length})
            </span>
          </h2>
          <Botao type="button" onClick={() => setForm("novo")}>
            <span className="flex items-center gap-2">
              <Icone name="add" className="text-lg" />{t("meus.lista.cadastrar")}
            </span>
          </Botao>
        </div>

        {dados.veiculos.length === 0 ? (
          <Vazio icone="directions_car">
            {t("meus.lista.vazio")}
          </Vazio>
        ) : (
          <div className="space-y-3">
            {dados.veiculos.map((v) => (
              <CartaoVeiculo
                key={v.id}
                veiculo={v}
                ocupado={acao === v.id}
                onEditar={() => setForm(v)}
                onPessoas={() => setGerindo(v)}
                onDesvincular={() => desvincular(v)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Conjunto 2: vagas da unidade ── */}
      {hasModulo("vagas") && (
        <section className="space-y-4">
          <h2 className="font-headline font-bold text-on-surface text-lg">
            {t("meus.vagas.titulo")}
            <span className="ml-2 text-xs font-normal text-on-surface-variant">
              ({dados.vagas.length})
            </span>
          </h2>

        {dados.vagas.length === 0 ? (
          <Vazio icone="local_parking">
            {t("meus.vagas.vazio")}
          </Vazio>
        ) : (
          <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                    {["vaga", "situacao", "ocupadaPor", "origem"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {t(`meus.vagas.colunas.${h}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.vagas.map((vg) => (
                    <tr key={vg.id} className="border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors">
                      <td className="px-4 py-3 font-semibold text-on-surface whitespace-nowrap">
                        {vg.numero}
                        {vg.localizacao && (
                          <span className="ml-1 text-xs font-normal text-on-surface-variant">· {vg.localizacao}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          vg.ocupada ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                        }`}>
                          {vg.ocupada ? t("meus.vagas.ocupada") : t("meus.vagas.livre")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                        {vg.ocupada ? (
                          <>
                            <span className="font-mono font-semibold text-on-surface">{vg.ocupadaPorPlaca}</span>
                            {vg.ocupadaPorNome && <span className="ml-2">{vg.ocupadaPorNome}</span>}
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {vg.origem === "VISITANTE" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                            <Icone name="lock" className="text-sm" />{t("meus.vagas.visitante")}
                          </span>
                        ) : vg.origem === "MORADOR" ? (
                          <span className="text-xs font-semibold text-on-surface-variant">{t("meus.vagas.morador")}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="text-xs text-on-surface-variant">
          {t("meus.vagas.nota")}
        </p>
      </section>
      )}

      {form && (
        <ModalVeiculo
          veiculo={form === "novo" ? null : form}
          vagas={dados.vagas}
          pessoas={pessoas}
          onFechar={() => setForm(null)}
          onSalvo={async () => { setForm(null); await carregar(); }}
        />
      )}

      {gerindo && (
        <ModalPessoas
          veiculo={dados.veiculos.find((v) => v.id === gerindo.id) || gerindo}
          pessoas={pessoas}
          onFechar={() => setGerindo(null)}
          onAlterado={carregar}
        />
      )}
    </div>
  );
}

function CartaoVeiculo({ veiculo: v, ocupado, onEditar, onPessoas, onDesvincular }) {
  const { t } = useTranslation("veiculos");
  const dentro = v.status === "DENTRO";
  const ultimo = (v.pessoas?.length ?? 0) <= 1;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icone name="directions_car" className="text-primary text-2xl" />
          </div>
          <div className="min-w-0">
            <p className="font-mono font-bold text-on-surface text-lg leading-tight">{v.placa}</p>
            <p className="text-xs text-on-surface-variant">
              {v.modelo || t("meus.cartao.modeloNaoInformado")}{v.cor ? ` · ${v.cor}` : ""}
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
          dentro ? "bg-primary/10 text-primary" : "bg-outline-variant/20 text-on-surface-variant"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dentro ? "bg-primary" : "bg-outline-variant"}`} />
          {dentro ? t("meus.cartao.dentro") : t("meus.cartao.fora")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <p className="text-on-surface-variant">
          <span className="font-semibold">{t("meus.cartao.vaga")}</span> {v.vagaNumero || t("meus.cartao.semVaga")}
        </p>
        <p className="text-on-surface-variant">
          <span className="font-semibold">{t("meus.cartao.pessoasVinculadas")}</span>{" "}
          {v.pessoas?.length ? v.pessoas.map((p) => p.nome).join(", ") : "—"}
        </p>
      </div>

      {v.obs && (
        <p className="text-xs text-on-surface-variant bg-surface-container-highest/20 rounded-xl px-3 py-2">
          {v.obs}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={onEditar} disabled={ocupado}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer disabled:opacity-50">
          <Icone name="edit" className="text-sm" />{t("comum:acoes.editar")}
        </button>
        <button type="button" onClick={onPessoas} disabled={ocupado}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer disabled:opacity-50">
          <Icone name="group" className="text-sm" />{t("meus.cartao.pessoas")}
        </button>
        <button
          type="button"
          onClick={onDesvincular}
          disabled={ocupado || dentro}
          title={dentro
            ? t("meus.cartao.tituloSaidaAntes")
            : ultimo ? t("meus.cartao.tituloRemoveVeiculo") : t("meus.cartao.tituloRemoveVinculo")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icone name="link_off" className="text-sm" />
          {ultimo ? t("meus.cartao.removerVeiculo") : t("meus.cartao.desvincularMe")}
        </button>
      </div>

      {dentro && (
        <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <Icone name="info" className="text-sm text-secondary" />
          {t("meus.cartao.avisoDentro")}
        </p>
      )}
    </div>
  );
}

// ── Modal: cadastrar / editar (RN-03, RN-04) ─────────────────────────────────

function ModalVeiculo({ veiculo, vagas, pessoas, onFechar, onSalvo }) {
  const { t } = useTranslation("veiculos");
  const toast = useToast();
  const editando = Boolean(veiculo);
  const [form, setForm] = useState({
    placa: veiculo?.placa ?? "",
    modelo: veiculo?.modelo ?? "",
    cor: veiculo?.cor ?? "",
    obs: veiculo?.obs ?? "",
    vagaId: veiculo?.vagaId ?? "",
  });
  const [pessoaIds, setPessoaIds] = useState(
    veiculo ? (veiculo.pessoas ?? []).map((p) => p.pessoaId) : pessoas.map((p) => p.pessoaId)
  );
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Sem escolha explícita, vincula todo mundo da unidade só quando há uma pessoa.
  useEffect(() => {
    if (!editando && pessoaIds.length === 0 && pessoas.length === 1) {
      setPessoaIds([pessoas[0].pessoaId]);
    }
  }, [pessoas, editando, pessoaIds.length]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErro(null);
  }

  function alternarPessoa(id) {
    setPessoaIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
    setErro(null);
  }

  async function submeter(e) {
    e.preventDefault();
    setErro(null);

    if (!editando) {
      const placa = normalizarPlaca(form.placa);
      if (!placaValida(placa)) {
        setErro(t("meus.modal.erros.placaInvalida"));
        return;
      }
      if (pessoaIds.length === 0) {
        setErro(t("meus.modal.erros.selecionePessoa"));
        return;
      }
    }

    setSalvando(true);
    try {
      if (editando) {
        await meusVeiculosApi.atualizar(veiculo.id, {
          modelo: form.modelo || null,
          cor: form.cor || null,
          obs: form.obs || null,
          vagaId: form.vagaId || null,
        });
        toast.success(t("meus.modal.toast.atualizado", { placa: veiculo.placa }));
      } else {
        await meusVeiculosApi.cadastrar({
          placa: normalizarPlaca(form.placa),
          modelo: form.modelo || null,
          cor: form.cor || null,
          obs: form.obs || null,
          vagaId: form.vagaId || null,
          pessoaIds,
        });
        toast.success(t("meus.modal.toast.cadastrado"));
      }
      onSalvo();
    } catch (err) {
      setErro(errMsg(err) || t("meus.modal.erros.salvar"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-lg border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            {editando ? t("meus.modal.tituloEditar", { placa: veiculo.placa }) : t("meus.modal.tituloCadastrar")}
          </h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>

        <form onSubmit={submeter} className="space-y-4">
          {editando ? (
            <div className="bg-surface-container-highest/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <Icone name="lock" className="text-on-surface-variant text-base shrink-0 mt-0.5" />
              <p className="text-xs text-on-surface-variant">
                {t("meus.modal.placaBloqueadaAntes")}{" "}
                <span className="font-mono font-bold text-on-surface">{veiculo.placa}</span>{" "}
                {t("meus.modal.placaBloqueadaDepois")}
              </p>
            </div>
          ) : (
            <Campo
              id="placa"
              label={t("meus.modal.placa")}
              name="placa"
              value={form.placa}
              onChange={(e) => set("placa", normalizarPlaca(e.target.value))}
              placeholder="AAA1A23"
              className="font-mono"
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo id="modelo" label={t("meus.modal.modelo")} optional value={form.modelo}
              onChange={(e) => set("modelo", e.target.value)} placeholder={t("meus.modal.modeloPlaceholder")} />
            <Campo id="cor" label={t("meus.modal.cor")} optional value={form.cor}
              onChange={(e) => set("cor", e.target.value)} placeholder={t("meus.modal.corPlaceholder")} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("meus.modal.vaga")} <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">{t("meus.modal.opcional")}</span>
            </label>
            <select
              value={form.vagaId}
              onChange={(e) => set("vagaId", e.target.value)}
              className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
            >
              <option value="">{t("meus.modal.semVaga")}</option>
              {vagas.map((vg) => (
                <option key={vg.id} value={vg.id}>
                  {t("meus.modal.opcaoVaga", { numero: vg.numero })}{vg.localizacao ? ` — ${vg.localizacao}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant ml-1">
              {t("meus.modal.apenasVagasUnidade")}
            </p>
          </div>

          {!editando && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {t("meus.modal.pessoasVinculadas")} <span className="text-red-500">*</span>
              </label>
              {pessoas.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-2">
                  {t("meus.modal.erroPessoas")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {pessoas.map((p) => (
                    <label key={p.pessoaId}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20 cursor-pointer hover:bg-veu/5 transition-all">
                      <input
                        type="checkbox"
                        checked={pessoaIds.includes(p.pessoaId)}
                        onChange={() => alternarPessoa(p.pessoaId)}
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-sm text-on-surface">{p.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("meus.modal.observacoes")} <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">{t("meus.modal.opcional")}</span>
            </label>
            <textarea
              value={form.obs}
              onChange={(e) => set("obs", e.target.value)}
              rows={2}
              className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all resize-none"
            />
          </div>

          {erro && (
            <div className="bg-error/10 border border-error/25 rounded-xl p-3 flex gap-2 text-sm text-error">
              <Icone name="error_outline" className="shrink-0" />
              <p>{erro}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-1">
            <button type="button" onClick={onFechar}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
              {t("comum:acoes.cancelar")}
            </button>
            <Botao type="submit" disabled={salvando}>
              {salvando ? t("comum:acoes.salvando") : editando ? t("meus.modal.salvarAlteracoes") : t("meus.modal.cadastrar")}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: pessoas vinculadas (RN-06) ────────────────────────────────────────

function ModalPessoas({ veiculo, pessoas, onFechar, onAlterado }) {
  const { t } = useTranslation("veiculos");
  const toast = useToast();
  const [acao, setAcao] = useState(null);

  const vinculadas = useMemo(() => veiculo.pessoas ?? [], [veiculo.pessoas]);
  const vinculadasIds = useMemo(() => new Set(vinculadas.map((p) => p.pessoaId)), [vinculadas]);
  const disponiveis = pessoas.filter((p) => !vinculadasIds.has(p.pessoaId));
  const ultimo = vinculadas.length <= 1;

  async function vincular(pessoaId) {
    setAcao(pessoaId);
    try {
      await meusVeiculosApi.vincularPessoa(veiculo.id, pessoaId);
      toast.success(t("meus.pessoas.toast.vinculada"));
      await onAlterado();
    } catch (err) {
      toast.error(errMsg(err) || t("meus.pessoas.toast.erroVincular"));
    } finally {
      setAcao(null);
    }
  }

  async function desvincular(pessoa) {
    if (!window.confirm(t("meus.pessoas.confirmarRemover", { nome: pessoa.nome, placa: veiculo.placa }))) return;
    setAcao(pessoa.pessoaId);
    try {
      await meusVeiculosApi.desvincularPessoa(veiculo.id, pessoa.pessoaId);
      toast.success(t("meus.pessoas.toast.removido"));
      await onAlterado();
    } catch (err) {
      toast.error(errMsg(err) || t("meus.pessoas.toast.erroRemover"));
    } finally {
      setAcao(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-md border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">{t("meus.pessoas.titulo")}</h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          {t("meus.pessoas.veiculo")} <span className="font-mono font-semibold text-on-surface">{veiculo.placa}</span>
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              {t("meus.pessoas.vinculadas", { n: vinculadas.length })}
            </p>
            {vinculadas.map((p) => (
              <div key={p.pessoaId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20">
                <span className="text-sm text-on-surface truncate">{p.nome}</span>
                <button
                  type="button"
                  onClick={() => desvincular(p)}
                  disabled={acao === p.pessoaId || ultimo}
                  title={ultimo ? t("meus.pessoas.tituloUltimo") : t("meus.pessoas.tituloRemover")}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("comum:acoes.remover")}
                </button>
              </div>
            ))}
            {ultimo && (
              <p className="text-xs text-on-surface-variant flex items-start gap-1.5 pt-1">
                <Icone name="info" className="text-sm text-secondary shrink-0 mt-0.5" />
                {t("meus.pessoas.avisoUltimo")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              {t("meus.pessoas.adicionar")}
            </p>
            {disponiveis.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-1">
                {t("meus.pessoas.todasVinculadas")}
              </p>
            ) : disponiveis.map((p) => (
              <div key={p.pessoaId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/10">
                <span className="text-sm text-on-surface-variant truncate">{p.nome}</span>
                <button
                  type="button"
                  onClick={() => vincular(p.pessoaId)}
                  disabled={acao === p.pessoaId}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {t("meus.pessoas.vincular")}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
