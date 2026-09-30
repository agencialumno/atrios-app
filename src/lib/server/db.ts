import postgres from "postgres";
import { DATABASE_URL } from "$env/static/private";

// Conexão única, reaproveitada entre as chamadas da função serverless
// (o Supabase pooler já cuida de gerenciar várias conexões por trás)
export const sql = postgres(DATABASE_URL, {
  ssl: "require",
  prepare: false, // o modo "transaction" do pooler não suporta prepared statements
});
