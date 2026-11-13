"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ReceiptText, PlusCircle, BarChart3, CalendarRange, FileCog, School, DatabaseBackup, LogOut, Menu, X,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi SPJ", icon: ReceiptText },
  { href: "/transaksi/baru", label: "Tambah Transaksi", icon: PlusCircle },
  { href: "/laporan", label: "Laporan & Rekap", icon: BarChart3 },
  { href: "/tahun", label: "Tahun Anggaran & Arsip", icon: CalendarRange },
  { href: "/pengaturan/template", label: "Template Dokumen", icon: FileCog },
  { href: "/pengaturan", label: "Pengaturan Sekolah", icon: School },
  { href: "/backup", label: "Backup & Restore", icon: DatabaseBackup },
];

export default function Sidebar({ user, school, year }: { user: string; school: string; year: number }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (href: string) => {
    if (href === "/transaksi") return path === "/transaksi" || (/^\/transaksi\/\d+/.test(path));
    return path === href;
  };
  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    router.replace("/login");
    router.refresh();
  }
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 text-white lg:hidden">
        <span className="text-sm font-bold">SPJ BOSP</span>
        <button onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[52px] bottom-0 z-20 overflow-y-auto bg-navy-900 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:top-0 lg:block lg:w-64`}
      >
        <div className="hidden border-b border-white/10 px-5 py-5 lg:block">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-200">Administrasi &amp; Cetak</div>
          <div className="mt-1 text-lg font-bold leading-tight">SPJ BOSP Sekolah</div>
        </div>
        <div className="px-5 py-4 text-xs text-navy-200">
          <div className="font-semibold text-white">{school || "Identitas sekolah belum diisi"}</div>
          <div>Tahun Anggaran {year}</div>
        </div>
        <nav className="space-y-1 px-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active(n.href) ? "bg-white text-navy-900" : "text-navy-100 hover:bg-white/10"
              }`}
            >
              <n.icon size={18} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-white/10 px-5 py-4 text-sm">
          <div className="mb-2 text-navy-200">Masuk sebagai <b className="text-white">{user}</b></div>
          <button onClick={logout} className="flex items-center gap-2 text-navy-100 hover:text-white">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
