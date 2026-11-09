/**
 * Reto diario de Block Breaker.
 * El nivel se genera a partir de la fecha UTC, así que es igual para todos
 * y cambia solo cada día sin tareas programadas ni datos guardados.
 */

const ADJECTIVES = ['Neon', 'Tropical', 'Midnight', 'Sunset', 'Pixel', 'Cosmic', 'Electric', 'Paradise', 'Turbo', 'Velvet'];
const NOUNS = ['Heart', 'Fortress', 'Garden', 'Tide', 'Circuit', 'Comet', 'Temple', 'Wave', 'Hive', 'Crown'];

const ROWS = 8;
const COLS = 11;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha del reto vigente, en UTC: AAAA-MM-DD. */
export function todayUTC(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** Momento en que empieza el siguiente reto (medianoche UTC). */
export function nextResetUTC(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.toISOString();
}

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
function seededRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tipos de ladrillo: 0 vacío, 1 normal, 2 blindado, 3 pesado, 4 TNT, 9 acero. */
function brickFor(roll) {
  if (roll < 0.12) return 0;
  if (roll < 0.62) return 1;
  if (roll < 0.8) return 2;
  if (roll < 0.88) return 3;
  if (roll < 0.96) return 4;
  return 9;
}

export function dailyChallenge(date) {
  const rand = seededRandom(hashString(`pixelpulse-daily:${date}`));
  const pick = (list) => list[Math.floor(rand() * list.length)];

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const filledRows = 4 + Math.floor(rand() * 3); // de 4 a 6 filas

  // Nivel simétrico: cada columna se refleja en la opuesta.
  for (let r = 0; r < filledRows; r++) {
    for (let c = 0; c <= Math.floor(COLS / 2); c++) {
      const type = brickFor(rand());
      grid[r][c] = type;
      grid[r][COLS - 1 - c] = type;
    }
  }

  const hasBreakable = grid.some((row) => row.some((cell) => cell > 0 && cell !== 9));
  if (!hasBreakable) grid[0][Math.floor(COLS / 2)] = 1;

  return {
    date,
    name: `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    grid,
    config: {
      ballSpeed: pick([6, 6.5, 7, 7.5, 8, 8.5]),
      paddleBaseWidth: pick([92, 128, 128, 172]),
      powerUpChance: pick([0.1, 0.24, 0.24, 0.5]),
    },
  };
}
