import { useEffect, useState } from "react";
import { gestaoApi } from "../services/gestaoApi";

/**
 * Receita da plataforma com as assinaturas dos condomínios.
 *
 * É o outro fluxo de dinheiro do Mora: o financeiro-service cuida do que o
 * morador paga ao condomínio; aqui é o que o condomínio paga à plataforma.
 *
 * Uma busca para vários blocos do painel (cards, gráficos e tabela), que o
 * Admin Geral organiza separadamente. Separada do painel principal de
 * propósito: a agregação percorre todas as assinaturas, e os números de uso
 * não devem esperar por ela.
 */
export function useReceitaPlataforma(meses, plano) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    gestaoApi
      .receita({ meses, plano })
      .then((r) => {
        if (!vivo) return;
        setDados(r.data);
        setErro("");
      })
      .catch(() => vivo && setErro("Não foi possível carregar a receita das assinaturas."));
    return () => {
      vivo = false;
    };
  }, [meses, plano]);

  return { dados, erro };
}
