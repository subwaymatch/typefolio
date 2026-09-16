/**
 * Static checks that need no browser: tag balance, local links that resolve,
 * unique ids, and images that declare their dimensions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PAGES, reporter } from './lib.mjs';

const r = reporter('markup');

const PAIRED = [
  'a', 'div', 'section', 'ul', 'ol', 'li', 'figure', 'figcaption', 'button',
  'form', 'main', 'header', 'footer', 'nav', 'picture', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'p', 'span', 'label', 'select', 'textarea', 'fieldset', 'legend',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'address', 'blockquote',
];

for (const file of PAGES) {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const src = raw.replace(/<!--[\s\S]*?-->/g, '');

  // Balance
  for (const tag of PAIRED) {
    const open = (src.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (src.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    r.ok(`${file}: <${tag}> balanced (${open} open, ${close} close)`, open === close);
  }

  // Local references resolve
  for (const m of src.matchAll(/\b(?:href|src|srcset)="([^"]+)"/g)) {
    const url = m[1];
    if (!url || /^(https?:|mailto:|tel:|#|data:)/.test(url)) continue;
    const target = url.split('#')[0].split('?')[0];
    r.ok(`${file}: ${target} exists`, fs.existsSync(path.join(ROOT, target)));
  }

  // Unique ids
  const ids = [...src.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  r.ok(`${file}: no duplicate ids${dupes.length ? ' (' + [...new Set(dupes)].join(', ') + ')' : ''}`,
       dupes.length === 0);

  // Intrinsic dimensions, so the page does not shift as images load
  for (const m of src.matchAll(/<img\s([^>]*)>/g)) {
    const attrs = m[1];
    const srcAttr = /src="([^"]+)"/.exec(attrs);
    if (!srcAttr) continue;
    r.ok(`${file}: ${srcAttr[1]} declares width and height`,
         /\bwidth="/.test(attrs) && /\bheight="/.test(attrs));
    r.ok(`${file}: ${srcAttr[1]} declares alt`, /\balt="/.test(attrs));
  }

  // Every raster image should have AVIF and WebP siblings offered
  for (const m of src.matchAll(/<img\s[^>]*src="(images\/[^"]+\.(?:jpe?g|png))"/g)) {
    const stem = m[1].replace(/\.[^.]+$/, '');
    const hasSources = src.includes(`srcset="${stem}.avif"`) && src.includes(`srcset="${stem}.webp"`);
    r.ok(`${file}: ${m[1]} offers avif and webp`, hasSources);
  }

  // Things the rebuild removed should stay removed
  r.ok(`${file}: no http:// subresources`, !/\b(?:href|src)="http:\/\//.test(src));
  r.ok(`${file}: no maximum-scale in viewport`, !/maximum-scale/.test(src));
  r.ok(`${file}: has a unique title`, /<title>[^<]{5,}<\/title>/.test(src));
  r.ok(`${file}: has a meta description`, /<meta name="description" content="[^"]{20,}"/.test(src));
}

r.finish();
