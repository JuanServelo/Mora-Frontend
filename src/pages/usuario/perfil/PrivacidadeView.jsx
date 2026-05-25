// src/pages/perfil/PrivacidadeView.jsx
import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";
import { validarSenha } from "../../../utils/passwordValidation";

export function PrivacidadeView() {
  const { atualizarPerfil } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [errosSenha, setErrosSenha] = useState([]);

  async function handleAtualizarSenha(e) {
    e.preventDefault();
    setMsg("");
    setErro("");
    setErrosSenha([]);

    const form = new FormData(e.target);
    const senhaAtual = form.get("senhaAtual");
    const novaSenha = form.get("novaSenha");
    const confirmarSenha = form.get("confirmarSenha");

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    const reqs = validarSenha(novaSenha);
    if (reqs.length > 0) {
      setErrosSenha(reqs);
      return;
    }

    setSalvando(true);
    try {
      await atualizarPerfil({ senha: novaSenha, senhaAtual });
      setMsg("Senha atualizada com sucesso.");
      e.target.reset();
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao atualizar senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleAtualizarSenha} className="space-y-7">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">
          Alterar Senha
        </p>
        <Campo
          id="senha-atual"
          name="senhaAtual"
          label="Senha Atual"
          type="password"
          placeholder="••••••••"
          icon="lock"
        />
        <Campo
          id="nova-senha"
          name="novaSenha"
          label="Nova Senha"
          type="password"
          placeholder="Mín. 8 caracteres, 1 número, 1 maiúscula"
          icon="lock_reset"
        />
        {errosSenha.map((m) => (
          <p key={m} className="text-error text-sm">{m}</p>
        ))}
        <Campo
          id="confirmar-senha"
          name="confirmarSenha"
          label="Confirmar Nova Senha"
          type="password"
          placeholder="••••••••"
          icon="check_circle"
        />
      </div>

      {erro && <p className="text-error text-sm font-medium">{erro}</p>}
      {msg && <p className="text-primary text-sm font-medium">{msg}</p>}

      <div className="pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Atualizando..." : "Atualizar Senha"}
          {!salvando && <Icone name="check" className="text-xl" />}
        </Botao>
      </div>
    </form>
  );
}
