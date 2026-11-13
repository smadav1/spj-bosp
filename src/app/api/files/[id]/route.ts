import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files, transactions } from "@/db/schema";
import { isResponse, requireUser } from "@/lib/auth";
import { getSchool, setSetting } from "@/lib/settings";
import { audit } from "@/lib/trx";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const id = Number((await params).id);
  const r = await db.select().from(files).where(eq(files.id, id)).limit(1);
  const f = r[0];
  if (!f) return new Response("Tidak ditemukan", { status: 404 });
  const dl = new URL(req.url).searchParams.get("dl");
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `${dl ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const id = Number((await params).id);
  const r = await db.select().from(files).where(eq(files.id, id)).limit(1);
  const f = r[0];
  if (!f) return Response.json({ ok: true });
  if (f.transactionId) {
    const t = (await db.select().from(transactions).where(eq(transactions.id, f.transactionId)).limit(1))[0];
    if (t?.isFinal) return Response.json({ error: "Transaksi sudah final" }, { status: 409 });
    await db.delete(files).where(eq(files.id, id));
    if (t) await audit(t.id, t.uid, "Hapus berkas", `${f.slot}: ${f.name}`, u.name || u.username);
  } else {
    await db.delete(files).where(eq(files.id, id));
    const s = await getSchool();
    if (s.logoFileId === id) await setSetting("school", { ...s, logoFileId: null });
  }
  return Response.json({ ok: true });
}
