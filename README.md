# Cheridose Website

This folder is a self-contained static website for `cheridose.com`. It is intentionally separate
from the Angular/Capacitor medication app in `src/`.

## Contents

- `index.html`: landing page
- `privacy/index.html`: public Privacy Policy
- `support/index.html`: public support page
- `styles.css`: shared responsive design system
- `site-config.js`: App Store and support contact configuration
- `site.js`: small configuration and copyright-year helper
- `assets/`: website-owned Cheridose brand assets
- `build.mjs`: builds the deployable site and generated image assets

## Build

From this directory:

```bash
npm install
npm test
```

The deployable output is generated in `dist/`. The test command rebuilds the site, verifies
internal assets and links, checks required page and social-sharing metadata, and exercises both
pending and configured App Store states.

## Configure before publishing

Edit `site-config.js` and set:

- `appStoreUrl` to the public `https://apps.apple.com/...` Cheridose product URL;
- `supportEmail` to a monitored public inbox; and
- `legalName` to the business or owner name used in the public copyright notice.

When `appStoreUrl` is empty, the site deliberately shows a non-clickable “Coming soon to the App
Store” state instead of a dead or private App Store link.

## Local preview

Run:

```bash
npm run preview
```

The preview opens at `http://127.0.0.1:4300`. The published site uses only relative asset paths and
does not need a framework runtime, server API, cookies, or analytics.

## Publishing

Pushes to `main` are built, validated, and deployed to GitHub Pages by
`.github/workflows/deploy-pages.yml`.
