/**
 * GET /api/config → configuración pública para el navegador.
 * La clave publicable de Clerk es pública por diseño; la secreta nunca sale del servidor.
 */
import { getFlags } from './_lib/flags.mjs';

export async function GET() {
  const flags = await getFlags();
  return Response.json(
    { clerkPublishableKey: flags.features.signIn ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || null : null },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=10' } }
  );
}
