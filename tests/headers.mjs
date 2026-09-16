/**
 * Proves the Content-Security-Policy in _headers does not break any page.
 *
 * Locally, the policy is parsed out of _headers and applied to every response
 * so the browser enforces it for real; any securitypolicyviolation fails the
 * run. Against a deployed URL (BASE_URL set) it instead checks that the host
 * is actually serving the headers the file declares.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, BASE, PAGES, reporter } from './lib.mjs';

const r = reporter('headers');

/** Minimal parser for the Cloudflare Pages / Netlify _headers format. */
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(':');
      if (i > 0) current.headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

const rules = parseHeaders(fs.readFileSync(path.join(ROOT, '_headers'), 'utf8'));
const global = rules.find((x) => x.pattern === '/*');

r.ok('_headers declares a global rule', Boolean(global));
r.ok('_headers sets a Content-Security-Policy', Boolean(global?.headers['content-security-policy']));
r.ok('_headers sets X-Content-Type-Options', global?.headers['x-content-type-options'] === 'nosniff');
r.ok('_headers sets a Referrer-Policy', Boolean(global?.headers['referrer-policy']));

const csp = global.headers['content-security-policy'];
r.ok('CSP does not need unsafe-inline', !csp.includes('unsafe-inline'));
r.ok('CSP does not need unsafe-eval', !csp.includes('unsafe-eval'));

const browser = await chromium.launch();
const external = Boolean(process.env.BASE_URL);

if (external) {
  /*
    Deployed. Every page must be reachable; whether the declared headers
    arrive depends on the host. GitHub Pages cannot set response headers at
    all, so asserting them there would fail for a reason that is not a bug.
    Set EXPECT_HEADERS=1 on a host that honours _headers (Cloudflare Pages,
    Netlify) to check they are actually served.
  */
  const expectHeaders = process.env.EXPECT_HEADERS === '1';

  for (const file of PAGES) {
    const res = await fetch(BASE + file);
    r.ok(`${file}: served 200`, res.ok);

    if (!expectHeaders) continue;
    for (const [name, value] of Object.entries(global.headers)) {
      r.ok(`${file}: sends ${name}`, res.headers.get(name) === value);
    }
  }

  const font = await fetch(BASE + 'fonts/roboto-slab-latin.woff2');
  r.ok('the web font is reachable', font.ok);

  if (expectHeaders) {
    r.ok('fonts are cached immutably',
         (font.headers.get('cache-control') || '').includes('immutable'));
  } else {
    r.note('EXPECT_HEADERS is not set, so served headers were not asserted.');
  }
} else {
  // Local: enforce the policy in the browser and watch for violations.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await ctx.route(() => true, async (route) => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    if ((headers['content-type'] || '').includes('text/html')) {
      headers['content-security-policy'] = csp;
    }
    await route.fulfill({ response, headers });
  });

  for (const file of PAGES) {
    const page = await ctx.newPage();
    const violations = [];
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__cspViolations.push(`${e.violatedDirective} blocked ${e.blockedURI}`);
      });
    });
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) violations.push(m.text());
    });

    await page.goto(BASE + file, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const reported = await page.evaluate(() => window.__cspViolations || []);
    const all = [...new Set([...violations, ...reported])]
      // The map iframe is allowed by frame-src but its own subresources are
      // governed by OpenStreetMap's policy, not ours.
      .filter((v) => !v.includes('openstreetmap.org'));

    r.ok(`${file}: no CSP violations`, all.length === 0);
    for (const v of all.slice(0, 3)) r.note('   ' + v);

    await page.close();
  }

  await ctx.close();
}

await browser.close();
r.finish();
