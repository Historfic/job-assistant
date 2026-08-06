import { describe, it, expect, beforeEach } from 'vitest';

const TEST_KEY = 'a'.repeat(64); // 32 bytes hex

describe('crypto round-trip', () => {
  beforeEach(() => { process.env.OJ_SESSION_ENCRYPTION_KEY = TEST_KEY; });

  it('encrypts and decrypts a session string', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/crypto');
    const secret = 'ci_session_value_12345';
    const encoded = encryptSecret(secret);
    expect(encoded).not.toContain(secret);
    expect(decryptSecret(encoded)).toBe(secret);
  });

  it('produces different ciphertexts for the same input (random IV)', async () => {
    const { encryptSecret } = await import('@/lib/crypto');
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('throws on tampered ciphertext', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/crypto');
    const encoded = encryptSecret('secret');
    const parts = encoded.split('.');
    parts[2] = Buffer.from('tampered-data-here').toString('base64');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });

  it('throws a readable error when the key is missing', async () => {
    delete process.env.OJ_SESSION_ENCRYPTION_KEY;
    const { encryptSecret } = await import('@/lib/crypto');
    expect(() => encryptSecret('x')).toThrow(/OJ_SESSION_ENCRYPTION_KEY/);
  });
});
