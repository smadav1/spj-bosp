"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, AlertTriangle } from "lucide-react";

export default function BackupPanel() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function restore(f: File) {
    if (!confirm("RESTORE akan MENGGANTI seluruh data transaksi, berkas, dan pengaturan saat ini dengan isi backup. Lanjutkan?")) return;
    setBusy(true);
    setMsg("Memulihkan data...");
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/backup", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? `Restore berhasil: ${j.transaksi} transaksi dan ${j.berkas} berkas dipulihkan.` : j.error ?? "Restore gagal");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="mb-1 font-bold text-navy-900">Backup Database</h2>
        <p className="mb-4 text-sm text-slate-600">Unduh seluruh data (transaksi, pengaturan sekolah, tahun anggaran, riwayat, dan semua foto/PDF) dalam satu berkas JSON. Simpan di tempat aman, misalnya flashdisk atau penyimpanan cloud.</p>
        <a href="/api/backup" className="btn btn-primary"><Download size={16} /> Unduh Backup</a>
      </section>
      <section className="card p-6">
        <h2 className="mb-1 font-bold text-navy-900">Restore Database</h2>
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /> Data saat ini akan diganti dengan isi berkas backup. Akun login tidak berubah.</p>
        <button className="btn btn-outline" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} /> Pilih Berkas Backup (.json)</button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) restore(f); }} />
        {msg && <p className="mt-3 text-sm text-slate-700">{msg}</p>}
      </section>
    </div>
  );
}
