/**
 * `ssh-keygen` as OpenSSH 10 prints it when the learner presses Enter at each
 * prompt (default file, empty passphrase). The key material is pseudo-random
 * but shaped like the real thing: the public key blob has the real header, the
 * fingerprint is the SHA-256 of that blob as OpenSSH computes it, and the
 * randomart is drawn from those bytes with the same "drunken bishop" walk.
 */

import type { OutputLine } from './types';

interface KeyType {
  /** Name in the public key line (`ssh-ed25519 AAAA…`). */
  algo: string;
  /** Label in the randomart header (`ED25519 256`). */
  label: (bits: number) => string;
  defaultBits: number;
  /** Key material after the algorithm name in the public blob. */
  blobTail: (bits: number, random: () => number) => number[];
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const str = (s: string) => [...u32(s.length), ...Array.from(s, (c) => c.charCodeAt(0))];
const bytes = (n: number, random: () => number) => Array.from({ length: n }, () => Math.floor(random() * 256));

const KEY_TYPES: Record<string, KeyType> = {
  ed25519: {
    algo: 'ssh-ed25519',
    label: () => 'ED25519 256',
    defaultBits: 256,
    blobTail: (_bits, r) => [...u32(32), ...bytes(32, r)],
  },
  rsa: {
    algo: 'ssh-rsa',
    label: (bits) => `RSA ${bits}`,
    defaultBits: 3072,
    // Exponent 65537, then a modulus of `bits` bits (with its leading zero byte).
    blobTail: (bits, r) => {
      const size = Math.ceil(bits / 8);
      return [...u32(3), 1, 0, 1, ...u32(size + 1), 0, 128 | Math.floor(r() * 128), ...bytes(size - 1, r)];
    },
  },
  ecdsa: {
    algo: 'ecdsa-sha2-nistp256',
    label: () => 'ECDSA 256',
    defaultBits: 256,
    blobTail: (_bits, r) => [...str('nistp256'), ...u32(65), 4, ...bytes(64, r)],
  },
};

/** Deterministic generator (mulberry32) seeded from text, so a test sees stable output. */
function seeded(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64(data: number[], pad = true): string {
  let out = '';
  for (let i = 0; i < data.length; i += 3) {
    const [a, b = 0, c = 0] = data.slice(i, i + 3);
    const n = (a << 16) | (b << 8) | c;
    const left = data.length - i;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += left > 1 ? B64[(n >> 6) & 63] : pad ? '=' : '';
    out += left > 2 ? B64[n & 63] : pad ? '=' : '';
  }
  return out;
}

/** Bytes of a base64 text, or null when it is not base64. */
function fromBase64(text: string): number[] | null {
  const clean = text.replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) return null;
  const out: number[] = [];
  let buffer = 0, bits = 0;
  for (const c of clean) {
    buffer = (buffer << 6) | B64.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 255);
    }
  }
  return out;
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * SHA-256 (FIPS 180-4), synchronous so the terminal stays synchronous. It only
 * computes the fingerprint shown to the learner, never anything secret.
 */
export function sha256(data: number[]): number[] {
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const bitLength = data.length * 8;
  const msg = [...data, 0x80];
  while (msg.length % 64 !== 56) msg.push(0);
  msg.push(...u32(Math.floor(bitLength / 2 ** 32)), ...u32(bitLength >>> 0));
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const w = new Array<number>(64);
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      w[i] = (msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, k].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
  }
  return h.flatMap((v) => u32(v >>> 0));
}

