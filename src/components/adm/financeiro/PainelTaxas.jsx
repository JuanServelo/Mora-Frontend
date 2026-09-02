import { useEffect, useState } from "react";
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
  POR_UNIDADE: "por unidade",
  TOTAL_CONDOMINIO: "total a ratear",
};

export function PainelTaxas({ modoRateio }) {
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
      toast.error("Erro ao carregar as taxas.");
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
        toast.success("Taxa atualizada.");
      } else {
        await financeiroApi.criarTaxa(form);
        toast.success("Taxa criada.");
      }
      setForm(null);
      setEditandoId(null);
      carregar();
    } catch (e) {
      toast.error(e.response?.data?.mensagem || "Erro ao salvar a taxa.");
    } finally {
      setSalvando(false);
    }
  }

  async function desativar(t) {
    const ok = await confirmar({
      titulo: "Desativar taxa",
      // Desativar em vez de apagar: faturas já emitidas apontam para o tipo de
      // taxa, e removê-lo deixaria a composição delas sem explicação.
      mensagem: `"${t.nome}" deixa de entrar nos próximos fechamentos. As faturas já emitidas continuam como estão.`,
      confirmarTexto: "Desativar",
    });
    if (!ok) return;
    try {
      await financeiroApi.desativarTaxa(t.id);
      toast.success("Taxa desativada.");
      carregar();
    } catch {
      toast.error("Erro ao desativar a taxa.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          {carregando
            ? "Carregando…"
            : `${taxas.length} taxa${taxas.length !== 1 ? "s" : ""} ativa${taxas.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/25 transition cursor-pointer"
        >
          <Icone name="add" className="text-lg" />
          Nova taxa
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
        <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
          <Icone name="receipt_long" className="text-4xl text-outline-variant" />
          <p className="mt-3 text-on-surface-variant text-sm">
            Nenhuma taxa cadastrada ainda.
          </p>
          <p className="text-xs text-outline-variant mt-1">
            Sem ao menos uma taxa ativa, o fechamento do mês não tem o que cobrar.
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
                {t.descricao || "Sem descrição"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-headline font-bold text-on-surface">
                {formatarBRL(t.valorCentavos)}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {BASES[t.baseCalculo]} · {t.periodicidade.toLowerCase()}
                {t.parcelas > 1 && ` · ${t.parcelas}x`}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => abrirEdicao(t)}
                title="Editar"
                className="p-2 rounded-lg hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
              >
                <Icone name="edit" className="text-lg" />
              </button>
              <button
                onClick={() => desativar(t)}
                title="Desativar"
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
  const campo = (n, v) => setForm((f) => ({ ...f, [n]: v }));
  const entrada =
    "w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/50";
  const rotulo =
    "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-4">
      <h3 className="font-headline text-lg font-bold text-on-surface">
        {editando ? "Editar taxa" : "Nova taxa"}
      </h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={rotulo}>Nome</label>
          <input
            className={entrada}
            value={form.nome}
            placeholder="Taxa condominial"
            onChange={(e) => campo("nome", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className={rotulo}>Valor</label>
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
        <label className={rotulo}>Descrição</label>
        <input
          className={entrada}
          value={form.descricao}
          placeholder="O que esta taxa cobre"
          onChange={(e) => campo("descricao", e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={rotulo}>O valor informado é</label>
          <select
            className={`${entrada} cursor-pointer`}
            value={form.baseCalculo}
            onChange={(e) => campo("baseCalculo", e.target.value)}
          >
            <option value="POR_UNIDADE">por unidade</option>
            <option value="TOTAL_CONDOMINIO">o total do condomínio, a ratear</option>
          </select>
          {/* Sem isto o rateio fica ambíguo: R$ 350 é de cada apartamento, ou
              é o que o prédio inteiro divide? */}
          <p className="text-[11px] text-on-surface-variant ml-1">
            {form.baseCalculo === "POR_UNIDADE"
              ? "Cada unidade recebe esse valor."
              : "Esse valor é dividido entre as unidades."}
          </p>
        </div>
        <div className="space-y-2">
          <label className={rotulo}>Periodicidade</label>
          <select
            className={`${entrada} cursor-pointer`}
            value={form.periodicidade}
            onChange={(e) => campo("periodicidade", e.target.value)}
          >
            <option value="MENSAL">mensal</option>
            <option value="ANUAL">anual</option>
            <option value="UNICA">única</option>
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
          <span className="text-sm text-on-surface">Taxa extraordinária</span>
        </label>

        {form.extraordinaria && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-on-surface-variant">Parcelas</label>
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
        Só taxa extraordinária pode ser parcelada.
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={aoCancelar}
          className="px-5 py-2.5 rounded-full text-on-surface-variant hover:bg-white/5 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={aoSalvar}
          disabled={salvando}
          className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold cursor-pointer disabled:opacity-60 transition"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
