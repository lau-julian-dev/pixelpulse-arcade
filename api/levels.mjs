import { createHash, randomBytes } from 'node:crypto';
import { AuthError, getPlayer } from './_lib/auth.mjs';
import { getSql, json } from './_lib/db.mjs';
import { disabled, getFlags } from './_lib/flags.mjs';

const ROWS = 8;
const COLS = 11;
const BRICKS = new Set([0, 1, 2, 3, 4, 9]);
const ID_RE = /^[A-Za-z0-9]{8}$/;
const LEVEL_NAME_RE = /^[\p{L}\p{N} _.,!?'-]{1,24}$/u;
const GUEST_NAME_RE = /^[\p{L}\p{N} _.-]{1,16}$/u;
const MAX_PER_MINUTE = 5;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Código corto y legible para el link (sin 0/O ni 1/l/I). */
function newId() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Valida la cuadrícula del editor: 8 filas × 11 columnas con ladrillos conocidos. */
function isValidGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== ROWS) return false;
  let breakable = 0;
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== COLS) return false;
    for (const cell of row) {
      if (!Number.isInteger(cell) || !BRICKS.has(cell)) return false;
      if (cell > 0 && cell !== 9) breakable++;
    }
  }
  return breakable > 0;
}

/** GET /api/levels?id=XXXXXXXX → nivel compartido. */
export async function GET(request) {
  const flags = await getFlags();
  if (!flags.features.sharedLevels) return disabled('Shared levels are turned off right now.');

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !ID_RE.test(id)) return json({ error: 'Invalid level link.' }, 400);

  try {
    const rows = await getSql()`
      SELECT id, name, author, user_id IS NOT NULL AS verified, grid, created_at
      FROM levels WHERE id = ${id}`;
    if (!rows.length) return json({ error: 'This level does not exist.' }, 404);
    // Un nivel publicado no cambia: se puede cachear mucho tiempo.
    return json(rows[0], 200, { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' });
  } catch (err) {
    console.error('GET /api/levels', err);
    return json({ error: 'Could not load the level.' }, 500);
  }
}

/** POST /api/levels { grid, name, author? } → guarda el nivel y devuelve su código. */
export async function POST(request) {
  const flags = await getFlags();
  if (!flags.features.sharedLevels) return disabled('Shared levels are turned off right now.');

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  if (!isValidGrid(body?.grid)) {
    return json({ error: 'The level needs at least one breakable brick.' }, 400);
  }
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!LEVEL_NAME_RE.test(name)) {
    return json({ error: 'Give your level a name of 1 to 24 characters.' }, 400);
  }

  let player;
  try {
    player = await getPlayer(request);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error('POST /api/levels auth', err);
    return json({ error: 'Could not verify your account.' }, 500);
  }

  let author = 'Guest';
  if (player) {
    author = player.name;
  } else if (typeof body?.author === 'string') {
    const guest = body.author.trim().replace(/\s+/g, ' ');
    if (GUEST_NAME_RE.test(guest)) author = guest;
  }

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update(`pixelpulse:${ip}`).digest('hex').slice(0, 32);

  try {
    const sql = getSql();
    const [{ recent }] = await sql`
      SELECT COUNT(*)::int AS recent FROM levels
      WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 minute'`;
    if (recent >= MAX_PER_MINUTE) {
      return json({ error: 'Too many levels shared. Try again in a minute.' }, 429);
    }

    // Reintenta si el código aleatorio ya existe (muy improbable).
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = newId();
      const inserted = await sql`
        INSERT INTO levels (id, name, author, user_id, grid, ip_hash)
        VALUES (${id}, ${name}, ${author}, ${player?.id ?? null}, ${JSON.stringify(body.grid)}::jsonb, ${ipHash})
        ON CONFLICT (id) DO NOTHING
        RETURNING id`;
      if (inserted.length) return json({ ok: true, id, name, author, verified: Boolean(player) }, 201);
    }
    return json({ error: 'Could not create a link. Try again.' }, 500);
  } catch (err) {
    console.error('POST /api/levels', err);
    return json({ error: 'Could not share the level.' }, 500);
  }
}
