-- Foto de perfil e login social
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apple_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_apple_id ON usuarios(apple_id);

-- Conversa de suporte (hóspede/anfitrião <-> equipe Átrios): mensagem sem reserva, ligada ao usuário
ALTER TABLE mensagens ALTER COLUMN reserva_id DROP NOT NULL;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS suporte_usuario_id TEXT REFERENCES usuarios(id);
CREATE INDEX IF NOT EXISTS idx_mensagens_suporte ON mensagens(suporte_usuario_id, criado_em);
