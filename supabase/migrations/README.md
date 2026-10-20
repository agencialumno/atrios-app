# Migrações do Supabase

Rode os arquivos em ordem no SQL Editor do Supabase. Todos usam `IF NOT EXISTS`, então repetir é seguro.

As migrações 001-008 (SQLite da época do backend em Rust) ficam em `../backend/migrations`, fora deste repositório.
Daqui para frente, as migrações novas ficam aqui.

- 009_guia_checkin.sql: guia do hóspede e link de check-in
- 010_mensagens_perfil_social.sql: foto de perfil, login social e conversa de suporte
