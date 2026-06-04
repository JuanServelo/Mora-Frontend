import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { Icone } from "../../components/icones/Icone";
import { validarSenha } from "../../utils/passwordValidation";

export function ResetPassword() {
  const { redefinirSenha } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [erro, setErro] = useState("");
  const [errosSenha, setErrosSenha] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setErrosSenha([]);

    if (!token) {
      setErro("Link inválido ou expirado.");
      return;
    }

    const form = new FormData(e.target);
    const senha = form.get("senha");
    const confirmacao = form.get("confirmacao");

    if (!senha || !confirmacao) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    const reqs = validarSenha(senha);
    if (reqs.length > 0) {
      setErrosSenha(reqs);
      return;
    }

    setCarregando(true);
    try {
      await redefinirSenha(token, senha);
      setSucesso(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao redefinir senha.");
    } finally {
      setCarregando(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel max-w-sm w-full rounded-[2rem] p-8 text-center">
          <Icone name="error" className="text-error text-4xl mb-4" />
          <p className="text-on-surface font-semibold mb-2">Link inválido</p>
          <p className="text-on-surface-variant text-sm mb-6">
            Solicite um novo link em esqueci minha senha.
          </p>
          <Link to="/esqueceu-senha" className="text-primary font-bold hover:underline">
            Recuperar senha
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="glass-panel w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Icone name="lock_reset" className="text-primary text-2xl" />
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Nova senha</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Defina uma nova senha para sua conta.
          </p>
        </div>

        {sucesso ? (
          <div className="text-center space-y-3 py-4">
            <Icone name="check_circle" className="text-primary text-4xl" />
            <p className="text-on-surface font-semibold">Senha redefinida!</p>
            <p className="text-on-surface-variant text-sm">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Campo
              id="senha"
              name="senha"
              label="Nova senha"
              type="password"
              placeholder="Mín. 8 caracteres"
              icon="lock"
            />
            {errosSenha.map((msg) => (
              <p key={msg} className="text-error text-sm">{msg}</p>
            ))}
            <Campo
              id="confirmacao"
              name="confirmacao"
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              icon="lock_reset"
            />
            {erro && <p className="text-error text-sm font-medium">{erro}</p>}
            <Botao type="submit" disabled={carregando}>
              {carregando ? "Salvando..." : "Redefinir senha"}
              {!carregando && <Icone name="check" className="text-xl" />}
            </Botao>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-on-surface-variant hover:text-primary">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
