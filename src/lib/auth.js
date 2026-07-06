// Autentificare: JWT (HS256) + hashing parole (PBKDF2) — Web Crypto, fără dependențe.

const enc = new TextEncoder();

function b64u(bytes) {
  const s = typeof bytes === 'string' ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromB64u(s) {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

export function jwtSecret(env) {
  return env.JWT_SECRET || 'dev-insecure-secret-change-me';
}

export async function signJWT(payload, secret, expSec = 7 * 86400) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + expSec }));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64u(sig)}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token invalid');
  const [h, b, s] = parts;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sigBytes = Uint8Array.from(fromB64u(s), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${h}.${b}`));
  if (!ok) throw new Error('Semnătură invalidă');
  const payload = JSON.parse(fromB64u(b));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expirat');
  return payload;
}

// ── Parole (PBKDF2-SHA256, 100k iterații) ───────────────────────────────
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(password, salt);
  return `pbkdf2$100000$${b64u(salt)}$${b64u(bits)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algo, iter, saltB64, hashB64] = stored.split('$');
    if (algo !== 'pbkdf2') return false;
    const salt = Uint8Array.from(fromB64u(saltB64), (c) => c.charCodeAt(0));
    const bits = await pbkdf2(password, salt, parseInt(iter, 10));
    return b64u(bits) === hashB64;
  } catch {
    return false;
  }
}

async function pbkdf2(password, salt, iterations = 100000) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
}

// ── Middleware: extrage userul din Authorization: Bearer <token> ────────
export async function authenticate(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return await verifyJWT(token, jwtSecret(env));
  } catch {
    return null;
  }
}

// true dacă rolul userului e suficient (admin > operator > viewer)
export function hasRole(user, minRole) {
  const order = { viewer: 1, operator: 2, admin: 3 };
  return user && order[user.role] >= order[minRole];
}
