/**
 * Key manager V1 — ADR-005, THI-110.
 *
 * Client-side only. No key ever leaves the browser.
 * - Plain mode (default): localStorage.
 * - Encrypted mode (opt-in): IndexedDB + Web Crypto AES-GCM + PBKDF2 ≥ 210k iter.
 *
 * Web Worker isolation → V1.5 (THI-114).
 */

export type Provider = 'openrouter' | 'anthropic' | 'openai' | 'gemini';

export interface KeySaveOpts {
  encrypt?: boolean;
  passphrase?: string;
}

const PROVIDERS: readonly Provider[] = ['openrouter', 'anthropic', 'openai', 'gemini'];

const LS_PREFIX = 'ai_key_';
const DB_NAME = 'ai_keys_encrypted';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

interface EncryptedRecord {
  provider: Provider;
  ciphertext: ArrayBuffer;
  salt: ArrayBuffer;
  iv: ArrayBuffer;
}

function assertProvider(p: Provider): void {
  if (!PROVIDERS.includes(p)) {
    throw new Error('Unknown provider');
  }
}

function getLocalStorage(): Storage {
  const ls = (globalThis as { localStorage?: Storage }).localStorage;
  if (!ls) {
    throw new Error('localStorage unavailable');
  }
  return ls;
}

function getIndexedDB(): IDBFactory {
  const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  if (!idb) {
    throw new Error('indexedDB unavailable');
  }
  return idb;
}

function getSubtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto unavailable');
  }
  return c.subtle;
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  // Explicitly back the Uint8Array with a plain ArrayBuffer so TS does not infer
  // ArrayBufferLike (which would admit SharedArrayBuffer and fail BufferSource).
  const buf = new Uint8Array(new ArrayBuffer(n));
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = getIndexedDB().open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'provider' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  // Open one short-lived connection per operation so a subsequent deleteDatabase
  // never blocks on a lingering handle (tests rely on this for teardown).
  const db = await openDb();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

function dbGet(provider: Provider): Promise<EncryptedRecord | undefined> {
  return withDb(
    (db) =>
      new Promise<EncryptedRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(provider);
        req.onsuccess = () => resolve(req.result as EncryptedRecord | undefined);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'));
      }),
  );
}

function dbPut(record: EncryptedRecord): Promise<void> {
  return withDb(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error('IndexedDB put failed'));
      }),
  );
}

function dbDelete(provider: Provider): Promise<void> {
  return withDb(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(provider);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error('IndexedDB delete failed'));
      }),
  );
}

async function deriveKey(passphrase: string, salt: BufferSource): Promise<CryptoKey> {
  const subtle = getSubtle();
  const passKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptKey(
  key: string,
  passphrase: string,
): Promise<Pick<EncryptedRecord, 'ciphertext' | 'salt' | 'iv'>> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cryptoKey = await deriveKey(passphrase, salt);
  const ciphertext = await getSubtle().encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(key),
  );
  // Clone bytes into fresh ArrayBuffers so the stored record cannot reference
  // the caller's mutable Uint8Array backing stores.
  return {
    ciphertext,
    salt: salt.slice().buffer,
    iv: iv.slice().buffer,
  };
}

async function decryptKey(record: EncryptedRecord, passphrase: string): Promise<string> {
  const cryptoKey = await deriveKey(passphrase, record.salt);
  const plainBuf = await getSubtle().decrypt(
    { name: 'AES-GCM', iv: record.iv },
    cryptoKey,
    record.ciphertext,
  );
  return new TextDecoder().decode(plainBuf);
}

/** Detects a provider from a key's prefix. Returns null if unknown. */
export function detectProvider(key: string): Provider | null {
  if (typeof key !== 'string') return null;
  const k = key.trim();
  if (k.startsWith('sk-or-v1-')) return 'openrouter';
  if (k.startsWith('sk-ant-')) return 'anthropic';
  if (k.startsWith('sk-')) return 'openai';
  if (k.startsWith('AIza')) return 'gemini';
  return null;
}

/**
 * Stores an API key for the given provider.
 * - Plain by default (localStorage). ⚠️ ADR-002 gate: UX MUST guide toward encryption, not plain.
 *   Supply chain attack (XSS via deps) → localStorage compromise → key exfiltrated.
 * - Encrypted when `opts.encrypt === true` (IndexedDB + AES-GCM + PBKDF2).
 *   Requires a non-empty `opts.passphrase`.
 * Migration: switching mode for a provider removes the previous store entry.
 *
 * Called by: THI-112 AiKeySetup (design should default to encrypted, session-only fallback if passphrase refused).
 */
export async function saveKey(
  provider: Provider,
  key: string,
  opts: KeySaveOpts = {},
): Promise<void> {
  assertProvider(provider);
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Key must be a non-empty string');
  }

  if (opts.encrypt) {
    if (typeof opts.passphrase !== 'string' || opts.passphrase.length === 0) {
      throw new Error('Passphrase required for encrypted mode');
    }
    const { ciphertext, salt, iv } = await encryptKey(key, opts.passphrase);
    await dbPut({ provider, ciphertext, salt, iv });
    // Migration: erase any pre-existing plain entry.
    getLocalStorage().removeItem(LS_PREFIX + provider);
    return;
  }

  getLocalStorage().setItem(LS_PREFIX + provider, key);
  // Migration: erase any pre-existing encrypted entry.
  try {
    await dbDelete(provider);
  } catch {
    // Best-effort — if IDB is unavailable or empty, the plain write still succeeded.
  }
}

/**
 * Reads an API key for the given provider.
 * - Plain entry returned as-is.
 * - Encrypted entry: requires `passphrase`. Wrong passphrase or decryption
 *   failure returns `null` (never throws, never logs the key).
 * - No entry → `null`.
 */
export async function getKey(provider: Provider, passphrase?: string): Promise<string | null> {
  assertProvider(provider);

  const plain = getLocalStorage().getItem(LS_PREFIX + provider);
  if (plain !== null) return plain;

  try {
    const record = await dbGet(provider);
    if (!record) return null;
    if (typeof passphrase !== 'string' || passphrase.length === 0) return null;
    return await decryptKey(record, passphrase);
  } catch {
    return null;
  }
}

/** Removes both plain and encrypted entries for the given provider. */
export async function forgetKey(provider: Provider): Promise<void> {
  assertProvider(provider);
  getLocalStorage().removeItem(LS_PREFIX + provider);
  try {
    await dbDelete(provider);
  } catch {
    // Idempotent — nothing to do if IDB unavailable or entry absent.
  }
}

/** True iff an encrypted entry exists for the provider and no plain entry shadows it. */
export async function isEncrypted(provider: Provider): Promise<boolean> {
  assertProvider(provider);
  if (getLocalStorage().getItem(LS_PREFIX + provider) !== null) return false;
  try {
    const record = await dbGet(provider);
    return !!record;
  } catch {
    return false;
  }
}

/** True iff any entry (plain or encrypted) exists for the provider. */
export async function hasKey(provider: Provider): Promise<boolean> {
  assertProvider(provider);
  if (getLocalStorage().getItem(LS_PREFIX + provider) !== null) return true;
  try {
    const record = await dbGet(provider);
    return !!record;
  } catch {
    return false;
  }
}
