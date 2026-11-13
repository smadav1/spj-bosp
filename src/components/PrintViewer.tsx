"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText, FileDown, AlertTriangle, XCircle, PackageCheck, Layers, Paperclip, CheckCircle2 } from "lucide-react";
import type { Doc, Layout } from "@/lib/docs/types";
import { F4, pageSize } from "@/lib/docs/types";
import type { Check } from "@/lib/categories";
import { Blocks } from "./DocRender";

type Props = {
  docs: Doc[];
  title: string;
  exportQuery: string;
  defaults: Layout;
  initial: string[];
  autoPrint: boolean;
  backHref: string;
  checks?: Check[];
  showPresets: boolean;
};

export default function PrintViewer({ docs, title, exportQuery, defaults, initial, autoPrint, backHref, checks, showPresets }: Props) {
  const [sel, setSel] = useState<string[]>(initial);
  const [L, setL] = useState<Layout>(defaults);
  const [showChecks, setShowChecks] = useState(true);
  const selected = useMemo(() => docs.filter((d) => sel.includes(d.key)), [docs, sel]);
  const { pw, ph } = pageSize(L);
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const num = (k: keyof Layout, v: string) => setL((p) => ({ ...p, [k]: Math.min(6, Math.max(0.5, Number(v) || 0.5)) }));

  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 1200);
    return () => clearTimeout(t);
  }, [autoPrint]);

  const q = `${exportQuery}&docs=${selected.map((d) => d.key).join(",")}&o=${L.landscape ? "l" : "p"}&mt=${L.mt}&mr=${L.mr}&mb=${L.mb}&ml=${L.ml}`;
  const none = selected.length === 0;
  const errs = (checks ?? []).filter((c) => c.level === "error");

  const preset = (keys: string[]) => setSel(keys);

  return (
    <div className="print-root min-h-screen bg-slate-300">
      <style>{`@page { size: ${L.landscape ? F4.h : F4.w}cm ${L.landscape ? F4.w : F4.h}cm; margin: ${L.mt}cm ${L.mr}cm ${L.mb}cm ${L.ml}cm; @bottom-center { content: counter(page); font-family: "Times New Roman", serif; font-size: 9pt; } }`}</style>

      <header className="no-print sticky top-0 z-30 border-b border-navy-800 bg-navy-900 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={backHref} className="btn border-white/30 bg-white/10 text-white hover:bg-white/20"><ArrowLeft size={15} /> Kembali</Link>
          <div className="mr-auto min-w-0">
            <div className="truncate text-sm font-bold">{title}</div>
            <div className="text-xs text-navy-200">Kertas F4 (21,5 × 33 cm) · {selected.length} dokumen dipilih</div>
          </div>
          <button disabled={none} onClick={() => window.print()} className="btn bg-white text-navy-900 hover:bg-navy-50"><Printer size={16} /> Cetak Dokumen</button>
          <a aria-disabled={none} href={none ? undefined : `/api/export?${q}&format=docx`} className={`btn border-white/30 bg-white/10 text-white hover:bg-white/20 ${none ? "pointer-events-none opacity-50" : ""}`}><FileText size={16} /> Download Word (.docx)</a>
          <a aria-disabled={none} href={none ? undefined : `/api/export?${q}&format=pdf`} className={`btn border-white/30 bg-white/10 text-white hover:bg-white/20 ${none ? "pointer-events-none opacity-50" : ""}`}><FileDown size={16} /> Download PDF</a>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside className="no-print w-full shrink-0 space-y-4 bg-slate-200 p-4 lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-68px)] lg:w-[310px] lg:self-start lg:overflow-y-auto">
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-bold text-navy-900">Pengaturan Cetak</h3>
            <label className="label">Orientasi</label>
            <select className="input mb-3" value={L.landscape ? "l" : "p"} onChange={(e) => setL({ ...L, landscape: e.target.value === "l" })}>
              <option value="p">Portrait</option>
              <option value="l">Landscape</option>
            </select>
            <label className="label">Margin (cm)</label>
            <div className="grid grid-cols-2 gap-2">
              {([["mt", "Atas"], ["mb", "Bawah"], ["ml", "Kiri"], ["mr", "Kanan"]] as const).map(([k, n]) => (
                <div key={k}>
                  <span className="text-[11px] text-slate-500">{n}</span>
                  <input type="number" step="0.1" min="0.5" max="6" className="input" value={L[k]} onChange={(e) => num(k, e.target.value)} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Saat dialog cetak muncul, pilih ukuran kertas F4 / sesuai ukuran halaman, skala 100%, dan matikan “Header dan footer” browser.</p>
          </div>

          <div className="card p-4">
            <h3 className="mb-2 text-sm font-bold text-navy-900">Dokumen yang dicetak</h3>
            {showPresets && (
              <div className="mb-3 grid grid-cols-1 gap-1.5">
                <button className="btn btn-outline btn-sm justify-start" onClick={() => preset(docs.filter((d) => d.inPackage).map((d) => d.key))}><PackageCheck size={14} /> Paket SPJ lengkap</button>
                <button className="btn btn-outline btn-sm justify-start" onClick={() => preset(docs.filter((d) => d.group === "dokumen").map((d) => d.key))}><Layers size={14} /> Seluruh dokumen transaksi</button>
                <button className="btn btn-outline btn-sm justify-start" onClick={() => preset(docs.filter((d) => d.group === "lampiran").map((d) => d.key))}><Paperclip size={14} /> Seluruh lampiran</button>
              </div>
            )}
            <ul className="space-y-1.5">
              {docs.map((d) => (
                <li key={d.key}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={sel.includes(d.key)} onChange={() => toggle(d.key)} />
                    <span>{d.label}{!d.inPackage && <em className="block text-[11px] text-slate-500">tidak masuk paket (diganti unggahan)</em>}</span>
                  </label>
                </li>
              ))}
            </ul>
            {showPresets && <div className="mt-3 flex gap-2 text-xs"><button className="text-navy-600 underline" onClick={() => setSel(docs.map((d) => d.key))}>Pilih semua</button><button className="text-navy-600 underline" onClick={() => setSel([])}>Kosongkan</button></div>}
          </div>

          {checks && (
            <div className="card p-4">
              <button className="mb-2 flex w-full items-center justify-between text-sm font-bold text-navy-900" onClick={() => setShowChecks(!showChecks)}>
                Pemeriksaan kelengkapan <span className="text-xs font-normal text-slate-500">{checks.length === 0 ? "Lengkap" : `${errs.length} kurang`}</span>
              </button>
              {showChecks && (checks.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16} /> Seluruh dokumen lengkap.</p>
              ) : (
                <ul className="space-y-1.5">
                  {checks.map((c, i) => (
                    <li key={i} className={`flex items-start gap-1.5 rounded p-2 text-xs ${c.level === "error" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
                      {c.level === "error" ? <XCircle size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}{c.msg}
                    </li>
                  ))}
                  <li className="text-[11px] text-slate-500">Dokumen yang tersedia tetap dapat dicetak.</li>
                </ul>
              ))}
            </div>
          )}
        </aside>

      <div className="doc-stage min-w-0 flex-1" style={{ minHeight: 300 }}>
        {selected.length === 0 && <div className="no-print py-20 text-center text-slate-100">Pilih minimal satu dokumen untuk ditampilkan.</div>}
        {selected.map((d) => (
          <article
            key={d.key}
            className="doc-sheet"
            style={{ width: `${pw}cm`, minHeight: `${ph}cm`, padding: `${L.mt}cm ${L.mr}cm ${L.mb}cm ${L.ml}cm` }}
          >
            <Blocks blocks={d.blocks} layout={L} />
          </article>
        ))}
      </div>
      </div>
    </div>
  );
}
