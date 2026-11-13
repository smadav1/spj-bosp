import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { transactions, files } from "@/db/schema";
import { isResponse, requireUser } from "@/lib/auth";
import { CATEGORIES, computeAmount, isCat, titleOf, statusOf } from "@/lib/categories";
import { formatReceiptNo } from "@/lib/format";
import { getPrint } from "@/lib/settings";
import { audit, loadCtx, checksFor } from "@/lib/trx";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function get(id: number) {
  const r = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return r[0];
}

export async function PUT(req: Request, { params }: Ctx) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const id = Number((await params).id);
  const t = await get(id);
  if (!t || !isCat(t.category)) return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  if (t.isFinal) return Response.json({ error: "Transaksi sudah final. Buka kembali (draft) sebelum mengedit." }, { status: 409 });
  const b = await req.json();
  const data = (b.data ?? {}) as Record<string, unknown>;
  const date = String(data.tanggal ?? "");
  const month = /^\d{4}-(\d{2})/.test(date) ? Number(date.slice(5, 7)) : 0;
  const receiptNo = String(b.receiptNo ?? "").trim() || t.receiptNo;
  const old = t.data as Record<string, unknown>;
  const labels: Record<string, string> = {};
  CATEGORIES[t.category].sections.forEach((s) => s.fields.forEach((f) => (labels[f.name] = f.label)));
  const changed = Object.keys({ ...old, ...data })
    .filter((k) => JSON.stringify(old[k] ?? "") !== JSON.stringify(data[k] ?? ""))
    .map((k) => (labels[k] ?? k).replace(/\s*\(.*\)/, ""));
  if (receiptNo !== t.receiptNo) changed.unshift("Nomor kuitansi");
  await db
    .update(transactions)
    .set({ data, date, month, receiptNo, title: titleOf(t.category, data), amount: computeAmount(t.category, data), updatedAt: new Date() })
    .where(eq(transactions.id, id));
  await audit(id, t.uid, "Diubah", changed.length ? "Mengubah: " + changed.join(", ") : "Disimpan tanpa perubahan", u.name || u.username);
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const id = Number((await params).id);
  const t = await get(id);
  if (!t) return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  await db.delete(files).where(eq(files.transactionId, id));
  await db.delete(transactions).where(eq(transactions.id, id));
  await audit(null, t.uid, "Dihapus", `Transaksi ${t.uid} (${t.title}) dihapus`, u.name || u.username);
  return Response.json({ ok: true });
}

export async function POST(req: Request, { params }: Ctx) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const id = Number((await params).id);
  const t = await get(id);
  if (!t || !isCat(t.category)) return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  const { action } = await req.json();
  const who = u.name || u.username;

  if (action === "duplicate") {
    const print = await getPrint();
    const [m] = await db.select({ v: max(transactions.seq) }).from(transactions).where(eq(transactions.fiscalYear, t.fiscalYear));
    const seq = (m?.v ?? 0) + 1;
    const uid = `TRX-${t.fiscalYear}-${String(seq).padStart(4, "0")}`;
    const receiptNo = formatReceiptNo(print.receiptFormat, seq, t.fiscalYear, t.month);
    const [row] = await db
      .insert(transactions)
      .values({ uid, seq, fiscalYear: t.fiscalYear, category: t.category, date: t.date, month: t.month, title: t.title, amount: t.amount, receiptNo, data: t.data as object })
      .returning({ id: transactions.id });
    await audit(row.id, uid, "Duplikasi", `Diduplikasi dari ${t.uid} (lampiran/foto tidak ikut disalin)`, who);
    return Response.json({ id: row.id, uid });
  }

  if (action === "final") {
    const ctx = await loadCtx(id);
    if (!ctx) return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    const checks = checksFor(ctx);
    if (statusOf(checks) === "belum")
      return Response.json({ error: "Belum bisa difinalkan, masih ada dokumen yang belum lengkap.", checks }, { status: 422 });
    await db.update(transactions).set({ isFinal: true, updatedAt: new Date() }).where(eq(transactions.id, id));
    await audit(id, t.uid, "Final", "SPJ ditandai final", who);
    return Response.json({ ok: true });
  }

  if (action === "reopen") {
    await db.update(transactions).set({ isFinal: false, updatedAt: new Date() }).where(eq(transactions.id, id));
    await audit(id, t.uid, "Dibuka kembali", "Status final dibatalkan (draft)", who);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
