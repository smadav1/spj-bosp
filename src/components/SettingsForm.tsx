"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, KeyRound } from "lucide-react";
import type { School, PrintSettings } from "@/lib/settings";
import { formatReceiptNo } from "@/lib/format";
import FileUploader from "./FileUploader";

function T({ label, v, on, span, type = "text", ph }: { label: string; v: string | number; on: (s: string) => void; span?: boolean; type?: string; ph?: string }) {
  return (
    <div className={span ? "md:col-span-2" : ""}>
      <label className="label">{label}</label>
      <input className="input" type={type} value={v} placeholder={ph} onChange={(e) => on(e.target.value)} />
    </div>
  );
}

export default function SettingsForm({ school: s0, print: p0 }: { school: School; print: PrintSettings }) {
  const router = useRouter();
  const [s, setS] = useState(s0);
  const [p, setP] = useState(p0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current: "", password: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const ss = (k: keyof School) => (v: string) => setS((x) => ({ ...x, [k]: v }));
  const pp = (k: keyof PrintSettings) => (v: string | boolean) => setP((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg("");
    const a = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "school", value: s }) });
    const b = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "print", value: p }) });
    setBusy(false);
    setMsg(a.ok && b.ok ? "Pengaturan berhasil disimpan." : "Gagal menyimpan pengaturan.");
    router.refresh();
  }
  async function changePw() {
    setPwMsg("");
    if (pw.password !== pw.confirm) return setPwMsg("Konfirmasi password tidak sama");
    const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "password", ...pw }) });
    const j = await r.json().catch(() => ({}));
    setPwMsg(r.ok ? "Password berhasil diganti." : j.error ?? "Gagal");
    if (r.ok) setPw({ current: "", password: "", confirm: "" });
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-4 font-bold text-navy-900">Identitas Sekolah</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <T label="Nama Sekolah" v={s.nama} on={ss("nama")} span />
          <T label="NPSN" v={s.npsn} on={ss("npsn")} />
          <T label="Tahun Anggaran (aktif)" v={s.tahunAnggaran} on={ss("tahunAnggaran")} type="number" />
          <T label="Alamat Sekolah" v={s.alamat} on={ss("alamat")} span />
          <T label="Desa/Kelurahan" v={s.desa} on={ss("desa")} />
          <T label="Kecamatan" v={s.kecamatan} on={ss("kecamatan")} />
          <T label="Kabupaten/Kota" v={s.kabupaten} on={ss("kabupaten")} />
          <T label="Provinsi" v={s.provinsi} on={ss("provinsi")} />
          <T label="Kode Pos" v={s.kodePos} on={ss("kodePos")} />
          <div />
          <T label="Nama Kepala Sekolah" v={s.kepsek} on={ss("kepsek")} />
          <T label="NIP Kepala Sekolah" v={s.nipKepsek} on={ss("nipKepsek")} />
          <T label="Nama Bendahara BOSP" v={s.bendahara} on={ss("bendahara")} />
          <T label="NIP Bendahara (jika ada)" v={s.nipBendahara} on={ss("nipBendahara")} />
          <T label="Nama Operator Sekolah" v={s.operator} on={ss("operator")} />
        </div>
        <div className="mt-5">
          <FileUploader trxId={null} slot="logo" label="Logo Sekolah" max={1} imagesOnly compact
            files={s0.logoFileId ? [{ id: s0.logoFileId, name: "Logo sekolah", mime: "image/png", size: 0 }] : []} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-bold text-navy-900">Kop Surat</h2>
        <p className="mb-4 text-xs text-slate-500">Nama sekolah, NPSN, alamat, dan logo diambil dari identitas sekolah. Isi baris tambahan di bawah bila diperlukan.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <T label="Baris kop 1 (contoh: PEMERINTAH KABUPATEN ...)" v={p.kopBaris1} on={pp("kopBaris1") as (s: string) => void} span />
          <T label="Baris kop 2 (contoh: DINAS PENDIDIKAN ...)" v={p.kopBaris2} on={pp("kopBaris2") as (s: string) => void} span />
          <T label="Baris kontak (telepon / email / website)" v={p.kopKontak} on={pp("kopKontak") as (s: string) => void} span />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.kopKuitansi} onChange={(e) => pp("kopKuitansi")(e.target.checked)} /> Gunakan kop surat pada kuitansi</label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-navy-900">Tanda Tangan &amp; Kuitansi</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <T label="Jabatan penandatangan kepala sekolah" v={p.jabatanKepsek} on={pp("jabatanKepsek") as (s: string) => void} />
          <T label="Jabatan penandatangan bendahara" v={p.jabatanBendahara} on={pp("jabatanBendahara") as (s: string) => void} />
          <T label="Tempat penandatanganan (kota/kabupaten)" v={p.tempatTtd} on={pp("tempatTtd") as (s: string) => void} ph="Kosong = kabupaten sekolah" />
          <div>
            <T label="Format nomor kuitansi" v={p.receiptFormat} on={pp("receiptFormat") as (s: string) => void} />
            <p className="mt-1 text-xs text-slate-500">Token: {"{NO}"} {"{NO3}"} {"{NO4}"} (urutan), {"{TAHUN}"}, {"{BULAN}"} (romawi). Contoh hasil: <b>{formatReceiptNo(p.receiptFormat, 1, s.tahunAnggaran, 1)}</b></p>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.tampilNip} onChange={(e) => pp("tampilNip")(e.target.checked)} /> Tampilkan NIP di bawah nama penandatangan</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.kuitansiKepsek} onChange={(e) => pp("kuitansiKepsek")(e.target.checked)} /> Kuitansi memuat tanda tangan kepala sekolah</label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-navy-900">Pengaturan Cetak Bawaan (Kertas F4: 21,5 × 33 cm)</h2>
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="label">Orientasi</label>
            <select className="input" value={p.orientation} onChange={(e) => pp("orientation")(e.target.value)}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          {([["mt", "Margin atas (cm)"], ["mb", "Margin bawah (cm)"], ["ml", "Margin kiri (cm)"], ["mr", "Margin kanan (cm)"]] as const).map(([k, l]) => (
            <T key={k} label={l} type="number" v={p[k]} on={(v) => setP((x) => ({ ...x, [k]: Number(v) }))} />
          ))}
        </div>
      </section>

      <div className="card sticky bottom-3 z-10 flex items-center justify-between gap-3 border-navy-200 p-4 shadow-lg">
        <span className={`text-sm ${msg.includes("Gagal") ? "text-red-700" : "text-emerald-700"}`}>{msg}</span>
        <button className="btn btn-primary" disabled={busy} onClick={save}><Save size={16} /> {busy ? "Menyimpan..." : "Simpan Pengaturan"}</button>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-navy-900"><KeyRound size={18} /> Ganti Password Administrator</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <T label="Password lama" type="password" v={pw.current} on={(v) => setPw({ ...pw, current: v })} />
          <T label="Password baru (min. 8 karakter)" type="password" v={pw.password} on={(v) => setPw({ ...pw, password: v })} />
          <T label="Ulangi password baru" type="password" v={pw.confirm} on={(v) => setPw({ ...pw, confirm: v })} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn btn-outline" onClick={changePw}>Ganti Password</button>
          <span className="text-sm text-slate-600">{pwMsg}</span>
        </div>
      </section>
    </div>
  );
}
