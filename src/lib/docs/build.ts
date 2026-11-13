import type { School, PrintSettings } from "../settings";
import {
  CATEGORIES, CatKey, Data, lines, dateList, itemList, purposeOf, receiverOf, titleOf, sumItems,
} from "../categories";
import { rupiah, rp, terbilang, tgl, hariOf, hariTgl, tglShort, bulanLabel, dateRange } from "../format";
import { TEMPLATE_MAP } from "./templates";
import type { Block, Doc, Run, SignCol, ImgRef, Cell } from "./types";

export type FileMeta = { id: number; slot: string; name: string; mime: string; width: number; height: number };
export type TrxCtx = {
  school: School;
  print: PrintSettings;
  tpl: Record<string, string>;
  trx: { id: number; uid: string; category: CatKey; date: string; amount: number; receiptNo: string; fiscalYear: number; data: Data };
  files: FileMeta[];
};

const DOTS = ".............................";
const num = (v: unknown) => Number(v) || 0;
const R = (t: string, o: Partial<Run> = {}): Run => ({ t, ...o });
const P = (text: string | Run[], o: Partial<Extract<Block, { k: "p" }>> = {}): Block => ({
  k: "p", runs: typeof text === "string" ? [R(text)] : text, ...o,
});
const SP = (h = 8): Block => ({ k: "sp", h });
const val = (v: unknown, d = DOTS) => (String(v ?? "").trim() ? String(v).trim() : d);

export function schoolAddress(s: School) {
  return [
    s.alamat,
    s.desa && `Desa/Kel. ${s.desa}`,
    s.kecamatan && `Kec. ${s.kecamatan}`,
    s.kabupaten,
    s.provinsi,
    s.kodePos,
  ].filter(Boolean).join(", ");
}

function varsOf(c: TrxCtx): Record<string, string> {
  const { school: s, trx, trx: { data: d } } = c;
  const baDate = d.tanggalBA || d.tanggal;
  return {
    nama_sekolah: val(s.nama), npsn: val(s.npsn), alamat_sekolah: val(schoolAddress(s)), desa: val(s.desa),
    kecamatan: val(s.kecamatan), kabupaten: val(s.kabupaten), provinsi: val(s.provinsi),
    kepala_sekolah: val(s.kepsek), nip_kepsek: val(s.nipKepsek), bendahara: val(s.bendahara),
    nip_bendahara: val(s.nipBendahara), operator: val(s.operator), tahun_anggaran: String(trx.fiscalYear),
    nama_kegiatan: val(d.namaKegiatan), pembina: val(d.pembina), tahun_pelajaran: val(d.tahunPelajaran),
    nomor_sk: val(d.skNomor), tanggal_sk: val(tgl(d.skTanggal)), nama_toko: val(d.namaToko),
    alamat_toko: val(d.alamatToko), hari_ba: val(hariOf(baDate)), tanggal_ba: val(tgl(baDate)),
    kondisi: val(d.kondisi, "baik dan sesuai"),
  };
}

function tpl(c: TrxCtx, key: string): string {
  const text = c.tpl[key] ?? TEMPLATE_MAP[key].text;
  const v = varsOf(c);
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? "{{" + k + "}}");
}

/** Ubah teks template menjadi paragraf. */
function textBlocks(text: string, after = 6): Block[] {
  const out: Block[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) { out.push(SP(4)); continue; }
    if (/^MEMUTUSKAN$/i.test(l)) out.push(P([R("MEMUTUSKAN", { b: true })], { align: "center", after }));
    else if (/^(Menimbang|Mengingat|Menetapkan)\s*:?$/i.test(l)) out.push(P([R(l, { b: true })], { after: 2 }));
    else if (/^([a-z0-9]{1,2}\.|KE[A-Z]+:)\s/.test(l)) {
      const m = /^(KE[A-Z]+:)(.*)$/.exec(l);
      out.push(m ? P([R(m[1], { b: true }), R(m[2])], { align: "justify", ind: 0, after }) : P(l, { align: "justify", ind: 0.75, after }));
    } else out.push(P(l, { align: "justify", first: 1.25, after }));
  }
  return out;
}

