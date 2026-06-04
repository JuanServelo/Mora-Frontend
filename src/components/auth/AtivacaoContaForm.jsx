import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Campo } from "../campos/Campo";
import { Botao } from "../botoes/Botao";
import { Icone } from "../icones/Icone";
import { validarSenha } from "../../utils/passwordValidation";

export function AtivacaoContaForm({ tituloPasso1, subtituloPasso1, subtituloPasso2 }) {
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

  useEffect(() => {
    const c = searchParams.get("codigo");
    if (c) setCodigo(c);
  }, [searchParams]);

  async function handleValidarCodigo(e) {
    e.preventDefault();
    setErro("");
    setErros({});
    setCarregando(true);

    if (!codigo.trim()) {
      setErros({ codigo: "Este campo é obrigatório." });
      setCarregando(false);
      return;
    }

    try {
      const res = await validarConvite(codigo.trim());
      setConvite(res.convite);
      setCodigo(codigo.trim()); // garante que o código não vaze para outros campos
      setPasso(2);
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao validar código.");
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
      telefone: form.get("telefone")?.trim(),
      cpf: form.get("cpf")?.trim(),
      senha: form.get("senha"),
      confirmacaoSenha: form.get("confirmacaoSenha"),
    };

    const camposObrigatorios = ["nome", "email", "telefone", "cpf", "senha", "confirmacaoSenha"];
    const novosErros = {};
    for (const c of camposObrigatorios) {
      if (!dados[c]) novosErros[c] = "Este campo é obrigatório.";
    }
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    if (dados.senha !== dados.confirmacaoSenha) {
      setErros({ senha: "As senhas não coincidem.", confirmacaoSenha: "As senhas não coincidem." });
      setErro("As senhas não coincidem.");
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
      setErro(data?.mensagem || "Erro ao criar conta.");
    } finally {
      setCarregando(false);
    }
  }

  const campoErro = (campo) => (erros[campo] ? "ring-2 ring-error/60" : "");

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-headline font-bold text-on-surface">
          {passo === 1 ? tituloPasso1 : "Concluir cadastro"}
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
            label="Código de convite"
            placeholder="Ex: AB12CD34"
            icon="key"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className={campoErro("codigo")}
          />
          {erros.codigo && <p className="text-error text-sm">{erros.codigo}</p>}
          {erro && <p className="text-error text-sm font-medium">{erro}</p>}
          <Botao type="submit" disabled={carregando}>
            {carregando ? "Validando..." : "Validar código"}
            {!carregando && <Icone name="arrow_forward" className="text-xl" />}
          </Botao>
        </form>
      ) : (
        <form onSubmit={handleCriarConta} className="space-y-4">
          <Campo
            id="nome"
            name="nome"
            label="Nome completo"
            placeholder="Seu nome"
            icon="person"
            defaultValue={convite?.nomePrecadastro || ""}
            className={campoErro("nome")}
          />
          {erros.nome && <p className="text-error text-sm">{erros.nome}</p>}

          <Campo
            id="email"
            name="email"
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            icon="mail"
            defaultValue={convite?.email || ""}
            className={campoErro("email")}
          />
          {erros.email && <p className="text-error text-sm">{erros.email}</p>}

          <Campo
            id="telefone"
            name="telefone"
            label="Telefone"
            placeholder="(11) 99999-9999"
            icon="phone"
            className={campoErro("telefone")}
          />
          {erros.telefone && <p className="text-error text-sm">{erros.telefone}</p>}

          <Campo
            id="cpf"
            name="cpf"
            label="CPF"
            placeholder="000.000.000-00"
            icon="badge"
            defaultValue={convite?.cpfPrecadastro || ""}
            className={campoErro("cpf")}
          />
          {erros.cpf && <p className="text-error text-sm">{erros.cpf}</p>}

          <Campo
            id="senha"
            name="senha"
            label="Senha"
            type="password"
            placeholder="Mín. 8 caracteres"
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
            label="Confirmar senha"
            type="password"
            placeholder="Repita a senha"
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
              Voltar
            </button>
            <div className="flex-1">
              <Botao type="submit" disabled={carregando}>
                {carregando ? "Criando..." : "Criar conta"}
                {!carregando && <Icone name="check" className="text-xl" />}
              </Botao>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
