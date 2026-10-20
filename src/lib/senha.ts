// Regras de senha, usadas pelo cadastro (checklist em tempo real) e pelo servidor

export interface RequisitoSenha {
  id: string;
  rotulo: string;
  ok: (senha: string) => boolean;
}

export const REQUISITOS_SENHA: RequisitoSenha[] = [
  { id: "tamanho", rotulo: "Mínimo de 8 caracteres", ok: (s) => s.length >= 8 },
  { id: "maiuscula", rotulo: "Uma letra maiúscula", ok: (s) => /\p{Lu}/u.test(s) },
  { id: "minuscula", rotulo: "Uma letra minúscula", ok: (s) => /\p{Ll}/u.test(s) },
  { id: "numero", rotulo: "Um número", ok: (s) => /\d/.test(s) },
  {
    id: "especial",
    rotulo: "Um caractere especial (!@#$%^&*...)",
    ok: (s) => /[^\p{L}\p{N}\s]/u.test(s),
  },
];

export function senhaForte(senha: string): boolean {
  return REQUISITOS_SENHA.every((r) => r.ok(senha));
}
