import { renderCard } from './_lib/card.mjs';
import { json } from './_lib/db.mjs';
import { disabled, getFlags } from './_lib/flags.mjs';
import { getSharedScore } from './_lib/shared-score.mjs';

/** GET /api/card?id=123 → imagen PNG de 1200 × 630 para compartir un puntaje guardado. */
export async function GET(request) {
  const url = new URL(request.url);
  const flags = await getFlags();
  if (!flags.features.shareCards) return disabled('Share cards are turned off right now.');
  try {
    const shared = await getSharedScore(url.searchParams.get('id'));
    if (!shared) return json({ error: 'Score not found.' }, 404);
    return await renderCard({ ...shared, site: url.host });
  } catch (err) {
    console.error('GET /api/card', err);
    return json({ error: 'Could not create the card.' }, 500);
  }
}
