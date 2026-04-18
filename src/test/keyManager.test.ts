/**
 * Tests for src/lib/ai/keyManager.ts — THI-110.
 *
 * Covers plain + encrypted round-trip, migration between modes, isEncrypted/hasKey,
 * forgetKey, detectProvider, and defensive throws (invalid provider, empty key,
 * encrypt without passphrase, wrong passphrase → null).
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  detectProvider,
  forgetKey,
  getKey,
  hasKey,
  isEncrypted,
  saveKey,
  type Provider,
} from '@/lib/ai/keyManager';

const DB_NAME = 'ai_keys_encrypted';

function resetIdb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    const done = () => resolve();
    req.onsuccess = done;
    req.onerror = done;
    req.onblocked = done;
  });
}

beforeEach(async () => {
  localStorage.clear();
  await resetIdb();
});

describe('detectProvider', () => {
  it('detects OpenRouter', () => {
    expect(detectProvider('sk-or-v1-abc123')).toBe('openrouter');
  });

  it('detects Anthropic', () => {
    expect(detectProvider('sk-ant-api03-abc')).toBe('anthropic');
  });

  it('detects OpenAI (sk- without narrower prefix)', () => {
    expect(detectProvider('sk-proj-abc123')).toBe('openai');
  });

  it('detects Gemini', () => {
    expect(detectProvider('AIzaSyABC123')).toBe('gemini');
  });

  it('returns null for unknown prefix', () => {
    expect(detectProvider('unknown-key')).toBeNull();
  });

  it('trims surrounding whitespace before matching', () => {
    expect(detectProvider('   sk-or-v1-abc   ')).toBe('openrouter');
  });

  it('returns null for non-string input', () => {
    expect(detectProvider(null as unknown as string)).toBeNull();
    expect(detectProvider(undefined as unknown as string)).toBeNull();
    expect(detectProvider(42 as unknown as string)).toBeNull();
  });
});

describe('saveKey / getKey — plain mode', () => {
  it('round-trips a plain key', async () => {
    await saveKey('openrouter', 'sk-or-v1-test');
    expect(await getKey('openrouter')).toBe('sk-or-v1-test');
  });

  it('stores under a namespaced localStorage key', async () => {
    await saveKey('anthropic', 'sk-ant-test');
    expect(localStorage.getItem('ai_key_anthropic')).toBe('sk-ant-test');
  });

  it('returns null when no key is stored', async () => {
    expect(await getKey('openai')).toBeNull();
  });

  it('overwrites an existing plain key', async () => {
    await saveKey('openai', 'first');
    await saveKey('openai', 'second');
    expect(await getKey('openai')).toBe('second');
  });
});

describe('saveKey / getKey — encrypted mode', () => {
  it('round-trips an encrypted key with correct passphrase', async () => {
    await saveKey('anthropic', 'sk-ant-secret', { encrypt: true, passphrase: 'correct horse' });
    expect(await getKey('anthropic', 'correct horse')).toBe('sk-ant-secret');
  });

  it('never leaves the plaintext key in localStorage when encrypted', async () => {
    await saveKey('anthropic', 'sk-ant-secret', { encrypt: true, passphrase: 'pw' });
    expect(localStorage.getItem('ai_key_anthropic')).toBeNull();
  });

  it('returns null for a wrong passphrase (does not throw)', async () => {
    await saveKey('anthropic', 'sk-ant-secret', { encrypt: true, passphrase: 'right' });
    expect(await getKey('anthropic', 'wrong')).toBeNull();
  });

  it('returns null when an encrypted entry exists but no passphrase is provided', async () => {
    await saveKey('anthropic', 'sk-ant-secret', { encrypt: true, passphrase: 'pw' });
    expect(await getKey('anthropic')).toBeNull();
  });

  it('throws when encrypt: true but no passphrase is provided', async () => {
    await expect(saveKey('openrouter', 'k', { encrypt: true })).rejects.toThrow(/passphrase/i);
  });

  it('throws when encrypt: true and passphrase is empty', async () => {
    await expect(
      saveKey('openrouter', 'k', { encrypt: true, passphrase: '' }),
    ).rejects.toThrow(/passphrase/i);
  });
});

describe('saveKey — input validation', () => {
  it('throws on unknown provider', async () => {
    await expect(
      saveKey('ghost' as unknown as Provider, 'sk-test'),
    ).rejects.toThrow(/provider/i);
  });

  it('throws on empty key', async () => {
    await expect(saveKey('openai', '')).rejects.toThrow(/non-empty/i);
  });
});

describe('migration between modes', () => {
  it('erases plain entry when switching to encrypted', async () => {
    await saveKey('openai', 'plain-key');
    expect(localStorage.getItem('ai_key_openai')).toBe('plain-key');

    await saveKey('openai', 'encrypted-key', { encrypt: true, passphrase: 'pw' });
    expect(localStorage.getItem('ai_key_openai')).toBeNull();
    expect(await getKey('openai', 'pw')).toBe('encrypted-key');
  });

  it('erases encrypted entry when switching to plain', async () => {
    await saveKey('openai', 'encrypted-key', { encrypt: true, passphrase: 'pw' });
    expect(await isEncrypted('openai')).toBe(true);

    await saveKey('openai', 'plain-key');
    expect(await isEncrypted('openai')).toBe(false);
    expect(await getKey('openai')).toBe('plain-key');
  });
});

describe('forgetKey', () => {
  it('removes a plain key', async () => {
    await saveKey('gemini', 'AIza-test');
    await forgetKey('gemini');
    expect(await hasKey('gemini')).toBe(false);
    expect(await getKey('gemini')).toBeNull();
  });

  it('removes an encrypted key', async () => {
    await saveKey('gemini', 'AIza-test', { encrypt: true, passphrase: 'pw' });
    await forgetKey('gemini');
    expect(await hasKey('gemini')).toBe(false);
    expect(await getKey('gemini', 'pw')).toBeNull();
  });

  it('is a no-op when no key exists', async () => {
    await expect(forgetKey('openrouter')).resolves.toBeUndefined();
    expect(await hasKey('openrouter')).toBe(false);
  });

  it('throws on unknown provider', async () => {
    await expect(forgetKey('ghost' as unknown as Provider)).rejects.toThrow(/provider/i);
  });
});

describe('hasKey / isEncrypted', () => {
  it('hasKey reflects plain storage', async () => {
    expect(await hasKey('openai')).toBe(false);
    await saveKey('openai', 'k');
    expect(await hasKey('openai')).toBe(true);
  });

  it('hasKey reflects encrypted storage', async () => {
    expect(await hasKey('anthropic')).toBe(false);
    await saveKey('anthropic', 'k', { encrypt: true, passphrase: 'pw' });
    expect(await hasKey('anthropic')).toBe(true);
  });

  it('isEncrypted is false for plain keys', async () => {
    await saveKey('openai', 'k');
    expect(await isEncrypted('openai')).toBe(false);
  });

  it('isEncrypted is true only for encrypted keys', async () => {
    await saveKey('anthropic', 'k', { encrypt: true, passphrase: 'pw' });
    expect(await isEncrypted('anthropic')).toBe(true);
  });

  it('isEncrypted is false when no key is stored', async () => {
    expect(await isEncrypted('gemini')).toBe(false);
  });
});

describe('providers are isolated from one another', () => {
  it('saving one provider does not affect another', async () => {
    await saveKey('openrouter', 'or-key');
    await saveKey('anthropic', 'ant-key', { encrypt: true, passphrase: 'pw' });

    expect(await getKey('openrouter')).toBe('or-key');
    expect(await getKey('anthropic', 'pw')).toBe('ant-key');
    expect(await getKey('openai')).toBeNull();
    expect(await getKey('gemini')).toBeNull();
  });

  it('forgetting one provider leaves others intact', async () => {
    await saveKey('openrouter', 'or-key');
    await saveKey('openai', 'oa-key');

    await forgetKey('openrouter');

    expect(await hasKey('openrouter')).toBe(false);
    expect(await getKey('openai')).toBe('oa-key');
  });
});
