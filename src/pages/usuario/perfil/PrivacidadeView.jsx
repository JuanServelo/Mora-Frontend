// src/pages/perfil/PrivacidadeView.jsx
import { useState } from "react";
import { Campo } from "../../../components/campos/Campo";
import { Botao } from "../../../components/botoes/Botao";
import { Icone } from "../../../components/icones/Icone";

export function PrivacidadeView() {
  const [biometria, setBiometria] = useState(true);

  return (
    <div className="space-y-7">
      {/* Alterar Senha */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">
          Alterar Senha
        </p>
        <Campo
          id="senha-atual"
          label="Senha Atual"
          type="password"
          placeholder="••••••••"
          icon="lock"
        />
        <Campo
          id="nova-senha"
          label="Nova Senha"
          type="password"
          placeholder="••••••••"
          icon="lock_reset"
        />
        <Campo
          id="confirmar-senha"
          label="Confirmar Nova Senha"
          type="password"
          placeholder="••••••••"
          icon="check_circle"
        />
      </div>

      {/* Autenticação */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1 mb-3">
          Autenticação
        </p>
        <div className="flex items-center justify-between p-4 bg-surface-container-highest/40 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Icone name="fingerprint" className="text-primary text-2xl" />
            <div>
              <p className="text-on-surface text-sm font-semibold">
                Acesso por Biometria
              </p>
              <p className="text-on-surface-variant text-xs">
                Face ID ou impressão digital
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBiometria((b) => !b)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
              biometria ? "bg-primary" : "bg-surface-container-highest"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                biometria ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="pt-1">
        <Botao type="button">
          Atualizar Senha
          <Icone name="check" className="text-xl" />
        </Botao>
      </div>
    </div>
  );
}
