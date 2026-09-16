import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devices } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Base URL of the server under test. CI points this at a preview deployment. */
export const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8099').replace(/\/$/, '') + '/';

/** Every page in the template, discovered rather than hard-coded. */
export const PAGES = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort();

export const VIEWPORTS = {
  wide:    { viewport: { width: 1920, height: 1000 } },
  desktop: { viewport: { width: 1440, height: 900 } },
  laptop:  { viewport: { width: 1280, height: 800 } },
  narrow:  { viewport: { width: 1024, height: 800 } },
  tablet:  { ...devices['iPad Mini'] },
  mobile:  { ...devices['iPhone 13'] },
  small:   { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
  tiny:    { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
};

/** Collects pass/fail lines and exits non-zero if anything failed. */
export function reporter(name) {
  const failures = [];
  let passes = 0;

  return {
    ok(label, condition) {
      if (condition) {
        passes++;
      } else {
        failures.push(label);
        console.log('  FAIL  ' + label);
      }
    },
    fail(label) {
      failures.push(label);
      console.log('  FAIL  ' + label);
    },
    note(line) {
      console.log('  ' + line);
    },
    finish() {
      const total = passes + failures.length;
      if (failures.length) {
        console.log(`\n${name}: ${failures.length} of ${total} checks failed`);
        writeSummary(name, failures);
        process.exitCode = 1;
      } else {
        console.log(`\n${name}: all ${total} checks passed`);
        writeSummary(name, []);
      }
      return failures;
    },
  };
}

/** Appends to the GitHub Actions step summary when running in CI. */
function writeSummary(name, failures) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;

  const lines = failures.length
    ? [`### ${name}: ${failures.length} failing`, '', ...failures.map((f) => `- ${f}`), '']
    : [`### ${name}: passing`, ''];

  fs.appendFileSync(file, lines.join('\n') + '\n');
}

/**
 * Walks the page so lazy-loaded images below the fold actually request,
 * then waits for them to decode.
 */
export async function settle(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => Promise.all(
    [...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => {}))
  ));
  await page.waitForTimeout(250);
}
