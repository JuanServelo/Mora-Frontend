// src/pages/perfil/DetalhesContaView.jsx
import { useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

function fotoUrlCompleta(fotoUrl) {
  if (!fotoUrl) return null;
  if (fotoUrl.startsWith("http")) return fotoUrl;
  return `${API_BASE}${fotoUrl}`;
}

export function DetalhesContaView() {
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
    if (!nome) novosErros.nome = "Este campo é obrigatório.";
    if (!email) novosErros.email = "Este campo é obrigatório.";
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      setSalvando(false);
      return;
    }

    try {
      await atualizarPerfil({ nome, email, telefone });
      setMsg("Dados atualizados com sucesso.");
    } catch (err) {
      const data = err.response?.data;
      if (data?.erros) setErros(data.erros);
      setErro(data?.mensagem || "Erro ao salvar.");
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
      setMsg("Foto atualizada com sucesso.");
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao enviar foto.");
    } finally {
      setUploadando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const foto = fotoUrlCompleta(usuario?.fotoUrl);
  const campoErro = (campo) => (erros[campo] ? "ring-2 ring-error/60" : "");

  return (
    <form className="space-y-5" onSubmit={handleSalvar}>
      <div className="flex items-center gap-4 p-4 bg-surface-container-highest/30 rounded-2xl">
        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary via-secondary to-tertiary shrink-0 overflow-hidden">
          {foto ? (
            <img src={foto} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
              <Icone name="person" className="text-primary text-3xl" />
            </div>
          )}
        </div>
        <div>
          <p className="text-on-surface font-semibold text-sm">Foto de Perfil</p>
          <p className="text-on-surface-variant text-xs">JPG ou PNG - Max. 5MB</p>
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
          {uploadando ? "Enviando..." : "Alterar"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Campo
            id="nome"
            name="nome"
            label="Nome Completo"
            placeholder="Seu nome"
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
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            icon="mail"
            defaultValue={usuario?.email || ""}
            className={campoErro("email")}
          />
          {erros.email && <p className="text-error text-sm mt-1">{erros.email}</p>}
        </div>
        <Campo
          id="telefone"
          name="telefone"
          label="Telefone"
          placeholder="(11) 99999-9999"
          icon="phone"
          defaultValue={usuario?.telefone || ""}
        />
      </div>

      {erro && <p className="text-error text-sm font-medium">{erro}</p>}
      {msg && <p className="text-primary text-sm font-medium">{msg}</p>}

      <div className="pt-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar Alterações"}
          {!salvando && <Icone name="check" className="text-xl" />}
        </Botao>
      </div>
    </form>
  );
}
