// src/components/adm/financeiro/PainelContratos.jsx
// Síndico: contratos de locação das unidades (RF-15).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icone } from "../../icones/Icone";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { useConfirm } from "../../../contexts/ConfirmContext";
import { financeiroApi } from "../../../services/financeiroApi";
import { apartamentoApi } from "../../../services/estruturasApi";
import { userManagementApi } from "../../../services/userManagementApi";
import { formatarBRL } from "../../../utils/dinheiro";
import { formatarData } from "../../../utils/datas";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO, Carregando, Janela, Selo, Vazio } from "./comum";
import { hojeCampo, mensagemDe } from "../../../utils/financeiroTela";

/**
 * O aviso de divergência, compartilhado com a tela do dono.
 *
 * O contrato não muda quem recebe a fatura: isso é decidido pela transferência
 * de responsabilidade financeira da unidade. Quando os dois discordam, a fatura
 * vai para quem a transferência diz — e a tela precisa deixar isso claro.
 */
export function AvisoDivergencia({ contrato, nomeDe }) {
  const d = contrato.divergencia;
  if (!contrato.ativo) return null;
  if (d === null || d === undefined) {
    return (
      <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
        <Icone name="help" className="text-sm" />
        Não foi possível conferir quem recebe a fatura desta unidade agora.
      </p>
    );
  }
  if (!d.divergente) return null;
  return (
    <div className="rounded-xl p-3 border border-secondary/25 bg-secondary/5 text-xs text-on-surface flex gap-2">
      <Icone name="warning" className="text-secondary text-base shrink-0" />
      <span>
        Pelo contrato, a taxa é paga por <strong>{nomeDe(d.responsavelEsperadoId)}</strong>, mas a fatura
        está indo para <strong>{d.responsavelAtualId ? nomeDe(d.responsavelAtualId) : "ninguém"}</strong>.
        Para mudar, use a transferência de responsabilidade financeira da unidade.
      </span>
    </div>
  );
}

const VAZIO = {
  unidadeId: "", proprietarioUsuarioId: "", inquilinoUsuarioId: "", inicio: "", fim: "",
  valorAluguel: "", responsavelTaxas: "INQUILINO",
};

