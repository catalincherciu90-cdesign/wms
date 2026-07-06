// Rute autentificare
import { json, error, readJson } from '../lib/http.js';
import { signJWT, verifyPassword, jwtSecret } from '../lib/auth.js';

export async function login(request, env) {
  const body = await readJson(request);
  if (!body?.email || !body?.password) return error('Email și parolă obligatorii', 400);

  const user = await env.DB.prepare(
    'SELECT id, email, name, password_hash, role, active FROM users WHERE email = ?'
  ).bind(String(body.email).toLowerCase().trim()).first();

  if (!user || !user.active) return error('Credențiale invalide', 401);
  const ok = await verifyPassword(body.password, user.password_hash);
  if (!ok) return error('Credențiale invalide', 401);

  const token = await signJWT({ sub: user.id, email: user.email, name: user.name, role: user.role }, jwtSecret(env));
  return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}

export async function me(request, env, ctx, user) {
  return json({ user: { id: user.sub, email: user.email, name: user.name, role: user.role } });
}
