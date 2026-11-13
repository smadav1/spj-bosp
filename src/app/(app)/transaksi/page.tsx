import Link from "next/link";
import { Plus, Search, Printer } from "lucide-react";
import { db } from "@/db";
import { fiscalYears } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSchool } from "@/lib/settings";
import { listTrx } from "@/lib/trx";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/categories";
import { BULAN, rp, tgl } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/ui";
import { RowActions } from "@/components/TrxActions";

export const dynamic = "force-dynamic";
type SP = { q?: string; tahun?: string; bulan?: string; kategori?: string; status?: string };

export default async function TransaksiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const school = await getSchool();
  const year = Number(sp.tahun) || school.tahunAnggaran;
  const years = await db.select().from(fiscalYears).orderBy(desc(fiscalYears.year));
  let rows = await listTrx(year);
  const q = (sp.q ?? "").trim().toLowerCase();
  if (q) rows = rows.filter((r) => [r.uid, r.receiptNo, r.title, CATEGORIES[r.category].label].join(" ").toLowerCase().includes(q));
  if (sp.bulan) rows = rows.filter((r) => r.month === Number(sp.bulan));
  if (sp.kategori) rows = rows.filter((r) => r.category === sp.kategori);
  if (sp.status) rows = rows.filter((r) => r.status === sp.status);
  const total = rows.reduce((a, b) => a + b.amount, 0);

  return (
    <div>
      <PageHeader title="Transaksi SPJ" desc="Kelola seluruh transaksi belanja beserta dokumen pertanggungjawabannya.">
        <Link href="/laporan" className="btn btn-outline"><Printer size={16} /> Laporan</Link>
        <Link href="/transaksi/baru" className="btn btn-primary"><Plus size={16} /> Tambah Transaksi</Link>
      </PageHeader>

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <div className="lg:col-span-2">
          <label className="label">Cari (nama, ID, nomor kuitansi)</label>
          <input name="q" defaultValue={sp.q} className="input" placeholder="Cari transaksi..." />
        </div>
        <div>
          <label className="label">Tahun anggaran</label>
          <select name="tahun" defaultValue={String(year)} className="input">
            {[...new Set([year, ...years.map((y) => y.year)])].sort((a, b) => b - a).map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Bulan</label>
          <select name="bulan" defaultValue={sp.bulan ?? ""} className="input">
            <option value="">Semua</option>
            {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Kategori</label>
          <select name="kategori" defaultValue={sp.kategori ?? ""} className="input">
            <option value="">Semua</option>
            {CATEGORY_LIST.map((c) => <option key={c.key} value={c.key}>{c.short}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Kelengkapan</label>
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">Semua</option>
            <option value="lengkap">Lengkap</option>
            <option value="belum">Belum lengkap</option>
            <option value="periksa">Perlu diperiksa</option>
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button className="btn btn-primary"><Search size={15} /> Terapkan Filter</button>
          <Link href="/transaksi" className="btn btn-outline">Reset</Link>
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>ID / Kuitansi</th><th>Tanggal</th><th>Kategori</th><th>Uraian</th><th className="text-right">Jumlah</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/transaksi/${r.id}`} className="font-semibold text-navy-700 hover:underline">{r.uid}</Link>
                    <div className="text-xs text-slate-500">{r.receiptNo}</div>
                  </td>
                  <td className="whitespace-nowrap">{tgl(r.date, "-")}</td>
                  <td><span className="badge text-white" style={{ background: CATEGORIES[r.category].color }}>{CATEGORIES[r.category].short}</span></td>
                  <td className="max-w-xs">{r.title}{r.isFinal && <span className="ml-2 badge bg-slate-200 text-slate-700">FINAL</span>}</td>
                  <td className="whitespace-nowrap text-right">{rp(r.amount)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><RowActions id={r.id} uid={r.uid} isFinal={r.isFinal} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-slate-500">Tidak ada transaksi yang sesuai.</td></tr>}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-navy-100 bg-navy-50 font-bold text-navy-900">
                  <td colSpan={4} className="px-3 py-2 text-right">Total {rows.length} transaksi</td>
                  <td className="px-3 py-2 text-right">{rp(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
