// src/pages/perfil/DetalhesContaView.jsx
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";
import { FotoUsuario } from "../../../components/avatar/FotoUsuario";
import { idiomaAtual } from "../../../i18n";

export function DetalhesContaView() {
  const { t } = useTranslation("perfil");
  const { usuario, atualizarPerfil, atualizarFoto } = useAuth();
  const fileRef = useRef(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState({});

  async function handleSalvar(e) {
    e.preventDefault();
    setMsg("");
    setErro("");
    setErros({});
    setSalvando(true);

    const form = new FormData(e.target);
    const nome = form.get("nome")?.trim();
    const email = form.get("email")?.trim();
    const telefone = form.get("telefone")?.trim();

    const novosErros = {};
    if (!nome) novosErros.nome = t("detalhes.validacao.obrigatorio");
    if (!email) novosErros.email = t("detalhes.validacao.obrigatorio");
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      setSalvando(false);
      return;
    }

    try {
      await atualizarPerfil({ nome, email, telefone });
      setMsg(t("detalhes.msg.salvo"));
    } catch (err) {
      const data = err.response?.data;
      if (data?.erros) setErros(data.erros);
      setErro(data?.mensagem || t("detalhes.msg.erroSalvar"));
    } finally {
      setSalvando(false);
    }
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro("");
    setMsg("");
    setUploadando(true);

    try {
      await atualizarFoto(file);
      setMsg(t("detalhes.msg.fotoAtualizada"));
    } catch (err) {
      setErro(err.response?.data?.mensagem || t("detalhes.msg.erroFoto"));
    } finally {
      setUploadando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const campoErro = (campo) => (erros[campo] ? "ring-2 ring-error/60" : "");

  return (
    <form className="space-y-5" onSubmit={handleSalvar}>
      <div className="flex items-center gap-4 p-4 bg-surface-container-highest/30 rounded-2xl">
        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary via-secondary to-tertiary shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center">
            <FotoUsuario usuario={usuario} classeIcone="text-primary text-3xl" />
          </div>
        </div>
        <div>
          <p className="text-on-surface font-semibold text-sm">{t("detalhes.foto.titulo")}</p>
          <p className="text-on-surface-variant text-xs">{t("detalhes.foto.formatos")}</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={handleFotoChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadando}
          className="ml-auto text-primary text-sm font-semibold hover:underline shrink-0 disabled:opacity-50"
        >
          {uploadando ? t("detalhes.foto.enviando") : t("detalhes.foto.alterar")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Campo
            id="nome"
            name="nome"
            label={t("detalhes.campos.nome.label")}
            placeholder={t("detalhes.campos.nome.placeholder")}
            icon="person"
            defaultValue={usuario?.nome || ""}
            className={campoErro("nome")}
          />
          {erros.nome && <p className="text-error text-sm mt-1">{erros.nome}</p>}
        </div>
        <div>
          <Campo
            id="email"
            name="email"
            label={t("detalhes.campos.email.label")}
            type="email"
            placeholder={t("detalhes.campos.email.placeholder")}
            icon="mail"
            defaultValue={usuario?.email || ""}
            className={campoErro("email")}
          />
          {erros.email && <p className="text-error text-sm mt-1">{erros.email}</p>}
        </div>
        <Campo
          id="telefone"
          name="telefone"
          label={t("detalhes.campos.telefone.label")}
          placeholder={t("detalhes.campos.telefone.placeholder")}
          icon="phone"
          defaultValue={usuario?.telefone || ""}
        />
        {usuario?.dataNascimento && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("detalhes.campos.dataNascimento")}
            </label>
            <div className="flex items-center gap-2 bg-surface-container-highest/40 rounded-xl py-3 px-4 text-on-surface">
              <Icone name="cake" className="text-outline-variant text-lg" />
              <span>
                {new Date(usuario.dataNascimento).toLocaleDateString(idiomaAtual(), { timeZone: "UTC" })}
              </span>
            </div>
          </div>
        )}
      </div>

      {erro && <p className="text-error text-sm font-medium">{erro}</p>}
      {msg && <p className="text-primary text-sm font-medium">{msg}</p>}

      <div className="pt-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? t("detalhes.salvando") : t("detalhes.salvar")}
          {!salvando && <Icone name="check" className="text-xl" />}
        </Botao>
      </div>
    </form>
  );
}
