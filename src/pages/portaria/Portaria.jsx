import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { acessoApi } from "../../services/acessoApi";
import { veiculoApi, atendimentoApi, apartamentoApi, preAutorizacaoApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { useToast } from "../../contexts/ToastContext";
import { PERFIS_FUNCIONARIO } from "../../utils/perfis";
import {
  errMsg, formatarCpfMask, fmtData, fmtHora, fmtDuracao, hoje,
  unidadeLabel, fmtDuracaoEntre, normalizarPlaca, placaValida,
} from "./portariaHelpers";

// ─── helpers ───────────────────────────────────────────────────────────────







// `valor` vai para a API como filtro; `rotuloKey` é só o texto da opção.
const PERFIS_OPCOES = [
  { valor: "Morador", rotuloKey: "perfis.morador" },
  { valor: "Dono Aluguel", rotuloKey: "perfis.donoAluguel" },
  { valor: "Visitante", rotuloKey: "perfis.visitante" },
  { valor: "Porteiro", rotuloKey: "perfis.porteiro" },
  { valor: "Terceiro", rotuloKey: "perfis.terceiro" },
  { valor: "Admin Síndico", rotuloKey: "perfis.adminSindico" },
  { valor: "Admin Geral", rotuloKey: "perfis.adminGeral" },
];

// Perfis de funcionário que aparecem na aba Funcionários (auth-api)
// Importada de utils/perfis para não haver lista paralela com a reserva de evento.

// ─── sub-componentes registrar acesso ──────────────────────────────────────

function BadgeAcesso({ status }) {
  const { t } = useTranslation("portaria");
  const dentro = status === "DENTRO";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
      dentro ? "bg-primary/10 text-primary" : "bg-outline-variant/20 text-on-surface-variant"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dentro ? "bg-primary" : "bg-outline-variant"}`} />
      {dentro ? t("status.dentro") : t("status.fora")}
    </span>
  );
}

function BadgePermissao({ permitida }) {
  const { t } = useTranslation("portaria");
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
      permitida ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"
    }`}>
      <Icone name={permitida ? "check_circle" : "cancel"} className="text-sm" />
      {permitida ? t("permissao.autorizada") : t("permissao.bloqueada")}
    </span>
  );
}

