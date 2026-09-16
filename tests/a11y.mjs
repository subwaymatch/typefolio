/**
 * axe-core over every page, at desktop and phone width, in light and dark.
 * The bar is zero violations.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { BASE, PAGES, VIEWPORTS, reporter } from './lib.mjs';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const PROFILES = ['desktop', 'mobile'];

const r = reporter('a11y');
const browser = await chromium.launch();

for (const scheme of ['light', 'dark']) {
  for (const name of PROFILES) {
    const ctx = await browser.newContext({ ...VIEWPORTS[name], colorScheme: scheme });

    for (const file of PAGES) {
      const page = await ctx.newPage();
      await page.goto(BASE + file, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      await page.addScriptTag({ content: axeSource });

      const result = await page.evaluate(
        async (tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
        TAGS
      );

      const nodes = result.violations.reduce((n, v) => n + v.nodes.length, 0);
      r.ok(`${scheme}/${name} ${file}: no violations`, nodes === 0);

      for (const v of result.violations) {
        r.note(`   [${v.impact}] ${v.id}: ${v.help}`);
        for (const n of v.nodes.slice(0, 2)) {
          r.note('      ' + n.html.replace(/\s+/g, ' ').slice(0, 140));
        }
      }

      await page.close();
    }

    await ctx.close();
  }
}

await browser.close();
r.finish();
