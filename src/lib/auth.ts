import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Tereverus TV — restricted operator access.
 * Credentials are fixed by channel policy and must never be changed.
 */
export const ADMIN_EMAIL = "njerukwetu@gmail.com";
const ADMIN_PASSWORD = "Kwetu@254";

export const COOKIE_NAME = "tvtv_session";
const HMAC_SECRET = "terevers-tv-control-room-signing-key-0x254";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function hmac(payload: string): string {
  return crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("base64url");
}

/** Create a signed session token: "<expiryMs>.<hmac>" */
export function createSessionToken(): string {
  const expiry = Date.now() + SESSION_TTL_MS;
  return `${expiry}.${hmac(String(expiry))}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(expiry) || Date.now() > Number(expiry)) return false;
  const expected = hmac(expiry);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function checkCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD
  );
}

/**
 * Set-Cookie header written directly on the HTTP response — the most
 * reliable way to establish the session across hosting environments
 * (serverless function platforms can be picky about cookies().set()).
 */
export function sessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export const SESSION_CLEAR_HEADER = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/** Server-side guard: true when the request carries a valid admin session */
export async function isAuthedAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}
