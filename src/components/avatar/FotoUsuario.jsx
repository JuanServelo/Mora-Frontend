import { useState } from "react";
import { Icone } from "../icones/Icone";
import { fotoUrlCompleta } from "../../utils/avatar";

/**
 * Conteúdo de um avatar circular: a foto do usuário, ou um ícone no lugar.
 *
 * Renderiza só o miolo — quem chama já tem o círculo, o anel de gradiente e o
 * tamanho. Assim o mesmo componente serve do avatar de 32px da barra lateral ao
 * de 112px da tela de perfil.
 *
 * **Cai para o ícone quando a imagem não carrega.** Isso não é zelo excessivo:
 * a coluna `fotoUrl` aponta para um arquivo em disco, e os dois podem divergir
 * — foi o que aconteceu quando o container do auth-api foi recriado sem volume
 * e levou os arquivos junto, deixando linhas apontando para 404. Sem esta
 * guarda, o usuário vê o ícone de imagem quebrada do navegador.
 */
export function FotoUsuario({
  usuario,
  iconeVazio = "person",
  classeIcone = "text-primary text-xl",
}) {
  // Guarda a URL que falhou, e não um booleano: quando o usuário envia uma foto
  // nova, a URL muda e a tentativa recomeça sozinha. Com booleano, o avatar
  // ficaria preso no ícone até recarregar a página.
  const [urlComFalha, setUrlComFalha] = useState(null);

  const url = fotoUrlCompleta(usuario?.fotoUrl);

  if (!url || urlComFalha === url) {
    return <Icone name={iconeVazio} className={classeIcone} />;
  }

  return (
    <img
      src={url}
      alt={usuario?.nome ? `Foto de ${usuario.nome}` : "Foto de perfil"}
      onError={() => setUrlComFalha(url)}
      className="w-full h-full object-cover"
    />
  );
}
