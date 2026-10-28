import { useEffect, useState } from "react";
import { gestaoApi } from "../services/gestaoApi";
import { cotacaoDolar, definirCotacaoDolar } from "../utils/cambio";

/**
 * Carrega a cotação do dólar uma vez por sessão, quando `ativo` (tela em
 * inglês e usuário logado: a rota exige token). Devolve se ela já está
 * disponível, para quem chama atualizar os valores formatados.
 *
 * Se o backend não tiver cotação, a tela segue só com o real: o dólar é
 * referência, não pode impedir ninguém de ver uma cobrança.
 */
export function useCotacaoDolar(ativo) {
  const [disponivel, setDisponivel] = useState(() => cotacaoDolar() != null);

  useEffect(() => {
    if (!ativo || cotacaoDolar() != null) return;
    let vivo = true;
    gestaoApi
      .cambio()
      .then((r) => {
        definirCotacaoDolar(r.data?.reaisPorDolar);
        if (vivo) setDisponivel(cotacaoDolar() != null);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [ativo]);

  return disponivel;
}
