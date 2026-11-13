import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CheckCircle2, AlertTriangle, XCircle, Eye, Printer, FileText, FileDown, PackageCheck, Layers, Paperclip, FileStack } from "lucide-react";
import { db } from "@/db";
import { auditLogs, transactions } from "@/db/schema";
import { CATEGORIES, statusOf } from "@/lib/categories";
import { loadDocs } from "@/lib/trx";
import { dateTimeId, rp, terbilang, tgl } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/ui";
import { DetailActions } from "@/components/TrxActions";
import FileUploader from "@/components/FileUploader";

export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const r = await loadDocs(id);
  if (!r) notFound();
  const { ctx, docs, checks } = r;
  const t = ctx.trx;
  const cat = CATEGORIES[t.category];
  const status = statusOf(checks);
  const isFinal = (await db.select({ f: transactions.isFinal }).from(transactions).where(eq(transactions.id, id)).limit(1))[0]?.f === true;
  const logs = await db.select().from(auditLogs).where(eq(auditLogs.transactionId, id)).orderBy(desc(auditLogs.createdAt)).limit(40);
  const have = new Set(docs.map((d) => d.key));
  const view = (q: string) => `/cetak/${id}?${q}`;
  const exp = (key: string, f: string) => `/api/export?src=trx&id=${id}&docs=${key}&format=${f}`;

  return (
    <div>
      <PageHeader title={t.uid} desc={cat.label}>
        <DetailActions id={id} uid={t.uid} isFinal={isFinal} />
      </PageHeader>

      <div className="card mb-6 grid gap-4 p-5 md:grid-cols-4">
        <div><div className="text-xs text-slate-500">Nomor kuitansi</div><div className="font-bold text-navy-900">{t.receiptNo}</div></div>
        <div><div className="text-xs text-slate-500">Tanggal pembayaran</div><div className="font-bold text-navy-900">{tgl(t.date, "-")}</div></div>
        <div><div className="text-xs text-slate-500">Total pembayaran</div><div className="font-bold text-navy-900">{rp(t.amount)}</div><div className="text-xs italic text-slate-500">{terbilang(t.amount)}</div></div>
        <div>
          <div className="text-xs text-slate-500">Status kelengkapan</div>
          <div className="mt-1 flex items-center gap-2"><StatusBadge status={status} />{isFinal && <span className="badge bg-slate-800 text-white">FINAL</span>}</div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl bg-navy-900 p-5 text-white">
        <div className="mr-auto">
          <div className="text-lg font-bold">Cetak Dokumen SPJ</div>
          <div className="text-sm text-navy-200">Pemeriksaan kelengkapan dilakukan otomatis. Dokumen yang tersedia tetap dapat dicetak.</div>
        </div>
        <Link target="_blank" href={view("mode=paket&print=1")} className="btn bg-white text-navy-900 hover:bg-navy-50"><PackageCheck size={16} /> CETAK PAKET SPJ LENGKAP</Link>
        <Link target="_blank" href={view("mode=dokumen")} className="btn border-white/30 bg-white/10 text-white hover:bg-white/20"><Layers size={16} /> Seluruh Dokumen</Link>
        <Link target="_blank" href={view("mode=lampiran")} className="btn border-white/30 bg-white/10 text-white hover:bg-white/20"><Paperclip size={16} /> Seluruh Lampiran</Link>
        <Link target="_blank" href={view("mode=single")} className="btn border-white/30 bg-white/10 text-white hover:bg-white/20"><FileStack size={16} /> Pilih Satu Dokumen</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="card overflow-hidden xl:col-span-3">
          <h2 className="p-5 pb-3 font-bold text-navy-900">Daftar Dokumen</h2>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Dokumen</th><th>Kondisi</th><th>Aksi</th></tr></thead>
              <tbody>
                {cat.docs.map((d) => {
                  const ok = have.has(d.key);
                  return (
                    <tr key={d.key}>
                      <td className="font-medium">{d.label}<div className="text-xs font-normal text-slate-500">{d.group === "lampiran" ? "Lampiran" : d.scan || d.isScan ? "Dokumen otomatis / unggahan" : "Dokumen otomatis"}</div></td>
                      <td>{ok ? <span className="badge bg-emerald-100 text-emerald-800">Tersedia</span> : <span className="badge bg-slate-100 text-slate-600">Belum diunggah</span>}</td>
                      <td>
                        {ok ? (
                          <div className="flex flex-wrap gap-1">
                            <Link target="_blank" href={view(`mode=single&docs=${d.key}`)} className="btn btn-outline btn-sm"><Eye size={13} /> Preview</Link>
                            <Link target="_blank" href={view(`mode=single&docs=${d.key}&print=1`)} className="btn btn-outline btn-sm"><Printer size={13} /> Cetak</Link>
                            <a href={exp(d.key, "docx")} className="btn btn-outline btn-sm"><FileText size={13} /> Word</a>
                            <a href={exp(d.key, "pdf")} className="btn btn-outline btn-sm"><FileDown size={13} /> PDF</a>
                          </div>
                        ) : <span className="text-xs text-slate-400">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5 xl:col-span-2">
          <h2 className="mb-3 font-bold text-navy-900">Pemeriksaan Kelengkapan</h2>
          {checks.length === 0 ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /> Seluruh dokumen sudah lengkap. SPJ siap dicetak.</div>
          ) : (
            <ul className="space-y-2">
              {checks.map((c, i) => (
                <li key={i} className={`flex items-start gap-2 rounded-lg p-2.5 text-sm ${c.level === "error" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
                  {c.level === "error" ? <XCircle size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
                  {c.msg}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-1 font-bold text-navy-900">Unggah Dokumen &amp; Bukti</h2>
        <p className="mb-4 text-xs text-slate-500">Foto otomatis dikompres (maks. 1600 px) agar ringan tanpa mengurangi keterbacaan. Berkas tersimpan permanen di database.{isFinal && " Transaksi final: unggahan dikunci."}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {cat.slots.map((s) => (
            <div key={s.slot} className={s.max >= 10 ? "lg:col-span-2" : ""}>
              <FileUploader
                trxId={id}
                slot={s.slot}
                label={s.label}
                max={s.max}
                hint={s.hint}
                disabled={isFinal}
                files={ctx.files.filter((f) => f.slot === s.slot).map((f) => ({ id: f.id, name: f.name, mime: f.mime, size: 0 }))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-bold text-navy-900">Riwayat Perubahan</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
              <span className="w-40 shrink-0 text-xs text-slate-500">{dateTimeId(l.createdAt)}</span>
              <span className="badge bg-navy-50 text-navy-700">{l.action}</span>
              <span className="min-w-0 flex-1 text-slate-700">{l.detail}</span>
              <span className="text-xs text-slate-400">{l.userName}</span>
            </li>
          ))}
          {logs.length === 0 && <li className="py-3 text-slate-500">Belum ada riwayat.</li>}
        </ul>
      </section>
    </div>
  );
}
