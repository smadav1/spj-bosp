import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getUser()) redirect("/dashboard");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="text-sm font-semibold uppercase tracking-widest text-navy-200">SPJ BOSP</div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Aplikasi Administrasi &amp; Cetak SPJ BOSP Sekolah
          </h1>
          <p className="mt-4 max-w-md text-navy-200">
            Susun kuitansi, daftar hadir, berita acara, dan lampiran bukti belanja secara otomatis.
            Cetak di kertas F4 atau unduh dalam format Word dan PDF.
          </p>
        </div>
        <div className="text-xs text-navy-200">Untuk Operator Sekolah dan Bendahara BOSP</div>
      </section>
      <section className="flex items-center justify-center p-6">
        <LoginForm setup={n === 0} />
      </section>
    </main>
  );
}
