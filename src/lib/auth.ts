import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";

const COOKIE = "spj_session";

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((res, rej) =>
    _scrypt(password, salt, 64, (e, k) => (e ? rej(e) : res(k as Buffer))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(password, salt);
  const a = Buffer.from(hash, "hex");
  return a.length === key.length && timingSafeEqual(a, key);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await db.insert(sessions).values({ token: sha(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, sha(token)));
  jar.delete(COOKIE);
}

export type SessionUser = { id: number; username: string; name: string };

export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, sha(token)))
    .limit(1);
  const r = rows[0];
  if (!r || r.expiresAt.getTime() < Date.now()) return null;
  return { id: r.id, username: r.username, name: r.name };
}

/** For API route handlers: returns the user or a 401 Response. */
export async function requireUser(): Promise<SessionUser | Response> {
  const u = await getUser();
  if (!u) return Response.json({ error: "Belum login" }, { status: 401 });
  return u;
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}
