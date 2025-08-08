import { readFileSync } from 'node:fs';
import { createDecipheriv, scryptSync } from 'node:crypto';

// Usage: npm run env:load -- path/to/.env.enc command [args...]
const [, , inputPathArg, ...cmdAndArgs] = process.argv;
if (!inputPathArg || cmdAndArgs.length === 0) {
  console.error('Usage: env:load <input.enc> <command> [args...]');
  process.exit(1);
}

const pass = process.env.SECRETS_PASSPHRASE || process.env.SECRETS_KEY;
if (!pass) {
  console.error('Missing SECRETS_PASSPHRASE or SECRETS_KEY in environment');
  process.exit(1);
}

const blob = readFileSync(inputPathArg, 'utf8');
const buf = Buffer.from(blob, 'base64');
const magic = buf.subarray(0, 4).toString('utf8');
if (magic !== 'ENV1') {
  console.error('Invalid env blob format');
  process.exit(1);
}
const salt = buf.subarray(4, 20);
const iv = buf.subarray(20, 32);
const tag = buf.subarray(32, 48);
const ciphertext = buf.subarray(48);

const key = scryptSync(pass, salt, 32);
const decipher = createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(tag);
const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

// inject into process.env
for (const line of plain.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const k = line.slice(0, idx).trim();
  const v = line.slice(idx + 1).trim();
  if (k) process.env[k] = v;
}

// exec command with env
const { execa } = await import('execa');
const [cmd, ...args] = cmdAndArgs;
const child = execa(cmd, args, { stdio: 'inherit', env: process.env });
const { exitCode } = await child;
process.exit(exitCode ?? 0);


