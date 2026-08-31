import { access, readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const websiteDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(websiteDirectory, '..', 'dist', 'website');
const htmlFiles = [
  join(outputDirectory, 'index.html'),
  join(outputDirectory, 'privacy', 'index.html'),
  join(outputDirectory, 'support', 'index.html'),
];

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const relativeName = htmlFile.slice(outputDirectory.length + 1);
  const headingCount = (html.match(/<h1\b/g) || []).length;

  check(headingCount === 1, `${relativeName} must contain exactly one h1`);
  check(/<title>[^<]+<\/title>/.test(html), `${relativeName} is missing a title`);
  check(
    /<meta\s+name="description"\s+content="[^"]+"/.test(html),
    `${relativeName} is missing a meta description`,
  );
  check(!/under construction/i.test(html), `${relativeName} contains under-construction copy`);
  check(
    /<meta\s+property="og:title"\s+content="[^"]+"/.test(html),
    `${relativeName} is missing an Open Graph title`,
  );
  check(
    /<meta\s+property="og:description"\s+content="[^"]+"/.test(html),
    `${relativeName} is missing an Open Graph description`,
  );
  check(
    /<meta\s+property="og:url"\s+content="https:\/\/cheridose\.com\/[^"]*"/.test(html),
    `${relativeName} is missing its canonical Open Graph URL`,
  );
  check(
    /<meta\s+property="og:image"\s+content="https:\/\/cheridose\.com\/assets\/social-card\.png"/.test(
      html,
    ),
    `${relativeName} is missing the absolute Open Graph image URL`,
  );
  check(
    /<meta\s+property="og:image:width"\s+content="1200"/.test(html) &&
      /<meta\s+property="og:image:height"\s+content="630"/.test(html),
    `${relativeName} must declare the social image dimensions`,
  );
  check(
    /<meta\s+name="twitter:card"\s+content="summary_large_image"/.test(html) &&
      /<meta\s+name="twitter:title"\s+content="[^"]+"/.test(html) &&
      /<meta\s+name="twitter:description"\s+content="[^"]+"/.test(html) &&
      /<meta\s+name="twitter:image"\s+content="https:\/\/cheridose\.com\/assets\/social-card\.png"/.test(
        html,
      ),
    `${relativeName} is missing complete X/Twitter sharing metadata`,
  );

  const references = html.matchAll(/\b(?:href|src)="([^"]+)"/g);
  for (const [, reference] of references) {
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(reference)) continue;

    const cleanReference = reference.split(/[?#]/, 1)[0];
    let target = reference.startsWith('/')
      ? join(outputDirectory, cleanReference)
      : resolve(dirname(htmlFile), cleanReference);

    if (!extname(target)) target = join(target, 'index.html');

    try {
      await access(target);
    } catch {
      failures.push(`${relativeName} references missing file: ${reference}`);
    }
  }
}

const landingHtml = await readFile(join(outputDirectory, 'index.html'), 'utf8');
const siteScript = await readFile(join(outputDirectory, 'site.js'), 'utf8');

function createConfiguredDocument(configuration) {
  const dom = new JSDOM(landingHtml, {
    runScripts: 'outside-only',
    url: 'https://cheridose.com/',
  });
  dom.window.CHERIDOSE_SITE_CONFIG = configuration;
  dom.window.eval(siteScript);
  return dom;
}

const pendingDom = createConfiguredDocument({
  appStoreUrl: '',
  supportEmail: 'support@cheridose.com',
  legalName: 'Cheridose',
});
for (const link of pendingDom.window.document.querySelectorAll('[data-app-store-link]')) {
  check(link.getAttribute('aria-disabled') === 'true', 'Pending App Store links must be disabled');
  check(link.tabIndex === -1, 'Pending App Store links must be removed from keyboard navigation');
}
pendingDom.window.close();

const publicAppStoreUrl = 'https://apps.apple.com/us/app/cheridose/id1234567890';
const activeDom = createConfiguredDocument({
  appStoreUrl: publicAppStoreUrl,
  supportEmail: 'help@cheridose.com',
  legalName: 'Cheridose LLC',
});
for (const link of activeDom.window.document.querySelectorAll('[data-app-store-link]')) {
  check(link.href === publicAppStoreUrl, 'Configured App Store links must use the public URL');
  check(!link.classList.contains('is-pending'), 'Configured App Store links must become active');
  check(!link.hasAttribute('aria-disabled'), 'Configured App Store links must not remain disabled');
}
for (const link of activeDom.window.document.querySelectorAll('[data-support-email]')) {
  check(link.href === 'mailto:help@cheridose.com', 'Support links must use the configured email');
  check(
    link.textContent === 'help@cheridose.com',
    'Support link text must use the configured email',
  );
}
for (const name of activeDom.window.document.querySelectorAll('[data-legal-name]')) {
  check(
    name.textContent === 'Cheridose LLC',
    'Copyright notices must use the configured legal name',
  );
}
activeDom.window.close();

if (failures.length > 0) {
  console.error(`Website validation failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Cheridose website validation passed.');
}
