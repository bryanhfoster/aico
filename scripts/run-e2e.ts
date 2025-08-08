import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execa } from 'execa';

async function main() {
  const portsFile = join(process.cwd(), '.dev-ports.json');
  const conf = JSON.parse(readFileSync(portsFile, 'utf8')) as { baseURL: string };
  const env = { ...process.env, E2E_BASE_URL: conf.baseURL };
  console.log(`[e2e] baseURL: ${conf.baseURL}`);
  // wait for client with progress
  const ok = await waitReady(conf.baseURL, 80, 250);
  if (!ok) throw new Error('Client not ready');
  console.log('[e2e] client ready, starting Playwright...');
  const pw = await execa('npx', ['playwright', 'test', '--reporter=line', '--workers=1'], { stdio: 'inherit', env });
  process.exit(pw.exitCode ?? 0);
}

async function waitReady(base: string, tries = 80, delayMs = 250): Promise<boolean> {
  const target = new URL(base);
  target.pathname = '/';
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(target, { method: 'GET' });
      if (res.ok) return true;
    } catch {}
    if (i % 8 === 0) console.log(`[e2e] waiting for client at ${target.href} (attempt ${i + 1}/${tries})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

main().catch((err) => {
  console.error('Failed to run e2e:', err);
  process.exit(1);
});


