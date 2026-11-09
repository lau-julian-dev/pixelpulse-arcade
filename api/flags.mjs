import { getFlags } from './_lib/flags.mjs';

/** GET /api/flags → interruptores de funciones y aviso activo, para el navegador. */
export async function GET() {
  return Response.json(await getFlags(), {
    headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
  });
}
