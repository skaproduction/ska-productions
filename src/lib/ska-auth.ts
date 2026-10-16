import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

// Single shared admin password, set via SKA_ADMIN_PASSWORD (see .env.example).
// The session cookie holds an HMAC of the password, so changing the password logs everyone out.

export const ADMIN_COOKIE = 'ska_admin';
const MAX_AGE = 60 * 60 * 24 * 7;

const password = () => process.env.SKA_ADMIN_PASSWORD || '';
const token = (pw: string) => createHmac('sha256', pw).update('ska-admin-session').digest('hex');

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const adminConfigured = () => password().length > 0;

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!value && safeEqual(value, token(password()));
}

export async function logIn(attempt: string) {
  if (!adminConfigured() || !safeEqual(attempt, password())) return false;
  (await cookies()).set(ADMIN_COOKIE, token(password()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
  return true;
}

export async function logOut() {
  (await cookies()).delete(ADMIN_COOKIE);
}
