import { dailyChallenge, nextResetUTC, todayUTC } from './_lib/daily.mjs';
import { disabled, getFlags } from './_lib/flags.mjs';

/**
 * GET /api/daily → reto diario vigente: fecha, nombre, nivel y ajustes fijos.
 * El ranking del reto se lee en /api/scores?game=breakout&daily=AAAA-MM-DD.
 */
export async function GET() {
  const flags = await getFlags();
  if (!flags.features.dailyChallenge || !flags.games.breakout) {
    return disabled('The daily challenge is turned off right now.');
  }
  const date = todayUTC();
  return Response.json(
    { ...dailyChallenge(date), endsAt: nextResetUTC() },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } }
  );
}
