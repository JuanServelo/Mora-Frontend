// src/pages/porteiro/AtendimentoPortaria.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import {
  atendimentoApi,
  apartamentoApi,
  veiculoApi,
} from "../../services/portariaApi";
import { acessoApi } from "../../services/acessoApi";
import { formatarUnidade } from "../../utils/unidades";

// ─── helpers ──────────────────────────────────────────────────────────────────

function errMsg(err) {
  return (
    err?.response?.data?.mensagem ||
    err?.response?.data?.message ||
    err?.message ||
    "Erro inesperado."
  );
}

function fmtDH(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizarPlaca(p) {
  return p ? p.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

function mascaraCpf(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function validarCpf(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rem = 11 - (sum % 11);
  const dig1 = rem >= 10 ? 0 : rem;
  if (dig1 !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rem = 11 - (sum % 11);
  const dig2 = rem >= 10 ? 0 : rem;
  return dig2 === parseInt(d[10]);
}

// ─── Indicador de passos ───────────────────────────────────────────────────────

function IndicadorPassos({ passo }) {
  const passos = ["Pessoa", "Veículo", "Confirmar"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {passos.map((label, i) => {
        const n = i + 1;
        const ativo = passo === n;
        const concluido = passo > n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  concluido
                    ? "bg-primary text-on-primary"
                    : ativo
                    ? "bg-primary/20 text-primary ring-2 ring-primary"
                    : "bg-surface-container-highest/40 text-outline-variant"
                }`}
              >
                {concluido ? <Icone name="check" className="text-sm" /> : n}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  ativo ? "text-primary" : "text-outline-variant"
                }`}
              >
                {label}
              </span>
            </div>
            {i < passos.length - 1 && (
              <div
                className={`h-px w-12 mx-1 mb-5 ${
                  passo > n ? "bg-primary" : "bg-outline-variant/30"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Chip de status de acesso ─────────────────────────────────────────────────

function ChipStatus({ status }) {
  if (status === "DENTRO")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-error/15 text-error">
        <span className="w-1.5 h-1.5 rounded-full bg-error" />
        Dentro
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      Fora
    </span>
  );
}

// ─── Cartão de pessoa (resultado de busca) ────────────────────────────────────

function CartaoPessoa({ pessoa, onSelecionar }) {
  return (
    <button
      type="button"
      onClick={() => onSelecionar(pessoa)}
      className="w-full text-left glass-panel rounded-2xl p-4 border border-outline-variant/15 hover:border-primary/30 hover:bg-white/[0.02] transition-all group"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-on-surface text-sm">{pessoa.nome}</p>
          <p className="text-xs text-outline-variant mt-0.5">
            {pessoa.documento || "Sem documento"}
            {pessoa.empresa ? ` · ${pessoa.empresa}` : ""}
            {pessoa.apartamentoNumero ? ` · Apto ${pessoa.apartamentoNumero}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ChipStatus status={pessoa.status} />
          <Icone
            name="chevron_right"
            className="text-outline-variant group-hover:text-primary transition-colors text-lg"
          />
        </div>
      </div>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AtendimentoPortaria() {
  const [searchParams] = useSearchParams();

  // ─── passo global ──────────────────────────────────────────────────────────
  const [passo, setPasso] = useState(1);

  // ─── passo 1: pessoa ───────────────────────────────────────────────────────
  const [tipo, setTipo] = useState(() => {
    const t = searchParams.get("tipo");
    if (t === "visitante") return "VISITA";
    if (t === "servico") return "SERVICO";
    return null;
  });
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [pessoaConfirmada, setPessoaConfirmada] = useState(null);
  const [modoForm, setModoForm] = useState(false);
  const [formPessoa, setFormPessoa] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    obs: "",
    apartamentoId: "",
    moradorId: "",
    empresa: "",
    destino: "",
  });
  const [errosPessoa, setErrosPessoa] = useState({});

  // dados auxiliares para VISITA
  const [apartamentos, setApartamentos] = useState([]);
  const [moradores, setMoradores] = useState([]);
  const [moradoresCarregando, setMoradoresCarregando] = useState(false);
  const [erroMoradores, setErroMoradores] = useState(null);

  // ─── passo 2: veículo ──────────────────────────────────────────────────────
  const [semVeiculo, setSemVeiculo] = useState(false);
  const [buscaPlaca, setBuscaPlaca] = useState("");
  const [veiculosCondo, setVeiculosCondo] = useState([]);
  const [veiculoConfirmado, setVeiculoConfirmado] = useState(null);
  const [modoFormVeiculo, setModoFormVeiculo] = useState(false);
  const [formVeiculo, setFormVeiculo] = useState({ placa: "", modelo: "", cor: "" });
  const [errosVeiculo, setErrosVeiculo] = useState({});
  const [vagasUnidade, setVagasUnidade] = useState([]);
  const [vagasCarregando, setVagasCarregando] = useState(false);
  const [erroVagas, setErroVagas] = useState(null);
  const [vagaId, setVagaId] = useState(null);
  const [semVaga, setSemVaga] = useState(false);

  // ─── passo 3: confirmação ──────────────────────────────────────────────────
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroGlobal, setErroGlobal] = useState(null);
  const [pessoaJaDentro, setPessoaJaDentro] = useState(false);

  const debounceRef = useRef(null);

  // ─── pré-preencher da URL (cpf + placa) ──────────────────────────────────

  useEffect(() => {
    const placaParam = searchParams.get("placa");
    if (placaParam) setBuscaPlaca(normalizarPlaca(placaParam));

    const cpfParam = searchParams.get("cpf");
    if (!cpfParam) return;
    const cpfNorm = cpfParam.replace(/\D/g, "");
    if (!cpfNorm) return;
    const tipoUrl = searchParams.get("tipo");
    const tipoParaBusca = tipoUrl === "servico" ? "SERVICO" : "VISITA";
    atendimentoApi.buscar(cpfNorm, tipoParaBusca)
      .then((r) => {
        const lista = r.data;
        if (!Array.isArray(lista) || lista.length === 0) return;
        const p = lista.find((x) => x.documento?.replace(/\D/g, "") === cpfNorm) || lista[0];
        if (!p) return;
        setPessoaConfirmada(p);
        if (p.status === "DENTRO") setPessoaJaDentro(true);
        setPasso(2);
      })
      .catch(() => {}); // CPF não encontrado — porteiro busca manualmente
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── carregar dados auxiliares ao selecionar tipo ─────────────────────────

  useEffect(() => {
    if (tipo === "VISITA") {
      apartamentoApi.listar().then((r) => setApartamentos(r.data || [])).catch(() => {});
      setMoradoresCarregando(true);
      setErroMoradores(null);
      acessoApi
        .listarUsuariosCondominio()
        .then((r) => setMoradores(r.data?.usuarios || []))
        .catch((err) => setErroMoradores(errMsg(err)))
        .finally(() => setMoradoresCarregando(false));
    }
    veiculoApi.listar().then((r) => setVeiculosCondo(r.data || [])).catch(() => {});
  }, [tipo]);

  function recarregarMoradores() {
    setMoradoresCarregando(true);
    setErroMoradores(null);
    acessoApi
      .listarUsuariosCondominio()
      .then((r) => setMoradores(r.data?.usuarios || []))
      .catch((err) => setErroMoradores(errMsg(err)))
      .finally(() => setMoradoresCarregando(false));
  }

  // ─── busca de pessoas com debounce ───────────────────────────────────────

  useEffect(() => {
    if (!tipo || busca.trim().length < 2) {
      setResultados([]);
      return;
    }
    clearTimeout(debounceRef.current);
    setBuscando(true);
    debounceRef.current = setTimeout(() => {
      atendimentoApi
        .buscar(busca.trim(), tipo)
        .then((r) => setResultados(r.data || []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [busca, tipo]);

  // ─── vagas da unidade ao selecionar apartamento no form ──────────────────

  useEffect(() => {
    if (!formPessoa.apartamentoId) {
      setVagasUnidade([]);
      setErroVagas(null);
      setVagaId(null);
      setVagasCarregando(false);
      return;
    }
    setVagasCarregando(true);
    setErroVagas(null);
    atendimentoApi
      .vagasUnidade(formPessoa.apartamentoId)
      .then((r) => setVagasUnidade(r.data || []))
      .catch((err) => { setVagasUnidade([]); setErroVagas(errMsg(err)); })
      .finally(() => setVagasCarregando(false));
    setFormPessoa((f) => ({ ...f, moradorId: "" }));
  }, [formPessoa.apartamentoId]);

  // ─── vagas quando visitante existente selecionado ────────────────────────

  useEffect(() => {
    const aptId = pessoaConfirmada?.apartamentoId || formPessoa.apartamentoId;
    if (!aptId || tipo !== "VISITA") return;
    setVagasCarregando(true);
    setErroVagas(null);
    atendimentoApi
      .vagasUnidade(aptId)
      .then((r) => setVagasUnidade(r.data || []))
      .catch((err) => { setVagasUnidade([]); setErroVagas(errMsg(err)); })
      .finally(() => setVagasCarregando(false));
  }, [pessoaConfirmada, tipo]);

  // ─── veiculoBloqueado: sem vaga → bloqueia cadastro de veículo ───────────

  const aptId = pessoaConfirmada?.apartamentoId || formPessoa.apartamentoId;
  const vagasDisponiveis = vagasUnidade.filter((v) => v.disponivel);
  const todasOcupadas = vagasUnidade.length > 0 && vagasDisponiveis.length === 0;
  const semVagasCadastradas = vagasUnidade.length === 0 && !!aptId && !vagasCarregando && !erroVagas;
  const aptSelecionado = apartamentos.find((a) => a.id === aptId);
  const veiculoBloqueado = tipo === "VISITA" && !!aptId && !vagasCarregando && !erroVagas && (semVagasCadastradas || todasOcupadas);

  // ─── moradores filtrados pela unidade selecionada ────────────────────────

  const moradoresdaUnidade = moradores.filter(
    (m) => m.unidadeId && m.unidadeId === formPessoa.apartamentoId
  );

  // ─── resetar ao trocar tipo ───────────────────────────────────────────────

  const resetarTudo = useCallback((novoTipo) => {
    setTipo(novoTipo);
    setBusca("");
    setResultados([]);
    setPessoaConfirmada(null);
    setModoForm(false);
    setFormPessoa({ nome: "", cpf: "", telefone: "", obs: "", apartamentoId: "", moradorId: "", empresa: "", destino: "" });
    setErrosPessoa({});
    setSemVeiculo(false);
    setVeiculoConfirmado(null);
    setModoFormVeiculo(false);
    setFormVeiculo({ placa: "", modelo: "", cor: "" });
    setErrosVeiculo({});
    setVagasUnidade([]);
    setVagasCarregando(false);
    setErroVagas(null);
    setVagaId(null);
    setSemVaga(false);
    setMoradoresCarregando(false);
    setErroMoradores(null);
    setErroGlobal(null);
    setResultado(null);
    setPessoaJaDentro(false);
    setPasso(1);
    // Preservar buscaPlaca se veio de param de URL
    const placaParam = searchParams.get("placa");
    if (placaParam) setBuscaPlaca(normalizarPlaca(placaParam));
  }, [searchParams]);

  // ─── validações passo 1 ───────────────────────────────────────────────────

  function validarPessoa() {
    const erros = {};
    if (!formPessoa.nome.trim()) erros.nome = "Obrigatório";
    const cpfNorm = formPessoa.cpf.replace(/\D/g, "");
    if (!cpfNorm) {
      erros.cpf = "Obrigatório";
    } else if (!validarCpf(cpfNorm)) {
      erros.cpf = "CPF inválido. Verifique os dígitos.";
    }
    if (tipo === "VISITA") {
      if (!formPessoa.apartamentoId) erros.apartamentoId = "Obrigatório";
      if (!formPessoa.moradorId && moradoresdaUnidade.length > 0) {
        erros.moradorId = "Obrigatório";
      }
    }
    if (tipo === "SERVICO" && !formPessoa.empresa.trim()) {
      erros.empresa = "Obrigatório";
    }
    setErrosPessoa(erros);
    if (Object.keys(erros).length > 0) {
      const primeiro = Object.keys(erros)[0];
      document.getElementById(`campo-${primeiro}`)?.focus();
    }
    return Object.keys(erros).length === 0;
  }

  function confirmarPessoa() {
    if (modoForm) {
      if (!validarPessoa()) return;
      setPessoaConfirmada({ fromForm: true, ...formPessoa, documento: formPessoa.cpf.replace(/\D/g, "") });
    } else if (tipo === "VISITA") {
      const erros = {};
      if (!formPessoa.apartamentoId && !pessoaConfirmada?.apartamentoId) {
        erros.apartamentoId = "Obrigatório";
      }
      if (!formPessoa.moradorId && moradoresdaUnidade.length > 0) {
        erros.moradorId = "Obrigatório";
      }
      setErrosPessoa(erros);
      if (Object.keys(erros).length > 0) return;
    }
    setPasso(2);
  }

  // ─── seleção de resultado de busca ────────────────────────────────────────

  function selecionarPessoa(p) {
    setPessoaConfirmada(p);
    setBusca(p.nome);
    setModoForm(false);
    setResultados([]);
    if (p.apartamentoId) {
      setFormPessoa((f) => ({ ...f, apartamentoId: p.apartamentoId }));
    }
  }

  function iniciarNovoCadastro() {
    setModoForm(true);
    setPessoaConfirmada(null);
    setFormPessoa((f) => ({
      ...f,
      nome: busca.trim().includes(" ") ? busca.trim() : "",
      cpf: "",
    }));
    setResultados([]);
  }

  // ─── validações passo 2 ───────────────────────────────────────────────────

  function validarVeiculo() {
    const erros = {};
    const placa = normalizarPlaca(formVeiculo.placa);
    if (!placa) { erros.placa = "Obrigatório"; }
    else if (!/^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa)) {
      erros.placa = "Formato inválido (AAA9999 ou AAA9A99)";
    }
    setErrosVeiculo(erros);
    if (erros.placa) document.getElementById("campo-placa")?.focus();
    return Object.keys(erros).length === 0;
  }

  function confirmarVeiculo() {
    if (!semVeiculo && modoFormVeiculo) {
      if (!validarVeiculo()) return;
      setVeiculoConfirmado({ fromForm: true, ...formVeiculo, placa: normalizarPlaca(formVeiculo.placa) });
    }
    setPasso(3);
  }

  // ─── veículo por placa ───────────────────────────────────────────────────

  const veiculosFiltrados = buscaPlaca.length >= 3
    ? veiculosCondo.filter((v) =>
        normalizarPlaca(v.placa).includes(normalizarPlaca(buscaPlaca))
      )
    : [];

  function selecionarVeiculo(v) {
    setVeiculoConfirmado(v);
    setBuscaPlaca(v.placa);
    setModoFormVeiculo(false);
  }

  // ─── confirmar atendimento ────────────────────────────────────────────────

  async function confirmar() {
    setConfirmando(true);
    setErroGlobal(null);
    try {
      const aptIdPayload = pessoaConfirmada?.apartamentoId || formPessoa.apartamentoId;

      const payload = {
        tipoVisita: tipo,
        pessoaId: pessoaConfirmada?.id || null,
        nome: pessoaConfirmada?.nome || formPessoa.nome,
        documento: pessoaConfirmada?.documento || formPessoa.cpf.replace(/\D/g, ""),
        telefone: pessoaConfirmada?.telefone || formPessoa.telefone || null,
        obs: formPessoa.obs || null,
        apartamentoId: tipo === "VISITA" ? (aptIdPayload || null) : null,
        moradorResponsavelId: tipo === "VISITA" ? (formPessoa.moradorId || pessoaConfirmada?.moradorResponsavelId || null) : null,
        empresa: tipo === "SERVICO" ? (formPessoa.empresa || pessoaConfirmada?.empresa || null) : null,
        destino: tipo === "SERVICO" ? (formPessoa.destino || pessoaConfirmada?.destino || null) : null,
        veiculo: semVeiculo
          ? null
          : veiculoConfirmado
          ? {
              veiculoId: veiculoConfirmado.fromForm ? null : veiculoConfirmado.id,
              placa: normalizarPlaca(veiculoConfirmado.placa),
              modelo: veiculoConfirmado.modelo || formVeiculo.modelo || null,
              cor: veiculoConfirmado.cor || formVeiculo.cor || null,
              vagaId: tipo === "VISITA" && !semVaga ? (vagaId || null) : null,
            }
          : null,
      };

      const res = await atendimentoApi.registrar(payload);
      setResultado(res.data);
      setPasso(4); // passo de sucesso
    } catch (err) {
      setErroGlobal(errMsg(err));
    } finally {
      setConfirmando(false);
    }
  }

  // ─── tela de sucesso ──────────────────────────────────────────────────────

  if (passo === 4 && resultado) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6 flex items-start justify-center">
        <div className="w-full max-w-lg mt-8">
          <div className="glass-panel rounded-3xl p-8 border border-primary/15 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <Icone name="check_circle" className="text-primary text-4xl" />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Entrada registrada</h2>
              <p className="text-on-surface-variant mt-2 text-sm">{resultado.mensagem}</p>
            </div>

            {resultado.pessoa && (
              <div className="glass-panel rounded-2xl p-4 text-left space-y-1 border border-outline-variant/10">
                <p className="font-semibold text-on-surface">{resultado.pessoa.nome}</p>
                <p className="text-xs text-outline-variant">
                  {resultado.pessoa.tipoVisita === "VISITA" ? "Visitante" : "Terceiro"}
                  {resultado.pessoa.apartamentoNumero ? ` · Apto ${resultado.pessoa.apartamentoNumero}` : ""}
                </p>
                {resultado.veiculo && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    Veículo: {resultado.veiculo.placa}
                    {resultado.vagaNumero ? ` · Vaga ${resultado.vagaNumero}` : " · Sem vaga"}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => resetarTudo(null)}
                className="flex-1 rounded-2xl py-3 px-4 bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Novo atendimento
              </button>
              <Link
                to="/entradas-e-saidas"
                className="flex-1 rounded-2xl py-3 px-4 bg-surface-container-highest/40 text-on-surface font-semibold text-sm text-center hover:bg-surface-container-highest/60 transition-colors"
              >
                Dentro agora
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── render principal ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Portaria
          </p>
          <h1 className="font-headline text-3xl font-bold text-on-surface">
            Atendimento
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Registre a entrada de visitantes e prestadores de serviço.
          </p>
        </div>

        <IndicadorPassos passo={Math.min(passo, 3)} />

        {/* ── PASSO 1: PESSOA ─────────────────────────────────────────────── */}
        <section className="glass-panel rounded-3xl p-6 border border-outline-variant/15 space-y-5">
          <h2 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">1</span>
            Identificação
          </h2>

          {/* Tipo */}
          <div className="flex gap-3">
            {[
              { value: "VISITA", label: "Visitante", icon: "person" },
              { value: "SERVICO", label: "Terceiro / Serviço", icon: "engineering" },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => resetarTudo(value)}
                className={`flex-1 flex items-center gap-2 rounded-2xl px-4 py-3 border text-sm font-semibold transition-all ${
                  tipo === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant"
                }`}
              >
                <Icone name={icon} className="text-lg" />
                {label}
              </button>
            ))}
          </div>

          {tipo && passo === 1 && (
            <>
              {/* Busca */}
              {!pessoaConfirmada && (
                <div className="space-y-3">
                  <Campo
                    id="campo-busca"
                    label="Buscar por nome ou CPF"
                    placeholder="Ex: João Silva ou 123.456.789-00"
                    icon="search"
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setModoForm(false); setPessoaConfirmada(null); }}
                    autoComplete="off"
                  />

                  {/* Resultados */}
                  {buscando && (
                    <p className="text-xs text-outline-variant text-center py-2">Buscando…</p>
                  )}

                  {!buscando && busca.trim().length >= 2 && (
                    <div className="space-y-2">
                      {resultados.length > 0 && (
                        <>
                          <p className="text-xs text-outline-variant uppercase tracking-wider font-semibold">
                            Encontrados
                          </p>
                          {resultados.map((p) => (
                            <CartaoPessoa key={p.id} pessoa={p} onSelecionar={selecionarPessoa} />
                          ))}
                        </>
                      )}
                      {resultados.length === 0 && !modoForm && (
                        <div className="text-center py-2">
                          <p className="text-sm text-on-surface-variant">
                            Nenhum resultado para "{busca}".
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={iniciarNovoCadastro}
                        className="w-full rounded-2xl py-3 px-4 border border-dashed border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                      >
                        <Icone name="person_add" className="text-lg" />
                        Cadastrar novo
                        {busca.trim() && `: "${busca.trim()}"`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pessoa selecionada (existente) */}
              {pessoaConfirmada && !pessoaConfirmada.fromForm && (
                <div className="glass-panel rounded-2xl p-4 border border-primary/20 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-on-surface">{pessoaConfirmada.nome}</p>
                      <p className="text-xs text-outline-variant">
                        {pessoaConfirmada.documento}
                        {pessoaConfirmada.empresa ? ` · ${pessoaConfirmada.empresa}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChipStatus status={pessoaConfirmada.status} />
                      <button
                        type="button"
                        onClick={() => { setPessoaConfirmada(null); setBusca(""); setResultados([]); }}
                        className="text-outline-variant hover:text-on-surface"
                      >
                        <Icone name="close" className="text-lg" />
                      </button>
                    </div>
                  </div>

                  {/* Avisos */}
                  {pessoaConfirmada.status === "DENTRO" && (
                    <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-xs text-error">
                      <strong>{pessoaConfirmada.nome}</strong> já está no condomínio desde{" "}
                      {fmtDH(pessoaConfirmada.horarioEntrada)}.{" "}
                      <Link to="/entradas-e-saidas" className="underline font-semibold">
                        Ver dentro agora
                      </Link>
                    </div>
                  )}

                  {/* Unidade para VISITA (confirmar/alterar) */}
                  {tipo === "VISITA" && (
                    <>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1 block mb-1">
                          Unidade visitada <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="w-full bg-surface-container-highest/40 rounded-xl py-3 px-4 text-sm text-on-surface border-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={formPessoa.apartamentoId || pessoaConfirmada.apartamentoId || ""}
                          onChange={(e) => setFormPessoa((f) => ({ ...f, apartamentoId: e.target.value, moradorId: "" }))}
                        >
                          <option value="">Selecionar unidade...</option>
                          {apartamentos.map((a) => (
                            <option key={a.id} value={a.id}>
                              {formatarUnidade(a.blocoNome || a.bloco?.nome, a.numero)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Morador responsável — obrigatório para VISITA */}
                      {(formPessoa.apartamentoId || pessoaConfirmada.apartamentoId) && (
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1 block mb-1">
                            Morador responsável <span className="text-red-500">*</span>
                          </label>
                          {moradoresCarregando ? (
                            <p className="text-xs text-on-surface-variant px-1 py-2">Carregando moradores…</p>
                          ) : erroMoradores ? (
                            <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-xs text-error flex items-center justify-between gap-2">
                              <span>{erroMoradores}</span>
                              <button type="button" onClick={recarregarMoradores} className="underline font-semibold shrink-0">Tentar novamente</button>
                            </div>
                          ) : moradoresdaUnidade.length === 0 ? (
                            <p className="text-xs text-on-surface-variant px-1 py-2">Esta unidade não possui moradores ativos cadastrados.</p>
                          ) : (
                            <select
                              className={`w-full bg-surface-container-highest/40 rounded-xl py-3 px-4 text-sm text-on-surface border-none focus:outline-none ${errosPessoa.moradorId ? "ring-2 ring-error/60" : "focus:ring-2 focus:ring-primary/50"}`}
                              value={formPessoa.moradorId}
                              onChange={(e) => setFormPessoa((f) => ({ ...f, moradorId: e.target.value }))}
                            >
                              <option value="">Selecionar morador...</option>
                              {moradoresdaUnidade.map((m) => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                              ))}
                            </select>
                          )}
                          {errosPessoa.moradorId && !moradoresCarregando && !erroMoradores && moradoresdaUnidade.length > 0 && (
                            <p className="text-xs text-error ml-1 mt-1">{errosPessoa.moradorId}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Formulário de novo cadastro */}
              {modoForm && (
                <div className="space-y-4 border-t border-outline-variant/15 pt-4">
                  <p className="text-xs text-outline-variant uppercase tracking-wider font-semibold">
                    Novo {tipo === "VISITA" ? "visitante" : "prestador de serviço"}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Campo
                      id="campo-nome"
                      label="Nome completo"
                      required
                      placeholder="Ex: Maria da Silva"
                      value={formPessoa.nome}
                      onChange={(e) => setFormPessoa((f) => ({ ...f, nome: e.target.value }))}
                      error={errosPessoa.nome}
                    />
                    <Campo
                      id="campo-cpf"
                      label="CPF"
                      required
                      placeholder="000.000.000-00"
                      value={formPessoa.cpf}
                      onChange={(e) => setFormPessoa((f) => ({ ...f, cpf: mascaraCpf(e.target.value) }))}
                      error={errosPessoa.cpf}
                      inputMode="numeric"
                    />
                  </div>
                  <Campo
                    id="campo-telefone"
                    label="Telefone"
                    optional
                    placeholder="Ex: (11) 99999-9999"
                    value={formPessoa.telefone}
                    onChange={(e) => setFormPessoa((f) => ({ ...f, telefone: e.target.value }))}
                  />

                  {tipo === "VISITA" && (
                    <>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1 block mb-1.5">
                          Unidade visitada <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="campo-apartamentoId"
                          className={`w-full bg-surface-container-highest/40 rounded-xl py-3.5 px-4 text-sm text-on-surface border-none focus:outline-none ${errosPessoa.apartamentoId ? "ring-2 ring-error/60" : "focus:ring-2 focus:ring-primary/50"}`}
                          value={formPessoa.apartamentoId}
                          onChange={(e) => setFormPessoa((f) => ({ ...f, apartamentoId: e.target.value, moradorId: "" }))}
                        >
                          <option value="">Selecionar unidade...</option>
                          {apartamentos.map((a) => (
                            <option key={a.id} value={a.id}>
                              {formatarUnidade(a.blocoNome || a.bloco?.nome, a.numero)}
                            </option>
                          ))}
                        </select>
                        {errosPessoa.apartamentoId && (
                          <p className="text-xs text-error ml-1 mt-1">{errosPessoa.apartamentoId}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1 block mb-1.5">
                          Morador responsável <span className="text-red-500">*</span>
                        </label>
                        {!formPessoa.apartamentoId ? (
                          <p className="text-xs text-on-surface-variant px-1 py-2">Selecione a unidade primeiro.</p>
                        ) : moradoresCarregando ? (
                          <p className="text-xs text-on-surface-variant px-1 py-2">Carregando moradores…</p>
                        ) : erroMoradores ? (
                          <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-xs text-error flex items-center justify-between gap-2">
                            <span>{erroMoradores}</span>
                            <button type="button" onClick={recarregarMoradores} className="underline font-semibold shrink-0">Tentar novamente</button>
                          </div>
                        ) : moradoresdaUnidade.length === 0 ? (
                          <p className="text-xs text-on-surface-variant px-1 py-2">Esta unidade não possui moradores ativos cadastrados.</p>
                        ) : (
                          <select
                            id="campo-moradorId"
                            className={`w-full bg-surface-container-highest/40 rounded-xl py-3.5 px-4 text-sm text-on-surface border-none focus:outline-none ${errosPessoa.moradorId ? "ring-2 ring-error/60" : "focus:ring-2 focus:ring-primary/50"}`}
                            value={formPessoa.moradorId}
                            onChange={(e) => setFormPessoa((f) => ({ ...f, moradorId: e.target.value }))}
                          >
                            <option value="">Selecionar morador...</option>
                            {moradoresdaUnidade.map((m) => (
                              <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                          </select>
                        )}
                        {errosPessoa.moradorId && !moradoresCarregando && !erroMoradores && moradoresdaUnidade.length > 0 && (
                          <p className="text-xs text-error ml-1 mt-1">{errosPessoa.moradorId}</p>
                        )}
                      </div>
                    </>
                  )}

                  {tipo === "SERVICO" && (
                    <>
                      <Campo
                        id="campo-empresa"
                        label="Empresa / Prestador"
                        required
                        placeholder="Ex: Plombéria Silva"
                        value={formPessoa.empresa}
                        onChange={(e) => setFormPessoa((f) => ({ ...f, empresa: e.target.value }))}
                        error={errosPessoa.empresa}
                      />
                      <Campo
                        id="campo-destino"
                        label="Destino"
                        optional
                        placeholder="Ex: Apto 501 ou Salão de festas"
                        value={formPessoa.destino}
                        onChange={(e) => setFormPessoa((f) => ({ ...f, destino: e.target.value }))}
                      />
                    </>
                  )}

                  <Campo
                    id="campo-obs"
                    label="Observações"
                    optional
                    placeholder="Informações adicionais"
                    value={formPessoa.obs}
                    onChange={(e) => setFormPessoa((f) => ({ ...f, obs: e.target.value }))}
                  />
                </div>
              )}

              {/* Botão avançar passo 1 */}
              {(pessoaConfirmada || modoForm) && pessoaConfirmada?.status !== "DENTRO" && (
                <button
                  type="button"
                  onClick={confirmarPessoa}
                  className="w-full rounded-2xl py-3 px-4 bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  Próximo: Veículo
                  <Icone name="arrow_forward" className="text-lg" />
                </button>
              )}
            </>
          )}

          {/* Pessoa confirmada (passos 2 e 3) */}
          {passo > 1 && pessoaConfirmada && (
            <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
              <div>
                <p className="font-semibold text-on-surface text-sm">{pessoaConfirmada.nome || formPessoa.nome}</p>
                <p className="text-xs text-outline-variant">
                  {tipo === "VISITA" ? "Visitante" : "Terceiro"}
                  {(pessoaConfirmada.apartamentoNumero || aptSelecionado?.numero) &&
                    ` · Apto ${pessoaConfirmada.apartamentoNumero || aptSelecionado?.numero}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPasso(1); setVeiculoConfirmado(null); setSemVeiculo(false); }}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Alterar
              </button>
            </div>
          )}
        </section>

        {/* ── PASSO 2: VEÍCULO ────────────────────────────────────────────── */}
        {passo >= 2 && (
          <section className="glass-panel rounded-3xl p-6 border border-outline-variant/15 space-y-5">
            <h2 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">2</span>
              Veículo
              <span className="text-xs font-normal text-on-surface-variant normal-case">(opcional)</span>
            </h2>

            {passo === 2 && (
              <>
                {/* Banner: visitante já está dentro — apenas veículo */}
                {pessoaJaDentro && (
                  <div className="flex items-start gap-3 rounded-xl bg-primary/10 border border-primary/20 p-4">
                    <Icone name="info" className="text-primary text-xl shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-primary">Visitante já está no condomínio</p>
                      <p className="text-xs text-primary/80 mt-0.5">Será registrada apenas a entrada do veículo. A entrada da pessoa já existente é mantida.</p>
                    </div>
                  </div>
                )}

                {/* Toggle "Entrou a pé" — oculto quando visitante já está dentro (AJUSTE 6) */}
                {!pessoaJaDentro && (
                  <button
                    type="button"
                    aria-pressed={semVeiculo}
                    onClick={() => setSemVeiculo((v) => !v)}
                    className={`w-full rounded-2xl py-3 px-4 border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      semVeiculo
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant"
                    }`}
                  >
                    <Icone name="directions_walk" className="text-lg" />
                    {semVeiculo ? "Entrou a pé — toque para desfazer" : "Entrou a pé / sem veículo"}
                  </button>
                )}

                {/* Seção de veículo — oculta só quando "Entrou a pé" */}
                {!semVeiculo && (
                  <>
                    {/* Estado de erro ao carregar vagas */}
                    {tipo === "VISITA" && erroVagas && (
                      <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-xs text-error flex items-center justify-between gap-2">
                        <span>{erroVagas}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!aptId) return;
                            setVagasCarregando(true);
                            setErroVagas(null);
                            atendimentoApi
                              .vagasUnidade(aptId)
                              .then((r) => setVagasUnidade(r.data || []))
                              .catch((err) => { setVagasUnidade([]); setErroVagas(errMsg(err)); })
                              .finally(() => setVagasCarregando(false));
                          }}
                          className="underline font-semibold shrink-0"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    )}

                    {/* Bloqueio por sem vaga — seção visível mas desabilitada */}
                    {veiculoBloqueado && (
                      <div className="rounded-xl bg-error/10 border border-error/20 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <Icone name="block" className="text-error text-xl shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-error">Sem vaga disponível</p>
                            <p className="text-xs text-error/80 mt-1">
                              {semVagasCadastradas
                                ? `A unidade ${aptSelecionado ? formatarUnidade(aptSelecionado.blocoNome || aptSelecionado.bloco?.nome, aptSelecionado.numero) : ""} não possui vagas cadastradas. Não é possível registrar a entrada com automóvel — apenas entrada a pé.`
                                : `A unidade ${aptSelecionado ? formatarUnidade(aptSelecionado.blocoNome || aptSelecionado.bloco?.nome, aptSelecionado.numero) : ""} não possui vaga disponível no momento. Não é possível registrar a entrada com automóvel — apenas entrada a pé.`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSemVeiculo(true)}
                          className="w-full rounded-xl py-2.5 px-4 border border-error/30 text-error text-sm font-semibold hover:bg-error/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <Icone name="directions_walk" className="text-base" />
                          Registrar entrada a pé
                        </button>
                      </div>
                    )}

                    {/* Formulário de veículo — desabilitado quando bloqueado */}
                    {!veiculoBloqueado && (
                      <>
                        {/* Busca por placa */}
                        {!veiculoConfirmado && (
                          <div className="space-y-3">
                            <Campo
                              id="campo-placa-busca"
                              label="Buscar veículo por placa"
                              placeholder="Ex: ABC1234"
                              icon="search"
                              value={buscaPlaca}
                              onChange={(e) => { setBuscaPlaca(e.target.value); setVeiculoConfirmado(null); setModoFormVeiculo(false); }}
                              autoComplete="off"
                            />

                            {buscaPlaca.length >= 3 && (
                              <div className="space-y-2">
                                {veiculosFiltrados.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => selecionarVeiculo(v)}
                                    className="w-full text-left glass-panel rounded-2xl p-4 border border-outline-variant/15 hover:border-primary/30 transition-all group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-on-surface text-sm">{v.placa}</p>
                                        <p className="text-xs text-outline-variant">
                                          {v.modelo || "—"} {v.cor ? `· ${v.cor}` : ""}
                                        </p>
                                      </div>
                                      <Icone name="chevron_right" className="text-outline-variant group-hover:text-primary transition-colors text-lg" />
                                    </div>
                                  </button>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setModoFormVeiculo(true);
                                    setFormVeiculo((f) => ({ ...f, placa: normalizarPlaca(buscaPlaca) }));
                                  }}
                                  className="w-full rounded-2xl py-3 px-4 border border-dashed border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Icone name="add" className="text-lg" />
                                  Cadastrar veículo: {normalizarPlaca(buscaPlaca)}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Form de novo veículo */}
                        {modoFormVeiculo && !veiculoConfirmado && (
                          <div className="space-y-4 border-t border-outline-variant/15 pt-4">
                            <p className="text-xs text-outline-variant uppercase tracking-wider font-semibold">Dados do veículo</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <Campo
                                id="campo-placa"
                                label="Placa"
                                required
                                placeholder="ABC1234"
                                value={formVeiculo.placa}
                                onChange={(e) => setFormVeiculo((f) => ({ ...f, placa: e.target.value }))}
                                error={errosVeiculo.placa}
                              />
                              <Campo
                                id="campo-modelo"
                                label="Modelo"
                                optional
                                placeholder="Ex: Civic"
                                value={formVeiculo.modelo}
                                onChange={(e) => setFormVeiculo((f) => ({ ...f, modelo: e.target.value }))}
                              />
                              <Campo
                                id="campo-cor"
                                label="Cor"
                                optional
                                placeholder="Ex: Prata"
                                value={formVeiculo.cor}
                                onChange={(e) => setFormVeiculo((f) => ({ ...f, cor: e.target.value }))}
                              />
                            </div>
                          </div>
                        )}

                        {/* Veículo selecionado */}
                        {veiculoConfirmado && (
                          <div className="glass-panel rounded-2xl p-4 border border-primary/20 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-on-surface">{normalizarPlaca(veiculoConfirmado.placa)}</p>
                              <p className="text-xs text-outline-variant">
                                {veiculoConfirmado.modelo || "—"} {veiculoConfirmado.cor ? `· ${veiculoConfirmado.cor}` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setVeiculoConfirmado(null); setBuscaPlaca(""); setModoFormVeiculo(false); setVagaId(null); setSemVaga(false); }}
                              className="text-outline-variant hover:text-on-surface"
                            >
                              <Icone name="close" className="text-lg" />
                            </button>
                          </div>
                        )}

                        {/* Seletor de vaga — VISITA com veículo */}
                        {tipo === "VISITA" && (veiculoConfirmado || modoFormVeiculo) && aptId && (
                          <div className="space-y-3 border-t border-outline-variant/15 pt-4">
                            <p className="text-xs text-outline-variant uppercase tracking-wider font-semibold">
                              Vaga de estacionamento
                            </p>

                            {vagasCarregando && (
                              <p className="text-xs text-outline-variant text-center py-2">Verificando vagas…</p>
                            )}

                            {vagasUnidade.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {vagasUnidade.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    disabled={!v.disponivel || semVaga}
                                    onClick={() => { setVagaId(v.id); setSemVaga(false); }}
                                    className={`rounded-2xl p-3 border text-sm font-semibold text-left transition-all ${
                                      vagaId === v.id
                                        ? "border-primary bg-primary/10 text-primary"
                                        : !v.disponivel
                                        ? "border-outline-variant/15 text-outline-variant opacity-50 cursor-not-allowed"
                                        : "border-outline-variant/30 text-on-surface hover:border-primary/40"
                                    }`}
                                  >
                                    <p>Vaga {v.numero}</p>
                                    {v.tipo && <p className="text-xs font-normal opacity-70">{v.tipo}</p>}
                                    {!v.disponivel && (
                                      <p className="text-xs font-normal text-error mt-0.5">
                                        Ocupada: {v.ocupadaPorPlaca} desde {v.ocupadaDesde}
                                      </p>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Botão avançar passo 2 */}
                <button
                  type="button"
                  onClick={confirmarVeiculo}
                  disabled={!semVeiculo && !veiculoBloqueado && !veiculoConfirmado && !modoFormVeiculo}
                  className="w-full rounded-2xl py-3 px-4 bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próximo: Confirmar
                  <Icone name="arrow_forward" className="text-lg" />
                </button>
              </>
            )}

            {/* Resumo veículo (passo 3) */}
            {passo === 3 && (
              <div className="flex items-center justify-between rounded-xl bg-surface-container-highest/20 border border-outline-variant/15 px-4 py-3">
                <div>
                  {semVeiculo ? (
                    <p className="text-sm text-on-surface-variant">Entrou a pé</p>
                  ) : (
                    <>
                      <p className="font-semibold text-on-surface text-sm">
                        {normalizarPlaca(veiculoConfirmado?.placa || formVeiculo.placa)}
                      </p>
                      <p className="text-xs text-outline-variant">
                        {tipo === "VISITA" && vagaId
                          ? `Vaga ${vagasUnidade.find((v) => v.id === vagaId)?.numero || ""}`
                          : "Sem vaga"}
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPasso(2)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Alterar
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── PASSO 3: CONFIRMAR ───────────────────────────────────────────── */}
        {passo === 3 && (
          <section className="glass-panel rounded-3xl p-6 border border-outline-variant/15 space-y-5">
            <h2 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">3</span>
              Confirmar entrada
            </h2>

            {/* Resumo */}
            <div className="glass-panel rounded-2xl p-4 border border-outline-variant/10 space-y-3 bg-surface-container-highest/10">
              <div className="flex items-start gap-3">
                <Icone name="person" className="text-primary text-xl mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-on-surface text-sm">
                    {pessoaConfirmada?.nome || formPessoa.nome}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {tipo === "VISITA" ? "Visitante" : "Terceiro"}
                    {aptSelecionado?.numero && ` · Apto ${aptSelecionado.numero}`}
                    {pessoaConfirmada?.apartamentoNumero && ` · Apto ${pessoaConfirmada.apartamentoNumero}`}
                    {(formPessoa.empresa || pessoaConfirmada?.empresa) &&
                      ` · ${formPessoa.empresa || pessoaConfirmada?.empresa}`}
                    {(formPessoa.destino || pessoaConfirmada?.destino) &&
                      ` → ${formPessoa.destino || pessoaConfirmada?.destino}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Icone name="directions_car" className="text-secondary text-xl mt-0.5 shrink-0" />
                <div>
                  {semVeiculo ? (
                    <p className="text-sm text-on-surface-variant">Sem veículo</p>
                  ) : (
                    <>
                      <p className="font-semibold text-on-surface text-sm">
                        {normalizarPlaca(veiculoConfirmado?.placa || formVeiculo.placa)}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {tipo === "VISITA"
                          ? vagaId
                            ? `Vaga ${vagasUnidade.find((v) => v.id === vagaId)?.numero || ""}`
                            : "Sem vaga"
                          : "Sem vaga (terceiro)"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {erroGlobal && (
              <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-sm text-error">
                {erroGlobal}
              </div>
            )}

            <button
              type="button"
              onClick={confirmar}
              disabled={confirmando}
              className="w-full rounded-2xl py-4 px-4 bg-primary text-on-primary font-bold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {confirmando ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
                  Registrando…
                </>
              ) : (
                <>
                  <Icone name="login" className="text-xl" />
                  Confirmar entrada
                </>
              )}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
