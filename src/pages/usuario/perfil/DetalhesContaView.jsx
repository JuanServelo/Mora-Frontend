// src/pages/perfil/DetalhesContaView.jsx
import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";

export function DetalhesContaView() {
  const { usuario, atualizarPerfil } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  async function handleSalvar(e) {
    e.preventDefault();
    setMsg("");
    setErro("");
    setSalvando(true);

    const form = new FormData(e.target);
    const nome = form.get("nome")?.trim();
    const email = form.get("email")?.trim();

    try {
      await atualizarPerfil({ nome, email });
      setMsg("Perfil atualizado com sucesso!");
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSalvar}>
      {/* Foto de Perfil */}
      <div className="flex items-center gap-4 p-4 bg-surface-container-highest/30 rounded-2xl">
        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary via-secondary to-tertiary shrink-0">
          <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
            <Icone name="person" className="text-primary text-3xl" />
          </div>
        </div>
        <div>
          <p className="text-on-surface font-semibold text-sm">
            Foto de Perfil
          </p>
          <p className="text-on-surface-variant text-xs">
            JPG ou PNG - Max. 5MB
          </p>
        </div>
        <button type="button" className="ml-auto text-primary text-sm font-semibold hover:underline shrink-0">
          Alterar
        </button>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="nome"
          name="nome"
          label="Nome Completo"
          placeholder="Seu nome"
          icon="person"
          defaultValue={usuario?.nome || ""}
        />
        <Campo
          id="email"
          name="email"
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          icon="mail"
          defaultValue={usuario?.email || ""}
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
