import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, fiscalYears } from "@/db/schema";

export type School = {
  nama: string; npsn: string; alamat: string; desa: string; kecamatan: string;
  kabupaten: string; provinsi: string; kodePos: string;
  kepsek: string; nipKepsek: string; bendahara: string; nipBendahara: string;
  operator: string; tahunAnggaran: number; logoFileId: number | null;
};
export type PrintSettings = {
  orientation: "portrait" | "landscape";
  mt: number; mr: number; mb: number; ml: number;
  kopBaris1: string; kopBaris2: string; kopKontak: string;
  kopKuitansi: boolean;
  kuitansiKepsek: boolean;
  receiptFormat: string;
  tempatTtd: string;
  jabatanKepsek: string;
  jabatanBendahara: string;
  tampilNip: boolean;
};

export const DEFAULT_SCHOOL: School = {
  nama: "", npsn: "", alamat: "", desa: "", kecamatan: "", kabupaten: "", provinsi: "",
  kodePos: "", kepsek: "", nipKepsek: "", bendahara: "", nipBendahara: "", operator: "",
  tahunAnggaran: new Date().getFullYear(), logoFileId: null,
};
export const DEFAULT_PRINT: PrintSettings = {
  orientation: "portrait", mt: 2, mr: 2, mb: 2, ml: 2.5,
  kopBaris1: "", kopBaris2: "", kopKontak: "",
  kopKuitansi: false, kuitansiKepsek: true,
  receiptFormat: "{NO3}/KWT/BOSP/{TAHUN}",
  tempatTtd: "", jabatanKepsek: "Kepala Sekolah", jabatanBendahara: "Bendahara BOSP", tampilNip: true,
};

export async function getSetting<T extends object>(key: string, def: T): Promise<T> {
  const r = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return { ...def, ...((r[0]?.value as object) ?? {}) } as T;
}
export async function setSetting(key: string, value: object) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export const getSchool = () => getSetting<School>("school", DEFAULT_SCHOOL);
export const getPrint = () => getSetting<PrintSettings>("print", DEFAULT_PRINT);
export const getTemplates = () => getSetting<Record<string, string>>("templates", {});

export function schoolComplete(s: School) {
  return !!(s.nama && s.kepsek && s.bendahara);
}

export async function ensureYear(year: number) {
  await db.insert(fiscalYears).values({ year }).onConflictDoNothing();
}

let ready: Promise<void> | null = null;
/** Pastikan tahun anggaran aktif tercatat di tabel tahun anggaran. */
export function ensureBootstrap() {
  if (!ready) {
    ready = (async () => {
      const s = await getSchool();
      await ensureYear(s.tahunAnggaran);
      await db.execute(sql`select 1`);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
