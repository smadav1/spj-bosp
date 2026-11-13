import Link from "next/link";
import { FileSpreadsheet, FileText, FileDown, Eye, Printer } from "lucide-react";
import { getSchool } from "@/lib/settings";
import { getReport } from "@/lib/trx";
import { CATEGORIES } from "@/lib/categories";
import { rp, rupiah, tgl } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

function Rekap({ title, head, list }: { title: string; head: string; list: { label: string; n: number; sum: number }[] }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="p-5 pb-3 font-bold text-navy-900">{title}</h2>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>{head}</th><th className="text-center">Jumlah Transaksi</th><th className="text-right">Total (Rp)</th></tr></thead>
          <tbody>
            {list.map((x) => <tr key={x.label}><td>{x.label}</td><td className="text-center">{x.n}</td><td className="text-right">{rupiah(x.sum)}</td></tr>)}
          </tbody>
          <tfoot>
            <tr className="bg-navy-50 font-bold text-navy-900"><td className="px-3 py-2">TOTAL</td><td className="px-3 py-2 text-center">{list.reduce((a, b) => a + b.n, 0)}</td><td className="px-3 py-2 text-right">{rupiah(list.reduce((a, b) => a + b.sum, 0))}</td></tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export default async function Laporan({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const sp = await searchParams;
  const school = await getSchool();
  const year = Number(sp.tahun) || school.tahunAnggaran;
  const rep = await getReport(year);
  const base = `/api/export?src=laporan&year=${year}`;
  return (
    <div>
      <PageHeader title="Laporan & Rekapitulasi" desc={`Tahun Anggaran ${year} - total pengeluaran ${rp(rep.total)} dari ${rep.rows.length} transaksi`}>
        <form className="flex gap-2">
          <input name="tahun" type="number" defaultValue={year} className="input w-28" />
          <button className="btn btn-outline">Tampilkan</button>
        </form>
      </PageHeader>

      <div className="card mb-6 flex flex-wrap items-center gap-2 p-4">
        <span className="mr-auto text-sm font-semibold text-navy-900">Ekspor &amp; cetak laporan</span>
        <Link target="_blank" href={`/cetak/laporan?tahun=${year}`} className="btn btn-outline"><Eye size={15} /> Lihat Preview</Link>
        <Link target="_blank" href={`/cetak/laporan?tahun=${year}&print=1`} className="btn btn-outline"><Printer size={15} /> Cetak</Link>
        <a href={`${base}&format=xlsx`} className="btn btn-success"><FileSpreadsheet size={15} /> Excel</a>
        <a href={`${base}&format=docx&o=l`} className="btn btn-primary"><FileText size={15} /> Word</a>
        <a href={`${base}&format=pdf&o=l`} className="btn btn-primary"><FileDown size={15} /> PDF</a>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <Rekap title="Rekap Transaksi per Bulan" head="Bulan" list={rep.perBulan} />
          <Rekap title="Rekap Transaksi per Kategori" head="Kategori" list={rep.perKategori} />
        </div>
        <Rekap title="Rekap Berdasarkan Jenis Belanja" head="Jenis Belanja" list={rep.perJenis} />

        <section className="card overflow-hidden">
          <h2 className="p-5 pb-3 font-bold text-navy-900">Daftar Seluruh Transaksi</h2>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>ID</th><th>No. Kuitansi</th><th>Tanggal</th><th>Kategori</th><th>Uraian</th><th className="text-right">Jumlah</th><th>Status</th></tr></thead>
              <tbody>
                {rep.rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/transaksi/${r.id}`} className="font-semibold text-navy-700 hover:underline">{r.uid}</Link></td>
                    <td>{r.receiptNo}</td><td className="whitespace-nowrap">{tgl(r.date, "-")}</td>
                    <td>{CATEGORIES[r.category].short}</td><td>{r.title}</td>
                    <td className="text-right whitespace-nowrap">{rp(r.amount)}</td><td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {rep.rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Belum ada transaksi pada tahun ini.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <h2 className="p-5 pb-3 font-bold text-navy-900">Rekap Dokumen Belum Lengkap ({rep.belum.length})</h2>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>ID</th><th>Kategori</th><th>Uraian</th><th>Kekurangan / catatan</th></tr></thead>
              <tbody>
                {rep.belum.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/transaksi/${r.id}`} className="font-semibold text-navy-700 hover:underline">{r.uid}</Link></td>
                    <td>{CATEGORIES[r.category].short}</td><td>{r.title}</td>
                    <td><ul className="list-disc pl-4 text-xs">{r.checks.map((c, i) => <li key={i} className={c.level === "error" ? "text-red-700" : "text-amber-700"}>{c.msg}</li>)}</ul></td>
                  </tr>
                ))}
                {rep.belum.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-emerald-700">Seluruh dokumen lengkap.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
