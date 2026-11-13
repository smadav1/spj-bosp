"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, RotateCcw } from "lucide-react";
import { TEMPLATES } from "@/lib/docs/templates";

export default function TemplateEditor({ saved }: { saved: Record<string, string> }) {
  const router = useRouter();
  const [t, setT] = useState<Record<string, string>>(() => Object.fromEntries(TEMPLATES.map((d) => [d.key, saved[d.key] ?? d.text])));
  const [msg, setMsg] = useState("");
  async function save() {
    const overrides: Record<string, string> = {};
    for (const d of TEMPLATES) if (t[d.key].trim() !== d.text.trim()) overrides[d.key] = t[d.key];
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "templates", value: overrides }) });
    setMsg(r.ok ? "Template tersimpan." : "Gagal menyimpan.");
    router.refresh();
  }
  return (
    <div className="space-y-5">
      {TEMPLATES.map((d) => (
        <section key={d.key} className="card p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-bold text-navy-900">{d.label}</h2>
            <button className="btn btn-outline btn-sm" onClick={() => setT({ ...t, [d.key]: d.text })}><RotateCcw size={13} /> Kembalikan bawaan</button>
          </div>
          <textarea className="input font-mono" rows={Math.min(14, Math.max(3, t[d.key].split("\n").length + 1))} value={t[d.key]} onChange={(e) => setT({ ...t, [d.key]: e.target.value })} />
          <p className="mt-1 text-xs text-slate-500">Variabel tersedia: {d.vars.split(", ").map((v) => `{{${v}}}`).join("  ")}. Variabel yang datanya kosong tampil sebagai titik-titik.</p>
        </section>
      ))}
      <div className="card sticky bottom-3 flex items-center justify-between border-navy-200 p-4 shadow-lg">
        <span className="text-sm text-emerald-700">{msg}</span>
        <button className="btn btn-primary" onClick={save}><Save size={16} /> Simpan Template</button>
      </div>
    </div>
  );
}
