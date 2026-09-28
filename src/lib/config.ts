// Endereço do servidor. Vem da variável VITE_API_URL na hora do build;
// sem ela, usa o servidor local de desenvolvimento.
const configurada = import.meta.env.VITE_API_URL as string | undefined;

export const API_URL = (
  configurada && configurada.trim() !== ""
    ? configurada.trim()
    : "http://localhost:3000"
).replace(/\/+$/, "");
