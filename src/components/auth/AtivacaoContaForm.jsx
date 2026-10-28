import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { Campo } from "../campos/Campo";
import { Botao } from "../botoes/Botao";
import { Icone } from "../icones/Icone";
import { validarSenha } from "../../utils/passwordValidation";
import { mascararCpf, mascararTelefone, validarCpf, validarTelefone } from "../../utils/masks";

export function AtivacaoContaForm({ tituloPasso1, subtituloPasso1, subtituloPasso2 }) {
  const { t } = useTranslation("auth");
  const { validarConvite, ativarConta, getRedirectPath } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [passo, setPasso] = useState(1);
  const [codigo, setCodigo] = useState(searchParams.get("codigo") || "");
  const [convite, setConvite] = useState(null);
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState({});
  const [errosSenha, setErrosSenha] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  useEffect(() => {
    const c = searchParams.get("codigo");
    if (c) setCodigo(c);
  }, [searchParams]);

  useEffect(() => {
    if (convite?.cpfPrecadastro) {
      setCpf(mascararCpf(convite.cpfPrecadastro));
    }
  }, [convite]);

  function handleTelefoneChange(e) {
    setTelefone(mascararTelefone(e.target.value));
  }

  function handleCpfChange(e) {
    setCpf(mascararCpf(e.target.value));
  }

  async function handleValidarCodigo(e) {
    e.preventDefault();
    setErro("");
    setErros({});
    setCarregando(true);

    if (!codigo.trim()) {
      setErros({ codigo: t("ativacao.erros.obrigatorio") });
      setCarregando(false);
      return;
    }

    try {
      const res = await validarConvite(codigo.trim());
      setConvite(res.convite);
      setCodigo(codigo.trim());
      setPasso(2);
    } catch (err) {
      setErro(err.response?.data?.mensagem || t("ativacao.erros.validarCodigo"));
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriarConta(e) {
    e.preventDefault();
    setErro("");
    setErros({});
    setErrosSenha([]);

    const form = new FormData(e.target);
    const dados = {
      codigo: codigo.trim(),
      nome: form.get("nome")?.trim(),
      email: form.get("email")?.trim(),
      telefone: telefone,
      cpf: cpf,
      dataNascimento: dataNascimento,
      senha: form.get("senha"),
      confirmacaoSenha: form.get("confirmacaoSenha"),
    };

    const novosErros = {};
    const camposObrigatorios = ["nome", "email", "telefone", "cpf", "dataNascimento", "senha", "confirmacaoSenha"];
    for (const c of camposObrigatorios) {
      if (!dados[c]) novosErros[c] = t("ativacao.erros.obrigatorio");
    }

    if (!novosErros.cpf && !validarCpf(dados.cpf)) {
      novosErros.cpf = t("ativacao.erros.cpfInvalido");
    }

    if (!novosErros.dataNascimento) {
      const d = new Date(dados.dataNascimento);
      if (isNaN(d.getTime()) || d >= new Date()) {
        novosErros.dataNascimento = t("ativacao.erros.dataInvalida");
      }
    }

    if (!novosErros.telefone && !validarTelefone(dados.telefone)) {
      novosErros.telefone = t("ativacao.erros.telefoneInvalido");
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    if (dados.senha !== dados.confirmacaoSenha) {
      setErros({ senha: t("geral.senhasDiferentes"), confirmacaoSenha: t("geral.senhasDiferentes") });
      setErro(t("geral.senhasDiferentes"));
      return;
    }

    const reqsSenha = validarSenha(dados.senha);
    if (reqsSenha.length > 0) {
      setErrosSenha(reqsSenha);
      return;
    }

    setCarregando(true);
    try {
      const res = await ativarConta(dados);
      const path = res.redirectPath || getRedirectPath(res.usuario?.perfil);
      navigate(path);
    } catch (err) {
      const data = err.response?.data;
      if (data?.erros) setErros(data.erros);
      if (data?.errosSenha) setErrosSenha(data.errosSenha);
      setErro(data?.mensagem || t("ativacao.erros.criarConta"));
    } finally {
      setCarregando(false);
    }
  }

  const campoErro = (campo) => (erros[campo] ? "ring-2 ring-error/60" : "");

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-headline font-bold text-on-surface">
          {passo === 1 ? tituloPasso1 : t("ativacao.concluirCadastro")}
        </h2>
        <p className="text-on-surface-variant text-sm mt-1">
          {passo === 1 ? subtituloPasso1 : subtituloPasso2}
        </p>
      </div>

      {passo === 1 ? (
        <form onSubmit={handleValidarCodigo} className="space-y-5">
          <Campo
            id="codigo"
            name="codigo"
            label={t("ativacao.campos.codigo")}
            placeholder={t("ativacao.campos.codigoPlaceholder")}
            icon="key"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className={campoErro("codigo")}
          />
          {erros.codigo && <p className="text-error text-sm">{erros.codigo}</p>}
          {erro && <p className="text-error text-sm font-medium">{erro}</p>}
          <Botao type="submit" disabled={carregando}>
            {carregando ? t("ativacao.validando") : t("ativacao.validar")}
            {!carregando && <Icone name="arrow_forward" className="text-xl" />}
          </Botao>
        </form>
      ) : (
        <form onSubmit={handleCriarConta} className="space-y-4">
          <Campo
            id="nome"
            name="nome"
            label={t("ativacao.campos.nome")}
            placeholder={t("ativacao.campos.nomePlaceholder")}
            icon="person"
            defaultValue={convite?.nomePrecadastro || ""}
            className={campoErro("nome")}
          />
          {erros.nome && <p className="text-error text-sm">{erros.nome}</p>}

          <Campo
            id="email"
            name="email"
            label={t("field.email.label")}
            type="email"
            placeholder={t("geral.emailPlaceholder")}
            icon="mail"
            defaultValue={convite?.email || ""}
            className={campoErro("email")}
          />
          {erros.email && <p className="text-error text-sm">{erros.email}</p>}

          <Campo
            id="telefone"
            name="telefone"
            label={t("ativacao.campos.telefone")}
            placeholder="(11) 99999-9999"
            icon="phone"
            inputMode="numeric"
            value={telefone}
            onChange={handleTelefoneChange}
            className={campoErro("telefone")}
          />
          {erros.telefone && <p className="text-error text-sm">{erros.telefone}</p>}

          <Campo
            id="cpf"
            name="cpf"
            label={t("ativacao.campos.cpf")}
            placeholder="000.000.000-00"
            icon="badge"
            inputMode="numeric"
            value={cpf}
            onChange={handleCpfChange}
            className={campoErro("cpf")}
          />
          {erros.cpf && <p className="text-error text-sm">{erros.cpf}</p>}

          <Campo
            id="dataNascimento"
            name="dataNascimento"
            label={t("ativacao.campos.dataNascimento")}
            type="date"
            icon="cake"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className={campoErro("dataNascimento")}
          />
          {erros.dataNascimento && <p className="text-error text-sm">{erros.dataNascimento}</p>}

          <Campo
            id="senha"
            name="senha"
            label={t("field.password.label")}
            type="password"
            placeholder={t("geral.senhaPlaceholder")}
            icon="lock"
            className={campoErro("senha")}
          />
          {erros.senha && <p className="text-error text-sm">{erros.senha}</p>}
          {errosSenha.map((msg) => (
            <p key={msg} className="text-error text-sm">{msg}</p>
          ))}

          <Campo
            id="confirmacaoSenha"
            name="confirmacaoSenha"
            label={t("geral.confirmarSenha")}
            type="password"
            placeholder={t("geral.repitaSenha")}
            icon="lock_reset"
            className={campoErro("confirmacaoSenha")}
          />
          {erros.confirmacaoSenha && <p className="text-error text-sm">{erros.confirmacaoSenha}</p>}

          {erro && <p className="text-error text-sm font-medium">{erro}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setPasso(1); setErro(""); }}
              className="px-4 py-3 rounded-full text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              {t("comum:acoes.voltar")}
            </button>
            <div className="flex-1">
              <Botao type="submit" disabled={carregando}>
                {carregando ? t("ativacao.criando") : t("ativacao.criar")}
                {!carregando && <Icone name="check" className="text-xl" />}
              </Botao>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