function kop(c: TrxCtx): Block {
  const { school: s, print: p } = c;
  const ls: { t: string; size: number; b?: boolean }[] = [];
  if (p.kopBaris1.trim()) ls.push({ t: p.kopBaris1.toUpperCase(), size: 12, b: true });
  if (p.kopBaris2.trim()) ls.push({ t: p.kopBaris2.toUpperCase(), size: 12, b: true });
  ls.push({ t: (s.nama || "NAMA SEKOLAH BELUM DIISI").toUpperCase(), size: 15, b: true });
  if (s.npsn) ls.push({ t: `NPSN: ${s.npsn}`, size: 10 });
  const addr = schoolAddress(s);
  if (addr) ls.push({ t: addr, size: 10 });
  if (p.kopKontak.trim()) ls.push({ t: p.kopKontak, size: 10 });
  return { k: "kop", logoId: s.logoFileId, lines: ls };
}

const kepsekSign = (c: TrxCtx, head: string[] = []): SignCol => ({
  head: [...head, c.print.jabatanKepsek + ","],
  name: val(c.school.kepsek, "(..............................)"),
  nip: c.print.tampilNip && c.school.nipKepsek ? `NIP. ${c.school.nipKepsek}` : undefined,
});
const bendaharaSign = (c: TrxCtx, head: string[] = []): SignCol => ({
  head: [...head, c.print.jabatanBendahara + ","],
  name: val(c.school.bendahara, "(..............................)"),
  nip: c.print.tampilNip && c.school.nipBendahara ? `NIP. ${c.school.nipBendahara}` : undefined,
});
const person = (head: string[], name: unknown): SignCol => ({
  head, name: val(name, "(..............................)"),
});
const place = (c: TrxCtx) => c.print.tempatTtd || c.school.kabupaten || c.school.desa || "..............";
const placeDate = (c: TrxCtx, date?: string) => `${place(c)}, ${tgl(date, "..............")}`;
const empty: SignCol = { head: [], name: "", empty: true };

const title = (text: string, sub: string[] = [], u = false): Block => ({ k: "title", text, sub, u });
const kv = (rows: [string, string, string?][], lw = 5): Block => ({ k: "kv", rows, lw });

function itemsTable(rows: Data[], withSpec: boolean) {
  const total = sumItems(rows, "jumlah", "harga");
  const head = withSpec
    ? ["No", "Nama Barang", "Spesifikasi", "Jumlah", "Satuan", "Harga Satuan (Rp)", "Jumlah Harga (Rp)"]
    : ["No", "Nama Barang", "Spesifikasi", "Jumlah", "Satuan"];
  const body = rows.map((it, i) =>
    withSpec
      ? [String(i + 1), String(it.nama ?? ""), String(it.spesifikasi ?? ""), String(num(it.jumlah)), String(it.satuan ?? ""), rupiah(it.harga), rupiah(num(it.jumlah) * num(it.harga))]
      : [String(i + 1), String(it.nama ?? ""), String(it.spesifikasi ?? ""), String(num(it.jumlah)), String(it.satuan ?? "")],
  );
  const rowsOut: (string | Cell)[][] = body;
  if (withSpec) rowsOut.push([{ t: "TOTAL KESELURUHAN", span: 6, align: "right", b: true }, { t: rupiah(total), align: "right", b: true }]);
  const t: Block = {
    k: "table",
    widths: withSpec ? [4, 22, 22, 8, 9, 15, 17] : [5, 33, 34, 12, 12],
    head, rows: rowsOut,
    aligns: withSpec ? ["center", "left", "left", "center", "center", "right", "right"] : ["center", "left", "left", "center", "center"],
    size: 11,
  };
  return { t, total };
}

// ---------- Pembangun dokumen ----------
type Builder = (c: TrxCtx) => Block[];

const kuitansi: Builder = (c) => {
  const { trx, school, print } = c;
  const d = trx.data;
  const cat = trx.category;
  const blocks: Block[] = [];
  if (print.kopKuitansi) blocks.push(kop(c));
  blocks.push(title("KUITANSI", [], true));
  blocks.push(kv([
    ["Nomor", val(trx.receiptNo)],
    ["Sudah terima dari", val(d.terimaDari, `Bendahara BOSP ${val(school.nama, "(nama sekolah)")}`)],
    ["Uang sejumlah", terbilang(trx.amount), "bi"],
    ["Untuk pembayaran", purposeOf(cat, d)],
  ], 4.2));
  blocks.push(SP(10));
  blocks.push(P([R(`Jumlah:  ${rp(trx.amount)},-`, { b: true })], { size: 14, after: 4 }));
  blocks.push(P([R(`Tahun Anggaran ${trx.fiscalYear} - Dana BOSP`, { i: true })], { size: 10, after: 10 }));
  const where = val(d.tempat, school.kabupaten || school.desa || "..............");
  const recv = person([`${where}, ${tgl(trx.date, "..............")}`, "Yang menerima,"], receiverOf(cat, d));
  const cols: SignCol[] = [];
  if (print.kuitansiKepsek) cols.push(kepsekSign(c, ["Setuju dibayar,"]));
  cols.push(bendaharaSign(c, ["Lunas dibayar,"]));
  cols.push(recv);
  blocks.push({ k: "sign", cols });
  return blocks;
};

