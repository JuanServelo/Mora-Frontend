// src/pages/perfil/CobrancaView.jsx
import { Icone } from "../../../components/icones/Icone";

const HISTORICO = [
  {
    mes: "Outubro 2024",
    vencimento: "10/10/2024",
    valor: "R$ 1.240,00",
    status: "pago",
  },
  {
    mes: "Setembro 2024",
    vencimento: "10/09/2024",
    valor: "R$ 1.240,00",
    status: "pago",
  },
  {
    mes: "Agosto 2024",
    vencimento: "10/08/2024",
    valor: "R$ 1.240,00",
    status: "pago",
  },
  {
    mes: "Julho 2024",
    vencimento: "10/07/2024",
    valor: "R$ 1.180,00",
    status: "pago",
  },
  {
    mes: "Junho 2024",
    vencimento: "10/06/2024",
    valor: "R$ 1.180,00",
    status: "pago",
  },
];

export function CobrancaView() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1 mb-4">
        Últimos pagamentos
      </p>

      {HISTORICO.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-highest/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="receipt_long" className="text-primary" />
            </div>
            <div>
              <p className="text-on-surface text-sm font-semibold">
                {item.mes}
              </p>
              <p className="text-on-surface-variant text-xs">
                Venc. {item.vencimento}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-on-surface text-sm font-bold">{item.valor}</p>
              <span className="text-primary text-[10px] font-semibold uppercase tracking-wider">
                {item.status}
              </span>
            </div>
            <button
              className="text-outline hover:text-primary transition-colors p-1 cursor-pointer"
              title="Baixar comprovante"
            >
              <Icone name="download" className="text-base" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
