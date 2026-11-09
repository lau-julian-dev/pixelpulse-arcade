import { dailyChallenge } from './daily.mjs';
import { getSql } from './db.mjs';
import { rankFor } from './ranking.mjs';

export const SCORE_ID_RE = /^[1-9]\d{0,15}$/;

/** Lee un puntaje guardado con su puesto actual, o null si no existe. */
export async function getSharedScore(id) {
  if (!SCORE_ID_RE.test(String(id ?? ''))) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT id, game, name, score, user_id IS NOT NULL AS verified, to_char(daily, 'YYYY-MM-DD') AS daily
    FROM scores WHERE id = ${id}`;
  if (!rows.length) return null;
  const row = rows[0];
  const rank = await rankFor(sql, row.game, row.daily, row.score);
  return {
    ...row,
    rank,
    dailyName: row.daily ? dailyChallenge(row.daily).name : null,
  };
}