const undangan: Builder = (c) => {
  const d = c.trx.data;
  const s = c.school;
  return [
    kop(c),
    P(`${place(c)}, ${tgl(d.tanggalSurat, "..............")}`, { align: "right", after: 8 }),
    kv([["Nomor", val(d.nomorUndangan)], ["Lampiran", "-"], ["Perihal", "Undangan Rapat", "b"]], 2.5),
    SP(8),
    P("Yth. Bapak/Ibu Guru dan Staf", { after: 0 }),
    P(s.nama || DOTS, { after: 0 }),
    P("di Tempat", { after: 10 }),
    ...textBlocks(tpl(c, "undangan_pembuka")),
    SP(4),
    kv([
      ["Hari/Tanggal", hariTgl(d.tanggalRapat, DOTS)],
      ["Waktu", val(d.waktu)],
      ["Tempat", val(d.tempatRapat)],
      ["Agenda", lines(d.agenda).map((a, i, arr) => (arr.length > 1 ? `${i + 1}. ${a}` : a)).join("\n") || DOTS],
    ], 3.5),
    SP(8),
    ...textBlocks(tpl(c, "undangan_penutup")),
    SP(12),
    { k: "sign", cols: [empty, empty, kepsekSign(c)] },
  ];
};

const notulen: Builder = (c) => {
  const d = c.trx.data;
  const peserta = lines(d.peserta).length || num(d.jumlahPeserta);
  const hasil = String(d.hasilRapat ?? "").trim();
  return [
    kop(c),
    title("NOTULEN RAPAT", [], true),
    kv([
      ["Kegiatan", val(d.namaKegiatan)],
      ["Hari/Tanggal", hariTgl(d.tanggalRapat, DOTS)],
      ["Waktu", val(d.waktu)],
      ["Tempat", val(d.tempatRapat)],
      ["Pimpinan Rapat", val(d.pimpinan)],
      ["Notulis", val(d.notulis)],
      ["Peserta", peserta ? `${peserta} orang` : DOTS],
    ], 4),
    SP(6),
    P([R("Agenda Rapat:", { b: true })], { after: 2 }),
    ...(lines(d.agenda).length ? lines(d.agenda).map((a, i) => P(`${i + 1}. ${a}`, { ind: 0.75, after: 2 })) : [P(DOTS)]),
    SP(6),
    P([R("Hasil / Pembahasan Rapat:", { b: true })], { after: 2 }),
    ...(hasil ? lines(hasil).map((l) => P(l, { align: "justify", after: 4 })) : [P(DOTS + DOTS), P(DOTS + DOTS), P(DOTS + DOTS)]),
    SP(14),
    { k: "sign", cols: [person(["Notulis,"], d.notulis), empty, kepsekSign(c, [`${place(c)}, ${tgl(d.tanggalRapat, "..............")}`, "Mengetahui,"])] },
  ];
};

function matrixBlocks(names: string[], cols: string[], sizeNote: string): Block[] {
  const out: Block[] = [];
  const CH = 8;
  const rowsN = Math.max(names.length, 1);
  for (let off = 0; off < Math.max(cols.length, 1); off += CH) {
    const part = cols.slice(off, off + CH);
    const head = ["No", "Nama", ...part, "Ket."];
    const rest = 100 - 5 - 8;
    const nameW = Math.max(26, rest - part.length * 8);
    const rows: (string | Cell)[][] = [];
    for (let i = 0; i < rowsN; i++) rows.push([String(i + 1), names[i] ?? "", ...part.map(() => ""), ""]);
    if (off > 0) out.push(SP(8));
    if (cols.length > CH) out.push(P(`${sizeNote} (${off / CH + 1}/${Math.ceil(cols.length / CH)})`, { size: 10, after: 3 }));
    out.push({
      k: "table", head, rows, size: 11, rowH: 0.8,
      widths: [5, nameW, ...part.map(() => 8), 8],
      aligns: ["center", "left", ...part.map(() => "center" as const), "left"],
    });
  }
  return out;
}

