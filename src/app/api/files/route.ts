import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, transactions } from "@/db/schema";
import { isResponse, requireUser } from "@/lib/auth";
import { CATEGORIES, isCat } from "@/lib/categories";
import { getSchool, setSetting } from "@/lib/settings";
import { audit } from "@/lib/trx";

export const dynamic = "force-dynamic";
const OK = ["image/jpeg", "image/png", "application/pdf"];

export async function POST(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const fd = await req.formData();
  const file = fd.get("file");
  const slot = String(fd.get("slot") ?? "");
  const trxId = Number(fd.get("transactionId")) || null;
  const replaceId = Number(fd.get("replaceId")) || null;
  if (!(file instanceof File)) return Response.json({ error: "File tidak ditemukan" }, { status: 400 });
  if (!OK.includes(file.type)) return Response.json({ error: "Format file harus JPG, JPEG, PNG, atau PDF" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return Response.json({ error: "Ukuran file maksimal 20 MB" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const width = Number(fd.get("width")) || 0;
  const height = Number(fd.get("height")) || 0;
  const who = u.name || u.username;

  if (slot === "logo") {
    if (file.type === "application/pdf") return Response.json({ error: "Logo harus berupa gambar" }, { status: 400 });
    const s = await getSchool();
    if (s.logoFileId) await db.delete(files).where(eq(files.id, s.logoFileId));
    const [row] = await db.insert(files).values({ slot, name: file.name, mime: file.type, size: buf.length, width, height, data: buf }).returning({ id: files.id });
    await setSetting("school", { ...s, logoFileId: row.id });
    return Response.json({ id: row.id });
  }

  if (!trxId) return Response.json({ error: "Transaksi tidak valid" }, { status: 400 });
  const tr = await db.select().from(transactions).where(eq(transactions.id, trxId)).limit(1);
  const t = tr[0];
  if (!t || !isCat(t.category)) return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  if (t.isFinal) return Response.json({ error: "Transaksi sudah final" }, { status: 409 });
  const def = CATEGORIES[t.category].slots.find((x) => x.slot === slot);
  if (!def) return Response.json({ error: "Jenis lampiran tidak valid" }, { status: 400 });
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(files)
    .where(and(eq(files.transactionId, trxId), eq(files.slot, slot)));
  if (!replaceId && n >= def.max) return Response.json({ error: `Maksimal ${def.max} berkas untuk ${def.label}` }, { status: 400 });
  const [row] = await db
    .insert(files)
    .values({ transactionId: trxId, slot, name: file.name, mime: file.type, size: buf.length, width, height, data: buf })
    .returning({ id: files.id });
  if (replaceId) await db.delete(files).where(and(eq(files.id, replaceId), eq(files.transactionId, trxId)));
  await audit(trxId, t.uid, replaceId ? "Ganti berkas" : "Unggah berkas", `${def.label}: ${file.name}`, who);
  return Response.json({ id: row.id });
}
