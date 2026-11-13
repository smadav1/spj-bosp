import Link from "next/link";
import { CATEGORY_LIST, CATEGORIES, isCat } from "@/lib/categories";
import { getSchool } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import TransactionForm from "@/components/TransactionForm";

export const dynamic = "force-dynamic";

export default async function Baru({ searchParams }: { searchParams: Promise<{ kategori?: string }> }) {
  const sp = await searchParams;
  const school = await getSchool();
  if (sp.kategori && isCat(sp.kategori)) {
    return (
      <div>
        <PageHeader title="Tambah Transaksi" desc={`${CATEGORIES[sp.kategori].label} - Tahun Anggaran ${school.tahunAnggaran}`}>
          <Link href="/transaksi/baru" className="btn btn-outline">Ganti kategori</Link>
        </PageHeader>
        <TransactionForm category={sp.kategori} year={school.tahunAnggaran} />
      </div>
    );
  }
  return (
    <div>
      <PageHeader title="Tambah Transaksi" desc="Pilih jenis transaksi yang akan dibuat SPJ-nya." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CATEGORY_LIST.map((c, i) => (
          <Link key={c.key} href={`/transaksi/baru?kategori=${c.key}`} className="card group flex flex-col p-5 transition hover:border-navy-400 hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: c.color }}>{i + 1}</span>
              <span className="font-bold text-navy-900 group-hover:text-navy-600">{c.label}</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              {c.docs.filter((d) => !d.isScan).map((d) => <li key={d.key}>• {d.label}</li>)}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
