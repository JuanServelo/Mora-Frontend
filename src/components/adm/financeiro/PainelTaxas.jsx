import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { financeiroApi } from "../../../services/financeiroApi";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";
import { useConfirm } from "../../../contexts/ConfirmContext";
import { formatarBRL, centavosParaCampo } from "../../../utils/dinheiro";

const VAZIO = {
  nome: "",
  descricao: "",
  valor: "",
  baseCalculo: "POR_UNIDADE",
  periodicidade: "MENSAL",
  extraordinaria: false,
  parcelas: 1,
};

const BASES = {
  POR_UNIDADE: "taxas.bases.porUnidade",
  TOTAL_CONDOMINIO: "taxas.bases.totalCondominio",
};

export function PainelTaxas({ modoRateio }) {
  // `t` já é o nome da taxa nos laços abaixo; a tradução fica em `tr`.
  const { t: tr } = useTranslation("financeiro");
  const toast = useToast();
  const confirmar = useConfirm();

  const [taxas, setTaxas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await financeiroApi.listarTaxas();
      setTaxas(data.itens || []);
    } catch {
      toast.error(tr("taxas.toast.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNova() {
    // No modo proporcional o valor cadastrado é o total do condomínio, então o
    // padrão do formulário acompanha o modo escolhido — evita cadastrar R$ 350
    // "por unidade" e o sistema ratear 350 entre todos.
    setForm({
      ...VAZIO,
      baseCalculo: modoRateio === "FRACAO_IDEAL" ? "TOTAL_CONDOMINIO" : "POR_UNIDADE",
    });
    setEditandoId(null);
  }

  function abrirEdicao(t) {
    setForm({
      nome: t.nome,
      descricao: t.descricao || "",
      valor: centavosParaCampo(t.valorCentavos),
      baseCalculo: t.baseCalculo,
      periodicidade: t.periodicidade,
      extraordinaria: t.extraordinaria,
      parcelas: t.parcelas,
      ativo: t.ativo,
    });
    setEditandoId(t.id);
  }

  async function salvar() {
    setSalvando(true);
    try {
      if (editandoId) {
        await financeiroApi.atualizarTaxa(editandoId, form);
        toast.success(tr("taxas.toast.atualizada"));
      } else {
        await financeiroApi.criarTaxa(form);
        toast.success(tr("taxas.toast.criada"));
      }
      setForm(null);
      setEditandoId(null);
      carregar();
    } catch (e) {
      toast.error(e.response?.data?.mensagem || tr("taxas.toast.erroSalvar"));
    } finally {
      setSalvando(false);
    }
  }

  async function desativar(t) {
    const ok = await confirmar({
      titulo: tr("taxas.desativar.titulo"),
      // Desativar em vez de apagar: faturas já emitidas apontam para o tipo de
      // taxa, e removê-lo deixaria a composição delas sem explicação.
      mensagem: tr("taxas.desativar.mensagem", { nome: t.nome }),
      confirmarTexto: tr("taxas.desativar.confirmar"),
    });
    if (!ok) return;
    try {
      await financeiroApi.desativarTaxa(t.id);
      toast.success(tr("taxas.toast.desativada"));
      carregar();
    } catch {
      toast.error(tr("taxas.toast.erroDesativar"));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          {carregando
            ? tr("comum:estado.carregando")
            : tr("taxas.lista.contagem", { count: taxas.length })}
        </p>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/25 transition cursor-pointer"
        >
          <Icone name="add" className="text-lg" />
          {tr("taxas.nova")}
        </button>
      </div>

      {form && (
        <FormularioTaxa
          form={form}
          setForm={setForm}
          salvando={salvando}
          editando={Boolean(editandoId)}
          aoSalvar={salvar}
          aoCancelar={() => {
            setForm(null);
            setEditandoId(null);
          }}
        />
      )}

      {!carregando && taxas.length === 0 && !form && (
        <div className="text-center py-12 rounded-2xl border border-dashed border-veu/10">
          <Icone name="receipt_long" className="text-4xl text-outline-variant" />
          <p className="mt-3 text-on-surface-variant text-sm">
            {tr("taxas.lista.vazio")}
          </p>
          <p className="text-xs text-outline-variant mt-1">
            {tr("taxas.lista.vazioAjuda")}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {taxas.map((t) => (
          <div
            key={t.id}
            className="glass-panel rounded-2xl p-4 flex items-center gap-4 flex-wrap"
          >
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icone name={t.extraordinaria ? "priority_high" : "receipt_long"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-on-surface truncate">{t.nome}</p>
              <p className="text-xs text-on-surface-variant truncate">
                {t.descricao || tr("taxas.lista.semDescricao")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-headline font-bold text-on-surface">
                {formatarBRL(t.valorCentavos)}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {tr(BASES[t.baseCalculo])} ·{" "}
                {tr(`taxas.periodicidade.${t.periodicidade}`, { defaultValue: t.periodicidade.toLowerCase() })}
                {t.parcelas > 1 && ` · ${t.parcelas}x`}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => abrirEdicao(t)}
                title={tr("comum:acoes.editar")}
                className="p-2 rounded-lg hover:bg-veu/5 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
              >
                <Icone name="edit" className="text-lg" />
              </button>
              <button
                onClick={() => desativar(t)}
                title={tr("taxas.desativar.confirmar")}
                className="p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition cursor-pointer"
              >
                <Icone name="visibility_off" className="text-lg" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormularioTaxa({ form, setForm, salvando, editando, aoSalvar, aoCancelar }) {
  const { t } = useTranslation("financeiro");
  const campo = (n, v) => setForm((f) => ({ ...f, [n]: v }));
  const entrada =
    "w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/50";
  const rotulo =
    "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-4">
      <h3 className="font-headline text-lg font-bold text-on-surface">
        {editando ? t("taxas.form.tituloEditar") : t("taxas.nova")}
      </h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={rotulo}>{t("taxas.form.nome")}</label>
          <input
            className={entrada}
            value={form.nome}
            placeholder={t("taxas.form.nomePlaceholder")}
            onChange={(e) => campo("nome", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className={rotulo}>{t("taxas.form.valor")}</label>
          <input
            className={entrada}
            value={form.valor}
            placeholder="350,00"
            inputMode="decimal"
            onChange={(e) => campo("valor", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className={rotulo}>{t("taxas.form.descricao")}</label>
        <input
          className={entrada}
          value={form.descricao}
          placeholder={t("taxas.form.descricaoPlaceholder")}
          onChange={(e) => campo("descricao", e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={rotulo}>{t("taxas.form.baseCalculo")}</label>
          <select
            className={`${entrada} cursor-pointer`}
            value={form.baseCalculo}
            onChange={(e) => campo("baseCalculo", e.target.value)}
          >
            <option value="POR_UNIDADE">{t("taxas.bases.porUnidade")}</option>
            <option value="TOTAL_CONDOMINIO">{t("taxas.form.baseTotalOpcao")}</option>
          </select>
          {/* Sem isto o rateio fica ambíguo: R$ 350 é de cada apartamento, ou
              é o que o prédio inteiro divide? */}
          <p className="text-[11px] text-on-surface-variant ml-1">
            {form.baseCalculo === "POR_UNIDADE"
              ? t("taxas.form.basePorUnidadeAjuda")
              : t("taxas.form.baseTotalAjuda")}
          </p>
        </div>
        <div className="space-y-2">
          <label className={rotulo}>{t("taxas.form.periodicidade")}</label>
          <select
            className={`${entrada} cursor-pointer`}
            value={form.periodicidade}
            onChange={(e) => campo("periodicidade", e.target.value)}
          >
            <option value="MENSAL">{t("taxas.periodicidade.MENSAL")}</option>
            <option value="ANUAL">{t("taxas.periodicidade.ANUAL")}</option>
            <option value="UNICA">{t("taxas.periodicidade.UNICA")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.extraordinaria}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                extraordinaria: e.target.checked,
                parcelas: e.target.checked ? f.parcelas : 1,
              }))
            }
            className="w-4 h-4 accent-primary cursor-pointer"
          />
          <span className="text-sm text-on-surface">{t("taxas.form.extraordinaria")}</span>
        </label>

        {form.extraordinaria && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-on-surface-variant">{t("taxas.form.parcelas")}</label>
            <input
              type="number"
              min={1}
              value={form.parcelas}
              onChange={(e) => campo("parcelas", Number(e.target.value))}
              className="w-20 bg-surface-container-highest/40 border-none rounded-xl py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}
      </div>
      {/* Parcelar taxa mensal faria a parcela de um mês colidir com a do
          seguinte — só a extraordinária, aprovada em assembleia, se parcela. */}
      <p className="text-[11px] text-on-surface-variant">
        {t("taxas.form.parcelasAjuda")}
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={aoCancelar}
          className="px-5 py-2.5 rounded-full text-on-surface-variant hover:bg-veu/5 transition cursor-pointer"
        >
          {t("comum:acoes.cancelar")}
        </button>
        <button
          onClick={aoSalvar}
          disabled={salvando}
          className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold cursor-pointer disabled:opacity-60 transition"
        >
          {salvando ? t("comum:acoes.salvando") : t("comum:acoes.salvar")}
        </button>
      </div>
    </div>
  );
}
