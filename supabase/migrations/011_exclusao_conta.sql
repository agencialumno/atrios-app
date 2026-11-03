-- Exclusão de conta: a linha de usuarios é anonimizada (não apagada) para não quebrar
-- as chaves estrangeiras de reservas, mensagens e pagamentos.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS excluida_em TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_usuarios_excluida_em ON usuarios(excluida_em) WHERE excluida_em IS NOT NULL;
