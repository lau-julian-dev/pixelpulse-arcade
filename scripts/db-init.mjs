// Crea las tablas del ranking. Es idempotente: se puede ejecutar varias veces.
// Uso: npm run db:init   (lee DATABASE_URL de .env.local)
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Ejecuta primero: vercel env pull .env.local --yes');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS scores (
    id         bigserial PRIMARY KEY,
    game       text        NOT NULL CHECK (game IN ('breakout', 'snake', 'pong', 'invaders')),
    name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 16),
    score      integer     NOT NULL CHECK (score > 0),
    ip_hash    text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
await sql`CREATE INDEX IF NOT EXISTS scores_game_score_idx ON scores (game, score DESC)`;
await sql`CREATE INDEX IF NOT EXISTS scores_ip_recent_idx ON scores (ip_hash, created_at DESC)`;

// Fase 2: cuentas de Clerk. user_id vacío = invitado.
await sql`ALTER TABLE scores ADD COLUMN IF NOT EXISTS user_id text`;
await sql`CREATE INDEX IF NOT EXISTS scores_game_user_idx ON scores (game, user_id)`;

// Fase 3: reto diario. daily vacío = ranking histórico.
await sql`ALTER TABLE scores ADD COLUMN IF NOT EXISTS daily date`;
await sql`CREATE INDEX IF NOT EXISTS scores_game_daily_idx ON scores (game, daily, score DESC)`;

console.log('Tabla scores lista.');
