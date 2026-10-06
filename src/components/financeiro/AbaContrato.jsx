// src/components/financeiro/AbaContrato.jsx
// Dono e inquilino: contrato de locação da unidade (RF-15). Só o dono cadastra.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icone } from "../icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { financeiroApi } from "../../services/financeiroApi";
import { userManagementApi } from "../../services/userManagementApi";
import { formatarBRL } from "../../utils/dinheiro";
import { formatarData } from "../../utils/datas";
import { PERFIS } from "../../utils/perfis";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO, Carregando, Janela, Selo, Vazio } from "../adm/financeiro/comum";
import { hojeCampo, mensagemDe } from "../../utils/financeiroTela";
import { AvisoDivergencia } from "../adm/financeiro/PainelContratos";

const VAZIO = { inquilinoUsuarioId: "", inicio: "", fim: "", valorAluguel: "", responsavelTaxas: "INQUILINO" };

export function AbaContrato() {
  const { usuario } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const ehDono = usuario?.perfil === PERFIS.DONO_ALUGUEL;

  const [contratos, setContratos] = useState(null);
  const [moradores, setMoradores] = useState([]);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await financeiroApi.meusContratos();
      setContratos(data.contratos ?? []);
    } catch (err) {
      setContratos([]);
      toast.error(mensagemDe(err, "Não foi possível carregar o contrato."));
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!usuario?.unidadeId) return;
    userManagementApi.listarResidentes(usuario.unidadeId)
      .then(({ data }) => setMoradores(data.moradores ?? []))
      .catch(() => setMoradores([]));
  }, [usuario?.unidadeId]);

  const nomeDe = useMemo(() => {
    const mapa = new Map(moradores.map((m) => [m.id, m.nome]));
    return (id) => (id ? mapa.get(id) ?? "outra pessoa" : "—");
  }, [moradores]);

  async function salvar() {
    setSalvando(true);
    try {
      await financeiroApi.criarMeuContrato({
        ...form,
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

  async function encerrar(c) {
    const ok = await confirm({
      titulo: "Encerrar contrato",
      mensagem: "O contrato deixa de ser vigente hoje.",
      confirmarTexto: "Encerrar",
      variante: "danger",
    });
    if (!ok) return;
    try {
      await financeiroApi.encerrarMeuContrato(c.id);
      toast.success("Contrato encerrado.");
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, "Não foi possível encerrar."));
    }
  }

  if (contratos === null) return <Carregando />;

  const vigente = contratos.find((c) => c.ativo);
  const inquilinos = moradores.filter((m) => m.id !== usuario?.id);

  return (
    <div className="space-y-4">
      {ehDono && !vigente && (
        <div className="flex justify-end">
          <button onClick={() => { setForm({ ...VAZIO, inicio: hojeCampo() }); setNovo(true); }} className={BOTAO_PRIMARIO}>
            <Icone name="add" className="text-lg" />
            Cadastrar contrato
          </button>
        </div>
      )}

      {!contratos.length ? (
        <Vazio icone="contract" texto="Nenhum contrato de locação registrado para esta unidade." />
      ) : contratos.map((c) => (
        <article key={c.id} className="glass-panel rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm space-y-0.5">
              <p className="font-semibold text-on-surface">
                {formatarData(c.inicio)} até {c.fim ? formatarData(c.fim) : "sem data de fim"}
              </p>
              <p className="text-on-surface-variant">
                Proprietário: {nomeDe(c.proprietarioUsuarioId)} · Inquilino: {nomeDe(c.inquilinoUsuarioId)}
              </p>
              <p className="text-on-surface-variant">
                {c.valorAluguelCentavos != null && `Aluguel ${formatarBRL(c.valorAluguelCentavos)} · `}
                Taxa do condomínio paga pelo {c.responsavelTaxas === "INQUILINO" ? "inquilino" : "proprietário"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Selo texto={c.ativo ? "Vigente" : "Encerrado"} tom={c.ativo ? "ok" : "neutro"} />
              {ehDono && c.ativo && <button onClick={() => encerrar(c)} className={BOTAO_SECUNDARIO}>Encerrar</button>}
            </div>
          </div>
          <AvisoDivergencia contrato={c} nomeDe={nomeDe} />
        </article>
      ))}

      {novo && (
        <Janela titulo="Cadastrar contrato" aoFechar={() => setNovo(false)}>
          <div>
            <label className={ROTULO}>Inquilino</label>
            <select value={form.inquilinoUsuarioId} onChange={(e) => setForm((f) => ({ ...f, inquilinoUsuarioId: e.target.value }))} className={CAMPO}>
              <option value="">Selecione</option>
              {inquilinos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            {!inquilinos.length && (
              <p className="text-xs text-on-surface-variant mt-1">
                Cadastre o inquilino como ocupante da unidade no seu perfil antes.
              </p>
            )}
          </div>
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
                <option value="PROPRIETARIO">Eu, proprietário</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">
            O contrato registra o que foi combinado. Quem recebe a fatura do condomínio continua sendo
            definido pela transferência de responsabilidade financeira da unidade.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setNovo(false)} className={`${BOTAO_SECUNDARIO} flex-1`}>Cancelar</button>
            <button
              onClick={salvar}
              disabled={salvando || !form.inicio || (form.responsavelTaxas === "INQUILINO" && !form.inquilinoUsuarioId)}
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
