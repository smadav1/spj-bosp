"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Trash2, Pencil, Lock, Unlock, Eye } from "lucide-react";

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

/** Tombol aksi baris pada daftar transaksi. */
export function RowActions({ id, uid, isFinal }: { id: number; uid: string; isFinal: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function dup() {
    setBusy(true);
    const { ok, j } = await call(`/api/transactions/${id}`, "POST", { action: "duplicate" });
    setBusy(false);
    if (ok) router.push(`/transaksi/${j.id}/edit`);
    else alert(j.error ?? "Gagal");
  }
  async function del() {
    if (!confirm(`Hapus transaksi ${uid}? Seluruh lampiran/foto transaksi ini juga akan dihapus dan tidak dapat dikembalikan.`)) return;
    setBusy(true);
    const { ok, j } = await call(`/api/transactions/${id}`, "DELETE");
    setBusy(false);
    if (ok) router.refresh();
    else alert(j.error ?? "Gagal");
  }
  return (
    <div className="flex gap-1">
      <Link href={`/transaksi/${id}`} title="Buka / Dokumen" className="btn btn-outline btn-sm"><Eye size={14} /></Link>
      {!isFinal && <Link href={`/transaksi/${id}/edit`} title="Edit" className="btn btn-outline btn-sm"><Pencil size={14} /></Link>}
      <button disabled={busy} onClick={dup} title="Duplikasi" className="btn btn-outline btn-sm"><Copy size={14} /></button>
      <button disabled={busy} onClick={del} title="Hapus" className="btn btn-danger btn-sm"><Trash2 size={14} /></button>
    </div>
  );
}

/** Tombol aksi pada halaman detail transaksi. */
export function DetailActions({ id, uid, isFinal }: { id: number; uid: string; isFinal: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function dup() {
    setBusy(true);
    const { ok, j } = await call(`/api/transactions/${id}`, "POST", { action: "duplicate" });
    setBusy(false);
    if (ok) router.push(`/transaksi/${j.id}/edit`);
    else alert(j.error ?? "Gagal");
  }
  async function del() {
    if (!confirm(`Hapus transaksi ${uid}? Seluruh lampiran/foto juga akan dihapus dan tidak dapat dikembalikan.`)) return;
    setBusy(true);
    const { ok, j } = await call(`/api/transactions/${id}`, "DELETE");
    if (ok) {
      router.push("/transaksi");
      router.refresh();
    } else {
      setBusy(false);
      alert(j.error ?? "Gagal");
    }
  }
  async function fin() {
    if (!confirm("Tandai SPJ ini sebagai FINAL? Data dan lampiran tidak dapat diubah sampai dibuka kembali.")) return;
    setBusy(true);
    const { ok, j } = await call(`/api/transactions/${id}`, "POST", { action: "final" });
    setBusy(false);
    if (!ok) alert(j.error + (j.checks ? "\n\n- " + j.checks.filter((c: { level: string }) => c.level === "error").map((c: { msg: string }) => c.msg).join("\n- ") : ""));
    router.refresh();
  }
  async function reopen() {
    setBusy(true);
    await call(`/api/transactions/${id}`, "POST", { action: "reopen" });
    setBusy(false);
    router.refresh();
  }
  return (
    <>
      {!isFinal && <Link href={`/transaksi/${id}/edit`} className="btn btn-outline"><Pencil size={15} /> Edit</Link>}
      <button disabled={busy} onClick={dup} className="btn btn-outline"><Copy size={15} /> Duplikasi</button>
      {isFinal ? (
        <button disabled={busy} onClick={reopen} className="btn btn-outline"><Unlock size={15} /> Buka Kembali</button>
      ) : (
        <button disabled={busy} onClick={fin} className="btn btn-success"><Lock size={15} /> Tandai Final</button>
      )}
      <button disabled={busy} onClick={del} className="btn btn-danger"><Trash2 size={15} /> Hapus</button>
    </>
  );
}
