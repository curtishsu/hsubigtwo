const COOKIE_NAME = 'hsu_family_unlocked';
const TOKEN_VERSION = 1;
const REMEMBER_SECONDS = 60 * 60 * 24 * 180; // 180 days

function getSecret(): string {
  const secret = process.env.FAMILY_COOKIE_SECRET;
  if (!secret) throw new Error('Missing env var: FAMILY_COOKIE_SECRET');
  return secret;
}

function getPinHash(): string {
  const hash = process.env.FAMILY_PIN_HASH;
  if (!hash) throw new Error('Missing env var: FAMILY_PIN_HASH');
  return hash.toLowerCase().trim();
}

function getPinPepper(): string {
  const pepper = process.env.FAMILY_PIN_PEPPER;
  if (!pepper) throw new Error('Missing env var: FAMILY_PIN_PEPPER');
  return pepper;
}

function encoder() {
  return new TextEncoder();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return base64ToBytes(b64 + pad);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto not available');
  const bytes = encoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto not available');
  const keyBytes = encoder().encode(key);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, encoder().encode(message));
  return new Uint8Array(sig);
}

export function familyCookieName(): string {
  return COOKIE_NAME;
}

export function rememberSeconds(): number {
  return REMEMBER_SECONDS;
}

export function isValidFourDigitPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

export async function verifyFamilyPin(pin: string): Promise<boolean> {
  const expected = getPinHash();
  const pepper = getPinPepper();
  const actual = await sha256Hex(`${pin}:${pepper}`);
  const a = encoder().encode(actual);
  const b = encoder().encode(expected);
  return constantTimeEqual(a, b);
}

type UnlockPayload = {
  v: number;
  iat: number;
  exp: number;
};

export async function mintUnlockToken(nowSeconds?: number): Promise<string> {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const payload: UnlockPayload = {
    v: TOKEN_VERSION,
    iat: now,
    exp: now + REMEMBER_SECONDS,
  };
  const payloadB64 = base64UrlEncodeBytes(encoder().encode(JSON.stringify(payload)));
  const sigBytes = await hmacSha256(getSecret(), payloadB64);
  const sigB64 = base64UrlEncodeBytes(sigBytes);
  return `${payloadB64}.${sigB64}`;
}

export async function verifyUnlockToken(token: string): Promise<boolean> {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return false;

    const expectedSig = await hmacSha256(getSecret(), payloadB64);
    const gotSig = base64UrlDecodeToBytes(sigB64);
    if (!constantTimeEqual(expectedSig, gotSig)) return false;

    const payloadBytes = base64UrlDecodeToBytes(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as UnlockPayload;
    if (!payload || payload.v !== TOKEN_VERSION) return false;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) return false;
    return true;
  } catch {
    return false;
  }
}


