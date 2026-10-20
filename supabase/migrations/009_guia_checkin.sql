-- Guia do hóspede e link público de check-in
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS guia_json JSONB;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS checkin_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_checkin_token ON reservas(checkin_token);

-- Reservas já confirmadas ganham o link também
UPDATE reservas
SET checkin_token = gen_random_uuid()::text
WHERE checkin_token IS NULL AND status IN ('confirmada', 'concluida');