const hadir: Builder = (c) => {
  const d = c.trx.data;
  const names = lines(d.peserta);
  const n = Math.max(names.length, num(d.jumlahPeserta));
  const rows: (string | Cell)[][] = [];
  for (let i = 0; i < Math.max(n, 1); i++) rows.push([String(i + 1), names[i] ?? "", "", ""]);
  return [
    kop(c),
    title("DAFTAR HADIR RAPAT", [], true),
    kv([
      ["Kegiatan", val(d.namaKegiatan)],
      ["Hari/Tanggal", hariTgl(d.tanggalRapat, DOTS)],
      ["Waktu", val(d.waktu)],
      ["Tempat", val(d.tempatRapat)],
    ], 4),
    SP(6),
    { k: "table", widths: [6, 44, 25, 25], head: ["No", "Nama", "Tanda Tangan", "Keterangan"], rows, aligns: ["center", "left", "left", "left"], rowH: 0.9 },
    SP(12),
    { k: "sign", cols: [empty, empty, kepsekSign(c, [`${place(c)}, ${tgl(d.tanggalRapat, "..............")}`, "Mengetahui,"])] },
  ];
};

const ekskulName = (c: TrxCtx) => (c.trx.category === "pramuka" ? "PRAMUKA" : "TAHFIDZ AL-QUR'AN");

const transport: Builder = (c) => {
  const { trx } = c;
  const d = trx.data;
  const honor = num(d.honorPerPertemuan);
  const n = num(d.jumlahPertemuan);
  return [
    title(`DAFTAR PENERIMAAN TRANSPORT PEMBINA ${ekskulName(c)}`, [
      (c.school.nama || "").toUpperCase(),
      `TAHUN ANGGARAN ${trx.fiscalYear}`,
    ], false),
    kv([["Periode", val(d.periode)], ["Tanggal pembayaran", tgl(d.tanggal, DOTS)]], 4.5),
    SP(6),
    {
      k: "table", widths: [5, 22, 14, 14, 16, 16, 13],
      head: ["No", "Nama", "Periode", "Jumlah Pertemuan", "Honor/Transport per Pertemuan (Rp)", "Jumlah (Rp)", "Tanda Tangan"],
      rows: [
        ["1", val(d.pembina, ""), String(d.periode ?? ""), String(n), rupiah(honor), rupiah(trx.amount), ""],
        [{ t: "JUMLAH", span: 5, align: "right", b: true }, { t: rupiah(trx.amount), align: "right", b: true }, ""],
      ],
      aligns: ["center", "left", "left", "center", "right", "right", "left"], rowH: 1.4, size: 11,
    },
    SP(6),
    P([R("Terbilang: ", { b: true }), R(terbilang(trx.amount), { i: true })]),
    SP(10),
    { k: "sign", cols: [kepsekSign(c, ["Mengetahui,"]), empty, bendaharaSign(c, [placeDate(c, trx.date)])] },
  ];
};

const sk: Builder = (c) => {
  const d = c.trx.data;
  const pr = c.trx.category === "pramuka";
  const tp = val(d.tahunPelajaran);
  const tentang = pr
    ? `PENETAPAN PELATIH EKSTRAKURIKULER PRAMUKA ${(c.school.nama || "").toUpperCase()} TAHUN PELAJARAN ${tp}`
    : `PENETAPAN PEMBIMBING BACA AL-QUR'AN DALAM KEGIATAN EKSTRAKURIKULER TAHFIDZUL QUR'AN ${(c.school.nama || "").toUpperCase()} TAHUN PELAJARAN ${tp}`;
  return [
    kop(c),
    title(`KEPUTUSAN KEPALA ${(c.school.nama || "SEKOLAH").toUpperCase()}`, [`NOMOR: ${val(d.skNomor)}`, "TENTANG", tentang]),
    P([R(`KEPALA ${(c.school.nama || "SEKOLAH").toUpperCase()},`, { b: true })], { after: 6 }),
    ...textBlocks(tpl(c, pr ? "sk_pramuka" : "sk_tahfidz")),
    SP(10),
    { k: "sign", cols: [empty, empty, { ...kepsekSign(c, [`Ditetapkan di ${place(c)}`, `pada tanggal ${tgl(d.skTanggal, "..............")}`]) }] },
  ];
};

