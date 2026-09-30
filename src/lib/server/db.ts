import postgres from "postgres";
import { DATABASE_URL } from "$env/static/private";

// Conexão única, reaproveitada entre as chamadas da função serverless
// (o Supabase pooler já cuida de gerenciar várias conexões por trás)
export const sql = postgres(DATABASE_URL, {
  ssl: "require",
  prepare: false, // o modo "transaction" do pooler não suporta prepared statements
  types: {
    // Por padrão, o driver devolve colunas "numeric" como string (evita perda de precisão),
    // mas o frontend espera número de verdade (usa .toFixed(), faz conta, etc.)
    numeric: {
      to: 1700, // OID do tipo "numeric" no Postgres
      from: [1700],
      serialize: (x: number) => String(x),
      parse: (x: string) => parseFloat(x),
    },
  },
});
