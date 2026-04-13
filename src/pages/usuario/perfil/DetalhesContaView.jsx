// src/pages/perfil/DetalhesContaView.jsx
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";

export function DetalhesContaView() {
  return (
    <div className="space-y-5">
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
            JPG ou PNG • Máx. 5MB
          </p>
        </div>
        <button className="ml-auto text-primary text-sm font-semibold hover:underline shrink-0">
          Alterar
        </button>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="nome"
          label="Nome Completo"
          placeholder="João Silva"
          icon="person"
          defaultValue="João Silva"
        />
        <Campo
          id="email"
          label="E-mail"
          type="email"
          placeholder="joao@mora.com"
          icon="mail"
          defaultValue="joao@mora.com"
        />
      </div>

      <Campo
        id="telefone"
        label="Telefone"
        type="tel"
        placeholder="+55 (11) 99999-9999"
        icon="phone"
      />

      <div className="grid grid-cols-2 gap-4">
        <Campo
          id="torre"
          label="Torre"
          placeholder="Torre A"
          icon="apartment"
          defaultValue="Torre A"
        />
        <Campo
          id="unidade"
          label="Unidade"
          placeholder="102"
          icon="home"
          defaultValue="102"
        />
      </div>

      <div className="pt-2">
        <Botao type="button">
          Salvar Alterações
          <Icone name="check" className="text-xl" />
        </Botao>
      </div>
    </div>
  );
}
