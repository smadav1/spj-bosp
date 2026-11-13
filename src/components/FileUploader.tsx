"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, RefreshCw, FileText, Eye } from "lucide-react";

export type FileItem = { id: number; name: string; mime: string; size: number };

/** Kompres gambar di browser: maksimal 1600px, kualitas JPEG 0.85 (tetap terbaca). */
async function prepare(file: File): Promise<{ blob: Blob; name: string; w: number; h: number; type: string }> {
  if (file.type === "application/pdf") return { blob: file, name: file.name, w: 0, h: 0, type: file.type };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Gambar tidak dapat dibaca"));
      i.src = url;
    });
    const max = 1600;
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * s);
    const h = Math.round(img.naturalHeight * s);
    if (s === 1 && file.size < 400 * 1024) return { blob: file, name: file.name, w, h, type: file.type };
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.85));
    if (blob.size >= file.size && s === 1) return { blob: file, name: file.name, w, h, type: file.type };
    return { blob, name: file.name.replace(/\.\w+$/, "") + ".jpg", w, h, type: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Props = {
  trxId: number | null;
  slot: string;
  label: string;
  max: number;
  hint?: string;
  files: FileItem[];
  disabled?: boolean;
  imagesOnly?: boolean;
  compact?: boolean;
};

export default function FileUploader({ trxId, slot, label, max, hint, files, disabled, imagesOnly, compact }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const accept = imagesOnly ? "image/jpeg,image/png" : "image/jpeg,image/png,application/pdf";

  async function upload(list: File[], rid?: number) {
    setErr("");
    const room = max - files.length;
    const use = rid ? list.slice(0, 1) : list.slice(0, Math.max(room, 0));
    if (!rid && list.length > room) setErr(`Maksimal ${max} berkas. ${list.length - room} berkas tidak diunggah.`);
    for (let i = 0; i < use.length; i++) {
      setBusy(`Mengunggah ${i + 1}/${use.length}...`);
      try {
        const p = await prepare(use[i]);
        const fd = new FormData();
        fd.append("file", new File([p.blob], p.name, { type: p.type }));
        fd.append("slot", slot);
        if (trxId) fd.append("transactionId", String(trxId));
        fd.append("width", String(p.w));
        fd.append("height", String(p.h));
        if (rid) fd.append("replaceId", String(rid));
        const r = await fetch("/api/files", { method: "POST", body: fd });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErr(j.error ?? "Gagal mengunggah");
          break;
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal mengunggah");
        break;
      }
    }
    setBusy("");
    router.refresh();
  }

  async function remove(f: FileItem) {
    if (!confirm(`Hapus berkas "${f.name}"?`)) return;
    const r = await fetch(`/api/files/${f.id}`, { method: "DELETE" });
    if (!r.ok) setErr((await r.json().catch(() => ({}))).error ?? "Gagal menghapus");
    router.refresh();
  }

  return (
    <div className={compact ? "" : "rounded-xl border border-slate-200 p-4"}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-navy-900">{label}</div>
          <div className="text-xs text-slate-500">
            {files.length}/{max} berkas {hint ? `- ${hint}` : ""} - JPG, PNG{imagesOnly ? "" : ", PDF"}
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" disabled={disabled || !!busy || files.length >= max} onClick={() => input.current?.click()}>
          <Upload size={14} /> {busy || "Unggah"}
        </button>
        <input ref={input} type="file" hidden multiple={max > 1} accept={accept} onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ""; if (l.length) upload(l); }} />
        <input ref={replaceInput} type="file" hidden accept={accept} onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ""; if (l.length && replaceId) upload(l, replaceId); }} />
      </div>
      {err && <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</p>}
      {files.length === 0 ? (
        <p className="rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-500">Belum ada berkas diunggah</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {files.map((f) => (
            <div key={f.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] bg-white">
                {f.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${f.id}`} alt={f.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1 text-red-600"><FileText size={32} /><span className="text-xs font-bold">PDF</span></span>
                )}
                <span className="absolute right-1 top-1 hidden rounded bg-black/60 p-1 text-white group-hover:block"><Eye size={13} /></span>
              </a>
              <div className="truncate px-2 pt-1 text-[11px] text-slate-600" title={f.name}>{f.name}</div>
              <div className="flex justify-end gap-1 p-1">
                <button type="button" disabled={disabled || !!busy} title="Ganti" className="rounded p-1 text-navy-700 hover:bg-navy-50 disabled:opacity-40" onClick={() => { setReplaceId(f.id); setTimeout(() => replaceInput.current?.click(), 0); }}><RefreshCw size={14} /></button>
                <button type="button" disabled={disabled} title="Hapus" className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-40" onClick={() => remove(f)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
