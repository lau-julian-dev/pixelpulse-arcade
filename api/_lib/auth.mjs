import { createClerkClient, verifyToken } from '@clerk/backend';

let clerk;

/** Limpia un nombre para que cumpla las reglas del ranking (1 a 16 caracteres). */
export function cleanName(raw) {
  const name = String(raw ?? '')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16)
    .trim();
  return name || 'Player';
}

/**
 * Identifica al jugador a partir del token de sesión de Clerk.
 * - Sin token: devuelve null (modo invitado).
 * - Token válido: devuelve { id, name } con el nombre de la cuenta.
 * - Token inválido o caducado: lanza un error para responder 401.
 */
export async function getPlayer(request) {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new AuthError('Sign-in is not configured.');

  let payload;
  try {
    payload = await verifyToken(header.slice(7), { secretKey });
  } catch {
    throw new AuthError('Your session expired. Sign in again.');
  }

  clerk ??= createClerkClient({ secretKey });
  const user = await clerk.users.getUser(payload.sub);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return { id: user.id, name: cleanName(user.username || fullName) };
}

export class AuthError extends Error {}
