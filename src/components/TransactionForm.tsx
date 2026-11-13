"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, X } from "lucide-react";
import { CATEGORIES, CatKey, Data, Field, computeAmount, dateList, lines } from "@/lib/categories";
import { rp, terbilang, tgl } from "@/lib/format";

type Props = {
  category: CatKey;
  id?: number;
  initialData?: Data;
  initialReceiptNo?: string;
  year: number;
  uid?: string;
};

const spanCls = { 1: "", 2: "md:col-span-2", 3: "md:col-span-3" } as const;

export default function TransactionForm({ category, id, initialData, initialReceiptNo, year, uid }: Props) {
  const cat = CATEGORIES[category];
  const router = useRouter();
  const [d, setD] = useState<Data>(() => ({ ...cat.defaults(), ...(initialData ?? {}) }));
  const [receiptNo, setReceiptNo] = useState(initialReceiptNo ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [newDate, setNewDate] = useState<Record<string, string>>({});
  const amount = useMemo(() => computeAmount(category, d), [category, d]);
  const set = (k: string, v: unknown) => setD((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await fetch(id ? `/api/transactions/${id}` : "/api/transactions", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, data: d, receiptNo, fiscalYear: year }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Gagal menyimpan");
    router.push(`/transaksi/${id ?? j.id}`);
    router.refresh();
  }

  function renderField(f: Field) {
    const v = d[f.name];
    const common = { id: f.name, className: "input" };
    switch (f.type) {
      case "textarea":
        return <textarea {...common} rows={3} placeholder={f.placeholder} value={(v as string) ?? ""} onChange={(e) => set(f.name, e.target.value)} />;
      case "names":
        return (
          <>
            <textarea {...common} rows={6} value={(v as string) ?? ""} onChange={(e) => set(f.name, e.target.value)} placeholder="Ketik satu nama per baris" />
            <p className="mt-1 text-xs text-slate-500">{lines(v).length} nama</p>
          </>
        );
      case "select":
        return (
          <select {...common} value={(v as string) ?? ""} onChange={(e) => set(f.name, e.target.value)}>
            <option value="">- Pilih -</option>
            {f.options?.map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case "dates": {
        const list = dateList(v);
        const nd = newDate[f.name] ?? "";
        const add = () => {
          if (!nd || list.includes(nd)) return;
          set(f.name, [...list, nd].sort());
          setNewDate({ ...newDate, [f.name]: "" });
        };
        return (
          <div>
            <div className="flex gap-2">
              <input type="date" className="input max-w-[200px]" value={nd} onChange={(e) => setNewDate({ ...newDate, [f.name]: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
              <button type="button" onClick={add} className="btn btn-outline"><Plus size={15} /> Tambah tanggal</button>
              {list.length > 0 && <button type="button" onClick={() => set(f.name, [])} className="btn btn-danger">Kosongkan</button>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {list.map((x) => (
                <span key={x} className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800">
                  {tgl(x)}
                  <button type="button" onClick={() => set(f.name, list.filter((y) => y !== x))} aria-label="Hapus"><X size={13} /></button>
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{list.length} tanggal kegiatan</p>
          </div>
        );
      }
      case "items": {
        const cfg = f.items!;
        const rows: Data[] = Array.isArray(v) ? (v as Data[]) : [];
        const upd = (i: number, k: string, val: string) => set(f.name, rows.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
        const total = rows.reduce((a, r) => a + (Number(r[cfg.qty]) || 0) * (Number(r[cfg.price]) || 0), 0);
        return (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-navy-50 text-xs text-navy-800">
                <tr>
                  <th className="w-10 p-2">No</th>
                  {cfg.cols.map((c) => <th key={c.name} className="p-2 text-left" style={{ width: c.w }}>{c.label}</th>)}
                  <th className="p-2 text-right">Total (Rp)</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2 text-center text-slate-500">{i + 1}</td>
                    {cfg.cols.map((c) => (
                      <td key={c.name} className="p-1">
                        <input className="input" type={c.type} min={c.type === "number" ? 0 : undefined} step="any" value={(r[c.name] as string) ?? ""} onChange={(e) => upd(i, c.name, e.target.value)} />
                      </td>
                    ))}
                    <td className="whitespace-nowrap p-2 text-right font-semibold">{new Intl.NumberFormat("id-ID").format((Number(r[cfg.qty]) || 0) * (Number(r[cfg.price]) || 0))}</td>
                    <td className="p-1">
                      <button type="button" disabled={rows.length <= 1} onClick={() => set(f.name, rows.filter((_, j) => j !== i))} className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label="Hapus baris"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={cfg.cols.length + 1} className="p-2 text-right font-semibold">{cfg.totalLabel}</td>
                  <td className="p-2 text-right font-bold text-navy-800">{new Intl.NumberFormat("id-ID").format(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <div className="p-2">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => set(f.name, [...rows, Object.fromEntries(cfg.cols.map((c) => [c.name, ""]))])}>
                <Plus size={14} /> {cfg.addLabel}
              </button>
            </div>
          </div>
        );
      }
      default:
        return (
          <input
            {...common}
            type={f.type === "number" ? "number" : f.type}
            min={f.type === "number" ? 0 : undefined}
            step={f.type === "number" ? "any" : undefined}
            placeholder={f.placeholder}
            value={(v as string) ?? ""}
            onChange={(e) => set(f.name, e.target.value)}
          />
        );
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</div>
          <div className="text-lg font-bold" style={{ color: cat.color }}>{cat.label}</div>
          {uid && <div className="text-xs text-slate-500">ID Transaksi: {uid}</div>}
        </div>
        <div className="w-full max-w-xs">
          <label className="label">Nomor kuitansi {id ? "" : "(kosongkan = otomatis)"}</label>
          <input className="input" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="Otomatis sesuai format & tahun anggaran" />
        </div>
      </div>

      {cat.sections.map((s) => (
        <section key={s.title} className="card p-5">
          <h2 className="font-bold text-navy-900">{s.title}</h2>
          {s.desc && <p className="mb-3 text-xs text-slate-500">{s.desc}</p>}
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {s.fields.map((f) => (
              <div key={f.name} className={spanCls[f.span ?? 1]}>
                <label className="label" htmlFor={f.name}>{f.label}</label>
                {renderField(f)}
                {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="card sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 border-navy-200 p-4 shadow-lg">
        <div>
          <div className="text-xs text-slate-500">Total pembayaran (otomatis)</div>
          <div className="text-xl font-bold text-navy-900">{rp(amount)}</div>
          <div className="text-xs italic text-slate-500">{terbilang(amount)}</div>
        </div>
        <div className="flex items-center gap-3">
          {err && <span className="text-sm text-red-700">{err}</span>}
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>Batal</button>
          <button className="btn btn-primary" disabled={busy}>
            <Save size={16} /> {busy ? "Menyimpan..." : id ? "Simpan Perubahan" : "Simpan & Lanjut Unggah Dokumen"}
          </button>
        </div>
      </div>
    </form>
  );
}
