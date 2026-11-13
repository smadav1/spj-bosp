import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { isResponse, requireUser } from "@/lib/auth";
import { CATEGORIES, computeAmount, isCat, titleOf } from "@/lib/categories";
import { formatReceiptNo } from "@/lib/format";
import { ensureYear, getPrint, getSchool } from "@/lib/settings";
import { audit } from "@/lib/trx";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const b = await req.json();
  if (!isCat(b.category)) return Response.json({ error: "Kategori tidak valid" }, { status: 400 });
  const data = (b.data ?? {}) as Record<string, unknown>;
  const school = await getSchool();
  const print = await getPrint();
  const year = Number(b.fiscalYear) || school.tahunAnggaran;
  await ensureYear(year);
  const date = String(data.tanggal ?? "");
  const month = /^\d{4}-(\d{2})/.test(date) ? Number(date.slice(5, 7)) : 0;
  const [m] = await db.select({ v: max(transactions.seq) }).from(transactions).where(eq(transactions.fiscalYear, year));
  const seq = (m?.v ?? 0) + 1;
  const uid = `TRX-${year}-${String(seq).padStart(4, "0")}`;
  const receiptNo = String(b.receiptNo ?? "").trim() || formatReceiptNo(print.receiptFormat, seq, year, month);
  const [row] = await db
    .insert(transactions)
    .values({
      uid, seq, fiscalYear: year, category: b.category, date, month,
      title: titleOf(b.category, data), amount: computeAmount(b.category, data), receiptNo, data,
    })
    .returning({ id: transactions.id });
  await audit(row.id, uid, "Dibuat", `Transaksi ${CATEGORIES[b.category as keyof typeof CATEGORIES].short} dibuat. No. kuitansi ${receiptNo}`, u.name || u.username);
  return Response.json({ id: row.id, uid });
}
