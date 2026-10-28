import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useCotacaoDolar } from "../../hooks/useCotacaoDolar";

/**
 * Remonta as telas quando o idioma muda. O `t()` já se atualiza sozinho, mas
 * datas e valores formatados fora dele (`formatarData`, `formatarBRL`...) só
 * mudam quando o componente renderiza de novo. Fica abaixo dos providers: a
 * sessão, o tema e as notificações não se perdem na troca.
 *
 * Em inglês, remonta também quando a cotação do dólar chega, para os valores
 * ganharem o "≈ $". Acontece uma vez por sessão.
 */
export function ComIdioma({ children }) {
  const { i18n } = useTranslation();
  const { usuario } = useAuth();
  const comDolar = useCotacaoDolar(i18n.language === "en" && Boolean(usuario));
  return (
    <div key={`${i18n.language}:${comDolar}`} className="contents">
      {children}
    </div>
  );
}
