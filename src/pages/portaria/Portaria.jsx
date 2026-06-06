import { useState, useEffect, useCallback } from "react";
import { acessoApi } from "../../services/acessoApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { useToast } from "../../contexts/ToastContext";

function BadgeAcesso({ status }) {
  const dentro = status === "DENTRO";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
        dentro
          ? "bg-primary/10 text-primary"
          : "bg-outline-variant/20 text-on-surface-variant"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dentro ? "bg-primary" : "bg-outline-variant"}`} />
      {dentro ? "Dentro" : "Fora"}
    </span>
  );
}

function BadgePermissao({ permitida }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
        permitida
          ? "bg-secondary/10 text-secondary"
          : "bg-error/10 text-error"
      }`}
    >
      <Icone name={permitida ? "check_circle" : "cancel"} className="text-sm" />
      {permitida ? "Entrada autorizada" : "Entrada bloqueada"}
    </span>
  );
}

function CartaoUsuario({ usuario, onEntrada, onSaida, showPermissao = false, carregando }) {
  const dentro = usuario.statusAcesso === "DENTRO";
  const isGuest = usuario.perfil === "GUEST";
  const bloqueado = isGuest && !usuario.entradaPermitida;

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icone name={isGuest ? "person_outline" : "person"} className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface truncate">{usuario.nome}</p>
        <p className="text-xs text-on-surface-variant">
          {usuario.cpf ? `CPF: ${formatarCpfMask(usuario.cpf)}` : "Sem CPF"}
          {usuario.unidadeId && " · Unidade vinculada"}
        </p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <BadgeAcesso status={usuario.statusAcesso} />
          {showPermissao && isGuest && <BadgePermissao permitida={usuario.entradaPermitida} />}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {!dentro ? (
          <button
            onClick={() => onEntrada(usuario)}
            disabled={carregando || bloqueado}
            title={bloqueado ? "Entrada não autorizada pelo responsável" : "Registrar entrada"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
              bloqueado
                ? "border-outline-variant/20 text-outline-variant cursor-not-allowed opacity-50"
                : "border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
            }`}
          >
            <Icone name="login" className="text-base" />
            Entrada
          </button>
        ) : (
          <button
            onClick={() => onSaida(usuario)}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-secondary/30 text-secondary hover:bg-secondary/10 transition-all cursor-pointer"
          >
            <Icone name="logout" className="text-base" />
            Saída
          </button>
        )}
      </div>
    </div>
  );
}

function formatarCpfMask(cpf) {
  const d = String(cpf).replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function Portaria() {
  const toast = useToast();
  const [aba, setAba] = useState("residentes");
  const [busca, setBusca] = useState("");
  const [residentes, setResidentes] = useState([]);
  const [guests, setGuests] = useState([]);
  const [dentro, setDentro] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState(null); // id do usuário em ação

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [resRes, guestRes, dentroRes] = await Promise.all([
        acessoApi.listarResidentes(),
        acessoApi.listarGuests(),
        acessoApi.listarDentro(),
      ]);
      setResidentes(resRes.data.residentes || []);
      setGuests(guestRes.data.guests || []);
      setDentro(dentroRes.data.dentro || []);
    } catch (err) {
      toast.error("Erro ao carregar dados da portaria.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function atualizarStatus(userId, tipo) {
    const novoStatus = tipo === "ENTRADA" ? "DENTRO" : "FORA";
    const agora = new Date().toISOString();
    const atualizar = (lista) =>
      lista.map((u) =>
        u.id === userId ? { ...u, statusAcesso: novoStatus, ultimoRegistroEm: agora } : u
      );
    setResidentes((prev) => atualizar(prev));
    setGuests((prev) => atualizar(prev));

    if (tipo === "ENTRADA") {
      const usuario = [...residentes, ...guests].find((u) => u.id === userId);
      if (usuario) setDentro((prev) => [...prev.filter((u) => u.id !== userId), { ...usuario, statusAcesso: "DENTRO" }]);
    } else {
      setDentro((prev) => prev.filter((u) => u.id !== userId));
    }
  }

  async function handleEntrada(usuario) {
    setAcao(usuario.id);
    try {
      await acessoApi.registrarEntrada(usuario.id);
      atualizarStatus(usuario.id, "ENTRADA");
      toast.success(`Entrada de ${usuario.nome} registrada.`);
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao registrar entrada.");
    } finally {
      setAcao(null);
    }
  }

  async function handleSaida(usuario) {
    setAcao(usuario.id);
    try {
      await acessoApi.registrarSaida(usuario.id);
      atualizarStatus(usuario.id, "SAIDA");
      toast.success(`Saída de ${usuario.nome} registrada.`);
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao registrar saída.");
    } finally {
      setAcao(null);
    }
  }

  function filtrar(lista) {
    const q = busca.toLowerCase();
    return lista.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        (u.cpf && u.cpf.includes(q))
    );
  }

  const abas = [
    { id: "residentes", label: "Moradores", icon: "people", count: residentes.length },
    { id: "guests", label: "Convidados", icon: "person_outline", count: guests.length },
    { id: "dentro", label: "Dentro Agora", icon: "home", count: dentro.length },
  ];

  const listaAtual =
    aba === "residentes" ? filtrar(residentes)
    : aba === "guests" ? filtrar(guests)
    : filtrar(dentro);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Controle de Acesso
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Portaria
              </span>
            </h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="glass-panel rounded-2xl px-5 py-3 text-center">
              <p className="text-2xl font-headline font-bold text-primary">{dentro.length}</p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">Dentro</p>
            </div>
            <div className="glass-panel rounded-2xl px-5 py-3 text-center">
              <p className="text-2xl font-headline font-bold text-on-surface">{residentes.length + guests.length}</p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
            </div>
          </div>
        </header>

        {/* Abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit flex-wrap">
          {abas.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setAba(tab.id); setBusca(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
            >
              <Icone name={tab.icon} className="text-lg" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                aba === tab.id ? "bg-primary/20" : "bg-outline-variant/20"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="max-w-sm">
          <Campo
            id="busca"
            placeholder="Buscar por nome ou CPF..."
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">
            Carregando...
          </div>
        ) : listaAtual.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">
            {aba === "dentro" ? "Nenhum usuário registrado dentro do condomínio." : "Nenhum resultado encontrado."}
          </div>
        ) : (
          <div className="space-y-3">
            {aba === "guests" && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
                <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
                <span>
                  Convidados com entrada bloqueada não podem ser registrados. O responsável da unidade deve autorizar.
                </span>
              </div>
            )}
            {listaAtual.map((usuario) => (
              <CartaoUsuario
                key={usuario.id}
                usuario={usuario}
                onEntrada={handleEntrada}
                onSaida={handleSaida}
                showPermissao={aba === "guests"}
                carregando={acao === usuario.id}
              />
            ))}
          </div>
        )}

        {/* Botão atualizar */}
        <div className="flex justify-center pt-2">
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            <Icone name="refresh" className="text-base" />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