export function PainelContratos() {
  const { usuario } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [unidades, setUnidades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [moradores, setMoradores] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await financeiroApi.listarContratos();
      setContratos(data.contratos ?? []);
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível carregar os contratos."));
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!usuario?.condominioId) return;
    apartamentoApi.listarTodos(usuario.condominioId)
      .then(({ data }) => setUnidades(Array.isArray(data) ? data : []))
      .catch(() => setUnidades([]));
    userManagementApi.listarUsuarios()
      .then(({ data }) => setUsuarios(data.usuarios ?? []))
      .catch(() => setUsuarios([]));
  }, [usuario?.condominioId]);

  const nomeUnidade = useMemo(() => {
    const mapa = new Map(unidades.map((u) => [u.id, `Apto ${u.numero}${u.blocoNome ? ` · ${u.blocoNome}` : ""}`]));
    return (id) => mapa.get(id) ?? "Unidade";
  }, [unidades]);

  const nomeDe = useMemo(() => {
    const mapa = new Map(usuarios.map((u) => [u.id, u.nome]));
    return (id) => (id ? mapa.get(id) ?? `Usuário ${id}` : "—");
  }, [usuarios]);

  async function escolherUnidade(unidadeId) {
    setForm((f) => ({ ...f, unidadeId, proprietarioUsuarioId: "", inquilinoUsuarioId: "" }));
    setMoradores([]);
    if (!unidadeId) return;
    try {
      const { data } = await userManagementApi.listarResidentes(unidadeId);
      setMoradores(data.moradores ?? []);
    } catch {
      setMoradores([]);
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      await financeiroApi.criarContrato({
        ...form,
        proprietarioUsuarioId: Number(form.proprietarioUsuarioId),
        inquilinoUsuarioId: form.inquilinoUsuarioId ? Number(form.inquilinoUsuarioId) : null,
        fim: form.fim || null,
        valorAluguel: form.valorAluguel || null,
      });
      toast.success("Contrato cadastrado.");
      setNovo(false);
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível cadastrar o contrato."));
    } finally {
      setSalvando(false);
    }
  }

  async function encerrar(contrato) {
    const ok = await confirm({
      titulo: "Encerrar contrato",
      mensagem: `O contrato de ${nomeUnidade(contrato.unidadeId)} deixa de ser vigente hoje.`,
      confirmarTexto: "Encerrar",
      variante: "danger",
    });
    if (!ok) return;
    try {
      await financeiroApi.encerrarContrato(contrato.id);
      toast.success("Contrato encerrado.");
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível encerrar o contrato."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant max-w-2xl">
          Registro do que proprietário e inquilino combinaram. Quem recebe a fatura continua sendo
          definido pela responsabilidade financeira da unidade.
        </p>
        <button onClick={() => { setForm({ ...VAZIO, inicio: hojeCampo() }); setMoradores([]); setNovo(true); }} className={BOTAO_PRIMARIO}>
          <Icone name="add" className="text-lg" />
          Novo contrato
        </button>
      </div>

      {carregando ? (
        <Carregando texto="Carregando contratos..." />
      ) : contratos.length === 0 ? (
        <Vazio icone="contract" texto="Nenhum contrato de locação cadastrado." />
      ) : (
        <div className="space-y-3">
          {contratos.map((c) => (
            <article key={c.id} className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface">{nomeUnidade(c.unidadeId)}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Proprietário: {nomeDe(c.proprietarioUsuarioId)} · Inquilino: {nomeDe(c.inquilinoUsuarioId)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {formatarData(c.inicio)} até {c.fim ? formatarData(c.fim) : "sem data de fim"}
                    {c.valorAluguelCentavos != null && ` · aluguel ${formatarBRL(c.valorAluguelCentavos)}`}
                    {` · taxa paga pelo ${c.responsavelTaxas === "INQUILINO" ? "inquilino" : "proprietário"}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Selo texto={c.ativo ? "Vigente" : "Encerrado"} tom={c.ativo ? "ok" : "neutro"} />
                  {c.ativo && (
                    <button onClick={() => encerrar(c)} className={BOTAO_SECUNDARIO}>Encerrar</button>
                  )}
                </div>
              </div>
              <AvisoDivergencia contrato={c} nomeDe={nomeDe} />
            </article>
          ))}
        </div>
      )}

      {novo && (
        <Janela titulo="Novo contrato de locação" aoFechar={() => setNovo(false)}>
          <div>
            <label className={ROTULO}>Unidade</label>
            <select value={form.unidadeId} onChange={(e) => escolherUnidade(e.target.value)} className={CAMPO}>
              <option value="">Selecione</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{nomeUnidade(u.id)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ROTULO}>Proprietário</label>
              <select
                value={form.proprietarioUsuarioId} disabled={!form.unidadeId}
                onChange={(e) => setForm((f) => ({ ...f, proprietarioUsuarioId: e.target.value }))}
                className={CAMPO}
              >
                <option value="">Selecione</option>
                {moradores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={ROTULO}>Inquilino</label>
              <select
                value={form.inquilinoUsuarioId} disabled={!form.unidadeId}
                onChange={(e) => setForm((f) => ({ ...f, inquilinoUsuarioId: e.target.value }))}
                className={CAMPO}
              >
                <option value="">Selecione</option>
                {moradores.filter((p) => String(p.id) !== form.proprietarioUsuarioId)
                  .map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          {form.unidadeId && moradores.length === 0 && (
            <p className="text-xs text-on-surface-variant">
              Esta unidade não tem moradores vinculados. Vincule proprietário e inquilino em Usuários antes.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ROTULO}>Início</label>
              <input type="date" value={form.inicio} onChange={(e) => setForm((f) => ({ ...f, inicio: e.target.value }))} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>Fim (opcional)</label>
              <input type="date" min={form.inicio} value={form.fim} onChange={(e) => setForm((f) => ({ ...f, fim: e.target.value }))} className={CAMPO} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ROTULO}>Aluguel (R$, opcional)</label>
              <input type="text" inputMode="decimal" placeholder="0,00" value={form.valorAluguel} onChange={(e) => setForm((f) => ({ ...f, valorAluguel: e.target.value }))} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>Quem paga a taxa</label>
              <select value={form.responsavelTaxas} onChange={(e) => setForm((f) => ({ ...f, responsavelTaxas: e.target.value }))} className={CAMPO}>
                <option value="INQUILINO">Inquilino</option>
                <option value="PROPRIETARIO">Proprietário</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setNovo(false)} className={`${BOTAO_SECUNDARIO} flex-1`}>Cancelar</button>
            <button
              onClick={salvar}
              disabled={salvando || !form.unidadeId || !form.proprietarioUsuarioId || !form.inicio}
              className={`${BOTAO_PRIMARIO} flex-1`}
            >
              {salvando ? "Salvando..." : "Cadastrar"}
            </button>
          </div>
        </Janela>
      )}
    </div>
  );
}
