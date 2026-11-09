/**
 * Interruptores de funciones (Vercel Global Config, servidos por /api/flags).
 * Marca con clases en <html> lo que está apagado, para que el CSS lo oculte,
 * y muestra el aviso del momento si hay uno. Sin API, todo queda activado.
 */
(function () {
  const DEFAULTS = {
    games: { breakout: true, snake: true, pong: true, invaders: true },
    features: { ranking: true, signIn: true, dailyChallenge: true, sharedLevels: true, shareCards: true },
    banner: null,
  };
  const root = document.documentElement;
  let current = DEFAULTS;

  function apply(flags) {
    current = flags;
    for (const [game, on] of Object.entries(flags.games || {})) {
      root.classList.toggle(`ff-off-game-${game}`, on === false);
    }
    for (const [feature, on] of Object.entries(flags.features || {})) {
      root.classList.toggle(`ff-off-${feature}`, on === false);
    }

    const banner = document.getElementById('pp-banner');
    if (banner) {
      if (flags.banner && flags.banner.text) {
        banner.textContent = flags.banner.text;
        banner.dataset.tone = flags.banner.tone || 'info';
        banner.hidden = false;
      } else {
        banner.hidden = true;
      }
    }
  }

  const ready = fetch('api/flags', { headers: { Accept: 'application/json' } })
    .then(async (res) => {
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.includes('application/json')) return DEFAULTS;
      return res.json();
    })
    .catch(() => DEFAULTS)
    .then((flags) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => apply(flags), { once: true });
      } else {
        apply(flags);
      }
      return flags;
    });

  window.PPFlags = {
    ready,
    get: () => current,
    isGameOn: (game) => current.games?.[game] !== false,
    isOn: (feature) => current.features?.[feature] !== false,
  };
})();
