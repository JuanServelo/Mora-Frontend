// src/pages/usuario/perfil/CobrancaView.jsx
import { Icone } from "../../../components/icones/Icone";

export function CobrancaView() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1 mb-4">
        Últimos pagamentos
      </p>

      <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-on-surface-variant text-sm text-center px-4">
        <Icone name="receipt_long" className="text-4xl opacity-30" />
        <p>
          Não há faturas listadas. O histórico será exibido quando o módulo financeiro estiver integrado.
        </p>
      </div>
    </div>
  );
}
