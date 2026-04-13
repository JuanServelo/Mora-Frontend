// src/pages/perfil/FamiliaView.jsx
import { useState } from "react";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";

const MEMBROS_INICIAIS = [
  { id: 1, nome: "Maria Silva", relacao: "Cônjuge", icon: "favorite" },
  { id: 2, nome: "Pedro Silva", relacao: "Filho", icon: "child_care" },
  { id: 3, nome: "Ana Lima", relacao: "Convidada", icon: "person_add" },
];

export function FamiliaView() {
  const [membros, setMembros] = useState(MEMBROS_INICIAIS);
  const [adicionando, setAdicionando] = useState(false);

  function remover(id) {
    setMembros((m) => m.filter((mb) => mb.id !== id));
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">
        {membros.length} pessoas com acesso
      </p>

      <div className="space-y-2">
        {membros.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-highest/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icone name={m.icon} className="text-primary" />
              </div>
              <div>
                <p className="text-on-surface text-sm font-semibold">
                  {m.nome}
                </p>
                <p className="text-on-surface-variant text-xs">{m.relacao}</p>
              </div>
            </div>
            <button
              onClick={() => remover(m.id)}
              className="text-outline hover:text-error transition-colors p-1 cursor-pointer"
              title="Remover"
            >
              <Icone name="close" className="text-base" />
            </button>
          </div>
        ))}
      </div>

      {adicionando ? (
        <div className="space-y-3 p-4 rounded-2xl bg-surface-container-highest/20 border border-outline-variant/15">
          <Campo
            id="novo-nome"
            label="Nome"
            placeholder="Nome da pessoa"
            icon="person"
          />
          <Campo
            id="novo-relacao"
            label="Relação"
            placeholder="Cônjuge, Filho, Convidado..."
            icon="group"
          />
          <div className="flex gap-3 pt-1">
            <Botao type="button">
              Adicionar
              <Icone name="check" className="text-xl" />
            </Botao>
            <button
              onClick={() => setAdicionando(false)}
              className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all duration-300 text-sm font-semibold cursor-pointer"
        >
          <Icone name="add" className="text-lg" />
          Adicionar Pessoa
        </button>
      )}
    </div>
  );
}
