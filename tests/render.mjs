/**
 * Loads every page at eight widths in both themes and fails on console
 * errors, failed requests, or anything that pushes the page sideways.
 */
import { chromium } from 'playwright';
import { BASE, PAGES, VIEWPORTS, reporter } from './lib.mjs';

const r = reporter('render');
const browser = await chromium.launch();

for (const scheme of ['light', 'dark']) {
  for (const [name, profile] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ ...profile, colorScheme: scheme });

    for (const file of PAGES) {
      const page = await ctx.newPage();
      const problems = [];

      page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
      page.on('pageerror', (e) => problems.push('uncaught: ' + e.message));
      page.on('requestfailed', (req) => {
        // The map iframe is third-party; a network blip there is not our bug.
        if (req.url().includes('openstreetmap.org')) return;
        problems.push('request failed: ' + req.url().slice(0, 90));
      });
      page.on('response', (res) => {
        if (res.status() >= 400 && !res.url().includes('openstreetmap.org')) {
          problems.push(`HTTP ${res.status()}: ${res.url().slice(0, 90)}`);
        }
      });

      const fonts = [];
      page.on('response', (res) => {
        if (res.url().endsWith('.woff2')) fonts.push(res.url().split('/').pop());
      });

      try {
        await page.goto(BASE + file, { waitUntil: 'load', timeout: 30000 });
      } catch (e) {
        problems.push('navigation: ' + e.message.split('\n')[0]);
      }
      await page.waitForTimeout(300);

      const layout = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        const overflowing = [...document.querySelectorAll('body *')]
          // Horizontal scrollers and offscreen helpers are meant to exceed it.
          .filter((el) => !el.closest('[data-slider-track], .slider-thumbs, .honeypot, .skip-link, .visually-hidden'))
          .filter((el) => {
            const box = el.getBoundingClientRect();
            return box.width > 0 && (box.right > limit + 1 || box.left < -1);
          })
          .slice(0, 3)
          .map((el) => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40));

        return {
          hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
          overflowing,
        };
      });

      if (layout.hScroll) problems.push('page scrolls horizontally');
      if (layout.overflowing.length) problems.push('overflowing: ' + layout.overflowing.join(', '));

      /*
        A page that downloads a web font and never draws a glyph with it has
        spent 33 KB of someone's bandwidth for nothing. That is what a blanket
        <link rel="preload"> on every page does, and nothing else in this suite
        would notice: it is not an error, just waste.
      */
      if (fonts.length) {
        const drawn = await page.evaluate(() =>
          [...document.fonts].some((f) => f.status === 'loaded'));
        if (!drawn) {
          problems.push(`downloaded ${fonts.join(', ')} but rendered no glyph with it`);
        }
      }

      r.ok(`${scheme}/${name} ${file}`, problems.length === 0);
      for (const p of [...new Set(problems)].slice(0, 5)) r.note('   ' + p);

      await page.close();
    }

    await ctx.close();
  }
}

await browser.close();
r.finish();
