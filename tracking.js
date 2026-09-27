(() => {
  if (window.CHERIDOSE_TRACKING_STARTED) return;
  window.CHERIDOSE_TRACKING_STARTED = true;

  // Remove attribution before any subsequent navigation can share the address.
  const page = new URL(window.location.href);
  const incomingToken = page.searchParams.get('cdv');
  if (page.searchParams.has('cdv')) {
    page.searchParams.delete('cdv');
    window.history.replaceState(window.history.state, '', page.href);
  }

  let origin;
  try {
    const configured = new URL(window.CHERIDOSE_SITE_CONFIG?.trackingOrigin);
    if (configured.protocol !== 'https:' || configured.username || configured.password) return;
    origin = configured.origin;
  } catch {
    return;
  }

  const storageKey = 'cheridose.visit.v1';
  const now = Date.now();
  function tokenExpiry(token) {
    try {
      const encoded = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(encoded));
      return Number.isFinite(payload.iat) ? (payload.iat + 86400) * 1000 : Infinity;
    } catch {
      return Infinity;
    }
  }
  let visit;
  try {
    visit = JSON.parse(window.sessionStorage.getItem(storageKey));
  } catch {
    /* Storage is optional. */
  }
  if (!visit || !Number.isFinite(visit.expiresAt) || visit.expiresAt <= now) visit = null;
  if (visit?.token && tokenExpiry(visit.token) <= now) visit = null;
  if (incomingToken && incomingToken !== visit?.token) visit = null;
  visit ??= {
    token: incomingToken && tokenExpiry(incomingToken) > now ? incomingToken : '',
    visitId: window.crypto.randomUUID(),
    expiresAt: now + 24 * 60 * 60 * 1000,
    recorded: false,
  };
  const save = () => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(visit));
    } catch {
      /* Continue without persistence. */
    }
  };
  save();

  for (const link of document.querySelectorAll('[data-app-store-link], [data-interest-link]')) {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });
  }

  function validUrl(value, kind, tracked) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      if (tracked) {
        if (url.origin !== origin || url.pathname !== `/out/${kind}`) return '';
      } else if (kind === 'app-store' && url.hostname !== 'apps.apple.com') return '';
      return url.href;
    } catch {
      return '';
    }
  }

  function apply(settings, tracked = false) {
    for (const [kind, selector, key] of [
      ['app-store', '[data-app-store-link]', 'appStoreUrl'],
      ['early-access', '[data-interest-link]', 'earlyAccessUrl'],
    ]) {
      const destination = validUrl(settings[key], kind, tracked);
      // An explicit empty setting is an administrator's choice. Malformed or
      // missing values are not a successful configuration update.
      if (!destination && settings[key] !== '') continue;
      document.querySelectorAll(selector).forEach((link, index) => {
        if (!destination) {
          link.removeAttribute('href');
          link.removeAttribute('target');
          link.setAttribute('aria-disabled', 'true');
          link.tabIndex = -1;
          if (kind === 'app-store') {
            link.classList.add('is-pending');
            const kicker = link.querySelector('[data-store-kicker]');
            const name = link.querySelector('[data-store-name]');
            if (kicker && name) {
              kicker.textContent = 'Coming soon to the';
              name.textContent = 'App Store';
            } else link.textContent = 'App Store soon';
          } else link.hidden = true;
          return;
        }
        const url = new URL(destination);
        if (tracked)
          url.searchParams.set(
            'placement',
            link.dataset.trackingPlacement || `${page.pathname}:${kind}:${index + 1}`,
          );
        link.href = url.href;
        link.hidden = false;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
        link.classList.remove('is-pending');
        if (kind === 'app-store') {
          const kicker = link.querySelector('[data-store-kicker]');
          const name = link.querySelector('[data-store-name]');
          if (kicker && name) {
            kicker.textContent = 'Download on the';
            name.textContent = 'App Store';
          } else link.textContent = 'App Store';
        } else {
          const label = link.querySelector('[data-interest-link-label]');
          if (label) label.textContent = 'Join the early-access list';
        }
      });
    }
  }

  async function request(path, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${origin}${path}`, {
        ...options,
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
      });
      if (!response.ok) {
        const error = new Error('Tracking unavailable');
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Refresh destinations each page, including already recorded visits. Dashboard
  // changes take effect without publishing the website again.
  window.CHERIDOSE_TRACKING_READY = (async () => {
    try {
      const settings = await request('/api/config');
      if (visit.recorded && visit.token) {
        const tracked = {};
        for (const [kind, key] of [
          ['app-store', 'appStoreUrl'],
          ['early-access', 'earlyAccessUrl'],
        ]) {
          if (validUrl(settings[key], kind, false)) {
            const url = new URL(`/out/${kind}`, origin);
            url.searchParams.set('v', visit.token);
            tracked[key] = url.href;
          } else if (settings[key] === '') tracked[key] = '';
        }
        apply(tracked, true);
      } else apply(settings);
    } catch {
      /* Keep the working static destinations. */
    }
    if (visit.recorded && visit.token) return;
    const record = () =>
      request('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visit.token ? { token: visit.token } : { visitId: visit.visitId }),
      });
    try {
      let result;
      try {
        result = await record();
      } catch (error) {
        if (error.status !== 400 || !visit.token) throw error;
        // An expired or rejected campaign token must not attribute a new visit
        // to that campaign. Retry once as a fresh organic visit.
        visit = {
          token: '',
          visitId: window.crypto.randomUUID(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          recorded: false,
        };
        save();
        result = await record();
      }
      if (typeof result.token !== 'string' || !result.token) return;
      visit.token = result.token;
      // This decoded value only shortens local retention; the server remains
      // responsible for validating the signature and attribution.
      visit.expiresAt = Math.min(visit.expiresAt, tokenExpiry(result.token));
      visit.recorded = true;
      save();
      apply(result, true);
    } catch {
      /* A failed measurement must not prevent a visitor continuing. */
    }
  })();
})();