function CartaoUsuario({ usuario, onEntrada, onSaida, showPermissao = false, carregando }) {
  const { t } = useTranslation("portaria");
  const dentro = usuario.statusAcesso === "DENTRO";
  const isGuest = usuario.perfil === "CONVIDADO";
  const isVisitantePortaria = usuario.perfil === "VISITANTE";
  const bloqueado = isGuest && !usuario.entradaPermitida;

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icone name={isGuest ? "person_outline" : "person"} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface truncate">{usuario.nome}</p>
        <p className="text-xs text-on-surface-variant">
          {usuario.cpf ? t("cartao.cpf", { cpf: formatarCpfMask(usuario.cpf) }) : t("cartao.semCpf")}
          {usuario._perfilLabel && ` · ${usuario._perfilLabel}`}
          {!usuario._perfilLabel && usuario.unidadeId && ` · ${t("cartao.unidadeVinculada")}`}
          {usuario.empresa && ` · ${usuario.empresa}`}
        </p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <BadgeAcesso status={usuario.statusAcesso} />
          {showPermissao && isGuest && <BadgePermissao permitida={usuario.entradaPermitida} />}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {!dentro ? (
          isVisitantePortaria ? (
            <Link
              to={`/atendimento?tipo=visitante&cpf=${usuario.cpf}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all"
            >
              <Icone name="open_in_new" className="text-base" />
              {t("acoes.irAtendimento")}
            </Link>
          ) : (
            <button
              onClick={() => onEntrada(usuario)}
              disabled={carregando || bloqueado}
              title={bloqueado ? t("cartao.entradaNaoAutorizada") : t("cartao.registrarEntrada")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                bloqueado
                  ? "border-outline-variant/20 text-outline-variant cursor-not-allowed opacity-50"
                  : "border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
              }`}
            >
              <Icone name="login" className="text-base" />
              {t("acoes.entrada")}
            </button>
          )
        ) : (
          <button
            onClick={() => onSaida(usuario)}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-secondary/30 text-secondary hover:bg-secondary/10 transition-all cursor-pointer"
          >
            <Icone name="logout" className="text-base" />
            {t("acoes.saida")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── aba "Registrar acesso" — sub-aba Funcionários ────────────────────────

const PERFIL_LABEL_FUNC = {
  PORTEIRO: "perfis.porteiro",
  ADMIN_SINDICO: "perfis.sindico",
  TERCEIRO: "perfis.terceiro",
};

function AbaFuncionarios({ residentes, portTerceiros = [], acao, onEntrada, onSaida }) {
  const { t } = useTranslation("portaria");
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");

  const authFuncionarios = useMemo(() =>
    residentes
      .filter((u) => PERFIS_FUNCIONARIO.includes(u.perfil))
      .map((u) => ({ ...u, _perfilLabel: PERFIL_LABEL_FUNC[u.perfil] ? t(PERFIL_LABEL_FUNC[u.perfil]) : u.perfil })),
    [residentes, t]
  );

  const tercMapped = useMemo(() =>
    portTerceiros.map((v) => ({
      id: v.id,
      nome: v.nome,
      cpf: v.documento,
      empresa: v.empresa || null,
      statusAcesso: v.status === "DENTRO" ? "DENTRO" : "FORA",
      perfil: "TERCEIRO",
      _perfilLabel: t("perfis.terceiro"),
      entradaPermitida: true,
      _portaria: true,
      _tipoVisita: "SERVICO",
    })),
    [portTerceiros, t]
  );

  const todos = useMemo(() => {
    const portIds = new Set(tercMapped.map((v) => v.id));
    return [...authFuncionarios.filter((u) => !portIds.has(u.id)), ...tercMapped];
  }, [authFuncionarios, tercMapped]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return todos
      .filter((u) => !filtroPerfil || u.perfil === filtroPerfil)
      .filter((u) =>
        !q ||
        u.nome.toLowerCase().includes(q) ||
        (u.cpf && u.cpf.replace(/\D/g, "").includes(q.replace(/\D/g, "")))
      );
  }, [todos, busca, filtroPerfil]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Campo
            id="busca-func"
            placeholder={t("funcionarios.buscaPlaceholder")}
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div>
          <select
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value)}
            className="h-[42px] rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors"
          >
            <option value="">{t("funcionarios.todosPerfis")}</option>
            {Object.entries(PERFIL_LABEL_FUNC).map(([v, l]) => (
              <option key={v} value={v}>{t(l)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
          {busca || filtroPerfil
            ? t("funcionarios.semResultadoFiltros")
            : t("funcionarios.vazio")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((usuario) => (
            <CartaoUsuario
              key={usuario.id}
              usuario={usuario}
              onEntrada={onEntrada}
              onSaida={onSaida}
              showPermissao={false}
              carregando={acao === usuario.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── visitantes pré-aprovados ──────────────────────────────────────────────
//
// Mesma lista nas duas telas: em Pessoas mostra todos os pré-liberados de hoje;
// em Veículos, só os que têm placa. Registrar a entrada usa um único endpoint
// que grava visitante e veículo na mesma transação e consome a autorização.

function ListaPreAprovados({ somenteComVeiculo = false, onRegistrado }) {
  const { t } = useTranslation("portaria");
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [acao, setAcao] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await preAutorizacaoApi.ativasHoje();
      const todas = Array.isArray(res.data) ? res.data : [];
      setLista(somenteComVeiculo ? todas.filter((p) => p.placaVeiculo) : todas);
    } catch (err) {
      setErro(errMsg(err) || t("preAprovados.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }, [somenteComVeiculo, t]);

  useEffect(() => { carregar(); }, [carregar]);

  async function registrar(pa, incluirVeiculo) {
    setAcao(pa.id);
    try {
      const res = await preAutorizacaoApi.registrarEntrada(pa.id, { incluirVeiculo });
      const msgPadrao = incluirVeiculo && pa.placaVeiculo
        ? t("preAprovados.entradaRegistradaComVeiculo", { nome: pa.nomeVisitante, placa: pa.placaVeiculo })
        : t("preAprovados.entradaRegistrada", { nome: pa.nomeVisitante });
      toast.success(res.data?.mensagem || msgPadrao);
      await carregar();
      onRegistrado?.();
    } catch (err) {
      toast.error(errMsg(err) || t("preAprovados.erroRegistrar"));
    } finally {
      setAcao(null);
    }
  }

  if (carregando) {
    return <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("comum:estado.carregando")}</div>;
  }
  if (erro) {
    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-error">
          <Icone name="error_outline" className="text-2xl" />
          <p className="font-semibold">{t("erros.falhaCarregar")}</p>
        </div>
        <p className="text-on-surface-variant text-sm">{erro}</p>
        <button onClick={carregar} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
          <Icone name="refresh" className="text-base" />{t("comum:acoes.tentarNovamente")}
        </button>
      </div>
    );
  }
  if (lista.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
        {somenteComVeiculo
          ? t("preAprovados.vazioVeiculos")
          : t("preAprovados.vazio")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
        <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
        <span>
          {somenteComVeiculo ? t("preAprovados.infoVeiculos") : t("preAprovados.info")}
        </span>
      </div>

      {lista.map((pa) => (
        <div key={pa.id} className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icone name={pa.placaVeiculo ? "directions_car" : "how_to_reg"} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-on-surface truncate">{pa.nomeVisitante}</p>
            <p className="text-xs text-on-surface-variant">
              {pa.cpfVisitante ? t("cartao.cpf", { cpf: formatarCpfMask(pa.cpfVisitante) }) : t("cartao.semCpf")}
              {pa.telefoneVisitante ? ` · ${pa.telefoneVisitante}` : ""}
            </p>
            {pa.placaVeiculo && (
              <p className="text-xs text-on-surface-variant mt-0.5">
                <span className="font-mono font-semibold text-on-surface">{pa.placaVeiculo}</span>
                {pa.modeloVeiculo ? ` · ${pa.modeloVeiculo}` : ""}
                {pa.corVeiculo ? ` · ${pa.corVeiculo}` : ""}
              </p>
            )}
            <p className="text-xs text-on-surface-variant mt-0.5">
              {t("preAprovados.validaAte", { data: String(pa.validadeFim || "").split("-").reverse().join("/") })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => registrar(pa, true)}
              disabled={acao === pa.id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <Icone name="login" className="text-base" />
              {acao === pa.id ? t("preAprovados.registrando") : pa.placaVeiculo ? t("preAprovados.entradaComVeiculo") : t("acoes.entrada")}
            </button>
            {pa.placaVeiculo && (
              // Sem vaga na chegada o veículo não entra, mas a pessoa pode entrar a pé.
              <button
                onClick={() => registrar(pa, false)}
                disabled={acao === pa.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Icone name="directions_walk" className="text-base" />
                {t("preAprovados.soAPe")}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── aba "Registrar acesso" ────────────────────────────────────────────────

function AbaRegistrar({ residentes, guests, portVisitantes = [], portTerceiros = [], dentro, carregando, erroCarregamento, onCarregar, acao, onEntrada, onSaida }) {
  const { t } = useTranslation("portaria");
  const [abaSub, setAbaSub] = useState("residentes");
  const [busca, setBusca] = useState("");

  // Portaria visitantes (VISITA) normalizados para CartaoUsuario
  const portGuests = useMemo(() =>
    portVisitantes.map((v) => ({
      id: v.id,
      nome: v.nome,
      cpf: v.documento,
      statusAcesso: v.status === "DENTRO" ? "DENTRO" : "FORA",
      unidadeId: v.apartamentoId,
      perfil: "VISITANTE",
      entradaPermitida: true,
      _portaria: true,
      _apartamentoId: v.apartamentoId,
      _tipoVisita: "VISITA",
    })),
    [portVisitantes]
  );

  const allGuests = useMemo(() => {
    // Auth-api CONVIDADO + portaria VISITA, sem duplicatas por id
    const portIds = new Set(portGuests.map((v) => v.id));
    return [...guests.filter((g) => !portIds.has(g.id)), ...portGuests];
  }, [guests, portGuests]);

  const funcCount = useMemo(() => {
    const authFunc = residentes.filter((u) => PERFIS_FUNCIONARIO.includes(u.perfil)).length;
    return authFunc + portTerceiros.length;
  }, [residentes, portTerceiros]);

  const moradores = useMemo(() =>
    residentes.filter((u) => u.perfil === "MORADOR" || u.perfil === "DONO_ALUGUEL"),
    [residentes]
  );

  function filtrar(lista) {
    const q = busca.toLowerCase();
    return lista.filter((u) => u.nome.toLowerCase().includes(q) || (u.cpf && u.cpf.includes(q)));
  }

  const abasSub = [
    { id: "residentes",    label: t("registrar.abas.moradores"),    icon: "people",         count: moradores.length },
    { id: "guests",        label: t("registrar.abas.visitantes"),   icon: "person_outline", count: allGuests.length },
    { id: "preaprovados",  label: t("registrar.abas.preAprovados"), icon: "how_to_reg" },
    { id: "funcionarios",  label: t("registrar.abas.funcionarios"), icon: "badge",          count: funcCount },
  ];

  const listaAtual = abaSub === "residentes" ? filtrar(moradores) : filtrar(allGuests);

  return (
    <div className="space-y-6">
      {/* Sub-abas */}
      <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
        {abasSub.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setAbaSub(tab.id); setBusca(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              abaSub === tab.id
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
            }`}
          >
            <Icone name={tab.icon} className="text-lg" />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              abaSub === tab.id ? "bg-primary/20" : "bg-outline-variant/20"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Pré-aprovados busca a própria lista; não usa a busca por nome/CPF */}
      {abaSub === "preaprovados" ? (
        <ListaPreAprovados onRegistrado={onCarregar} />
      ) : abaSub === "funcionarios" ? (
        carregando ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("comum:estado.carregando")}</div>
        ) : erroCarregamento ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-error">
              <Icone name="error_outline" className="text-2xl" />
              <p className="font-semibold">{t("erros.falhaCarregarDados")}</p>
            </div>
            <p className="text-on-surface-variant text-sm">{erroCarregamento}</p>
            <button onClick={onCarregar} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
              <Icone name="refresh" className="text-base" />{t("comum:acoes.tentarNovamente")}
            </button>
          </div>
        ) : (
          <AbaFuncionarios
            residentes={residentes}
            portTerceiros={portTerceiros}
            acao={acao}
            onEntrada={onEntrada}
            onSaida={onSaida}
          />
        )
      ) : (
        <>
          {/* Busca (Moradores e Visitantes) */}
          <div className="max-w-sm">
            <Campo
              id="busca-registrar"
              placeholder={t("registrar.buscaPlaceholder")}
              icon="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {/* Lista */}
          {carregando ? (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
              {t("comum:estado.carregando")}
            </div>
          ) : erroCarregamento ? (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-error">
                <Icone name="error_outline" className="text-2xl" />
                <p className="font-semibold">{t("erros.falhaCarregarDados")}</p>
              </div>
              <p className="text-on-surface-variant text-sm">{erroCarregamento}</p>
              <button
                onClick={onCarregar}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
              >
                <Icone name="refresh" className="text-base" />
                {t("comum:acoes.tentarNovamente")}
              </button>
            </div>
          ) : listaAtual.length === 0 ? (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
              {busca
                ? t("registrar.semResultadoBusca")
                : abaSub === "residentes"
                ? t("registrar.semResidentes")
                : t("registrar.semVisitantes")}
            </div>
          ) : (
            <div className="space-y-3">
              {abaSub === "guests" && guests.length > 0 && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
                  <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
                  <span>
                    {t("registrar.infoBloqueados")}
                  </span>
                </div>
              )}
              {listaAtual.map((usuario) => (
                <CartaoUsuario
                  key={usuario.id}
                  usuario={usuario}
                  onEntrada={onEntrada}
                  onSaida={onSaida}
                  showPermissao={abaSub === "guests"}
                  carregando={acao === usuario.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── aba "Dentro agora" ────────────────────────────────────────────────────


function AbaDentro({ dentro, visitantesDentro, carregando, erroCarregamento, onCarregar, acao, onSaida, apartamentoMap }) {
  const { t } = useTranslation("portaria");
  useEffect(() => {
    const id = setInterval(() => {}, 30_000);
    return () => clearInterval(id);
  }, []);

  const dentroCombo = useMemo(() => {
    const auth = (dentro || []).map(r => ({ ...r, _key: `a-${r.usuarioId}`, _fonte: 'auth' }));
    const port = (visitantesDentro || []).map(v => ({
      entradaId: v.id,
      usuarioId: null,
      entradaEm: v.horarioEntrada,
      nome: v.nome,
      perfil: v.tipoVisita === 'VISITA' ? t("perfis.visitante") : t("perfis.terceiro"),
      unidadeId: v.apartamentoId,
      _apartamentoNumero: v.apartamentoNumero,
      _blocoNome: v.blocoNome,
      registradoPorNome: null,
      _key: `p-${v.id}`,
      _fonte: 'portaria',
      id: v.id,
    }));
    return [...auth, ...port].sort((a, b) => new Date(b.entradaEm) - new Date(a.entradaEm));
  }, [dentro, visitantesDentro, t]);

  if (carregando) {
    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
        {t("comum:estado.carregando")}
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-error">
          <Icone name="error_outline" className="text-2xl" />
          <p className="font-semibold">{t("erros.falhaCarregarDados")}</p>
        </div>
        <p className="text-on-surface-variant text-sm">{erroCarregamento}</p>
        <button
          onClick={onCarregar}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
        >
          <Icone name="refresh" className="text-base" />
          {t("comum:acoes.tentarNovamente")}
        </button>
      </div>
    );
  }

  if (dentroCombo.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-10 flex flex-col items-center text-center gap-3 border border-outline-variant/15">
        <Icone name="home" className="text-on-surface-variant/30 text-5xl" />
        <p className="font-semibold text-on-surface">{t("dentro.vazioTitulo")}</p>
        <p className="text-sm text-on-surface-variant">{t("dentro.vazioDescricao")}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
              {["nome", "perfil", "unidade", "dataEntrada", "hora", "permanencia", "registradoPor", ""].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                  {h && t(`tabela.${h}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dentroCombo.map((r) => (
              <tr key={r._key} className="border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors bg-primary/3">
                <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{r.nome || "—"}</td>
                <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r.perfil || "—"}</td>
                <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                  {unidadeLabel(r.unidadeId, r.unidadeId, r._apartamentoNumero, r._blocoNome, apartamentoMap)}
                </td>
                <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtData(r.entradaEm)}</td>
                <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtHora(r.entradaEm)}</td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-primary">
                  {fmtDuracao(r.entradaEm)}
                </td>
                <td className="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">{r.registradoPorNome || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={() => onSaida(r)}
                    disabled={acao === r._key}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Icone name="logout" className="text-sm" />
                    {t("acoes.saida")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── aba "Histórico" ───────────────────────────────────────────────────────

function AbaHistorico({ apartamentoMap }) {
  const { t } = useTranslation("portaria");
  const toast = useToast();
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState({
    dataInicio: hoje(),
    dataFim: hoje(),
    nome: "",
    perfil: "",
    status: "",
  });

  function setF(key, val) {
    setFiltros((f) => ({ ...f, [key]: val }));
  }

  const buscar = useCallback(async (f) => {
    setCarregando(true);
    setErro(null);
    try {
      const authParams = {};
      if (f.dataInicio) authParams.dataInicio = f.dataInicio;
      if (f.dataFim)    authParams.dataFim    = f.dataFim;
      if (f.nome)       authParams.nome       = f.nome;
      if (f.perfil)     authParams.perfil     = f.perfil;
      if (f.status)     authParams.status     = f.status;

      const portParams = {};
      if (f.dataInicio) portParams.dataInicio = f.dataInicio;
      if (f.dataFim)    portParams.dataFim    = f.dataFim;
      if (f.nome)   portParams.nome   = f.nome;
      if (f.status) portParams.status = f.status;
      // tipoVisita filter: Visitante → VISITA, Terceiro → SERVICO
      if (f.perfil === "Visitante") portParams.tipoVisita = "VISITA";
      else if (f.perfil === "Terceiro") portParams.tipoVisita = "SERVICO";

      const [authRes, portRes] = await Promise.allSettled([
        acessoApi.listarHistoricoAcesso(authParams),
        (f.perfil === "" || f.perfil === "Visitante" || f.perfil === "Terceiro")
          ? atendimentoApi.historico(portParams)
          : Promise.resolve({ data: [] }),
      ]);

      const authRows = authRes.status === "fulfilled"
        ? (authRes.value.data.registros || []).map(r => ({ ...r, _key: `a-${r.id}`, _unidade: apartamentoMap[r.unidadeId] || r.unidadeId || "—" }))
        : [];

      const portRows = portRes.status === "fulfilled"
        ? (Array.isArray(portRes.value.data) ? portRes.value.data : []).map(v => ({
            id: v.id,
            _key: `p-${v.id}`,
            nome: v.nome,
            perfil: v.tipoVisita === "VISITA" ? t("perfis.visitante") : t("perfis.terceiro"),
            _unidade: v.blocoNome
              ? t("unidade.blocoApto", { bloco: v.blocoNome, numero: v.apartamentoNumero })
              : (v.apartamentoNumero ? t("unidade.apto", { numero: v.apartamentoNumero }) : "—"),
            entradaEm: v.horarioEntrada,
            saidaEm: v.horarioSaida,
            registradoPorNome: null,
          }))
        : [];

      // Filtro de data client-side nos registros da portaria (backend pode não suportar)
      const filtroInicio = f.dataInicio ? new Date(f.dataInicio + "T00:00:00") : null;
      const filtroFim    = f.dataFim    ? new Date(f.dataFim    + "T23:59:59") : null;
      const portRowsFiltrados = portRows.filter((r) => {
        if (!r.entradaEm) return true;
        const entrada = new Date(r.entradaEm);
        if (filtroInicio && entrada < filtroInicio) return false;
        if (filtroFim    && entrada > filtroFim)    return false;
        return true;
      });

      // Merge and sort by entradaEm desc
      const merged = [...authRows, ...portRowsFiltrados].sort(
        (a, b) => new Date(b.entradaEm) - new Date(a.entradaEm)
      );
      setRegistros(merged);
    } catch (err) {
      const msg = errMsg(err) || t("erros.carregarHistorico");
      setErro(msg);
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }, [toast, apartamentoMap, t]);

  useEffect(() => { buscar(filtros); }, []);

  function aplicar(e) {
    e.preventDefault();
    buscar(filtros);
  }

  function limpar() {
    const pad = { dataInicio: hoje(), dataFim: hoje(), nome: "", perfil: "", status: "" };
    setFiltros(pad);
    buscar(pad);
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <form onSubmit={aplicar} className="glass-panel rounded-2xl p-5 border border-outline-variant/15 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t("filtros.titulo")}</h3>
          <button type="button" onClick={limpar} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
            {t("filtros.limpar")}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.dataInicial")}</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setF("dataInicio", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.dataFinal")}</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setF("dataFim", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.nome")}</label>
            <input type="text" value={filtros.nome} onChange={(e) => setF("nome", e.target.value)}
              placeholder={t("filtros.buscaParcial")}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.perfil")}</label>
            <select value={filtros.perfil} onChange={(e) => setF("perfil", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
              <option value="">{t("comum:estado.todos")}</option>
              {PERFIS_OPCOES.map((p) => <option key={p.valor} value={p.valor}>{t(p.rotuloKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.status")}</label>
            <select value={filtros.status} onChange={(e) => setF("status", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
              <option value="">{t("comum:estado.todos")}</option>
              <option value="DENTRO">{t("status.dentro")}</option>
              <option value="SAIU">{t("status.saiu")}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer">
            <Icone name="filter_list" className="text-sm" />
            {t("filtros.aplicar")}
          </button>
        </div>
      </form>

      {/* Tabela */}
      {carregando ? (
        <div className="flex items-center justify-center py-10 text-on-surface-variant gap-2">
          <Icone name="sync" className="text-2xl animate-spin" />
          {t("comum:estado.carregando")}
        </div>
      ) : erro ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15 space-y-2">
          <Icone name="error_outline" className="text-error text-4xl" />
          <p className="text-sm text-on-surface-variant">{erro}</p>
        </div>
      ) : registros.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15">
          <Icone name="inbox" className="text-on-surface-variant/30 text-4xl mb-2" />
          <p className="text-sm text-on-surface-variant">{t("historico.vazio")}</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                  {["nome", "perfil", "unidade", "dataEntrada", "horaEntrada", "saida", "duracao", "registradoPor"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                      {t(`tabela.${h}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => {
                  const dentro = !r.saidaEm;
                  return (
                    <tr key={r._key || r.id} className={`border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors ${dentro ? "bg-primary/3" : ""}`}>
                      <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{r.nome || "—"}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r.perfil || "—"}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r._unidade || "—"}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtData(r.entradaEm)}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtHora(r.entradaEm)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {dentro ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                            {t("status.dentro")}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">{fmtData(r.saidaEm)} {fmtHora(r.saidaEm)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-on-surface-variant">
                        {dentro ? (
                          <span className="text-primary">{fmtDuracao(r.entradaEm)}</span>
                        ) : (
                          fmtDuracaoEntre(r.entradaEm, r.saidaEm)
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">{r.registradoPorNome || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── validação de placa ────────────────────────────────────────────────────




// ─── seção de veículos ─────────────────────────────────────────────────────

function AbaRegistrarVeiculo() {
  const { t } = useTranslation("portaria");
  const toast = useToast();
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [acao, setAcao] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await veiculoApi.listar();
      setVeiculos(r.data || []);
    } catch (err) {
      setErro(errMsg(err) || t("veiculos.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }, [t]);

  useEffect(() => { carregar(); }, [carregar]);

  const buscaNorm = busca.trim().toLowerCase();
  const veiculosFiltrados = useMemo(() => {
    if (!buscaNorm) return veiculos;
    return veiculos.filter((v) =>
      normalizarPlaca(v.placa).includes(normalizarPlaca(busca)) ||
      (v.modelo && v.modelo.toLowerCase().includes(buscaNorm))
    );
  }, [veiculos, busca, buscaNorm]);

  const semResultado = buscaNorm && veiculosFiltrados.length === 0;
  const naoEncontradoNaCerta = busca.length === 7 && placaValida(normalizarPlaca(busca)) && !veiculos.find((v) => v.placa === normalizarPlaca(busca));

  function tipoProprietarioLabel(tipo) {
    if (tipo === "MORADOR") return t("perfis.morador");
    if (tipo === "VISITANTE") return t("perfis.visitante");
    if (tipo === "FUNCIONARIO") return t("perfis.terceiro");
    return tipo || "";
  }

  async function handleEntrada(veiculo) {
    setAcao(veiculo.id);
    try {
      await veiculoApi.registrarEntrada(veiculo.id);
      setVeiculos((prev) => prev.map((v) => v.id === veiculo.id ? { ...v, status: "DENTRO", dataEntrada: new Date().toISOString() } : v));
      toast.success(t("toast.entradaRegistrada", { nome: veiculo.placa }));
    } catch (err) {
      toast.error(errMsg(err) || t("toast.erroEntrada"));
    } finally {
      setAcao(null);
    }
  }

  async function handleSaida(veiculo) {
    setAcao(veiculo.id);
    try {
      const res = await veiculoApi.registrarSaida(veiculo.id);
      setVeiculos((prev) => prev.map((v) => v.id === veiculo.id ? { ...v, status: "SAIU", dataSaida: new Date().toISOString() } : v));
      const d = res?.data;
      if (d?.visitanteSaiu && d?.visitanteNome) {
        toast.success(t("toast.saidaVeiculoEVisitante", { placa: veiculo.placa, nome: d.visitanteNome }));
      } else {
        toast.success(t("toast.saidaRegistrada", { nome: veiculo.placa }));
      }
    } catch (err) {
      toast.error(errMsg(err) || t("toast.erroSaida"));
    } finally {
      setAcao(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Veículos de visitantes pré-aprovados pelo morador */}
      <section className="space-y-3">
        <h3 className="font-headline font-bold text-on-surface text-base">
          {t("veiculos.preAprovados")}
        </h3>
        <ListaPreAprovados somenteComVeiculo onRegistrado={carregar} />
      </section>

      <div className="border-t border-outline-variant/15 pt-6 space-y-4">
        <h3 className="font-headline font-bold text-on-surface text-base">
          {t("veiculos.cadastrados")}
        </h3>

      {/* Campo de busca */}
      <div className="max-w-sm">
        <Campo
          id="busca-veiculo"
          placeholder={t("veiculos.buscaPlaceholder")}
          icon="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value.toUpperCase())}
        />
      </div>

      {/* Estados */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
          {t("comum:estado.carregando")}
        </div>
      ) : erro ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-error">
            <Icone name="error_outline" className="text-2xl" />
            <p className="font-semibold">{t("veiculos.falhaCarregar")}</p>
          </div>
          <p className="text-on-surface-variant text-sm">{erro}</p>
          <button
            onClick={carregar}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
          >
            <Icone name="refresh" className="text-base" />
            {t("comum:acoes.tentarNovamente")}
          </button>
        </div>
      ) : veiculos.length === 0 ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
          {t("veiculos.vazio")}
        </div>
      ) : semResultado ? (
        <>
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            {t("veiculos.semResultado", { busca })}
          </div>
          {naoEncontradoNaCerta && (
            <div className="glass-panel rounded-2xl p-5 space-y-3 border border-outline-variant/15">
              <p className="text-sm text-on-surface-variant">
                <Trans
                  t={t}
                  i18nKey="veiculos.naoCadastrado"
                  values={{ placa: normalizarPlaca(busca) }}
                  components={{ placa: <span className="font-mono font-bold text-on-surface" /> }}
                />
              </p>
              <Link
                to={`/atendimento?placa=${normalizarPlaca(busca)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all"
              >
                <Icone name="person_add" className="text-base" />
                {t("veiculos.cadastrarAtendimento")}
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {veiculosFiltrados.map((v) => {
            const isVisitante = v.tipoProprietario === "VISITANTE";
            return (
              <div key={v.id} className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="directions_car" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface font-mono">{v.placa}</p>
                  <p className="text-xs text-on-surface-variant">
                    {v.modelo || t("veiculos.modeloNaoInformado")}
                    {v.cor && ` · ${v.cor}`}
                    {v.vagaNumero && ` · ${t("veiculos.vaga", { numero: v.vagaNumero })}`}
                  </p>
                  {v.proprietarioNome && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {v.proprietarioNome} · {tipoProprietarioLabel(v.tipoProprietario)}
                      {v.apartamentoNumero && ` · ${t("unidade.apto", { numero: v.apartamentoNumero })}`}
                    </p>
                  )}
                  <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    v.status === "DENTRO"
                      ? "bg-primary/10 text-primary"
                      : "bg-outline-variant/20 text-on-surface-variant"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${v.status === "DENTRO" ? "bg-primary" : "bg-outline-variant"}`} />
                    {v.status === "DENTRO" ? t("status.dentro") : t("status.fora")}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {v.status !== "DENTRO" ? (
                    isVisitante ? (
                      <Link
                        to={`/atendimento?tipo=visitante&cpf=${v.proprietarioCpf || ""}&placa=${v.placa}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all"
                      >
                        <Icone name="open_in_new" className="text-base" />
                        {t("acoes.irAtendimento")}
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEntrada(v)}
                        disabled={!!acao}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Icone name="login" className="text-base" />
                        {t("acoes.entrada")}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleSaida(v)}
                      disabled={!!acao}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-secondary/30 text-secondary hover:bg-secondary/10 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Icone name="logout" className="text-base" />
                      {t("acoes.saida")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

function AbaDentroVeiculos() {
  const { t } = useTranslation("portaria");
  const toast = useToast();
  const [dentro, setDentro] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [acao, setAcao] = useState(null);
  const [agora, setAgora] = useState(Date.now());

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await veiculoApi.listarDentroPortaria();
      setDentro(res.data || []);
    } catch (err) {
      setErro(errMsg(err) || t("veiculos.erroCarregarDentro"));
    } finally {
      setCarregando(false);
    }
  }, [t]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleSaida(mov) {
    setAcao(mov.id);
    try {
      await veiculoApi.registrarSaidaPorPlaca(mov.placa);
      setDentro((prev) => prev.filter((m) => m.id !== mov.id));
      toast.success(t("toast.saidaRegistrada", { nome: mov.placa }));
    } catch (err) {
      toast.error(errMsg(err) || t("toast.erroSaida"));
    } finally {
      setAcao(null);
    }
  }

  if (carregando) return (
    <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">{t("comum:estado.carregando")}</div>
  );
  if (erro) return (
    <div className="glass-panel rounded-3xl p-10 text-center space-y-3">
      <Icone name="error_outline" className="text-error text-3xl" />
      <p className="text-sm text-on-surface-variant">{erro}</p>
      <button onClick={carregar} className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold cursor-pointer">
        <Icone name="refresh" className="text-base" />{t("comum:acoes.tentarNovamente")}
      </button>
    </div>
  );
  if (!dentro.length) return (
    <div className="glass-panel rounded-2xl p-10 flex flex-col items-center text-center gap-3 border border-outline-variant/15">
      <Icone name="directions_car" className="text-on-surface-variant/30 text-5xl" />
      <p className="font-semibold text-on-surface">{t("veiculos.dentroVazio")}</p>
      <p className="text-sm text-on-surface-variant">{t("dentro.vazioDescricao")}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                {["placa", "modelo", "vinculadoA", "dataEntrada", "hora", "permanencia", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h && t(`tabela.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dentro.map((m) => (
                <tr key={m.id} className="border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-on-surface whitespace-nowrap">{m.placa}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{m.modelo || "—"}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{m.vinculadoNome || t("veiculos.avulso")}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtData(m.entradaEm)}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtHora(m.entradaEm)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-primary">{fmtDuracao(m.entradaEm)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleSaida(m)}
                      disabled={acao === m.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Icone name="logout" className="text-sm" />{t("acoes.saida")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-center">
        <button onClick={carregar} disabled={carregando} className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50">
          <Icone name="refresh" className="text-base" />{t("comum:acoes.atualizar")}
        </button>
      </div>
    </div>
  );
}

function AbaHistoricoVeiculos() {
  const { t } = useTranslation("portaria");
  const toast = useToast();
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState({ placa: "", vinculadoNome: "", dataInicio: hoje(), dataFim: hoje(), status: "" });

  function setF(key, val) { setFiltros((f) => ({ ...f, [key]: val })); }

  const buscar = useCallback(async (f) => {
    setCarregando(true);
    setErro(null);
    try {
      const params = {};
      if (f.placa)      params.placa      = f.placa;
      if (f.dataInicio) params.dataInicio = f.dataInicio;
      if (f.dataFim)    params.dataFim    = f.dataFim;
      if (f.status)     params.status     = f.status;
      const res = await veiculoApi.historicoAcesso(params);
      setRegistros(res.data || []);
    } catch (err) {
      const msg = errMsg(err) || t("erros.carregarHistorico");
      setErro(msg);
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }, [toast, t]);

  useEffect(() => { buscar(filtros); }, []);

  function aplicar(e) { e.preventDefault(); buscar(filtros); }
  function limpar() {
    const pad = { placa: "", vinculadoNome: "", dataInicio: hoje(), dataFim: hoje(), status: "" };
    setFiltros(pad);
    buscar(pad);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={aplicar} className="glass-panel rounded-2xl p-5 border border-outline-variant/15 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t("filtros.titulo")}</h3>
          <button type="button" onClick={limpar} className="text-xs text-primary font-semibold hover:underline cursor-pointer">{t("filtros.limpar")}</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.dataInicial")}</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setF("dataInicio", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.dataFinal")}</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setF("dataFim", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.placa")}</label>
            <input type="text" value={filtros.placa} onChange={(e) => setF("placa", normalizarPlaca(e.target.value))}
              placeholder={t("filtros.buscaParcial")}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm font-mono text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.status")}</label>
            <select value={filtros.status} onChange={(e) => setF("status", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
              <option value="">{t("comum:estado.todos")}</option>
              <option value="DENTRO">{t("status.dentro")}</option>
              <option value="SAIU">{t("status.saiu")}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-on-surface-variant mb-1">{t("filtros.vinculadoA")}</label>
          <input type="text" value={filtros.vinculadoNome} onChange={(e) => setF("vinculadoNome", e.target.value)}
            placeholder={t("filtros.vinculadoPlaceholder")}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer">
            <Icone name="filter_list" className="text-sm" />{t("filtros.aplicar")}
          </button>
        </div>
      </form>

      {carregando ? (
        <div className="flex items-center justify-center py-10 text-on-surface-variant gap-2">
          <Icone name="sync" className="text-2xl animate-spin" />{t("comum:estado.carregando")}
        </div>
      ) : erro ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15 space-y-2">
          <Icone name="error_outline" className="text-error text-4xl" />
          <p className="text-sm text-on-surface-variant">{erro}</p>
        </div>
      ) : (() => {
        const q = filtros.vinculadoNome.trim().toLowerCase();
        const registrosFiltrados = q
          ? registros.filter((r) => (r.vinculadoNome || "").toLowerCase().includes(q))
          : registros;
        return registrosFiltrados.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15">
          <Icone name="inbox" className="text-on-surface-variant/30 text-4xl mb-2" />
          <p className="text-sm text-on-surface-variant">{t("historico.vazio")}</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                  {["placa", "modelo", "vinculadoA", "dataEntrada", "horaEntrada", "saida", "duracao"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">{t(`tabela.${h}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r) => {
                  const dentro = !r.saidaEm;
                  return (
                    <tr key={r.id} className={`border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors ${dentro ? "bg-primary/3" : ""}`}>
                      <td className="px-4 py-3 font-mono font-semibold text-on-surface whitespace-nowrap">{r.placa}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r.modelo || "—"}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r.vinculadoNome || t("veiculos.avulso")}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtData(r.entradaEm)}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtHora(r.entradaEm)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {dentro ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{t("status.dentro")}</span>
                        ) : (
                          <span className="text-on-surface-variant">{fmtData(r.saidaEm)} {fmtHora(r.saidaEm)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-on-surface-variant">
                        {dentro ? <span className="text-primary">{fmtDuracao(r.entradaEm)}</span> : fmtDuracaoEntre(r.entradaEm, r.saidaEm)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
      })()}
    </div>
  );
}

function SecaoVeiculos() {
  const { t } = useTranslation("portaria");
  const [aba, setAba] = useState("registrar");

  const abas = [
    { id: "registrar", label: t("abas.registrar"), icon: "add_road" },
    { id: "dentro",    label: t("abas.dentro"),    icon: "directions_car" },
    { id: "historico", label: t("abas.historico"), icon: "history" },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
        {abas.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              aba === tab.id
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
            }`}
          >
            <Icone name={tab.icon} className="text-lg" />
            {tab.label}
          </button>
        ))}
      </div>
      {aba === "registrar"  && <AbaRegistrarVeiculo />}
      {aba === "dentro"     && <AbaDentroVeiculos />}
      {aba === "historico"  && <AbaHistoricoVeiculos />}
    </div>
  );
}

// ─── componente principal ──────────────────────────────────────────────────

export function Portaria() {
  const { t } = useTranslation("portaria");
  const toast = useToast();
  const [modo, setModo] = useState("pessoas"); // 'pessoas' | 'veiculos'
  const [abaTop, setAbaTop] = useState("registrar");
  const [residentes, setResidentes] = useState([]);
  const [guests, setGuests] = useState([]);
  const [portVisitantes, setPortVisitantes] = useState([]);
  const [portTerceiros, setPortTerceiros] = useState([]);
  const [dentro, setDentro] = useState([]);
  const [visitantesDentro, setVisitantesDentro] = useState([]);
  const [apartamentoMap, setApartamentoMap] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(null);
  const [acao, setAcao] = useState(null);

  // Carrega mapa de apartamentos para resolver UUIDs em labels legíveis
  useEffect(() => {
    apartamentoApi.listar().then(r => {
      const map = {};
      (r.data || []).forEach(a => {
        const bloco = a.blocoNome || a.bloco?.nome || "";
        map[a.id] = bloco
          ? t("unidade.blocoApto", { bloco, numero: a.numero })
          : t("unidade.apto", { numero: a.numero });
      });
      setApartamentoMap(map);
    }).catch(() => {});
  }, [t]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregamento(null);
    try {
      const [resRes, guestRes, dentroRes, portDentroRes, portHistRes, portTercRes] = await Promise.all([
        acessoApi.listarResidentes(),
        acessoApi.listarGuests(),
        acessoApi.listarDentro(),
        atendimentoApi.dentro().catch(() => ({ data: [] })),
        atendimentoApi.historico({ tipoVisita: 'VISITA' }).catch(() => ({ data: [] })),
        atendimentoApi.buscar("", "SERVICO").catch(() => ({ data: [] })),
      ]);
      setResidentes(resRes.data.residentes || []);
      setGuests(guestRes.data.guests || []);
      setDentro(dentroRes.data.dentro || []);
      setVisitantesDentro(Array.isArray(portDentroRes.data) ? portDentroRes.data : []);
      setPortVisitantes(Array.isArray(portHistRes.data) ? portHistRes.data : []);
      setPortTerceiros(Array.isArray(portTercRes.data) ? portTercRes.data : []);
    } catch (err) {
      const msg = errMsg(err) || t("erros.carregarPortaria");
      console.error("[Portaria] Erro ao carregar:", err?.response?.status, err?.response?.data ?? err?.message);
      setErroCarregamento(msg);
    } finally {
      setCarregando(false);
    }
  }, [t]);

  useEffect(() => { carregar(); }, [carregar]);

  function atualizarStatusListas(userId, tipo) {
    const novoStatus = tipo === "ENTRADA" ? "DENTRO" : "FORA";
    const agora = new Date().toISOString();
    const atualizar = (lista) =>
      lista.map((u) => u.id === userId ? { ...u, statusAcesso: novoStatus, ultimoRegistroEm: agora } : u);
    setResidentes((prev) => atualizar(prev));
    setGuests((prev) => atualizar(prev));
  }

  async function handleEntrada(usuario) {
    if (usuario._portaria) {
      setAcao(usuario.id);
      const tipoVisita = usuario._tipoVisita || "VISITA";
      try {
        await atendimentoApi.registrar({
          pessoaId: usuario.id,
          nome: usuario.nome,
          documento: usuario.cpf || "",
          tipoVisita,
          apartamentoId: tipoVisita === "SERVICO" ? null : (usuario._apartamentoId || null),
        });
        if (tipoVisita === "SERVICO") {
          setPortTerceiros((prev) =>
            prev.map((v) => v.id === usuario.id ? { ...v, status: "DENTRO" } : v)
          );
        } else {
          setPortVisitantes((prev) =>
            prev.map((v) => v.id === usuario.id ? { ...v, status: "DENTRO" } : v)
          );
        }
        const portDentroRes = await atendimentoApi.dentro().catch(() => ({ data: [] }));
        setVisitantesDentro(Array.isArray(portDentroRes.data) ? portDentroRes.data : []);
        toast.success(t("toast.entradaRegistrada", { nome: usuario.nome }));
      } catch (err) {
        toast.error(errMsg(err) || t("toast.erroEntrada"));
      } finally {
        setAcao(null);
      }
      return;
    }
    setAcao(usuario.id);
    try {
      await acessoApi.registrarEntrada(usuario.id);
      atualizarStatusListas(usuario.id, "ENTRADA");
      const dentroRes = await acessoApi.listarDentro();
      setDentro(dentroRes.data.dentro || []);
      toast.success(t("toast.entradaRegistrada", { nome: usuario.nome }));
    } catch (err) {
      toast.error(errMsg(err) || t("toast.erroEntrada"));
    } finally {
      setAcao(null);
    }
  }

  async function handleSaida(usuario) {
    if (usuario._portaria) {
      setAcao(usuario.id);
      try {
        const res = await atendimentoApi.registrarSaida(usuario.id);
        if (usuario._tipoVisita === "SERVICO") {
          setPortTerceiros((prev) =>
            prev.map((v) => v.id === usuario.id ? { ...v, status: "SAIU" } : v)
          );
        } else {
          setPortVisitantes((prev) =>
            prev.map((v) => v.id === usuario.id ? { ...v, status: "SAIU" } : v)
          );
        }
        setVisitantesDentro((prev) => prev.filter((v) => v.id !== usuario.id));
        const d = res?.data;
        if (d?.veiculoDentroPlaca) {
          toast.success(
            d.vagaDentroNumero
              ? t("toast.saidaVeiculoVagaPermanece", { nome: usuario.nome, placa: d.veiculoDentroPlaca, vaga: d.vagaDentroNumero })
              : t("toast.saidaVeiculoPermanece", { nome: usuario.nome, placa: d.veiculoDentroPlaca })
          );
        } else {
          toast.success(t("toast.saidaRegistrada", { nome: usuario.nome }));
        }
      } catch (err) {
        toast.error(errMsg(err) || t("toast.erroSaida"));
      } finally {
        setAcao(null);
      }
      return;
    }
    setAcao(usuario.id);
    try {
      await acessoApi.registrarSaida(usuario.id);
      atualizarStatusListas(usuario.id, "SAIDA");
      setDentro((prev) => prev.filter((r) => r.usuarioId !== usuario.id));
      toast.success(t("toast.saidaRegistrada", { nome: usuario.nome }));
    } catch (err) {
      toast.error(errMsg(err) || t("toast.erroSaida"));
    } finally {
      setAcao(null);
    }
  }

  // Saída disparada a partir da aba "Dentro agora"
  async function handleSaidaDaDentro(registro) {
    const key = registro._key || `a-${registro.usuarioId}`;
    setAcao(key);
    try {
      if (registro._fonte === 'portaria') {
        const res = await atendimentoApi.registrarSaida(registro.id);
        setVisitantesDentro((prev) => prev.filter((v) => v.id !== registro.id));
        setPortVisitantes((prev) =>
          prev.map((v) => v.id === registro.id ? { ...v, status: "SAIU" } : v)
        );
        const d = res?.data;
        if (d?.veiculoDentroPlaca) {
          toast.success(
            d.vagaDentroNumero
              ? t("toast.saidaVeiculoVagaFica", { nome: registro.nome, placa: d.veiculoDentroPlaca, vaga: d.vagaDentroNumero })
              : t("toast.saidaVeiculoFica", { nome: registro.nome, placa: d.veiculoDentroPlaca })
          );
          return;
        }
      } else {
        await acessoApi.registrarSaida(registro.usuarioId);
        setDentro((prev) => prev.filter((r) => r.usuarioId !== registro.usuarioId));
        atualizarStatusListas(registro.usuarioId, "SAIDA");
      }
      toast.success(t("toast.saidaRegistrada", { nome: registro.nome }));
    } catch (err) {
      toast.error(errMsg(err) || t("toast.erroSaida"));
    } finally {
      setAcao(null);
    }
  }

  const abasTop = [
    { id: "registrar", label: t("abas.registrar"), icon: "how_to_reg" },
    { id: "dentro", label: t("abas.dentro"), icon: "home", count: dentro.length + visitantesDentro.length },
    { id: "historico", label: t("abas.historico"), icon: "history" },
  ];

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              {t("cabecalho.sobretitulo")}
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                {t("cabecalho.titulo")}
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
              <p className="text-2xl font-headline font-bold text-primary">{dentro.length + visitantesDentro.length}</p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("cabecalho.dentro")}</p>
            </div>
            <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
              <p className="text-2xl font-headline font-bold text-on-surface">{residentes.length + guests.length}</p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("cabecalho.total")}</p>
            </div>
          </div>
        </header>

        {/* Seletor pessoas / veículos */}
        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit">
          {[
            { id: "pessoas", label: t("modos.pessoas"), icon: "people" },
            { id: "veiculos", label: t("modos.veiculos"), icon: "directions_car" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setModo(m.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                modo === m.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
            >
              <Icone name={m.icon} className="text-lg" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Conteúdo por modo */}
        {modo === "veiculos" && <SecaoVeiculos />}
        {modo === "pessoas" && (
          <>
            <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
              {abasTop.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAbaTop(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    abaTop === tab.id
                      ? "bg-primary/15 text-primary"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <Icone name={tab.icon} className="text-lg" />
                  {tab.label}
                  {tab.count != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      abaTop === tab.id ? "bg-primary/20" : "bg-outline-variant/20"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {abaTop === "registrar" && (
              <AbaRegistrar
                residentes={residentes}
                guests={guests}
                portVisitantes={portVisitantes}
                portTerceiros={portTerceiros}
                dentro={dentro}
                carregando={carregando}
                erroCarregamento={erroCarregamento}
                onCarregar={carregar}
                acao={acao}
                onEntrada={handleEntrada}
                onSaida={handleSaida}
              />
            )}
            {abaTop === "dentro" && (
              <AbaDentro
                dentro={dentro}
                visitantesDentro={visitantesDentro}
                carregando={carregando}
                erroCarregamento={erroCarregamento}
                onCarregar={carregar}
                acao={acao}
                onSaida={handleSaidaDaDentro}
                apartamentoMap={apartamentoMap}
              />
            )}
            {abaTop === "historico" && <AbaHistorico apartamentoMap={apartamentoMap} />}

            {abaTop !== "historico" && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={carregar}
                  disabled={carregando}
                  className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Icone name="refresh" className="text-base" />
                  {t("comum:acoes.atualizar")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