/** The randomart box ssh-keygen draws from a fingerprint (OpenSSH `fingerprint_randomart`). */
export function randomart(fingerprint: number[], label: string): string[] {
  const W = 17, H = 9;
  const symbols = ' .o+=*BOX@%&#/^SE';
  const field = Array.from({ length: W }, () => new Array<number>(H).fill(0));
  let x = W >> 1, y = H >> 1;
  for (const byte of fingerprint) {
    let input = byte;
    for (let step = 0; step < 4; step++) {
      x += input & 1 ? 1 : -1;
      y += input & 2 ? 1 : -1;
      x = Math.max(0, Math.min(x, W - 1));
      y = Math.max(0, Math.min(y, H - 1));
      if (field[x][y] < symbols.length - 3) field[x][y]++;
      input >>= 2;
    }
  }
  field[W >> 1][H >> 1] = symbols.length - 2;
  field[x][y] = symbols.length - 1;
  const title = `[${label}]`;
  const top = '+' + title.padStart(Math.floor((W - title.length) / 2) + title.length, '-').padEnd(W, '-') + '+';
  const rows = Array.from({ length: H }, (_, row) => '|' + Array.from({ length: W }, (_, col) => symbols[field[col][row]]).join('') + '|');
  return [top, ...rows, '+----[SHA256]-----+'];
}

/** Options that take a value, from OpenSSH's getopt string. */
const WITH_VALUE = 'abCDEfFgGIJjKmMnNOPrRsStTVwYzZ';

export type KeygenOptions = { opts: Record<string, string | true> } | { missing: string };

/** Reads the options the way getopt does: `-lf file`, `-t rsa`, `-trsa`, `-N ""`. */
export function keygenOptions(args: string[]): KeygenOptions {
  const opts: Record<string, string | true> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('-') || a.length < 2) continue;
    for (let j = 1; j < a.length; j++) {
      const c = a[j];
      if (WITH_VALUE.includes(c)) {
        const rest = a.slice(j + 1);
        if (rest) opts[c] = rest;
        else if (i + 1 < args.length) opts[c] = args[++i];
        else return { missing: c };
        break;
      }
      opts[c] = true;
    }
  }
  return { opts };
}

/**
 * `ssh-keygen -l` on a public key line: `256 SHA256:… comment (ED25519)`,
 * or null when the text is not a public key.
 */
export function fingerprintLine(publicKey: string): string | null {
  const [algo, data, ...rest] = publicKey.trim().split(/\s+/);
  const labels: Record<string, string> = { 'ssh-ed25519': 'ED25519', 'ssh-rsa': 'RSA', 'ecdsa-sha2-nistp256': 'ECDSA' };
  const label = Object.prototype.hasOwnProperty.call(labels, algo) ? labels[algo] : undefined;
  const blob = data ? fromBase64(data) : null;
  if (!label || !blob || blob.length < 12) return null;
  let bits = 256;
  if (label === 'RSA') {
    // Skip the name and the exponent; the modulus length gives the key size.
    const readLen = (at: number) => ((blob[at] << 24) | (blob[at + 1] << 16) | (blob[at + 2] << 8) | blob[at + 3]) >>> 0;
    const expAt = 4 + readLen(0);
    const modAt = expAt + 4 + readLen(expAt);
    const modLen = readLen(modAt);
    bits = (modLen - (blob[modAt + 4] === 0 ? 1 : 0)) * 8;
  }
  const comment = rest.join(' ') || 'no comment';
  return `${bits} SHA256:${base64(sha256(blob), false)} ${comment} (${label})`;
}

export interface KeygenRequest {
  opts: Record<string, string | true>;
  /** Where the key goes by default, as the shell prints it (`/home/user/.ssh`, `C:\Users\user/.ssh`). */
  sshDirShown: string;
  /** `user@hostname`, the default comment. */
  defaultComment: string;
  sshDirExists: boolean;
  keyExists: boolean;
  /** The key path (or its `.pub`) is a directory: OpenSSH asks to overwrite, then cannot write. */
  keyIsDirectory?: boolean;
  /** The folder of `-f dir/key` does not exist: OpenSSH fails when it saves. */
  folderMissing?: boolean;
}

