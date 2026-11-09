import { readFile } from 'node:fs/promises';
import { ImageResponse } from '@vercel/og';

/**
 * Tarjeta para compartir un puntaje (1200 × 630), con la estética de la landing:
 * paleta Ponche Tropical, bordes Nightfall y sombras rígidas.
 */

const C = {
  night: '#351C4D',
  pink: '#F5AB99',
  paper: '#FFFDF9',
  sunset: '#FEB47B',
  heat: '#FF7E5F',
  paradise: '#765285',
};

export const GAME_LABELS = {
  breakout: 'Block Breaker',
  snake: 'Cyber Snake',
  pong: 'Pong Arena',
  invaders: 'Space Defender',
};

const FONT_FILES = {
  archivo: new URL('../../node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff', import.meta.url),
  grotesk500: new URL('../../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff', import.meta.url),
  grotesk700: new URL('../../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff', import.meta.url),
};

let fontsPromise;
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(FONT_FILES.archivo),
    readFile(FONT_FILES.grotesk500),
    readFile(FONT_FILES.grotesk700),
  ]).then(([archivo, g500, g700]) => [
    { name: 'Archivo Black', data: archivo, weight: 400, style: 'normal' },
    { name: 'Space Grotesk', data: g500, weight: 500, style: 'normal' },
    { name: 'Space Grotesk', data: g700, weight: 700, style: 'normal' },
  ]);
  return fontsPromise;
}

/** Marca de verificado dibujada en SVG (las fuentes no incluyen el símbolo ✓). */
const CHECK_ICON = {
  type: 'svg',
  props: {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    children: {
      type: 'path',
      props: { d: 'M4 12.5l5 5L20 6.5', stroke: C.night, strokeWidth: 4, fill: 'none', strokeLinecap: 'round' },
    },
  },
};

/** Crea un nodo para Satori sin JSX: h('div', estilo, ...hijos). */
function h(type, style, ...children) {
  const kids = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { style: { display: 'flex', ...style }, children: kids.length === 1 ? kids[0] : kids } };
}

/**
 * @param {{ game: string, name: string, score: number, verified: boolean,
 *           rank: number|null, dailyName: string|null, site: string }} data
 */
export async function renderCard(data) {
  const fonts = await loadFonts();
  const label = data.dailyName ? `Daily · ${data.dailyName}` : GAME_LABELS[data.game] || data.game;
  const unit = data.game === 'pong' ? 'HIT RALLY' : 'POINTS';

  const element = h(
    'div',
    {
      width: '100%',
      height: '100%',
      backgroundColor: C.pink,
      border: `16px solid ${C.night}`,
      padding: '48px 56px',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontFamily: 'Space Grotesk',
      color: C.night,
    },
    // Cabecera: marca y juego
    h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { fontFamily: 'Archivo Black', fontSize: 58, letterSpacing: -2 },
        'PIXEL', h('span', { color: C.paradise }, 'PULSE')),
      h('div', {
        backgroundColor: C.paradise,
        color: C.paper,
        border: `5px solid ${C.night}`,
        borderRadius: 12,
        padding: '10px 26px',
        fontSize: 32,
        fontWeight: 700,
      }, label)
    ),
    // Centro: jugador y puntaje
    h(
      'div',
      { alignItems: 'center', gap: 44 },
      h(
        'div',
        {
          flexDirection: 'column',
          backgroundColor: C.paper,
          border: `8px solid ${C.night}`,
          borderRadius: 26,
          boxShadow: `16px 16px 0 ${C.night}`,
          padding: '26px 44px 30px',
          minWidth: 560,
        },
        h('div', { alignItems: 'center', gap: 14, fontSize: 40, fontWeight: 700 },
          data.name,
          data.verified ? h('div', {
            width: 40, height: 40, borderRadius: 40, backgroundColor: C.heat,
            border: `4px solid ${C.night}`, alignItems: 'center', justifyContent: 'center',
          }, CHECK_ICON) : null),
        h('div', { fontFamily: 'Archivo Black', fontSize: 150, lineHeight: 1, marginTop: 6 },
          Number(data.score).toLocaleString('en-US')),
        h('div', { fontSize: 26, fontWeight: 700, letterSpacing: 4, color: C.paradise }, unit)
      ),
      data.rank ? h(
        'div',
        {
          width: 230, height: 230, borderRadius: 230,
          backgroundColor: C.heat, border: `8px solid ${C.night}`, boxShadow: `12px 12px 0 ${C.night}`,
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        },
        h('div', { fontSize: 28, fontWeight: 700, letterSpacing: 3 }, 'RANK'),
        h('div', { fontFamily: 'Archivo Black', fontSize: 92, lineHeight: 1 }, `#${data.rank}`)
      ) : null
    ),
    // Pie: invitación a jugar
    h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between', fontSize: 28, fontWeight: 500 },
      h('div', {}, 'Can you beat it?'),
      h('div', {
        backgroundColor: C.sunset, border: `5px solid ${C.night}`, borderRadius: 12,
        padding: '8px 22px', fontWeight: 700,
      }, data.site)
    )
  );

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts,
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' },
  });
}
