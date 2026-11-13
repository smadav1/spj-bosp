import Link from "next/link";
import { FileCheck2, FileWarning, Wallet, Receipt, Plus, Printer, Settings } from "lucide-react";
import { getSchool, schoolComplete } from "@/lib/settings";
import { listTrx } from "@/lib/trx";
import { CATEGORY_LIST } from "@/lib/categories";
import { rp, tgl } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const sp = await searchParams;
  const school = await getSchool();
  const year = Number(sp.tahun) || school.tahunAnggaran;
  const rows = await listTrx(year);
  const total = rows.reduce((a, b) => a + b.amount, 0);
  const lengkap = rows.filter((r) => r.status === "lengkap").length;
  const belum = rows.length - lengkap;
  const perCat = CATEGORY_LIST.map((c) => {
    const r = rows.filter((x) => x.category === c.key);
    return { ...c, n: r.length, sum: r.reduce((a, b) => a + b.amount, 0) };
  });
  const maxSum = Math.max(1, ...perCat.map((c) => c.sum));
  const cards = [
    { t: "Total Transaksi", v: String(rows.length), i: Receipt, c: "bg-navy-50 text-navy-700" },
    { t: "Total Nilai Belanja", v: rp(total), i: Wallet, c: "bg-sky-50 text-sky-700" },
    { t: "Dokumen Lengkap", v: String(lengkap), i: FileCheck2, c: "bg-emerald-50 text-emerald-700" },
    { t: "Belum Lengkap / Perlu Diperiksa", v: String(belum), i: FileWarning, c: "bg-amber-50 text-amber-700" },
  ];
  return (
    <div>
      <PageHeader title="Dashboard" desc={`${school.nama || "Sekolah"} - Tahun Anggaran ${year}`}>
        <Link href="/transaksi/baru" className="btn btn-primary"><Plus size={16} /> Tambah Transaksi</Link>
        <Link href={`/laporan?tahun=${year}`} className="btn btn-outline"><Printer size={16} /> Cetak Laporan</Link>
        <Link href="/pengaturan" className="btn btn-outline"><Settings size={16} /> Pengaturan Sekolah</Link>
      </PageHeader>

      {!schoolComplete(school) && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Identitas sekolah belum lengkap (nama sekolah, kepala sekolah, bendahara). Lengkapi di{" "}
          <Link href="/pengaturan" className="font-semibold underline">Pengaturan Sekolah</Link> agar muncul otomatis pada dokumen.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.t} className="card flex items-center gap-4 p-5">
            <div className={`grid h-12 w-12 place-items-center rounded-xl ${c.c}`}><c.i size={22} /></div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500">{c.t}</div>
              <div className="truncate text-xl font-bold text-navy-900">{c.v}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <section className="card p-5 xl:col-span-2">
          <h2 className="mb-4 font-bold text-navy-900">Transaksi &amp; Nilai per Kategori</h2>
          <div className="space-y-4">
            {perCat.map((c) => (
              <div key={c.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-700">{c.short}</span>
                  <span className="text-xs text-slate-500">{c.n} transaksi</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(c.sum / maxSum) * 100}%`, background: c.color }} />
                </div>
                <div className="mt-0.5 text-right text-xs font-semibold text-navy-800">{rp(c.sum)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-bold text-navy-900">Riwayat Transaksi Terbaru</h2>
            <Link href="/transaksi" className="text-sm font-semibold text-navy-600 hover:underline">Lihat semua</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Tanggal</th><th>Uraian</th><th className="text-right">Jumlah</th><th>Status</th></tr></thead>
              <tbody>
                {[...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{tgl(r.date, "-")}</td>
                    <td>
                      <Link href={`/transaksi/${r.id}`} className="font-medium text-navy-700 hover:underline">{r.title}</Link>
                      <div className="text-xs text-slate-500">{r.uid} - {r.receiptNo}</div>
                    </td>
                    <td className="text-right whitespace-nowrap">{rp(r.amount)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-500">Belum ada transaksi. Klik “Tambah Transaksi” untuk memulai.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