const hadirPembina: Builder = (c) => {
  const d = c.trx.data;
  const tg = dateList(d.tanggalKegiatan);
  const n = tg.length || num(d.jumlahPertemuan);
  const rows: (string | Cell)[][] = [];
  for (let i = 0; i < Math.max(n, 1); i++) rows.push([String(i + 1), tg[i] ? hariTgl(tg[i]) : "", "", ""]);
  const pr = c.trx.category === "pramuka";
  return [
    title(`DAFTAR HADIR ${pr ? "PELATIH PRAMUKA" : "PEMBINA TAHFIDZ AL-QUR'AN"}`, [(c.school.nama || "").toUpperCase(), `TAHUN ANGGARAN ${c.trx.fiscalYear}`]),
    kv([["Nama", val(d.pembina)], ["Periode", val(d.periode)]], 3.5),
    SP(6),
    { k: "table", widths: [6, 34, 30, 30], head: ["No", "Hari / Tanggal", "Materi / Kegiatan", "Tanda Tangan"], rows, aligns: ["center", "left", "left", "left"], rowH: 0.9 },
    SP(12),
    { k: "sign", cols: [kepsekSign(c, ["Mengetahui,"]), empty, person([placeDate(c, tg[tg.length - 1]), pr ? "Pelatih Pramuka," : "Pembina Tahfidz,"], d.pembina)] },
  ];
};

const hadirAnggota: Builder = (c) => {
  const d = c.trx.data;
  const pr = c.trx.category === "pramuka";
  const tg = dateList(d.tanggalKegiatan);
  const cols = tg.length ? tg.map(tglShort) : Array.from({ length: Math.min(num(d.jumlahPertemuan) || 1, 40) }, (_, i) => `Ke-${i + 1}`);
  return [
    title(`DAFTAR HADIR ${pr ? "ANGGOTA PRAMUKA" : "EKSTRAKURIKULER TAHFIDZ AL-QUR'AN"}`, [(c.school.nama || "").toUpperCase(), `TAHUN ANGGARAN ${c.trx.fiscalYear}`]),
    kv([[pr ? "Pembina" : "Pembimbing", val(d.pembina)], ["Periode", val(d.periode)]], 3.5),
    SP(6),
    ...matrixBlocks(lines(d.anggota), cols, "Tanggal kegiatan (dd/mm)"),
    SP(12),
    { k: "sign", cols: [kepsekSign(c, ["Mengetahui,"]), empty, person([placeDate(c, tg[tg.length - 1]), pr ? "Pelatih Pramuka," : "Pembimbing,"], d.pembina)] },
  ];
};

const suratPesanan: Builder = (c) => {
  const d = c.trx.data;
  const rows = itemList(d.items);
  const { t } = itemsTable(rows, true);
  return [
    kop(c),
    title("SURAT PESANAN", [`Nomor: ${val(d.nomorSP)}`], true),
    kv([
      ["Pemesan", val(c.school.nama)],
      ["Alamat", val(schoolAddress(c.school))],
      ["Tanggal", tgl(d.tanggal, DOTS)],
      ["Penyedia", val(d.namaToko)],
      ["Alamat Penyedia", val(d.alamatToko)],
    ], 4),
    SP(6),
    ...textBlocks(tpl(c, "surat_pesanan_pembuka")),
    SP(4),
    t,
    SP(4),
    P([R("Terbilang: ", { b: true }), R(terbilang(c.trx.amount), { i: true })], { after: 8 }),
    ...textBlocks(tpl(c, "surat_pesanan_penutup")),
    SP(10),
    { k: "sign", cols: [person(["Penyedia,", ""], d.namaPenyerah || d.namaToko), empty, kepsekSign(c, [placeDate(c, d.tanggal), "Pemesan,"])] },
  ];
};

