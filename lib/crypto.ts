// ─── Secret encryption (AES-256-GCM) ─────────────────────────────────────────
// Used for OnlineJobs.ph session tokens at rest. Encoded form:
// base64(iv).base64(authTag).base64(ciphertext)

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getKey(): Buffer {
  const hex = process.env.OJ_SESSION_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'OJ_SESSION_ENCRYPTION_KEY must be 64 hex chars (32 bytes). ' +
      'Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    enc.toString('base64'),
  ].join('.');
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split('.');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
