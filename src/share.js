/**
 * Niveles compartidos del editor de Block Breaker.
 * Publica la cuadrícula en /api/levels y genera un link play.html?level=CODIGO.
 * Sin API (GitHub Pages) la sección de compartir queda oculta.
 */
(function () {
  const box = document.getElementById('share-box');
  const nameInput = document.getElementById('share-name');
  const shareBtn = document.getElementById('btn-share-level');
  const result = document.getElementById('share-result');
  const urlInput = document.getElementById('share-url');
  const copyBtn = document.getElementById('btn-copy-share');
  const msg = document.getElementById('share-msg');
  let getGrid = null;

  function setMessage(text, tone) {
    msg.textContent = text;
    msg.dataset.tone = tone || '';
  }

  async function apiAvailable() {
    try {
      const res = await fetch('api/config', { headers: { Accept: 'application/json' } });
      return res.ok && (res.headers.get('content-type') || '').includes('application/json');
    } catch (_) {
      return false;
    }
  }

  async function share() {
    const grid = getGrid ? getGrid() : null;
    const name = nameInput.value.trim().replace(/\s+/g, ' ');
    if (!name) {
      setMessage('Give your level a name first.', 'error');
      nameInput.focus();
      return;
    }

    shareBtn.disabled = true;
    result.hidden = true;
    setMessage('Creating link…');

    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    try {
      const token = await window.PPAuth?.getToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (_) {
      /* sin sesión: se comparte como invitado */
    }

    let author;
    try {
      author = localStorage.getItem('pp_player_name') || undefined;
    } catch (_) {
      author = undefined;
    }

    try {
      const res = await fetch('api/levels', {
        method: 'POST',
        headers,
        body: JSON.stringify({ grid, name, author }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Could not share the level.', 'error');
        return;
      }
      const url = new URL('play.html', window.location.href);
      url.search = `?level=${encodeURIComponent(data.id)}`;
      urlInput.value = url.href;
      result.hidden = false;
      setMessage(`Link ready! Anyone can play “${data.name}” by ${data.author}.`, 'ok');
      urlInput.focus();
      urlInput.select();
    } catch (_) {
      setMessage('Connection error. Try again.', 'error');
    } finally {
      shareBtn.disabled = false;
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(urlInput.value);
      copyBtn.textContent = 'Copied!';
    } catch (_) {
      urlInput.select();
      copyBtn.textContent = 'Press Ctrl+C';
    }
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 1600);
  }

  /** Lee ?level=CODIGO de la URL y devuelve el nivel, { error } o null. */
  async function loadFromUrl() {
    const id = new URLSearchParams(window.location.search).get('level');
    if (!id) return null;
    try {
      const res = await fetch(`api/levels?id=${encodeURIComponent(id)}`, {
        headers: { Accept: 'application/json' },
      });
      const type = res.headers.get('content-type') || '';
      if (!type.includes('application/json')) {
        return { error: 'Shared levels only work on the Vercel version of PixelPulse.' };
      }
      const data = await res.json();
      return res.ok ? data : { error: data.error || 'Could not load the shared level.' };
    } catch (_) {
      return { error: 'Could not load the shared level.' };
    }
  }

  shareBtn.addEventListener('click', share);
  copyBtn.addEventListener('click', copyLink);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      share();
    }
  });

  window.PPShare = {
    async init(gridGetter) {
      getGrid = gridGetter;
      if (await apiAvailable()) box.hidden = false;
    },
    loadFromUrl,
  };
})();
