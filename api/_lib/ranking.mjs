/**
 * Consultas del ranking. Los jugadores con cuenta se agrupan por cuenta y los
 * invitados por nombre. `daily` es la fecha del reto diario, o null para el
 * ranking histórico de cada juego.
 */

export async function topScores(sql, game, daily, limit) {
  return sql`
    SELECT (array_agg(name ORDER BY created_at DESC))[1] AS name,
           MAX(score)::int AS score,
           bool_or(user_id IS NOT NULL) AS verified
    FROM scores
    WHERE game = ${game} AND daily IS NOT DISTINCT FROM ${daily}::date
    GROUP BY COALESCE(user_id, 'guest:' || lower(name))
    ORDER BY score DESC, MIN(created_at) ASC
    LIMIT ${limit}`;
}

export async function rankFor(sql, game, daily, score) {
  const [{ rank }] = await sql`
    SELECT COUNT(*)::int + 1 AS rank
    FROM (
      SELECT MAX(score) AS best
      FROM scores
      WHERE game = ${game} AND daily IS NOT DISTINCT FROM ${daily}::date
      GROUP BY COALESCE(user_id, 'guest:' || lower(name))
    ) AS t
    WHERE t.best > ${score}`;
  return rank;
}
