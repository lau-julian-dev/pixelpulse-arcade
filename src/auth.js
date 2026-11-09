/**
 * Inicio de sesión opcional con Clerk (GitHub, Google u otros que se activen en Clerk).
 * Solo se carga si /api/config entrega una clave publicable. Sin ella, por ejemplo
 * en GitHub Pages, el botón no aparece y el arcade funciona en modo invitado.
 */
(function () {
  const box = document.getElementById('auth-box');
  const signInBtn = document.getElementById('btn-signin');
  const userSlot = document.getElementById('auth-user');
  const listeners = new Set();
  let clerk = null;
  let settled = false;
  let settle;
  // Se resuelve cuando se sabe si hay inicio de sesión (Clerk cargado, sin configuración o con error).
  const ready = new Promise((resolve) => {
    settle = () => {
      settled = true;
      resolve();
    };
  });

  /** Mismo criterio que el servidor para el nombre visible en el ranking. */
  function displayName(user) {
    const raw = user.username || [user.firstName, user.lastName].filter(Boolean).join(' ');
    const name = String(raw || '')
      .replace(/[^\p{L}\p{N} _.-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16)
      .trim();
    return name || 'Player';
  }

  const api = {
    ready,
    get settled() {
      return settled;
    },
    get enabled() {
      return Boolean(clerk);
    },
    get user() {
      return clerk?.user || null;
    },
    get name() {
      return clerk?.user ? displayName(clerk.user) : null;
    },
    async getToken() {
      return clerk?.session ? clerk.session.getToken() : null;
    },
    signIn() {
      clerk?.openSignIn();
    },
    onChange(fn) {
      listeners.add(fn);
    },
  };
  window.PPAuth = api;

  function loadScript(src, key) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.dataset.clerkPublishableKey = key;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load Clerk'));
      document.head.appendChild(s);
    });
  }

  async function init() {
    let key = null;
    try {
      const res = await fetch('api/config', { headers: { Accept: 'application/json' } });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.includes('application/json')) return;
      key = (await res.json()).clerkPublishableKey;
    } catch (_) {
      return;
    }
    if (!key) return;

    try {
      // La clave publicable codifica el dominio de la instancia de Clerk.
      const frontendApi = atob(key.split('_')[2]).replace(/\$$/, '');
      // Clerk 6 separa la lógica (clerk-js) de las ventanas visuales (@clerk/ui).
      await Promise.all([
        loadScript(`https://${frontendApi}/npm/@clerk/ui@1/dist/ui.browser.js`, key),
        loadScript(`https://${frontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, key),
      ]);
      clerk = window.Clerk;
      await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
    } catch (err) {
      console.warn('[PixelPulse] Sign-in unavailable:', err);
      clerk = null;
      return;
    }

    let mounted = false;
    const render = () => {
      const signedIn = Boolean(clerk.user);
      signInBtn.hidden = signedIn;
      userSlot.hidden = !signedIn;
      if (signedIn && !mounted) {
        clerk.mountUserButton(userSlot);
        mounted = true;
      } else if (!signedIn && mounted) {
        clerk.unmountUserButton(userSlot);
        mounted = false;
      }
      listeners.forEach((fn) => fn(api));
    };

    clerk.addListener(render);
    box.hidden = false;
    render();
  }

  signInBtn.addEventListener('click', () => api.signIn());
  init().finally(settle);
})();