export type KeygenResult =
  | { error: OutputLine[]; status: number }
  | { lines: OutputLine[]; keyType: string; keyPathShown: string; privateKey: string; publicKey: string };

/** The key type `-t` asks for (ed25519 by default, as in OpenSSH 9.5 and later). */
export function keygenType(opts: Record<string, string | true>): string {
  return (typeof opts.t === 'string' ? opts.t : 'ed25519').toLowerCase();
}

export function sshKeygen(req: KeygenRequest): KeygenResult {
  const { opts } = req;
  const value = (flag: string) => (typeof opts[flag] === 'string' ? (opts[flag] as string) : undefined);
  const typeName = keygenType(opts);
  // Own properties only: `-t constructor` must not find Object.prototype.constructor.
  const type = Object.prototype.hasOwnProperty.call(KEY_TYPES, typeName) ? KEY_TYPES[typeName] : undefined;
  if (!type) return { error: [{ text: `unknown key type ${typeName}`, type: 'error' }], status: 255 };
  const bits = typeName === 'rsa' ? Number(value('b') ?? type.defaultBits) : type.defaultBits;
  if (typeName === 'rsa') {
    // OpenSSH's bounds and wording; the upper bound also keeps the fake modulus small.
    if (!Number.isInteger(bits) || bits < 1024) {
      return { error: [{ text: 'Invalid RSA key length: minimum is 1024 bits', type: 'error' }], status: 255 };
    }
    if (bits > 16384) {
      return { error: [{ text: 'Invalid RSA key length: maximum is 16384 bits', type: 'error' }], status: 255 };
    }
  }
  const comment = value('C') ?? req.defaultComment;
  const fileShown = value('f');
  const keyPath = fileShown ?? `${req.sshDirShown}/id_${typeName}`;

  const random = seeded(`${typeName}|${bits}|${comment}|${keyPath}`);
  const blob = [...str(type.algo), ...type.blobTail(bits, random)];
  const fingerprint = sha256(blob);
  const publicKey = `${type.algo} ${base64(blob)} ${comment}`;
  const privateBody = base64([...Array.from('openssh-key-v1', (c) => c.charCodeAt(0)), 0, ...blob, ...bytes(blob.length + 64, random)]);
  const privateKey = ['-----BEGIN OPENSSH PRIVATE KEY-----', ...(privateBody.match(/.{1,70}/g) ?? []), '-----END OPENSSH PRIVATE KEY-----'].join('\n');

  const out = (text: string): OutputLine => ({ text, type: 'output' });
  const lines: OutputLine[] = [out(`Generating public/private ${typeName} key pair.`)];
  if (fileShown === undefined) {
    lines.push(out(`Enter file in which to save the key (${keyPath}): `));
    if (!req.sshDirExists) lines.push(out(`Created directory '${req.sshDirShown}'.`));
  }
  if (req.keyExists || req.keyIsDirectory) lines.push(out(`${keyPath} already exists.`), out('Overwrite (y/n)? y'));
  if (req.keyIsDirectory) {
    return { error: [...lines, { text: `Saving key "${keyPath}" failed: Is a directory`, type: 'error' }], status: 1 };
  }
  if (opts.N === undefined) {
    lines.push(out(`Enter passphrase for "${keyPath}" (empty for no passphrase): `), out('Enter same passphrase again: '));
  }
  if (req.folderMissing) {
    return { error: [...lines, { text: `Saving key "${keyPath}" failed: No such file or directory`, type: 'error' }], status: 1 };
  }
  lines.push(
    out(`Your identification has been saved in ${keyPath}`),
    out(`Your public key has been saved in ${keyPath}.pub`),
    out('The key fingerprint is:'),
    out(`SHA256:${base64(fingerprint, false)} ${comment}`),
    out("The key's randomart image is:"),
    ...randomart(fingerprint, type.label(bits)).map(out),
  );
  return { lines, keyType: typeName, keyPathShown: keyPath, privateKey, publicKey };
}
