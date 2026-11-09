import { GAME_LABELS } from './_lib/card.mjs';
import { getSharedScore } from './_lib/shared-score.mjs';

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/**
 * GET /s/123 (reescrito a /api/s?id=123) → página corta para redes sociales.
 * Las redes leen las etiquetas Open Graph y muestran la tarjeta; las personas
 * son llevadas al arcade.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  let shared = null;
  try {
    shared = await getSharedScore(id);
  } catch (err) {
    console.error('GET /api/s', err);
  }

  const origin = url.origin;
  const playUrl = `${origin}/play.html`;
  let title = 'PixelPulse Arcade';
  let description = 'Four retro arcade games in your browser. Can you top the global ranking?';
  let image = '';

  if (shared) {
    const where = shared.dailyName ? `the Daily Challenge “${shared.dailyName}”` : GAME_LABELS[shared.game];
    const what = shared.game === 'pong' ? `a ${shared.score}-hit rally` : `${shared.score.toLocaleString('en-US')} points`;
    title = `${shared.name} scored ${what} in ${where}`;
    description = `Rank #${shared.rank} on PixelPulse. Can you beat it?`;
    image = `${origin}/api/card?id=${shared.id}`;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · PixelPulse</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PixelPulse Arcade">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(`${origin}/s/${shared ? shared.id : ''}`)}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${escapeHtml(image)}">` : '<meta name="twitter:card" content="summary">'}
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(playUrl)}">
<style>body{font-family:system-ui,sans-serif;background:#F5AB99;color:#351C4D;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#351C4D;font-weight:700}</style>
</head>
<body>
<p>Opening <a href="${escapeHtml(playUrl)}">PixelPulse Arcade</a>…</p>
<script>location.replace(${JSON.stringify(playUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    status: shared ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
