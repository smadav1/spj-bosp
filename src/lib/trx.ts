import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { transactions, files, auditLogs } from "@/db/schema";
import {
  CATEGORIES, CATEGORY_LIST, CatKey, Check, Status, validate, statusOf, titleOf, isCat,
} from "./categories";
import { getSchool, getPrint, getTemplates, schoolComplete } from "./settings";
import { BULAN, rupiah, tgl, rp } from "./format";
import type { TrxCtx, FileMeta } from "./docs/build";
import { buildTrxDocs, schoolAddress } from "./docs/build";
import type { Doc, Block } from "./docs/types";

export async function audit(trxId: number | null, trxUid: string, action: string, detail: string, userName: string) {
  await db.insert(auditLogs).values({ transactionId: trxId, trxUid, action, detail, userName });
}

export async function fileMetas(trxId: number): Promise<FileMeta[]> {
  return db
    .select({ id: files.id, slot: files.slot, name: files.name, mime: files.mime, width: files.width, height: files.height })
    .from(files)
    .where(eq(files.transactionId, trxId))
    .orderBy(files.id);
}

export async function loadCtx(id: number): Promise<TrxCtx | null> {
  const r = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  const t = r[0];
  if (!t || !isCat(t.category)) return null;
  const [school, print, tpl, fl] = await Promise.all([getSchool(), getPrint(), getTemplates(), fileMetas(id)]);
  return {
    school, print, tpl, files: fl,
    trx: {
      id: t.id, uid: t.uid, category: t.category, date: t.date, amount: t.amount,
      receiptNo: t.receiptNo, fiscalYear: t.fiscalYear, data: t.data as Record<string, unknown>,
    },
  };
}

export function slotCounts(fl: { slot: string }[]) {
  const c: Record<string, number> = {};
  for (const f of fl) c[f.slot] = (c[f.slot] ?? 0) + 1;
  return c;
}

export function checksFor(c: TrxCtx): Check[] {
  return validate(c.trx.category, c.trx.data, c.trx.amount, c.trx.date, c.trx.receiptNo, slotCounts(c.files), schoolComplete(c.school));
}

export async function loadDocs(id: number) {
  const ctx = await loadCtx(id);
  if (!ctx) return null;
  return { ctx, docs: buildTrxDocs(ctx), checks: checksFor(ctx) };
}

export type TrxRow = {
  id: number; uid: string; category: CatKey; date: string; month: number; title: string;
  amount: number; receiptNo: string; isFinal: boolean; status: Status; checks: Check[]; createdAt: Date;
};

export async function listTrx(year: number): Promise<TrxRow[]> {
  const [rows, school] = await Promise.all([
    db.select().from(transactions).where(eq(transactions.fiscalYear, year)).orderBy(desc(transactions.date), desc(transactions.id)),
    getSchool(),
  ]);
  const ids = rows.map((r) => r.id);
  const cnt: Record<number, Record<string, number>> = {};
  if (ids.length) {
    const cs = await db
      .select({ t: files.transactionId, slot: files.slot, n: sql<number>`count(*)::int` })
      .from(files)
      .where(inArray(files.transactionId, ids))
      .groupBy(files.transactionId, files.slot);
    for (const c of cs) {
      if (c.t == null) continue;
      (cnt[c.t] ??= {})[c.slot] = c.n;
    }
  }
  const ok = schoolComplete(school);
  return rows
    .filter((r) => isCat(r.category))
    .map((r) => {
      const checks = validate(r.category as CatKey, r.data as Record<string, unknown>, r.amount, r.date, r.receiptNo, cnt[r.id] ?? {}, ok);
      return {
        id: r.id, uid: r.uid, category: r.category as CatKey, date: r.date, month: r.month,
        title: r.title || titleOf(r.category as CatKey, r.data as Record<string, unknown>),
        amount: r.amount, receiptNo: r.receiptNo, isFinal: r.isFinal, status: statusOf(checks), checks, createdAt: r.createdAt,
      };
    });
}

export { and };

// ---------------- Laporan ----------------
export type ReportData = {
  year: number;
  rows: TrxRow[];
  total: number;
  perBulan: { label: string; n: number; sum: number }[];
  perKategori: { label: string; n: number; sum: number }[];
  perJenis: { label: string; n: number; sum: number }[];
  belum: TrxRow[];
};

export async function getReport(year: number): Promise<ReportData> {
  const rows = await listTrx(year);
  const perBulan = BULAN.map((label, i) => {
    const r = rows.filter((x) => x.month === i + 1);
    return { label, n: r.length, sum: r.reduce((a, b) => a + b.amount, 0) };
  });
  const nodate = rows.filter((x) => !x.month);
  if (nodate.length) perBulan.push({ label: "Tanggal belum diisi", n: nodate.length, sum: nodate.reduce((a, b) => a + b.amount, 0) });
  const perKategori = CATEGORY_LIST.map((c) => {
    const r = rows.filter((x) => x.category === c.key);
    return { label: c.label, n: r.length, sum: r.reduce((a, b) => a + b.amount, 0) };
  });
  const jenis = new Map<string, { n: number; sum: number }>();
  for (const r of rows) {
    const k = CATEGORIES[r.category].jenisBelanja;
    const v = jenis.get(k) ?? { n: 0, sum: 0 };
    v.n++; v.sum += r.amount;
    jenis.set(k, v);
  }
  return {
    year, rows, total: rows.reduce((a, b) => a + b.amount, 0), perBulan, perKategori,
    perJenis: [...jenis].map(([label, v]) => ({ label, ...v })),
    belum: rows.filter((r) => r.status !== "lengkap"),
  };
}

