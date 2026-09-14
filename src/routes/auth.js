// Rute autentificare
import { json, error, readJson } from '../lib/http.js';
import { signJWT, verifyPassword, jwtSecret } from '../lib/auth.js';

export async function login(request, env) {
  const body = await readJson(request);
  if (!body?.email || !body?.password) return error('Email și parolă obligatorii', 400);
  const email = String(body.email).toLowerCase().trim();

  // 1) cont de staff (users)
  const user = await env.DB.prepare(
    'SELECT id, email, name, password_hash, role, active FROM users WHERE email = ?'
  ).bind(email).first();
  if (user && user.active && await verifyPassword(body.password, user.password_hash)) {
    const token = await signJWT({ sub: user.id, email: user.email, name: user.name, role: user.role }, jwtSecret(env));
    return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }

  // 2) cont de client (client_users) — acces la portal
  try {
    const cu = await env.DB.prepare(
      'SELECT id, client_id, email, name, password_hash, active FROM client_users WHERE email = ?'
    ).bind(email).first();
    if (cu && cu.active && await verifyPassword(body.password, cu.password_hash)) {
      const payload = { sub: cu.id, email: cu.email, name: cu.name, role: 'client', kind: 'client', client_id: cu.client_id };
      const token = await signJWT(payload, jwtSecret(env));
      return json({ token, user: { id: cu.id, email: cu.email, name: cu.name, role: 'client', kind: 'client', client_id: cu.client_id } });
    }
  } catch (e) { /* tabelul client_users poate lipsi la prima rulare */ }

  return error('Credențiale invalide', 401);
}

export async function me(request, env, ctx, user) {
  return json({ user: { id: user.sub, email: user.email, name: user.name, role: user.role, kind: user.kind || 'staff', client_id: user.client_id || null } });
}

// Prefix pentru payload-ul QR de conectare (ca să nu logheze din greșeală un cod oarecare).
export const QR_LOGIN_PREFIX = 'WSDWMS1:';

// Generează un token aleator (base64url) pentru badge-ul de conectare rapidă.
export function randomToken(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Conectare prin scanarea unui QR (badge). Body: { token } sau { payload: "WSDWMS1:<token>" }.
export async function qrLogin(request, env) {
  const body = await readJson(request);
  let tok = String(body?.token || body?.payload || '').trim();
  if (tok.startsWith(QR_LOGIN_PREFIX)) tok = tok.slice(QR_LOGIN_PREFIX.length);
  if (!tok || tok.length < 12) return error('Cod QR de conectare invalid', 400);
  let user = null;
  try {
    user = await env.DB.prepare(
      'SELECT id, email, name, role, active FROM users WHERE login_token = ?'
    ).bind(tok).first();
  } catch (e) { /* coloana login_token poate lipsi înainte de migrare */ }
  if (!user || !user.active) return error('Cod QR invalid sau utilizator inactiv', 401);
  const token = await signJWT({ sub: user.id, email: user.email, name: user.name, role: user.role }, jwtSecret(env));
  return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