const baSerahTerima: Builder = (c) => {
  const d = c.trx.data;
  const rows = itemList(d.items);
  const { t } = itemsTable(rows, false);
  return [
    kop(c),
    title("BERITA ACARA SERAH TERIMA BARANG", [`Nomor: ${val(d.nomorBA)}`], true),
    ...textBlocks(tpl(c, "ba_serah_terima_pembuka")),
    kv([
      ["1. Nama", val(d.namaPenyerah)],
      ["    Jabatan", val(d.jabatanPenyerah)],
      ["    Alamat", val(d.alamatToko)],
      ["    Selaku", "PIHAK PERTAMA (yang menyerahkan)", "b"],
    ], 3.5),
    SP(4),
    kv([
      ["2. Nama", val(d.namaPenerima)],
      ["    Jabatan", val(d.jabatanPenerima)],
      ["    Alamat", val(c.school.nama)],
      ["    Selaku", "PIHAK KEDUA (yang menerima)", "b"],
    ], 3.5),
    SP(6),
    P("Pihak Pertama menyerahkan barang kepada Pihak Kedua dengan rincian sebagai berikut:", { after: 4 }),
    t,
    SP(6),
    ...textBlocks(tpl(c, "ba_serah_terima_penutup")),
    SP(10),
    { k: "sign", cols: [person(["PIHAK KEDUA,", "Yang menerima,"], d.namaPenerima), kepsekSign(c, ["Mengetahui,"]), person([placeDate(c, d.tanggalBA || d.tanggal), "PIHAK PERTAMA,", "Yang menyerahkan,"], d.namaPenyerah)] },
  ];
};

const baPemeriksaan: Builder = (c) => {
  const d = c.trx.data;
  const rows = itemList(d.items);
  const body: (string | Cell)[][] = rows.map((it, i) => [
    String(i + 1), String(it.nama ?? ""), String(it.spesifikasi ?? ""), `${num(it.jumlah)} ${it.satuan ?? ""}`.trim(), val(d.kondisi, ""),
  ]);
  const catatan = String(d.catatanPemeriksaan ?? "").trim();
  return [
    kop(c),
    title("BERITA ACARA PEMERIKSAAN TEKNIS HASIL PENGADAAN BARANG/JASA", [`Nomor: ${val(d.nomorBA)}`], true),
    ...textBlocks(tpl(c, "ba_pemeriksaan_pembuka")),
    kv([
      ["Penyedia", val(d.namaToko)],
      ["Alamat", val(d.alamatToko)],
      ["No. Transaksi", val(d.noTransaksi)],
      ["Tgl. Pembelian", tgl(d.tanggal, DOTS)],
      ["Total Nilai", rp(c.trx.amount)],
    ], 4),
    SP(6),
    { k: "table", widths: [5, 28, 28, 14, 25], head: ["No", "Nama Barang", "Spesifikasi", "Jumlah", "Hasil Pemeriksaan"], rows: body, aligns: ["center", "left", "left", "center", "left"], size: 11 },
    SP(6),
    ...textBlocks(tpl(c, "ba_pemeriksaan_penutup")),
    ...(catatan ? [P([R("Catatan: ", { b: true }), R(catatan)], { align: "justify" as const })] : []),
    SP(10),
    { k: "sign", cols: [person(["Pemeriksa Barang,", val(d.jabatanPemeriksa, "")], d.namaPemeriksa), kepsekSign(c, ["Mengetahui,"]), person([placeDate(c, d.tanggalBA || d.tanggal), "Penyedia,"], d.namaPenyerah || d.namaToko)] },
  ];
};

const daftarUpah: Builder = (c) => {
  const d = c.trx.data;
  const rows = itemList(d.items);
  const total = sumItems(rows, "hari", "upah");
  const body: (string | Cell)[][] = rows.map((it, i) => [
    String(i + 1), String(it.nama ?? ""), String(it.jenis ?? ""), String(num(it.hari)), rupiah(it.upah), rupiah(num(it.hari) * num(it.upah)), "",
  ]);
  body.push([{ t: "TOTAL UPAH", span: 5, align: "right", b: true }, { t: rupiah(total), align: "right", b: true }, ""]);
  return [
    title("DAFTAR PENERIMAAN UPAH KERJA TUKANG", [(c.school.nama || "").toUpperCase(), `TAHUN ANGGARAN ${c.trx.fiscalYear}`]),
    kv([
      ["Pekerjaan", val(d.namaPekerjaan)],
      ["Lokasi", val(d.lokasi)],
      ["Periode", val(d.periode || (d.periodeMulai ? `${tgl(d.periodeMulai)} s.d. ${tgl(d.periodeSelesai)}` : ""))],
      ["Tanggal pembayaran", tgl(d.tanggal, DOTS)],
    ], 4.5),
    SP(6),
    { k: "table", widths: [5, 24, 20, 9, 14, 15, 13], head: ["No", "Nama Tukang / Pekerja", "Jenis Pekerjaan", "Hari Kerja", "Upah per Hari (Rp)", "Jumlah (Rp)", "Tanda Tangan"], rows: body, aligns: ["center", "left", "left", "center", "right", "right", "left"], rowH: 1.1, size: 11 },
    SP(6),
    P([R("Terbilang: ", { b: true }), R(terbilang(total), { i: true })]),
    SP(10),
    { k: "sign", cols: [kepsekSign(c, ["Mengetahui,"]), empty, bendaharaSign(c, [placeDate(c, d.tanggal)])] },
  ];
};

