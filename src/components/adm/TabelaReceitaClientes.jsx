import { useNavigate } from "react-router-dom";
import { Icone } from "../icones/Icone";
import { formatarBRL } from "../../utils/dinheiro";

/**
 * Quanto cada cliente paga e já pagou à plataforma. `cor` é a escolhida no
 * painel personalizável e pinta a etiqueta do plano.
 */
export function TabelaReceitaClientes({ dados, cor }) {
  const navigate = useNavigate();

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-headline text-lg font-bold text-on-surface">Receita por cliente</h3>
        <button
          onClick={() => navigate("/adm/condominios")}
          className="text-sm text-primary font-semibold hover:underline cursor-pointer"
        >
          Ver clientes
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-on-surface-variant">
              <th className="py-2 pr-4 font-semibold">Cliente</th>
              <th className="py-2 pr-4 font-semibold">Plano</th>
              <th className="py-2 pr-4 font-semibold text-right">Mensalidade</th>
              <th className="py-2 pr-4 font-semibold text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {dados.clientes.map((c) => (
              <tr
                key={c.condominioId}
                onClick={() => navigate(`/adm/condominios/${c.condominioId}`)}
                className="border-t border-veu/5 hover:bg-veu/[0.03] cursor-pointer"
              >
                <td className="py-2.5 pr-4 text-on-surface font-medium">{c.nome}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${cor ? "" : "bg-primary/10 text-primary"}`}
                    style={cor ? { color: cor, background: `${cor}1f` } : undefined}
                  >
                    {c.plano}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right text-on-surface tabular-nums">
                  {formatarBRL(c.mensalidadeCentavos)}
                </td>
                <td className="py-2.5 pr-4 text-right text-on-surface-variant tabular-nums">
                  {formatarBRL(c.acumuladoCentavos)}
                </td>
              </tr>
            ))}

            {dados.semAssinatura.map((c) => (
              <tr key={c.condominioId} className="border-t border-veu/5">
                <td className="py-2.5 pr-4 text-on-surface-variant">{c.nome}</td>
                <td className="py-2.5 pr-4" colSpan={3}>
                  <span className="px-2 py-0.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                    sem plano contratado
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* O acumulado é estimado, e dizer isso na tela evita que alguém o use
          como número de fechamento contábil. */}
      <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
        <Icone name="info" className="text-sm" />
        O acumulado é uma estimativa — mensalidade × meses de vigência. Não há
        histórico de pagamento das assinaturas.
      </p>
    </div>
  );
}
