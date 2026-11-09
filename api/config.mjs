/**
 * GET /api/config → configuración pública para el navegador.
 * La clave publicable de Clerk es pública por diseño; la secreta nunca sale del servidor.
 */
export function GET() {
  return Response.json(
    { clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || null },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
}
