// src/components/financeiro/AbaPrestacaoMorador.jsx
// Morador: prestação de contas publicada pelo síndico (RF-17).
import { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { financeiroApi } from "../../services/financeiroApi";
import { formatarBRL } from "../../utils/dinheiro";
import { formatarCompetencia } from "../../utils/datas";
import { Carregando, Vazio } from "../adm/financeiro/comum";
import { mensagemDe } from "../../utils/financeiroTela";
import { ResumoPrestacao, ListaLancamentos } from "../adm/financeiro/PainelPrestacao";

export function AbaPrestacaoMorador() {
  const toast = useToast();
  const [competencias, setCompetencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState(null);
  const [prestacao, setPrestacao] = useState(null);

  useEffect(() => {
    financeiroApi.prestacoesPublicadas()
      .then(({ data }) => {
        const lista = data.competencias ?? [];
        setCompetencias(lista);
        if (lista[0]) setSelecionada(lista[0].competencia);
      })
      .catch((err) => toast.error(mensagemDe(err, "Não foi possível carregar a prestação de contas.")))
      .finally(() => setCarregando(false));
  }, [toast]);

  useEffect(() => {
    if (!selecionada) return;
    financeiroApi.prestacaoPublicada(selecionada)
      .then(({ data }) => setPrestacao(data.prestacao))
      .catch((err) => toast.error(mensagemDe(err, "Não foi possível abrir este mês.")));
  }, [selecionada, toast]);

  if (carregando) return <Carregando />;
  if (!competencias.length) {
    return <Vazio icone="account_balance" texto="O síndico ainda não publicou nenhuma prestação de contas." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {competencias.map((c) => (
          <button
            key={c.competencia}
            onClick={() => setSelecionada(c.competencia)}
            className={`shrink-0 text-left rounded-2xl px-4 py-2.5 border transition cursor-pointer ${
              selecionada === c.competencia
                ? "border-primary/40 bg-primary/10"
                : "border-veu/10 hover:bg-veu/5"
            }`}
          >
            <p className="text-sm font-semibold text-on-surface">{formatarCompetencia(c.competencia)}</p>
            <p className={`text-xs ${c.saldoCentavos < 0 ? "text-error" : "text-on-surface-variant"}`}>
              saldo {formatarBRL(c.saldoCentavos)}
            </p>
          </button>
        ))}
      </div>

      {prestacao?.competencia !== selecionada ? (
        <Carregando />
      ) : (
        <>
          <ResumoPrestacao prestacao={prestacao} />
          <ListaLancamentos lancamentos={prestacao.lancamentos} />
        </>
      )}
    </div>
  );
}
