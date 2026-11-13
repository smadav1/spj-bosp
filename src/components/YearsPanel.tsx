"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, CheckCircle2, Archive, ArchiveRestore, FolderOpen, Printer } from "lucide-react";
import { rp } from "@/lib/format";

export type YearRow = { year: number; note: string; archived: boolean; n: number; sum: number; final: number };

export default function YearsPanel({ rows, active }: { rows: YearRow[]; active: number }) {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [err, setErr] = useState("");
  async function act(action: string, y: number) {
    const r = await fetch("/api/years", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, year: y }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error ?? "Gagal");
    else { setErr(""); setYear(""); }
    router.refresh();
  }
  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Tambah tahun anggaran</label>
          <input type="number" className="input w-40" value={year} onChange={(e) => setYear(e.target.value)} placeholder="contoh: 2026" />
        </div>
        <button className="btn btn-primary" disabled={!year} onClick={() => act("add", Number(year))}><Plus size={15} /> Tambah</button>
        {err && <span className="text-sm text-red-700">{err}</span>}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Tahun</th><th>Status</th><th className="text-center">Transaksi</th><th className="text-center">Final</th><th className="text-right">Total Belanja</th><th>Aksi</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <td className="text-base font-bold text-navy-900">{r.year}</td>
                  <td>
                    {r.year === active && <span className="badge mr-1 bg-emerald-100 text-emerald-800">Aktif</span>}
                    {r.archived && <span className="badge bg-slate-200 text-slate-700">Diarsipkan</span>}
                  </td>
                  <td className="text-center">{r.n}</td>
                  <td className="text-center">{r.final}</td>
                  <td className="text-right">{rp(r.sum)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/transaksi?tahun=${r.year}`} className="btn btn-outline btn-sm"><FolderOpen size={13} /> Buka Arsip</Link>
                      <Link href={`/laporan?tahun=${r.year}`} className="btn btn-outline btn-sm"><Printer size={13} /> Laporan</Link>
                      {r.year !== active && <button className="btn btn-outline btn-sm" onClick={() => act("activate", r.year)}><CheckCircle2 size={13} /> Jadikan Aktif</button>}
                      {r.archived
                        ? <button className="btn btn-outline btn-sm" onClick={() => act("unarchive", r.year)}><ArchiveRestore size={13} /> Batalkan Arsip</button>
                        : r.year !== active && <button className="btn btn-outline btn-sm" onClick={() => act("archive", r.year)}><Archive size={13} /> Arsipkan</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
