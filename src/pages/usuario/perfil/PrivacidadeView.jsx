// src/pages/perfil/PrivacidadeView.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";
import { validarSenha } from "../../../utils/passwordValidation";

export function PrivacidadeView() {
  const { t } = useTranslation("perfil");
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
      setErro(t("privacidade.erros.preencherTodos"));
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro(t("privacidade.erros.naoCoincidem"));
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
      setMsg(t("privacidade.msg.atualizada"));
      e.target.reset();
    } catch (err) {
      setErro(err.response?.data?.mensagem || t("privacidade.msg.erroAtualizar"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleAtualizarSenha} className="space-y-7">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">
          {t("privacidade.titulo")}
        </p>
        <Campo
          id="senha-atual"
          name="senhaAtual"
          label={t("privacidade.campos.senhaAtual")}
          type="password"
          placeholder="••••••••"
          icon="lock"
        />
        <Campo
          id="nova-senha"
          name="novaSenha"
          label={t("privacidade.campos.novaSenha")}
          type="password"
          placeholder={t("privacidade.campos.novaSenhaPlaceholder")}
          icon="lock_reset"
        />
        {errosSenha.map((m) => (
          <p key={m} className="text-error text-sm">{m}</p>
        ))}
        <Campo
          id="confirmar-senha"
          name="confirmarSenha"
          label={t("privacidade.campos.confirmarSenha")}
          type="password"
          placeholder="••••••••"
          icon="check_circle"
        />
      </div>

      {erro && <p className="text-error text-sm font-medium">{erro}</p>}
      {msg && <p className="text-primary text-sm font-medium">{msg}</p>}

      <div className="pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? t("privacidade.atualizando") : t("privacidade.atualizar")}
          {!salvando && <Icone name="check" className="text-xl" />}
        </Botao>
      </div>
    </form>
  );
}
