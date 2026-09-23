// src/pages/usuario/MeusVeiculos.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { meusVeiculosApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";

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
  return (
    <div className="glass-panel rounded-2xl p-8 text-center border border-error/20 space-y-3">
      <Icone name="error_outline" className="text-error text-4xl" />
      <p className="text-sm text-on-surface-variant">{mensagem}</p>
      {onTentar && (
        <button
          onClick={onTentar}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold cursor-pointer"
        >
          <Icone name="refresh" className="text-base" />Tentar novamente
        </button>
      )}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export function MeusVeiculos() {
  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Minha Unidade
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Meus{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Veículos
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Veículos da sua unidade, pessoas vinculadas e situação das vagas.
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
              Para liberar o veículo de um visitante, use Meus convidados.
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              A pré-liberação é sempre do visitante, com o veículo como parte dela.
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
  const toast = useToast();
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
      setErro(errMsg(err) || "Não foi possível carregar os veículos da sua unidade.");
    } finally {
      setCarregando(false);
    }
  }, []);

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
      ? `Você é o último vínculo do veículo ${veiculo.placa}.\n\nAo confirmar, ele será REMOVIDO do cadastro da unidade e a vaga será liberada. O histórico de acessos é preservado.`
      : `Remover apenas o SEU vínculo com o veículo ${veiculo.placa}?\n\nEle continuará cadastrado para as outras pessoas da unidade.`;
    if (!window.confirm(aviso)) return;

    setAcao(veiculo.id);
    try {
      const res = await meusVeiculosApi.desvincular(veiculo.id);
      toast.success(res.data?.mensagem || "Desvinculação registrada.");
      await carregar();
    } catch (err) {
      toast.error(errMsg(err) || "Não foi possível desvincular o veículo.");
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
            Meus veículos
            <span className="ml-2 text-xs font-normal text-on-surface-variant">
              ({dados.veiculos.length})
            </span>
          </h2>
          <Botao type="button" onClick={() => setForm("novo")}>
            <span className="flex items-center gap-2">
              <Icone name="add" className="text-lg" />Cadastrar veículo
            </span>
          </Botao>
        </div>

        {dados.veiculos.length === 0 ? (
          <Vazio icone="directions_car">
            Nenhum veículo cadastrado na sua unidade. Use “Cadastrar veículo” para incluir o primeiro.
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
      <section className="space-y-4">
        <h2 className="font-headline font-bold text-on-surface text-lg">
          Vagas da minha unidade
          <span className="ml-2 text-xs font-normal text-on-surface-variant">
            ({dados.vagas.length})
          </span>
        </h2>

        {dados.vagas.length === 0 ? (
          <Vazio icone="local_parking">
            Sua unidade não possui vagas cadastradas. A administração do condomínio faz esse cadastro.
          </Vazio>
        ) : (
          <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                    {["Vaga", "Situação", "Ocupada por", "Origem"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {h}
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
                          {vg.ocupada ? "Ocupada" : "Livre"}
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
                            <Icone name="lock" className="text-sm" />Visitante
                          </span>
                        ) : vg.origem === "MORADOR" ? (
                          <span className="text-xs font-semibold text-on-surface-variant">Morador</span>
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
          A situação considera quem está no condomínio agora: uma vaga atribuída a um veículo que saiu aparece como livre.
          Veículo de visitante é somente leitura.
        </p>
      </section>

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
              {v.modelo || "Modelo não informado"}{v.cor ? ` · ${v.cor}` : ""}
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
          dentro ? "bg-primary/10 text-primary" : "bg-outline-variant/20 text-on-surface-variant"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dentro ? "bg-primary" : "bg-outline-variant"}`} />
          {dentro ? "Dentro do condomínio" : "Fora do condomínio"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <p className="text-on-surface-variant">
          <span className="font-semibold">Vaga:</span> {v.vagaNumero || "Sem vaga"}
        </p>
        <p className="text-on-surface-variant">
          <span className="font-semibold">Pessoas vinculadas:</span>{" "}
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50">
          <Icone name="edit" className="text-sm" />Editar
        </button>
        <button type="button" onClick={onPessoas} disabled={ocupado}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50">
          <Icone name="group" className="text-sm" />Pessoas
        </button>
        <button
          type="button"
          onClick={onDesvincular}
          disabled={ocupado || dentro}
          title={dentro
            ? "Registre a saída do veículo antes de desvinculá-lo"
            : ultimo ? "Remove o veículo do cadastro da unidade" : "Remove apenas o seu vínculo"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icone name="link_off" className="text-sm" />
          {ultimo ? "Remover veículo" : "Desvincular-me"}
        </button>
      </div>

      {dentro && (
        <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <Icone name="info" className="text-sm text-secondary" />
          Para desvincular, registre primeiro a saída do veículo na portaria.
        </p>
      )}
    </div>
  );
}

// ── Modal: cadastrar / editar (RN-03, RN-04) ─────────────────────────────────

function ModalVeiculo({ veiculo, vagas, pessoas, onFechar, onSalvo }) {
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
        setErro("Placa inválida. Use o formato AAA-9999 ou AAA9A99 (Mercosul).");
        return;
      }
      if (pessoaIds.length === 0) {
        setErro("Selecione ao menos uma pessoa para vincular ao veículo.");
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
        toast.success(`Veículo ${veiculo.placa} atualizado.`);
      } else {
        await meusVeiculosApi.cadastrar({
          placa: normalizarPlaca(form.placa),
          modelo: form.modelo || null,
          cor: form.cor || null,
          obs: form.obs || null,
          vagaId: form.vagaId || null,
          pessoaIds,
        });
        toast.success("Veículo cadastrado.");
      }
      onSalvo();
    } catch (err) {
      setErro(errMsg(err) || "Não foi possível salvar o veículo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-lg border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            {editando ? `Editar ${veiculo.placa}` : "Cadastrar veículo"}
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
                A placa <span className="font-mono font-bold text-on-surface">{veiculo.placa}</span> não
                pode ser alterada. Se estiver errada, remova o veículo e cadastre novamente — editá-la
                faria o histórico de acessos apontar para o carro errado.
              </p>
            </div>
          ) : (
            <Campo
              id="placa"
              label="Placa"
              name="placa"
              value={form.placa}
              onChange={(e) => set("placa", normalizarPlaca(e.target.value))}
              placeholder="AAA1A23"
              className="font-mono"
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo id="modelo" label="Modelo" optional value={form.modelo}
              onChange={(e) => set("modelo", e.target.value)} placeholder="Ex.: Civic" />
            <Campo id="cor" label="Cor" optional value={form.cor}
              onChange={(e) => set("cor", e.target.value)} placeholder="Ex.: Prata" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Vaga <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">(opcional)</span>
            </label>
            <select
              value={form.vagaId}
              onChange={(e) => set("vagaId", e.target.value)}
              className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
            >
              <option value="">Sem vaga</option>
              {vagas.map((vg) => (
                <option key={vg.id} value={vg.id}>
                  Vaga {vg.numero}{vg.localizacao ? ` — ${vg.localizacao}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant ml-1">
              Apenas vagas da sua unidade aparecem aqui.
            </p>
          </div>

          {!editando && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Pessoas vinculadas <span className="text-red-500">*</span>
              </label>
              {pessoas.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-2">
                  Não foi possível carregar as pessoas da unidade. O veículo será vinculado a você.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {pessoas.map((p) => (
                    <label key={p.pessoaId}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20 cursor-pointer hover:bg-white/5 transition-all">
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
              Observações <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">(opcional)</span>
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
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer">
              Cancelar
            </button>
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: pessoas vinculadas (RN-06) ────────────────────────────────────────

function ModalPessoas({ veiculo, pessoas, onFechar, onAlterado }) {
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
      toast.success("Pessoa vinculada ao veículo.");
      await onAlterado();
    } catch (err) {
      toast.error(errMsg(err) || "Não foi possível vincular a pessoa.");
    } finally {
      setAcao(null);
    }
  }

  async function desvincular(pessoa) {
    if (!window.confirm(`Remover o vínculo de ${pessoa.nome} com o veículo ${veiculo.placa}?`)) return;
    setAcao(pessoa.pessoaId);
    try {
      await meusVeiculosApi.desvincularPessoa(veiculo.id, pessoa.pessoaId);
      toast.success("Vínculo removido.");
      await onAlterado();
    } catch (err) {
      toast.error(errMsg(err) || "Não foi possível remover o vínculo.");
    } finally {
      setAcao(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-md border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">Pessoas vinculadas</h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          Veículo <span className="font-mono font-semibold text-on-surface">{veiculo.placa}</span>
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Vinculadas ({vinculadas.length})
            </p>
            {vinculadas.map((p) => (
              <div key={p.pessoaId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20">
                <span className="text-sm text-on-surface truncate">{p.nome}</span>
                <button
                  type="button"
                  onClick={() => desvincular(p)}
                  disabled={acao === p.pessoaId || ultimo}
                  title={ultimo ? "É o último vínculo — use “Remover veículo” no cartão" : "Remover vínculo"}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Remover
                </button>
              </div>
            ))}
            {ultimo && (
              <p className="text-xs text-on-surface-variant flex items-start gap-1.5 pt-1">
                <Icone name="info" className="text-sm text-secondary shrink-0 mt-0.5" />
                Último vínculo não pode ser removido aqui — sem vínculo o veículo ficaria órfão.
                Use “Remover veículo” no cartão.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Adicionar da minha unidade
            </p>
            {disponiveis.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-1">
                Todas as pessoas da unidade já estão vinculadas.
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
                  Vincular
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
