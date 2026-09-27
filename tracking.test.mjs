import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const [html, site, tracking] = await Promise.all(
  ['index.html', 'site.js', 'tracking.js'].map((p) =>
    readFile(new URL(p, import.meta.url), 'utf8'),
  ),
);
const origin = 'https://tracking.example.com';
const store = 'https://apps.apple.com/us/app/example/id1234';
const early = 'https://forms.example.com/join';
function browser({
  url = 'https://cheridose.com/',
  saved,
  denied = false,
  fail = false,
  settings = { appStoreUrl: store, earlyAccessUrl: early },
  incoming = 'signed-visit',
  rejectToken = false,
  configuration = {},
} = {}) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const w = dom.window;
  w.CHERIDOSE_SITE_CONFIG = {
    trackingOrigin: origin,
    appStoreUrl: '',
    interestFormUrl: early,
    ...configuration,
  };
  if (saved) w.sessionStorage.setItem('cheridose.visit.v1', saved);
  if (denied)
    Object.defineProperty(w, 'sessionStorage', {
      get() {
        throw new Error('denied');
      },
    });
  const calls = [];
  w.fetch = async (url, options) => {
    calls.push({ url, options });
    if (fail) throw new Error('offline');
    if (rejectToken && options.body && JSON.parse(options.body).token)
      return { ok: false, status: 400 };
    return {
      ok: true,
      json: async () =>
        url.endsWith('/api/config')
          ? settings
          : {
              token: incoming,
              appStoreUrl:
                settings.appStoreUrl === '' ? '' : `${origin}/out/app-store?v=${incoming}`,
              earlyAccessUrl:
                settings.earlyAccessUrl === '' ? '' : `${origin}/out/early-access?v=${incoming}`,
            },
    };
  };
  w.eval(site);
  w.eval(tracking);
  return { dom, w, calls };
}

test('campaign attribution is cleaned immediately, persisted, and not recorded on every page', async () => {
  const { w, calls } = browser({
    url: 'https://cheridose.com/?cdv=campaign-token&utm_source=facebook#story',
  });
  assert.equal(w.location.search, '?utm_source=facebook');
  assert.equal(w.location.hash, '#story');
  await w.CHERIDOSE_TRACKING_READY;
  assert.deepEqual(JSON.parse(calls[1].options.body), { token: 'campaign-token' });
  assert.equal(calls[1].options.referrerPolicy, 'no-referrer');
  const saved = w.sessionStorage.getItem('cheridose.visit.v1');
  w.eval(tracking);
  assert.equal(calls.length, 2);
  const next = browser({ url: 'https://cheridose.com/privacy/', saved });
  await next.w.CHERIDOSE_TRACKING_READY;
  assert.equal(next.calls.length, 1);
  const link = next.w.document.querySelector('[data-app-store-link]');
  assert.equal(new URL(link.href).searchParams.get('v'), 'signed-visit');
  w.close();
  next.w.close();
});

test('explicitly cleared settings disable static App Store and hide early-access links', async () => {
  for (const saved of [
    undefined,
    JSON.stringify({ token: 'retained', expiresAt: Date.now() + 60000, recorded: true }),
  ]) {
    const { w } = browser({
      saved,
      configuration: { appStoreUrl: store },
      settings: { appStoreUrl: '', earlyAccessUrl: '' },
    });
    await w.CHERIDOSE_TRACKING_READY;
    const app = w.document.querySelector('[data-app-store-link]');
    assert.equal(app.hasAttribute('href'), false);
    assert.equal(app.getAttribute('aria-disabled'), 'true');
    assert.equal(app.dispatchEvent(new w.Event('click', { cancelable: true })), false);
    assert.equal(w.document.querySelector('[data-interest-link]').hidden, true);
    assert.equal(w.document.querySelector('[data-interest-link]').hasAttribute('href'), false);
    w.close();
  }
});

test('rejected campaign token recovers once as organic without campaign attribution', async () => {
  const { w, calls } = browser({
    url: 'https://cheridose.com/?cdv=expired-campaign',
    rejectToken: true,
  });
  await w.CHERIDOSE_TRACKING_READY;
  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(calls[1].options.body), { token: 'expired-campaign' });
  const retry = JSON.parse(calls[2].options.body);
  assert.ok(retry.visitId);
  assert.equal(retry.token, undefined);
  assert.equal(JSON.parse(w.sessionStorage.getItem('cheridose.visit.v1')).token, 'signed-visit');
  w.close();
});

test('dynamic destinations activate pending buttons, including their click handler', async () => {
  const { w } = browser();
  await w.CHERIDOSE_TRACKING_READY;
  for (const link of w.document.querySelectorAll('[data-app-store-link]')) {
    assert.equal(link.hasAttribute('aria-disabled'), false);
    assert.equal(link.classList.contains('is-pending'), false);
    assert.equal(link.hasAttribute('tabindex'), false);
    assert.equal(link.dispatchEvent(new w.Event('click', { cancelable: true })), true);
    assert.equal(new URL(link.href).pathname, '/out/app-store');
  }
  w.close();
});

test('offline tracking preserves static form fallback and pending app store', async () => {
  const { w } = browser({ fail: true });
  await w.CHERIDOSE_TRACKING_READY;
  assert.equal(w.document.querySelector('[data-interest-link]').href, early);
  const pending = w.document.querySelector('[data-app-store-link]');
  assert.equal(pending.getAttribute('aria-disabled'), 'true');
  assert.equal(pending.dispatchEvent(new w.Event('click', { cancelable: true })), false);
  w.close();
});

test('storage denied still records organic visit and enables destinations', async () => {
  const { w, calls } = browser({ denied: true });
  await w.CHERIDOSE_TRACKING_READY;
  assert.match(JSON.parse(calls[1].options.body).visitId, /^[a-f0-9-]{36}$/);
  assert.equal(
    w.document.querySelector('[data-app-store-link]').hasAttribute('aria-disabled'),
    false,
  );
  w.close();
});

test('expired visits receive a new organic identifier', async () => {
  const { w, calls } = browser({
    saved: JSON.stringify({ token: 'expired', expiresAt: Date.now() - 1, recorded: true }),
  });
  await w.CHERIDOSE_TRACKING_READY;
  assert.ok(JSON.parse(calls[1].options.body).visitId);
  assert.equal(JSON.parse(calls[1].options.body).token, undefined);
  w.close();
});

test('signed expiry overrides a later browser receipt expiry', async () => {
  const token =
    Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000) - 86401 })).toString(
      'base64url',
    ) + '.signature';
  const { w, calls } = browser({
    saved: JSON.stringify({ token, expiresAt: Date.now() + 60000, recorded: true }),
  });
  await w.CHERIDOSE_TRACKING_READY;
  assert.ok(JSON.parse(calls[1].options.body).visitId);
  assert.equal(JSON.parse(calls[1].options.body).token, undefined);
  w.close();
});

test('untrusted App Store destinations are rejected on a retained visit', async () => {
  const { w } = browser({
    saved: JSON.stringify({ token: 'retained', expiresAt: Date.now() + 60000, recorded: true }),
    settings: {
      appStoreUrl: 'https://apps.apple.com.evil.example/x',
      earlyAccessUrl: 'javascript:alert(1)',
    },
  });
  await w.CHERIDOSE_TRACKING_READY;
  assert.equal(
    w.document.querySelector('[data-app-store-link]').getAttribute('aria-disabled'),
    'true',
  );
  assert.equal(w.document.querySelector('[data-interest-link]').href, early);
  w.close();
});