export const REPORT_DOCS = [
  { key: "total", label: "Rekap Total Pengeluaran" },
  { key: "bulan", label: "Rekap Transaksi per Bulan" },
  { key: "kategori", label: "Rekap Transaksi per Kategori" },
  { key: "jenis", label: "Rekap Berdasarkan Jenis Belanja" },
  { key: "daftar", label: "Daftar Seluruh Transaksi" },
  { key: "belum", label: "Rekap Dokumen Belum Lengkap" },
];

export async function buildReportDocs(year: number): Promise<Doc[]> {
  const [rep, school, print] = await Promise.all([getReport(year), getSchool(), getPrint()]);
  const kopLines: { t: string; size: number; b?: boolean }[] = [];
  if (print.kopBaris1) kopLines.push({ t: print.kopBaris1.toUpperCase(), size: 12, b: true });
  if (print.kopBaris2) kopLines.push({ t: print.kopBaris2.toUpperCase(), size: 12, b: true });
  kopLines.push({ t: (school.nama || "NAMA SEKOLAH BELUM DIISI").toUpperCase(), size: 15, b: true });
  const addr = schoolAddress(school);
  if (addr) kopLines.push({ t: addr, size: 10 });
  const kop: Block = { k: "kop", logoId: school.logoFileId, lines: kopLines };
  const sp: Block = { k: "sp", h: 8 };
  const sign: Block = {
    k: "sign",
    cols: [
      { head: [print.jabatanKepsek + ","], name: school.kepsek || "(..............................)", nip: print.tampilNip && school.nipKepsek ? "NIP. " + school.nipKepsek : undefined },
      { head: [], name: "", empty: true },
      { head: [`${print.tempatTtd || school.kabupaten || ".........."}, ${tgl(new Date().toISOString().slice(0, 10))}`, print.jabatanBendahara + ","], name: school.bendahara || "(..............................)", nip: print.tampilNip && school.nipBendahara ? "NIP. " + school.nipBendahara : undefined },
    ],
  };
  const rekap = (head: string, list: { label: string; n: number; sum: number }[]): Block => ({
    k: "table", widths: [6, 54, 12, 28], head: ["No", head, "Jumlah Transaksi", "Total (Rp)"],
    rows: [
      ...list.map((x, i) => [String(i + 1), x.label, String(x.n), rupiah(x.sum)]),
      [{ t: "TOTAL", span: 2, align: "right" as const, b: true }, { t: String(list.reduce((a, b) => a + b.n, 0)), align: "center" as const, b: true }, { t: rupiah(list.reduce((a, b) => a + b.sum, 0)), align: "right" as const, b: true }],
    ],
    aligns: ["center", "left", "center", "right"], size: 11,
  });
  const head = (t: string): Block[] => [kop, { k: "title", text: t, sub: [`TAHUN ANGGARAN ${year}`], u: false }];
  const mk = (key: string, blocks: Block[]): Doc => ({
    key, label: REPORT_DOCS.find((d) => d.key === key)!.label, group: "dokumen", inPackage: true, blocks,
  });
  return [
    mk("total", [...head("REKAPITULASI TOTAL PENGELUARAN BOSP"), {
      k: "kv", lw: 6, rows: [
        ["Jumlah transaksi", String(rep.rows.length)],
        ["Total pengeluaran", rp(rep.total), "b"],
        ["Dokumen lengkap", String(rep.rows.filter((r) => r.status === "lengkap").length)],
        ["Belum lengkap / perlu diperiksa", String(rep.belum.length)],
      ],
    }, sp, sign]),
    mk("bulan", [...head("REKAPITULASI TRANSAKSI PER BULAN"), rekap("Bulan", rep.perBulan), sp, sign]),
    mk("kategori", [...head("REKAPITULASI TRANSAKSI PER KATEGORI"), rekap("Kategori", rep.perKategori), sp, sign]),
    mk("jenis", [...head("REKAPITULASI BERDASARKAN JENIS BELANJA"), rekap("Jenis Belanja", rep.perJenis), sp, sign]),
    mk("daftar", [...head("DAFTAR SELURUH TRANSAKSI"), {
      k: "table", widths: [4, 11, 13, 11, 14, 24, 13, 10], size: 10,
      head: ["No", "ID Transaksi", "No. Kuitansi", "Tanggal", "Kategori", "Uraian", "Jumlah (Rp)", "Status"],
      rows: [
        ...rep.rows.map((r, i) => [String(i + 1), r.uid, r.receiptNo, tgl(r.date), CATEGORIES[r.category].short, r.title, rupiah(r.amount), r.status === "lengkap" ? "Lengkap" : r.status === "periksa" ? "Perlu diperiksa" : "Belum lengkap"]),
        [{ t: "TOTAL", span: 6, align: "right" as const, b: true }, { t: rupiah(rep.total), align: "right" as const, b: true }, ""],
      ],
      aligns: ["center", "left", "left", "left", "left", "left", "right", "left"],
    }, sp, sign]),
    mk("belum", [...head("REKAPITULASI DOKUMEN BELUM LENGKAP"), {
      k: "table", widths: [5, 12, 16, 22, 45], size: 10,
      head: ["No", "ID Transaksi", "Kategori", "Uraian", "Kekurangan / Catatan"],
      rows: rep.belum.length
        ? rep.belum.map((r, i) => [String(i + 1), r.uid, CATEGORIES[r.category].short, r.title, r.checks.map((c) => `- ${c.msg}`).join("\n")])
        : [[{ t: "Seluruh dokumen transaksi sudah lengkap.", span: 5, align: "center" as const }]],
      aligns: ["center", "left", "left", "left", "left"],
    }, sp, sign]),
  ];
}
