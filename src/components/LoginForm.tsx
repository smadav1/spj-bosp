"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";

export default function LoginForm({ setup }: { setup: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", username: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (setup && f.password !== f.confirm) return setErr("Konfirmasi password tidak sama");
    setBusy(true);
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: setup ? "setup" : "login", ...f }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Gagal");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-7">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 text-white">
          {setup ? <ShieldCheck size={22} /> : <LogIn size={22} />}
        </div>
        <div>
          <h2 className="text-lg font-bold text-navy-900">{setup ? "Buat Akun Administrator" : "Masuk"}</h2>
          <p className="text-xs text-slate-500">
            {setup ? "Pengaturan awal: buat akun administrator pertama." : "Silakan login untuk melanjutkan."}
          </p>
        </div>
      </div>
      {setup && (
        <div>
          <label className="label">Nama lengkap</label>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
      )}
      <div>
        <label className="label">Username</label>
        <input className="input" autoFocus required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
      </div>
      <div>
        <label className="label">Password {setup && "(minimal 8 karakter)"}</label>
        <input className="input" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </div>
      {setup && (
        <div>
          <label className="label">Ulangi password</label>
          <input className="input" type="password" required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        </div>
      )}
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Memproses..." : setup ? "Buat Akun & Masuk" : "Masuk"}
      </button>
    </form>
  );
}
