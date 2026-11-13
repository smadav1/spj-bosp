import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, getUser, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fails = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "logout") {
    await destroySession();
    return Response.json({ ok: true });
  }

  if (action === "setup") {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
    if (n > 0) return Response.json({ error: "Administrator sudah dibuat. Silakan login." }, { status: 400 });
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (username.length < 3) return Response.json({ error: "Username minimal 3 karakter" }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    const [u] = await db
      .insert(users)
      .values({ username, name: String(body.name ?? "").trim() || username, passwordHash: await hashPassword(password) })
      .returning({ id: users.id });
    await createSession(u.id);
    return Response.json({ ok: true });
  }

  if (action === "login") {
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const f = fails.get(username);
    if (f && f.n >= 5 && f.until > Date.now())
      return Response.json({ error: "Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi." }, { status: 429 });
    const r = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!r[0] || !(await verifyPassword(password, r[0].passwordHash))) {
      fails.set(username, { n: (f?.n ?? 0) + 1, until: Date.now() + 5 * 60_000 });
      return Response.json({ error: "Username atau password salah" }, { status: 401 });
    }
    fails.delete(username);
    await createSession(r[0].id);
    return Response.json({ ok: true });
  }

  if (action === "password") {
    const u = await getUser();
    if (!u) return Response.json({ error: "Belum login" }, { status: 401 });
    const r = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    if (!r[0] || !(await verifyPassword(String(body.current ?? ""), r[0].passwordHash)))
      return Response.json({ error: "Password lama salah" }, { status: 400 });
    const np = String(body.password ?? "");
    if (np.length < 8) return Response.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
    await db.update(users).set({ passwordHash: await hashPassword(np) }).where(eq(users.id, u.id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
