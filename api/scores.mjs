import { createHash } from 'node:crypto';
import { AuthError, getPlayer } from './_lib/auth.mjs';
import { DATE_RE, todayUTC } from './_lib/daily.mjs';
import { GAMES, getSql, isGame, json } from './_lib/db.mjs';
import { rankFor, topScores } from './_lib/ranking.mjs';

const NAME_RE = /^[\p{L}\p{N} _.-]{1,16}$/u;
const MAX_PER_MINUTE = 6;
const DAILY_GAME = 'breakout';

/**
 * GET /api/scores?game=breakout&limit=10 → ranking histórico del juego.
 * GET /api/scores?game=breakout&daily=AAAA-MM-DD → ranking del reto diario.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const game = url.searchParams.get('game');
  if (!isGame(game)) return json({ error: 'Unknown game.' }, 400);

  const daily = url.searchParams.get('daily');
  if (daily !== null && !DATE_RE.test(daily)) return json({ error: 'Invalid daily date.' }, 400);

  const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '10', 10) || 10));

  try {
    const scores = await topScores(getSql(), game, daily, limit);
    return json({ game, daily, scores }, 200, {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
    });
  } catch (err) {
    console.error('GET /api/scores', err);
    return json({ error: 'Could not load the ranking.' }, 500);
  }
}

/**
 * POST /api/scores { game, name, score, daily? } → guarda el puntaje y devuelve el puesto.
 * Con sesión de Clerk se usa el nombre de la cuenta; sin sesión, el nombre enviado.
 * `daily` solo se acepta para el reto del día vigente.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const game = body?.game;
  const score = body?.score;
  if (!isGame(game)) return json({ error: 'Unknown game.' }, 400);
  if (!Number.isInteger(score) || score < 1 || score > GAMES[game]) {
    return json({ error: 'Invalid score.' }, 400);
  }

  const daily = body?.daily ?? null;
  if (daily !== null) {
    if (game !== DAILY_GAME || typeof daily !== 'string' || !DATE_RE.test(daily)) {
      return json({ error: 'Invalid daily challenge.' }, 400);
    }
    if (daily !== todayUTC()) {
      return json({ error: 'This daily challenge has ended. Try today’s challenge!' }, 409);
    }
  }

  let player;
  try {
    player = await getPlayer(request);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error('POST /api/scores auth', err);
    return json({ error: 'Could not verify your account.' }, 500);
  }

  let name;
  if (player) {
    name = player.name;
  } else {
    name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (!NAME_RE.test(name)) {
      return json({ error: 'Use 1 to 16 letters, numbers, spaces, dots, dashes or underscores.' }, 400);
    }
  }

  // Límite de envíos por visitante. Se guarda un hash, nunca la IP.
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update(`pixelpulse:${ip}`).digest('hex').slice(0, 32);
  const userId = player?.id ?? null;

  try {
    const sql = getSql();
    const [{ recent }] = await sql`
      SELECT COUNT(*)::int AS recent
      FROM scores
      WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 minute'`;
    if (recent >= MAX_PER_MINUTE) {
      return json({ error: 'Too many submissions. Try again in a minute.' }, 429);
    }

    const [{ id }] = await sql`
      INSERT INTO scores (game, name, score, ip_hash, user_id, daily)
      VALUES (${game}, ${name}, ${score}, ${ipHash}, ${userId}, ${daily}::date)
      RETURNING id::text AS id`;

    const rank = await rankFor(sql, game, daily, score);
    return json({ ok: true, id, rank, name, verified: Boolean(userId), daily }, 201);
  } catch (err) {
    console.error('POST /api/scores', err);
    return json({ error: 'Could not save the score.' }, 500);
  }
}
