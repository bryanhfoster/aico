import { readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { join } from 'node:path';

// Usage: npm run env:encrypt -- path/to/.env output.enc
const [, , inputPathArg, outputPathArg] = process.argv;
if (!inputPathArg || !outputPathArg) {
  console.error('Usage: env:encrypt <input .env> <output.enc>');
  process.exit(1);
}

const pass = process.env.SECRETS_PASSPHRASE || process.env.SECRETS_KEY;
if (!pass) {
  console.error('Missing SECRETS_PASSPHRASE or SECRETS_KEY in environment');
  process.exit(1);
}

const input = readFileSync(inputPathArg, 'utf8');
const salt = randomBytes(16);
const key = scryptSync(pass, salt, 32);
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const plaintext = Buffer.from(input, 'utf8');
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();

const payload = Buffer.concat([Buffer.from('ENV1'), salt, iv, tag, ciphertext]).toString('base64');
writeFileSync(outputPathArg, payload, 'utf8');
console.log(`Wrote encrypted env to ${outputPathArg}`);