const hadirTukang: Builder = (c) => {
  const d = c.trx.data;
  const rows = itemList(d.items);
  const days = dateRange(d.periodeMulai, d.periodeSelesai);
  const cols = days.length ? days.map(tglShort) : ["", "", "", "", "", ""];
  return [
    title("DAFTAR HADIR TUKANG / PEKERJA", [(c.school.nama || "").toUpperCase(), `TAHUN ANGGARAN ${c.trx.fiscalYear}`]),
    kv([
      ["Pekerjaan", val(d.namaPekerjaan)],
      ["Lokasi", val(d.lokasi)],
      ["Periode", val(d.periode || (d.periodeMulai ? `${tgl(d.periodeMulai)} s.d. ${tgl(d.periodeSelesai)}` : ""))],
    ], 3.5),
    SP(6),
    ...matrixBlocks(rows.map((r) => String(r.nama ?? "")), cols, "Tanggal kerja (dd/mm)"),
    SP(12),
    { k: "sign", cols: [kepsekSign(c, ["Mengetahui,"]), empty, person([placeDate(c, d.periodeSelesai || d.tanggal), "Mandor / Ketua Tukang,"], d.penerima)] },
  ];
};

const BUILDERS: Record<string, Builder> = {
  kuitansi, undangan, notulen, hadir, transport, sk,
  hadir_pembina: hadirPembina, hadir_anggota: hadirAnggota,
  surat_pesanan: suratPesanan, ba_serah_terima: baSerahTerima, ba_pemeriksaan: baPemeriksaan,
  daftar_upah: daftarUpah, hadir_tukang: hadirTukang,
};

function slotBlocks(c: TrxCtx, label: string, slot: string): Block[] {
  const all = c.files.filter((f) => f.slot === slot);
  const imgs: ImgRef[] = all.filter((f) => f.mime.startsWith("image/")).map((f) => ({ id: f.id, w: f.width, h: f.height, name: f.name }));
  const pdfs = all.filter((f) => f.mime === "application/pdf");
  const doc = c.trx.data;
  const multi = slot === "dokumentasi";
  const out: Block[] = [
    title(label.toUpperCase(), [titleOf(c.trx.category, doc)].filter(Boolean)),
    kv([
      ["Satuan Pendidikan", val(c.school.nama)],
      ["Tanggal", tgl(c.trx.date, DOTS)],
      ["No. Kuitansi", val(c.trx.receiptNo)],
    ], 4.5),
    SP(8),
  ];
  if (imgs.length) out.push({ k: "images", items: imgs, cols: multi ? 2 : 1, maxH: multi ? 8.5 : undefined });
  for (const p of pdfs)
    out.push(P([R(`Lampiran berkas PDF: ${p.name} `, { i: true }), R("(berkas PDF tersimpan di sistem; unduh dari halaman transaksi untuk mencetaknya)", { i: true })], { size: 10 }));
  return out;
}

export function buildTrxDocs(c: TrxCtx): Doc[] {
  const cat = CATEGORIES[c.trx.category];
  const has = (slot?: string) => !!slot && c.files.some((f) => f.slot === slot);
  const out: Doc[] = [];
  for (const def of cat.docs) {
    let blocks: Block[];
    if (def.slot) {
      if (!has(def.slot)) continue;
      blocks = slotBlocks(c, def.label, def.slot);
    } else {
      const b = BUILDERS[def.key];
      if (!b) continue;
      blocks = b(c);
    }
    const scanDef = def.scan ? cat.docs.find((x) => x.key === def.scan) : undefined;
    const replaced = !!scanDef && has(scanDef.slot);
    out.push({ key: def.key, label: def.label, group: def.group, inPackage: !replaced, blocks });
  }
  return out;
}
