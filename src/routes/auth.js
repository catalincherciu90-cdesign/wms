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
