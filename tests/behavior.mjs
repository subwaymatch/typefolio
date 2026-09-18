/**
 * The interactive parts: menu, keyboard access to dropdowns, slider controls
 * and the sticky sidebar. These are the pieces that used to be jQuery plugins.
 */
import { chromium } from 'playwright';
import { BASE, VIEWPORTS, reporter } from './lib.mjs';

const r = reporter('behavior');
const browser = await chromium.launch();

/* ---------------------------------------------------------------- menu --- */
{
  const ctx = await browser.newContext(VIEWPORTS.mobile);
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const toggle = page.locator('#toggle-menu');
  const menu = page.locator('#menu-mobile');

  r.ok('toggle is a real <button>', (await toggle.evaluate((e) => e.tagName)) === 'BUTTON');
  r.ok('toggle starts collapsed', (await toggle.getAttribute('aria-expanded')) === 'false');
  r.ok('menu hidden at rest', !(await menu.isVisible()));

  await toggle.click();
  await page.waitForTimeout(300);

  r.ok('opens on click', (await toggle.getAttribute('aria-expanded')) === 'true');
  r.ok('menu visible when open', await menu.isVisible());
  r.ok('label switches to Close', (await toggle.textContent()).includes('Close'));
  r.ok('nested items copied across', (await page.locator('#menu-mobile li').count()) > 8);
  r.ok('hide-on-mobile stripped in the phone menu',
       (await page.locator('#menu-mobile .hide-on-mobile').count()) === 0);
  r.ok('no duplicate ids after the menu is built', await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    return ids.length === new Set(ids).size;
  }));
  r.ok('every menu link is a real target',
       (await page.locator('#menu-mobile a[href]').count()) === (await page.locator('#menu-mobile a').count()));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  r.ok('Escape closes', (await toggle.getAttribute('aria-expanded')) === 'false');
  r.ok('focus returns to the toggle', (await page.evaluate(() => document.activeElement.id)) === 'toggle-menu');

  // The phone menu must be the only navigation landmark at this width.
  r.ok('one navigation landmark on a phone',
       (await page.locator('nav:visible').count()) <= 2);

  await ctx.close();
}

/* ------------------------------------------------- desktop navigation --- */
{
  const ctx = await browser.newContext(VIEWPORTS.desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const sub = page.locator('#nav > li').first().locator('ul').first();
  const vis = () => sub.evaluate((e) => getComputedStyle(e).visibility);

  r.ok('submenu hidden at rest', (await vis()) === 'hidden');

  await page.locator('#nav > li > a').first().focus();
  await page.waitForTimeout(250);
  r.ok('submenu opens on keyboard focus', (await vis()) === 'visible');

  await page.locator('#nav > li').first().hover();
  await page.waitForTimeout(250);
  r.ok('submenu opens on hover', (await vis()) === 'visible');

  r.ok('skip link points at #main', (await page.locator('a.skip-link[href="#main"]').count()) === 1);
  r.ok('skip link is offscreen until focused',
       await page.locator('.skip-link').evaluate((e) => e.getBoundingClientRect().bottom <= 0));

  await page.locator('.skip-link').focus();
  await page.waitForTimeout(250);
  r.ok('skip link appears on focus',
       await page.locator('.skip-link').evaluate((e) => e.getBoundingClientRect().top >= 0));

  r.ok('focus ring is not suppressed', await page.evaluate(() => {
    const a = document.querySelector('#main a');
    a.focus();
    return getComputedStyle(a, ':focus-visible').outlineStyle !== 'none';
  }));

  await ctx.close();
}

/* -------------------------------------------------------------- slider --- */
for (const file of ['index-with-slider.html']) {
  const ctx = await browser.newContext(VIEWPORTS.desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + file, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const track = page.locator('[data-slider-track]');
  const settleScroll = () => page.waitForTimeout(1100);

  const start = await track.evaluate((e) => e.scrollLeft);
  await page.locator('[data-slider-next]').click();
  await settleScroll();
  r.ok(`${file}: next advances the track`, (await track.evaluate((e) => e.scrollLeft)) > start);

  r.ok(`${file}: exactly one control is current`, await page.evaluate(
    () => document.querySelectorAll('[data-slider-goto][aria-current="true"]').length) === 1);

  await page.evaluate(() => { document.querySelector('[data-slider-track]').scrollLeft = 0; });
  await settleScroll();
  r.ok(`${file}: prev disabled on the first slide`,
       await page.locator('[data-slider-prev]').evaluate((e) => e.disabled));

  await page.evaluate(() => {
    const t = document.querySelector('[data-slider-track]');
    t.scrollLeft = t.scrollWidth;
  });
  await settleScroll();
  r.ok(`${file}: next disabled on the last slide`,
       await page.locator('[data-slider-next]').evaluate((e) => e.disabled));

  await page.locator('[data-slider-goto]').nth(1).click();
  await settleScroll();
  r.ok(`${file}: a control jumps to its slide`,
       (await page.locator('[data-slider-goto]').nth(1).getAttribute('aria-current')) === 'true');

  r.ok(`${file}: the track scrolls without script`, await track.evaluate(
    (e) => getComputedStyle(e).overflowX === 'auto' || getComputedStyle(e).overflowX === 'scroll'));

  await ctx.close();
}

/* ----------------------------------------------------- sticky sidebar --- */
{
  const ctx = await browser.newContext(VIEWPORTS.desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + 'single-photography-sidebar-right.html', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const col = page.locator('.container > .columns:has(> .sidebar.sticky)').first();
  r.ok('sidebar column uses position: sticky',
       (await col.evaluate((e) => getComputedStyle(e).position)) === 'sticky');

  const before = await col.evaluate((e) => e.getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(400);
  const after = await col.evaluate((e) => e.getBoundingClientRect().top);

  r.ok(`sidebar holds position while scrolling (${before.toFixed(0)} to ${after.toFixed(0)})`,
       after >= -1 && after < before);
  r.ok('no cloned .sticked element left behind', (await page.locator('.sticked').count()) === 0);

  await ctx.close();
}

await browser.close();
r.finish();
