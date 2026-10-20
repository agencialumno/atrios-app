import postgres from "postgres";
import { DATABASE_URL } from "$env/static/private";

const base = postgres(DATABASE_URL, {
  ssl: "require",
  prepare: false, // o modo "transaction" do pooler não suporta prepared statements
  connect_timeout: 10, // o Supabase free pausado pode levar alguns segundos para acordar
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

const TENTATIVAS = 3;
const ESPERA_BASE_MS = 400;

// Só erros de "não consegui conectar" — acontecem antes de qualquer comando chegar ao banco,
// então repetir nunca executa uma escrita duas vezes
const ERROS_DE_CONEXAO = new Set([
  "CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "57P03", // cannot_connect_now: banco ainda iniciando
]);

function erroDeConexao(e: unknown): boolean {
  const codigo = (e as { code?: string } | null)?.code;
  return !!codigo && ERROS_DE_CONEXAO.has(codigo);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function comRetry<T>(executar: () => Promise<T>): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await executar();
    } catch (e) {
      if (tentativa >= TENTATIVAS || !erroDeConexao(e)) throw e;
      await esperar(ESPERA_BASE_MS * 2 ** (tentativa - 1)); // 400ms, 800ms
    }
  }
}

/**
 * Cliente do banco. Igual ao `postgres`, mas repete (até 3 vezes, com espera curta) as consultas
 * que falham por não conseguir conectar — o caso do Supabase free acordando depois de pausar.
 */
export const sql = new Proxy(base, {
  apply(alvo, _this, args: [TemplateStringsArray, ...any[]]) {
    // A consulta original continua "preguiçosa": serve como fragmento dentro de outra sql`...`.
    // Quando alguém dá `await`, executamos uma consulta nova, com retry.
    const consulta: any = (alvo as any)(...args);
    consulta.then = (ok?: (v: any) => any, falha?: (e: any) => any) =>
      comRetry(() => (alvo as any)(...args) as Promise<any>).then(ok, falha);
    return consulta;
  },
  get(alvo, prop) {
    if (prop === "begin") {
      return (...args: any[]) =>
        comRetry(() => (alvo.begin as any)(...args) as Promise<any>);
    }
    return Reflect.get(alvo, prop, alvo);
  },
}) as typeof base;
