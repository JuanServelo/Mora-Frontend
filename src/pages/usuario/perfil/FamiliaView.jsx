import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { useConfirm } from "../../../contexts/ConfirmContext";
import { userManagementApi } from "../../../services/userManagementApi";
import {
  PERFIS,
  labelPerfil,
  podeCadastrarPerfil,
  podeGerenciarOcupantes,
} from "../../../utils/perfis";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";

const PERFIL_ICONE = {
  [PERFIS.MORADOR]: "person",
  [PERFIS.DONO_ALUGUEL]: "key",
  [PERFIS.CONVIDADO]: "person_outline",
};

function campoErroClass(erros, campo) {
  return erros[campo] ? "ring-2 ring-error/60" : "";
}

function FormCadastro({ tipo, onSalvar, onCancelar, salvando, erros }) {
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    email: "",
    dataNascimento: "",
  });

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { nome: form.nome.trim(), cpf: form.cpf.trim() };
    if (tipo !== "guest") payload.email = form.email.trim();
    if (tipo !== "lessee") payload.dataNascimento = form.dataNascimento || undefined;
    onSalvar(payload);
  }

  const titulos = {
    lessee: "Cadastrar Locatário (Lessee)",
    occupant: "Cadastrar Ocupante",
    guest: "Cadastrar Convidado (Guest)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-2xl bg-surface-container-highest/20 border border-outline-variant/15">
      <p className="text-sm font-semibold text-on-surface">{titulos[tipo]}</p>

      <Campo
        id="cad-nome"
        label="Nome *"
        placeholder="Nome completo"
        icon="person"
        value={form.nome}
        onChange={(e) => set("nome", e.target.value)}
        className={campoErroClass(erros, "nome")}
      />
      {erros.nome && <p className="text-error text-xs ml-1">{erros.nome}</p>}

      <Campo
        id="cad-cpf"
        label="CPF *"
        placeholder="000.000.000-00"
        icon="badge"
        value={form.cpf}
        onChange={(e) => set("cpf", e.target.value)}
        className={campoErroClass(erros, "cpf")}
      />
      {erros.cpf && <p className="text-error text-xs ml-1">{erros.cpf}</p>}

      {tipo !== "guest" && (
        <>
          <Campo
            id="cad-email"
            label="E-mail *"
            type="email"
            placeholder="email@exemplo.com"
            icon="mail"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={campoErroClass(erros, "email")}
          />
          {erros.email && <p className="text-error text-xs ml-1">{erros.email}</p>}
        </>
      )}

      {tipo !== "lessee" && (
        <>
          <Campo
            id="cad-dob"
            label={tipo === "guest" ? "Data de nascimento" : "Data de nascimento *"}
            type="date"
            icon="calendar_today"
            value={form.dataNascimento}
            onChange={(e) => set("dataNascimento", e.target.value)}
            className={campoErroClass(erros, "dataNascimento")}
          />
          {erros.dataNascimento && (
            <p className="text-error text-xs ml-1">{erros.dataNascimento}</p>
          )}
        </>
      )}

      {tipo === "guest" && (
        <p className="text-xs text-on-surface-variant">
          Guests não possuem acesso ao sistema — cadastro direto, sem convite por e-mail.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Cadastrar"}
          <Icone name="check" className="text-xl" />
        </Botao>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CardOcupante({ item, podeRemover, onRemover, responsavelFinanceiroId }) {
  const isConvite = item.tipo === "convite";
  const isFinanceiro = !isConvite && item.id === responsavelFinanceiroId;

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-highest/30 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icone
            name={isConvite ? "mail" : PERFIL_ICONE[item.perfil] || "person"}
            className="text-primary"
          />
        </div>
        <div className="min-w-0">
          <p className="text-on-surface text-sm font-semibold truncate">
            {isConvite ? item.email : item.nome}
          </p>
          <p className="text-on-surface-variant text-xs">
            {labelPerfil(item.perfil)}
            {isConvite && " · Convite pendente"}
            {!isConvite && item.semAcessoSistema && " · Sem acesso ao sistema"}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {isFinanceiro && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary">
                Responsável financeiro
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isConvite ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
              }`}
            >
              {isConvite ? "pendente" : "ativo"}
            </span>
          </div>
        </div>
      </div>
      {podeRemover && !isConvite && !isFinanceiro && (
        <button
          onClick={() => onRemover(item)}
          className="text-outline hover:text-error transition-colors p-1 cursor-pointer shrink-0"
          title="Remover vínculo"
        >
          <Icone name="close" className="text-base" />
        </button>
      )}
    </div>
  );
}

export function FamiliaView() {
  const { usuario } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [ocupantes, setOcupantes] = useState([]);
  const [convitesPendentes, setConvitesPendentes] = useState([]);
  const [responsavelFinanceiroId, setResponsavelFinanceiroId] = useState(null);
  const [mensagemVazio, setMensagemVazio] = useState(null);
  const [elegibilidade, setElegibilidade] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [formAtivo, setFormAtivo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});

  const unidadeId = usuario?.unidadeId;
  const perfil = usuario?.perfil;

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const [listaRes, eligRes] = await Promise.all([
        userManagementApi.listarOcupantes(unidadeId),
        userManagementApi.verificarElegibilidadeTransferencia(unidadeId).catch(() => null),
      ]);
      const data = listaRes.data;
      setOcupantes(data.ocupantes || []);
      setConvitesPendentes(data.convitesPendentes || []);
      setResponsavelFinanceiroId(data.responsavelFinanceiroId ?? null);
      setMensagemVazio(data.mensagemVazio ?? null);
      if (eligRes?.data) setElegibilidade(eligRes.data);
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao carregar ocupantes.");
    } finally {
      setCarregando(false);
    }
  }, [unidadeId, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleCadastro(tipo, dados) {
    setSalvando(true);
    setErros({});
    const apiFn = {
      lessee: userManagementApi.cadastrarLessee,
      occupant: userManagementApi.cadastrarOccupant,
      guest: userManagementApi.cadastrarGuest,
    }[tipo];

    try {
      const res = await apiFn(unidadeId, dados);
      toast.success(res.data.mensagem);
      if (res.data.convite?.codigo) {
        toast.info("Convite enviado", { detalhe: `Código: ${res.data.convite.codigo}` });
      }
      setFormAtivo(null);
      await carregar();
    } catch (err) {
      const data = err.response?.data;
      if (data?.erros) setErros(data.erros);
      toast.error(data?.mensagem || "Erro ao cadastrar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleTransferir() {
    const ok = await confirm({
      titulo: "Transferir responsabilidade financeira",
      mensagem:
        "O Lessee ativo passará a ser o responsável financeiro e seu perfil será atualizado para Absent Owner. Ocupantes e convidados cadastrados por você serão desativados. Deseja continuar?",
      confirmarTexto: "Transferir",
      variante: "danger",
    });
    if (!ok) return;

    try {
      const res = await userManagementApi.transferirResponsabilidadeFinanceira(unidadeId);
      toast.success(res.data.mensagem);
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro na transferência.");
    }
  }

  async function handleRemover(item) {
    const ok = await confirm({
      titulo: "Remover vínculo",
      mensagem: `Deseja remover ${item.nome} desta unidade?`,
      confirmarTexto: "Remover",
      variante: "danger",
    });
    if (!ok) return;

    try {
      const res = await userManagementApi.removerOcupante(unidadeId, item.id);
      toast.success(res.data.mensagem);
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao remover vínculo.");
    }
  }

  if (!podeGerenciarOcupantes(perfil)) {
    return (
      <div className="rounded-2xl bg-surface-container-highest/30 py-10 px-4 text-center text-on-surface-variant text-sm">
        Você não tem permissão para gerenciar ocupantes desta unidade.
      </div>
    );
  }

  if (!unidadeId) {
    return (
      <div className="rounded-2xl bg-surface-container-highest/30 py-10 px-4 text-center space-y-3">
        <p className="text-on-surface-variant text-sm">
          Sua conta ainda não está vinculada a uma unidade.
        </p>
        <p className="text-on-surface-variant text-xs">
          Aguarde um administrador vincular seu usuário a um apartamento.
        </p>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="py-10 text-center text-on-surface-variant text-sm">
        Carregando ocupantes...
      </div>
    );
  }

  const itens = [...convitesPendentes, ...ocupantes];
  const podeLessee = podeCadastrarPerfil(perfil, PERFIS.MORADOR);
  const podeOccupant = podeCadastrarPerfil(perfil, PERFIS.MORADOR);
  const podeGuest = podeCadastrarPerfil(perfil, PERFIS.CONVIDADO);
  const podeTransferir = elegibilidade?.podeTransferir === true;

  return (
    <div className="space-y-4">
      {podeTransferir && (
        <div className="p-4 rounded-2xl border border-secondary/20 bg-secondary/5 space-y-3">
          <p className="text-sm text-on-surface">
            Você é o responsável financeiro. Pode transferir essa responsabilidade ao Lessee ativo.
          </p>
          <button
            type="button"
            onClick={handleTransferir}
            className="text-sm font-semibold text-secondary hover:underline cursor-pointer"
          >
            Transferir responsabilidade financeira
          </button>
        </div>
      )}

      {elegibilidade?.elegivel === false && elegibilidade?.mensagem && perfil === PERFIS.MORADOR && usuario?.responsavelFinanceiro && (
        <p className="text-xs text-on-surface-variant ml-1">{elegibilidade.mensagem}</p>
      )}

      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">
        {itens.length === 0
          ? mensagemVazio || "Nenhum ocupante vinculado a esta unidade."
          : `${itens.length} vínculo(s) na unidade`}
      </p>

      {itens.length === 0 && (
        <div className="rounded-2xl bg-surface-container-highest/30 py-10 px-4 text-center text-on-surface-variant text-sm">
          {mensagemVazio || "Nenhum ocupante vinculado a esta unidade."}
        </div>
      )}

      <div className="space-y-2">
        {itens.map((item) => (
          <CardOcupante
            key={item.tipo === "convite" ? `convite-${item.id}` : item.id}
            item={item}
            responsavelFinanceiroId={responsavelFinanceiroId}
            podeRemover={
              item.tipo !== "convite" &&
              (podeGerenciarOcupantes(perfil)
                ? item.cadastradoPorId === usuario?.id
                : true)
            }
            onRemover={handleRemover}
          />
        ))}
      </div>

      {formAtivo ? (
        <FormCadastro
          tipo={formAtivo}
          onSalvar={(dados) => handleCadastro(formAtivo, dados)}
          onCancelar={() => { setFormAtivo(null); setErros({}); }}
          salvando={salvando}
          erros={erros}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {podeLessee && (
            <button
              type="button"
              onClick={() => setFormAtivo("lessee")}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all text-sm font-semibold cursor-pointer"
            >
              <Icone name="key" className="text-lg" />
              Cadastrar Lessee
            </button>
          )}
          {podeOccupant && (
            <button
              type="button"
              onClick={() => setFormAtivo("occupant")}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all text-sm font-semibold cursor-pointer"
            >
              <Icone name="person_add" className="text-lg" />
              Cadastrar Occupant
            </button>
          )}
          {podeGuest && (
            <>
              <button
                type="button"
                onClick={() => setFormAtivo("guest")}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all text-sm font-semibold cursor-pointer"
              >
                <Icone name="group_add" className="text-lg" />
                Cadastrar Guest
              </button>
              <button
                type="button"
                onClick={() => navigate("/meus-convidados")}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-solid border-secondary/30 text-secondary hover:bg-secondary/10 transition-all text-sm font-semibold cursor-pointer"
              >
                <Icone name="manage_accounts" className="text-lg" />
                Gerenciar Acessos
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
