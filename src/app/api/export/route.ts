import ExcelJS from "exceljs";
import { isResponse, requireUser } from "@/lib/auth";
import { getPrint, getSchool } from "@/lib/settings";
import { buildReportDocs, getReport, loadDocs } from "@/lib/trx";
import { CATEGORIES } from "@/lib/categories";
import { loadImages } from "@/lib/docs/images";
import { renderDocx } from "@/lib/docs/render-docx";
import { renderPdf } from "@/lib/docs/render-pdf";
import { tgl } from "@/lib/format";
import type { Doc, Layout } from "@/lib/docs/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function file(buf: Buffer | Uint8Array, name: string, mime: string) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${name.replace(/[^\w.\-]+/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function excel(year: number) {
  const [rep, school] = await Promise.all([getReport(year), getSchool()]);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi SPJ BOSP";
  const sheet = (name: string, head: string[], rows: (string | number)[][], widths: number[], moneyCols: number[]) => {
    const ws = wb.addWorksheet(name);
    ws.addRow([`${school.nama} - Tahun Anggaran ${year}`]).font = { bold: true, size: 13 };
    ws.addRow([name]).font = { bold: true };
    ws.addRow([]);
    const h = ws.addRow(head);
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c, i) => (c.width = widths[i] ?? 15));
    moneyCols.forEach((i) => (ws.getColumn(i + 1).numFmt = "#,##0"));
    ws.eachRow((row, n) => { if (n >= 4) row.eachCell((c) => (c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } })); });
    return ws;
  };
  sheet("Daftar Transaksi", ["No", "ID Transaksi", "No. Kuitansi", "Tanggal", "Kategori", "Uraian", "Jumlah (Rp)", "Status"],
    rep.rows.map((r, i) => [i + 1, r.uid, r.receiptNo, tgl(r.date), CATEGORIES[r.category].short, r.title, r.amount, r.status === "lengkap" ? "Lengkap" : r.status === "periksa" ? "Perlu diperiksa" : "Belum lengkap"]),
    [6, 16, 24, 16, 20, 40, 16, 18], [6]);
  const rk = (n: string, l: string, list: { label: string; n: number; sum: number }[]) =>
    sheet(n, ["No", l, "Jumlah Transaksi", "Total (Rp)"], [...list.map((x, i) => [i + 1, x.label, x.n, x.sum]), ["", "TOTAL", list.reduce((a, b) => a + b.n, 0), list.reduce((a, b) => a + b.sum, 0)]], [6, 50, 18, 20], [3]);
  rk("Rekap per Bulan", "Bulan", rep.perBulan);
  rk("Rekap per Kategori", "Kategori", rep.perKategori);
  rk("Rekap Jenis Belanja", "Jenis Belanja", rep.perJenis);
  sheet("Belum Lengkap", ["No", "ID Transaksi", "Kategori", "Uraian", "Kekurangan / Catatan"],
    rep.belum.map((r, i) => [i + 1, r.uid, CATEGORIES[r.category].short, r.title, r.checks.map((c) => c.msg).join("; ")]), [6, 16, 20, 40, 80], []);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function GET(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const q = new URL(req.url).searchParams;
  const src = q.get("src") ?? "trx";
  const format = q.get("format") ?? "docx";
  const print = await getPrint();
  const num = (k: string, d: number) => (q.get(k) !== null && q.get(k) !== "" ? Math.min(6, Math.max(0.5, Number(q.get(k)) || d)) : d);
  const layout: Layout = {
    landscape: (q.get("o") ?? (print.orientation === "landscape" ? "l" : "p")) === "l",
    mt: num("mt", print.mt), mr: num("mr", print.mr), mb: num("mb", print.mb), ml: num("ml", print.ml),
  };
  const keys = (q.get("docs") ?? "").split(",").filter(Boolean);

  let docs: Doc[];
  let base: string;
  if (src === "laporan") {
    const year = Number(q.get("year")) || (await getSchool()).tahunAnggaran;
    if (format === "xlsx") return file(await excel(year), `Laporan-SPJ-BOSP-${year}.xlsx`, MIME.xlsx);
    docs = await buildReportDocs(year);
    base = `Laporan-SPJ-BOSP-${year}`;
  } else {
    const r = await loadDocs(Number(q.get("id")));
    if (!r) return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    docs = r.docs;
    base = `SPJ-${r.ctx.trx.uid}`;
  }
  docs = keys.length ? docs.filter((d) => keys.includes(d.key)) : docs.filter((d) => d.inPackage);
  if (keys.length === 1 && src !== "laporan") base += "-" + keys[0];
  const imgs = await loadImages(docs);
  try {
    if (format === "pdf") return file(await renderPdf(docs, layout, imgs, base), base + ".pdf", MIME.pdf);
    if (format === "docx") return file(await renderDocx(docs, layout, imgs, base), base + ".docx", MIME.docx);
  } catch (e) {
    console.error("export error", e);
    return Response.json({ error: "Gagal membuat berkas: " + (e instanceof Error ? e.message : "") }, { status: 500 });
  }
  return Response.json({ error: "Format tidak didukung" }, { status: 400 });
}
