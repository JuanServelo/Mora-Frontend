import { useState } from "react";
import { Icone } from "../icones/Icone";
import { Campo } from "../campos/Campo";
import { Botao } from "../botoes/Botao";
import { mascararCnpj, mascararTelefone, validarCnpj, validarTelefone } from "../../utils/masks";

/**
 * Formulário do cadastro de condomínio. Extraído de GerenciarCondominios para
 * ser usado também na tela de detalhe. O campo `id` só aparece na criação: ele
 * é o slug usado como condominioId em todas as tabelas de domínio, então não
 * pode ser editável depois.
 */
export function FormCondominio({ inicial, onSalvar, onCancelar, isNovo }) {
  const [form, setForm] = useState({
    id: inicial?.id ?? "",
    nome: inicial?.nome ?? "",
    cnpj: inicial?.cnpj ? mascararCnpj(inicial.cnpj) : "",
    endereco: inicial?.endereco ?? "",
    telefone: inicial?.telefone ? mascararTelefone(inicial.telefone) : "",
    email: inicial?.email ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErros((e) => ({ ...e, [field]: undefined }));
  }

  function validar() {
    const novosErros = {};
    if (isNovo && !form.id.trim()) novosErros.id = "ID é obrigatório.";
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório.";
    if (form.cnpj.trim()) {
      const digits = form.cnpj.replace(/\D/g, "");
      if (digits.length !== 14) novosErros.cnpj = "CNPJ incompleto (14 dígitos).";
      else if (!validarCnpj(form.cnpj)) novosErros.cnpj = "CNPJ inválido.";
    }
    if (form.telefone.trim() && !validarTelefone(form.telefone)) {
      novosErros.telefone = "Telefone inválido (10 ou 11 dígitos).";
    }
    return novosErros;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      await onSalvar({
        id: form.id.trim().toLowerCase(),
        nome: form.nome.trim(),
        cnpj: form.cnpj.trim() || undefined,
        endereco: form.endereco.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
    } catch {
      // erro tratado pelo pai
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isNovo && (
          <Campo
            id="cond-id"
            label="ID / Slug *"
            placeholder="ex: cond-jardim-europa"
            icon="tag"
            value={form.id}
            error={erros.id}
            onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s/g, "-"))}
          />
        )}
        <Campo
          id="cond-nome"
          label="Nome do Cliente *"
          placeholder="Condomínio Jardim Europa"
          icon="domain"
          value={form.nome}
          error={erros.nome}
          onChange={(e) => set("nome", e.target.value)}
        />
        <Campo
          id="cond-cnpj"
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          icon="badge"
          value={form.cnpj}
          error={erros.cnpj}
          inputMode="numeric"
          onChange={(e) => set("cnpj", mascararCnpj(e.target.value))}
        />
        <Campo
          id="cond-email"
          label="E-mail"
          type="email"
          placeholder="contato@condominio.com"
          icon="mail"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Campo
          id="cond-telefone"
          label="Telefone"
          placeholder="(11) 99999-9999"
          icon="call"
          value={form.telefone}
          error={erros.telefone}
          inputMode="numeric"
          onChange={(e) => set("telefone", mascararTelefone(e.target.value))}
        />
      </div>
      <Campo
        id="cond-endereco"
        label="Endereço"
        placeholder="Rua das Flores, 100 — São Paulo, SP"
        icon="location_on"
        value={form.endereco}
        onChange={(e) => set("endereco", e.target.value)}
      />

      <div className="flex gap-3 pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : isNovo ? "Criar Cliente" : "Salvar Alterações"}
          <Icone name={isNovo ? "add_business" : "check"} className="text-xl" />
        </Botao>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default FormCondominio;
