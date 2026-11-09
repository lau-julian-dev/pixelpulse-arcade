import { getAll } from '@vercel/global-config';

/**
 * Interruptores de funciones guardados en Vercel Global Config (tienda pixelpulse-flags).
 * Se editan en el panel de Vercel y se aplican sin volver a desplegar.
 * Si la tienda no está conectada o falla, todo queda activado.
 */
export const DEFAULT_FLAGS = {
  games: { breakout: true, snake: true, pong: true, invaders: true },
  features: { ranking: true, signIn: true, dailyChallenge: true, sharedLevels: true, shareCards: true },
  banner: null, // { "text": "…", "tone": "event" | "info" | "warning" }
};

const BANNER_TONES = new Set(['event', 'info', 'warning']);

function normalize(raw) {
  const flags = structuredClone(DEFAULT_FLAGS);
  for (const group of ['games', 'features']) {
    const value = raw?.[group];
    if (value && typeof value === 'object') {
      for (const key of Object.keys(flags[group])) {
        if (typeof value[key] === 'boolean') flags[group][key] = value[key];
      }
    }
  }
  const banner = raw?.banner;
  if (banner && typeof banner.text === 'string' && banner.text.trim()) {
    flags.banner = {
      text: banner.text.trim().slice(0, 140),
      tone: BANNER_TONES.has(banner.tone) ? banner.tone : 'info',
    };
  }
  return flags;
}

export async function getFlags() {
  if (!process.env.GLOBAL_CONFIG && !process.env.EDGE_CONFIG) return structuredClone(DEFAULT_FLAGS);
  try {
    return normalize(await getAll(['games', 'features', 'banner']));
  } catch (err) {
    console.warn('Global Config unavailable, using defaults:', err?.message);
    return structuredClone(DEFAULT_FLAGS);
  }
}

/** Respuesta 403 estándar cuando una función está apagada. */
export function disabled(message) {
  return Response.json({ error: message, disabled: true }, { status: 403 });
}
