// src/components/financeiro/AbaContrato.jsx
// Dono e inquilino: contrato de locação da unidade (RF-15). Só o dono cadastra.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("financeiro");
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
      toast.error(mensagemDe(err, t("abaContrato.toast.erroCarregar")));
    }
  }, [toast, t]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!usuario?.unidadeId) return;
    userManagementApi.listarResidentes(usuario.unidadeId)
      .then(({ data }) => setMoradores(data.moradores ?? []))
      .catch(() => setMoradores([]));
  }, [usuario?.unidadeId]);

  const nomeDe = useMemo(() => {
    const mapa = new Map(moradores.map((m) => [m.id, m.nome]));
    return (id) => (id ? mapa.get(id) ?? t("abaContrato.outraPessoa") : "—");
  }, [moradores, t]);

  async function salvar() {
    setSalvando(true);
    try {
      await financeiroApi.criarMeuContrato({
        ...form,
        inquilinoUsuarioId: form.inquilinoUsuarioId ? Number(form.inquilinoUsuarioId) : null,
        fim: form.fim || null,
        valorAluguel: form.valorAluguel || null,
      });
      toast.success(t("contratos.toast.cadastrado"));
      setNovo(false);
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, t("contratos.toast.erroCadastrar")));
    } finally {
      setSalvando(false);
    }
  }

  async function encerrar(c) {
    const ok = await confirm({
      titulo: t("contratos.encerrar.titulo"),
      mensagem: t("abaContrato.encerrarMensagem"),
      confirmarTexto: t("contratos.encerrar.botao"),
      variante: "danger",
    });
    if (!ok) return;
    try {
      await financeiroApi.encerrarMeuContrato(c.id);
      toast.success(t("contratos.toast.encerrado"));
      carregar();
    } catch (err) {
      toast.error(mensagemDe(err, t("abaContrato.toast.erroEncerrar")));
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
            {t("abaContrato.cadastrar")}
          </button>
        </div>
      )}

      {!contratos.length ? (
        <Vazio icone="contract" texto={t("abaContrato.vazio")} />
      ) : contratos.map((c) => (
        <article key={c.id} className="glass-panel rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm space-y-0.5">
              <p className="font-semibold text-on-surface">
                {t("contratos.lista.periodo", { inicio: formatarData(c.inicio), fim: c.fim ? formatarData(c.fim) : t("contratos.lista.semFim") })}
              </p>
              <p className="text-on-surface-variant">
                {t("contratos.lista.partes", { proprietario: nomeDe(c.proprietarioUsuarioId), inquilino: nomeDe(c.inquilinoUsuarioId) })}
              </p>
              <p className="text-on-surface-variant">
                {c.valorAluguelCentavos != null && `${t("abaContrato.aluguel", { valor: formatarBRL(c.valorAluguelCentavos) })} · `}
                {c.responsavelTaxas === "INQUILINO" ? t("abaContrato.taxaInquilino") : t("abaContrato.taxaProprietario")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Selo texto={c.ativo ? t("contratos.lista.vigente") : t("contratos.lista.encerrado")} tom={c.ativo ? "ok" : "neutro"} />
              {ehDono && c.ativo && <button onClick={() => encerrar(c)} className={BOTAO_SECUNDARIO}>{t("contratos.encerrar.botao")}</button>}
            </div>
          </div>
          <AvisoDivergencia contrato={c} nomeDe={nomeDe} />
        </article>
      ))}

      {novo && (
        <Janela titulo={t("abaContrato.cadastrar")} aoFechar={() => setNovo(false)}>
          <div>
            <label className={ROTULO}>{t("contratos.form.inquilino")}</label>
            <select value={form.inquilinoUsuarioId} onChange={(e) => setForm((f) => ({ ...f, inquilinoUsuarioId: e.target.value }))} className={CAMPO}>
              <option value="">{t("multas.form.selecione")}</option>
              {inquilinos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            {!inquilinos.length && (
              <p className="text-xs text-on-surface-variant mt-1">
                {t("abaContrato.semInquilinos")}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ROTULO}>{t("contratos.form.inicio")}</label>
              <input type="date" value={form.inicio} onChange={(e) => setForm((f) => ({ ...f, inicio: e.target.value }))} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>{t("contratos.form.fim")}</label>
              <input type="date" min={form.inicio} value={form.fim} onChange={(e) => setForm((f) => ({ ...f, fim: e.target.value }))} className={CAMPO} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ROTULO}>{t("contratos.form.aluguel")}</label>
              <input type="text" inputMode="decimal" placeholder="0,00" value={form.valorAluguel} onChange={(e) => setForm((f) => ({ ...f, valorAluguel: e.target.value }))} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>{t("contratos.form.quemPaga")}</label>
              <select value={form.responsavelTaxas} onChange={(e) => setForm((f) => ({ ...f, responsavelTaxas: e.target.value }))} className={CAMPO}>
                <option value="INQUILINO">{t("contratos.form.inquilino")}</option>
                <option value="PROPRIETARIO">{t("abaContrato.euProprietario")}</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">
            {t("abaContrato.aviso")}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setNovo(false)} className={`${BOTAO_SECUNDARIO} flex-1`}>{t("comum:acoes.cancelar")}</button>
            <button
              onClick={salvar}
              disabled={salvando || !form.inicio || (form.responsavelTaxas === "INQUILINO" && !form.inquilinoUsuarioId)}
              className={`${BOTAO_PRIMARIO} flex-1`}
            >
              {salvando ? t("geral.salvando") : t("contratos.form.cadastrar")}
            </button>
          </div>
        </Janela>
      )}
    </div>
  );
}
