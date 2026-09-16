/**
 * Runs every check in turn.
 *
 * Starts a static server unless BASE_URL is already pointing somewhere, which
 * is how CI aims these at a Cloudflare Pages preview deployment instead.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { ROOT, BASE } from './lib.mjs';

const SUITES = ['markup', 'headers', 'a11y', 'behavior', 'render'];
const external = Boolean(process.env.BASE_URL);
let server;

if (!external) {
  server = spawn('npx', ['--yes', 'http-server', '-p', '8099', '-c-1', '--silent'],
                 { cwd: ROOT, stdio: 'ignore' });
  await waitForServer();
}

console.log(`Testing ${BASE}\n`);

const failed = [];
for (const suite of SUITES) {
  console.log(`\n=== ${suite} ===`);
  const child = spawn(process.execPath, [`tests/${suite}.mjs`], { cwd: ROOT, stdio: 'inherit' });
  const [code] = await once(child, 'exit');
  if (code !== 0) failed.push(suite);
}

server?.kill();

if (failed.length) {
  console.log(`\nFAILED: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE + 'index.html');
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('static server did not come up on ' + BASE);
}
