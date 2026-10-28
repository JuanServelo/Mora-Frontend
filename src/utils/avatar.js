import { GATEWAY_URL as API_BASE } from "../services/gateway";

/**
 * Endereço completo da foto de perfil.
 *
 * O auth-api grava em `fotoUrl` um caminho relativo (`/uploads/avatars/...`),
 * porque é ele quem serve o arquivo. Usado como está, o navegador pediria a
 * imagem na origem do **frontend** — e o servidor de desenvolvimento responde
 * `index.html` com 200 para qualquer caminho desconhecido. Daria imagem
 * quebrada sem erro nenhum no console.
 *
 * Aceita URL absoluta intacta: contas do Google trazem a foto hospedada fora.
 */
export function fotoUrlCompleta(fotoUrl) {
  if (!fotoUrl) return null;
  if (fotoUrl.startsWith("http")) return fotoUrl;
  return `${API_BASE}${fotoUrl}`;
}
