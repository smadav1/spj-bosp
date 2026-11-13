import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { fiscalYears, transactions } from "@/db/schema";
import { getSchool } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import YearsPanel from "@/components/YearsPanel";

export const dynamic = "force-dynamic";

export default async function TahunPage() {
  const school = await getSchool();
  const ys = await db.select().from(fiscalYears).orderBy(desc(fiscalYears.year));
  const agg = await db
    .select({
      y: transactions.fiscalYear,
      n: sql<number>`count(*)::int`,
      sum: sql<number>`coalesce(sum(${transactions.amount}),0)::float8`,
      fin: sql<number>`count(*) filter (where ${transactions.isFinal})::int`,
    })
    .from(transactions)
    .groupBy(transactions.fiscalYear);
  const m = new Map(agg.map((a) => [a.y, a]));
  const rows = ys.map((y) => ({ year: y.year, note: y.note, archived: y.archived, n: m.get(y.year)?.n ?? 0, sum: m.get(y.year)?.sum ?? 0, final: m.get(y.year)?.fin ?? 0 }));
  return (
    <div>
      <PageHeader title="Tahun Anggaran & Arsip SPJ" desc="Data tahun-tahun sebelumnya tetap tersimpan dan dapat dibuka kapan saja. Tahun aktif dipakai untuk transaksi baru dan nomor kuitansi." />
      <YearsPanel rows={rows} active={school.tahunAnggaran} />
    </div>
  );
}
