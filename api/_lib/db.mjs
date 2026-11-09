import { neon } from '@neondatabase/serverless';

/**
 * Juegos con ranking y el puntaje máximo que se acepta para cada uno.
 * El tope descarta envíos imposibles; no sustituye una validación en servidor.
 * En Pong el puntaje es el rally más largo contra la IA.
 */
export const GAMES = {
  breakout: 2_000_000,
  snake: 200_000,
  pong: 500,
  invaders: 2_000_000,
};

export function isGame(value) {
  return typeof value === 'string' && Object.hasOwn(GAMES, value);
}

let sql;

/** Cliente SQL perezoso: no falla al importar si falta DATABASE_URL. */
export function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada');
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers });
}
