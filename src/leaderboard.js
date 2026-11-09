/**
 * Ranking global de PixelPulse.
 * Lee y envía puntajes a /api/scores (Vercel Functions + Neon Postgres).
 * Si la API no existe, por ejemplo en GitHub Pages o al abrir el archivo
 * directamente, el panel se oculta y el arcade funciona igual que antes.
 */
(function () {
  const API = 'api/scores';
  const NAME_KEY = 'pp_player_name';
  const LABELS = {
    breakout: 'Block Breaker',
    snake: 'Cyber Snake',
    pong: 'Pong Arena',
    invaders: 'Space Defender',
  };
  const NOTES = {
    pong: 'Longest rally vs the AI',
  };

  const panel = document.getElementById('leaderboard');
  const list = document.getElementById('lb-list');
  const gameLabel = document.getElementById('lb-game');
  const note = document.getElementById('lb-note');
  const form = document.getElementById('rank-form');
  const nameInput = document.getElementById('rank-name');
  const scoreOut = document.getElementById('rank-score');
  const msg = document.getElementById('rank-msg');
  const submitBtn = document.getElementById('rank-submit');

  let available = true;
  let loadedOnce = false;
  let currentGame = 'breakout';
  let pending = null;
  let requestId = 0;

  try {
    nameInput.value = localStorage.getItem(NAME_KEY) || '';
  } catch (_) {
    /* almacenamiento no disponible */
  }

  function setMessage(text, tone) {
    msg.textContent = text;
    msg.dataset.tone = tone || '';
  }

  function emptyRow(text) {
    list.replaceChildren();
    const li = document.createElement('li');
    li.className = 'lb-empty';
    li.textContent = text;
    list.appendChild(li);
  }

  function render(scores, highlightName) {
    if (!scores.length) {
      emptyRow('No scores yet. Be the first!');
      return;
    }
    list.replaceChildren(
      ...scores.map((row, i) => {
        const li = document.createElement('li');
        li.className = 'lb-row';
        if (highlightName && row.name === highlightName) li.classList.add('is-me');

        const pos = document.createElement('span');
        pos.className = 'lb-pos';
        pos.textContent = String(i + 1).padStart(2, '0');

        const name = document.createElement('span');
        name.className = 'lb-name';
        name.textContent = row.name;

        const score = document.createElement('span');
        score.className = 'lb-score';
        score.textContent = Number(row.score).toLocaleString();

        li.append(pos, name, score);
        return li;
      })
    );
  }

  async function load(game, highlightName) {
    currentGame = game;
    gameLabel.textContent = LABELS[game] || game;
    note.textContent = NOTES[game] || 'Best score per player';
    if (!available) return;

    const id = ++requestId;
    if (!loadedOnce) emptyRow('Loading…');

    try {
      const res = await fetch(`${API}?game=${encodeURIComponent(game)}&limit=10`, {
        headers: { Accept: 'application/json' },
      });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.includes('application/json')) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (id !== requestId) return;
      loadedOnce = true;
      render(data.scores || [], highlightName);
    } catch (_) {
      if (id !== requestId) return;
      if (!loadedOnce) {
        // Sin API: el arcade sigue funcionando sin ranking.
        available = false;
        panel.hidden = true;
        form.hidden = true;
        return;
      }
      emptyRow('Could not load the ranking.');
    }
  }

  function offer(game, score) {
    if (!available || !Number.isInteger(score) || score < 1) {
      hideOffer();
      return;
    }
    pending = { game, score };
    scoreOut.textContent = score.toLocaleString();
    submitBtn.disabled = false;
    nameInput.disabled = false;
    setMessage('');
    form.hidden = false;
  }

  function hideOffer() {
    pending = null;
    form.hidden = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pending) return;

    const name = nameInput.value.trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{N} _.-]{1,16}$/u.test(name)) {
      setMessage('Use 1 to 16 letters, numbers, spaces, dots, dashes or underscores.', 'error');
      nameInput.focus();
      return;
    }

    submitBtn.disabled = true;
    setMessage('Sending…');

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ game: pending.game, name, score: pending.score }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Could not save your score.', 'error');
        submitBtn.disabled = false;
        return;
      }
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch (_) {
        /* almacenamiento no disponible */
      }
      setMessage(`Saved! This score ranks #${data.rank}.`, 'ok');
      nameInput.disabled = true;
      const game = pending.game;
      pending = null;
      if (game === currentGame) load(game, name);
    } catch (_) {
      setMessage('Connection error. Try again.', 'error');
      submitBtn.disabled = false;
    }
  });

  window.PPLeaderboard = { show: load, offer, hideOffer };
})();
