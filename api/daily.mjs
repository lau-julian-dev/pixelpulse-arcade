import { dailyChallenge, nextResetUTC, todayUTC } from './_lib/daily.mjs';

/**
 * GET /api/daily → reto diario vigente: fecha, nombre, nivel y ajustes fijos.
 * El ranking del reto se lee en /api/scores?game=breakout&daily=AAAA-MM-DD.
 */
export function GET() {
  const date = todayUTC();
  return Response.json(
    { ...dailyChallenge(date), endsAt: nextResetUTC() },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } }
  );
}
