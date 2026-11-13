import { bulanLabel, tgl, dateRange } from "./format";

export type FieldType =
  | "text" | "number" | "date" | "month" | "textarea" | "select" | "dates" | "names" | "items";

export type ItemCol = { name: string; label: string; type: "text" | "number"; w?: string; placeholder?: string };
export type Field = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  options?: string[];
  span?: 1 | 2 | 3;
  items?: { qty: string; price: string; cols: ItemCol[]; addLabel: string; totalLabel: string };
};
export type Section = { title: string; desc?: string; fields: Field[] };
export type SlotDef = { slot: string; label: string; max: number; hint?: string };
export type DocDef = {
  key: string;
  label: string;
  group: "dokumen" | "lampiran";
  slot?: string; // dokumen berupa lampiran unggahan
  scan?: string; // key dokumen unggahan pengganti
  isScan?: boolean;
};

export type CatKey = "internet" | "listrik" | "konsumsi" | "pramuka" | "tahfidz" | "barang" | "tukang";

export type CatDef = {
  key: CatKey;
  label: string;
  short: string;
  jenisBelanja: string;
  color: string;
  sections: Section[];
  slots: SlotDef[];
  docs: DocDef[];
  defaults: () => Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Data = Record<string, any>;

const num = (v: unknown) => Number(v) || 0;
export const lines = (s: unknown): string[] =>
  String(s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
export const dateList = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]).filter(Boolean).sort() : [];
export const itemList = (v: unknown): Data[] => (Array.isArray(v) ? (v as Data[]) : []);
export const sumItems = (items: Data[], q: string, p: string) =>
  items.reduce((a, it) => a + num(it[q]) * num(it[p]), 0);

const kuitansiSection: Section = {
  title: "Pengaturan Kuitansi",
  desc: "Kosongkan jika ingin memakai isian otomatis.",
  fields: [
    { name: "terimaDari", label: "Sudah terima dari", type: "text", placeholder: "Otomatis: Bendahara BOSP + nama sekolah", span: 2 },
    { name: "tempat", label: "Tempat pembayaran", type: "text", placeholder: "Otomatis dari identitas sekolah" },
    { name: "untukPembayaran", label: "Untuk pembayaran", type: "textarea", placeholder: "Otomatis disusun dari data transaksi", span: 3 },
  ],
};

function ekskul(kind: "pramuka" | "tahfidz"): CatDef {
  const p = kind === "pramuka";
  const nm = p ? "Pramuka" : "Tahfidz Al-Qur'an";
  return {
    key: kind,
    label: p ? "Honor Ekstrakurikuler Pramuka" : "Honor Ekstrakurikuler Tahfidz Al-Qur'an",
    short: p ? "Honor Pramuka" : "Honor Tahfidz",
    jenisBelanja: "Honor/Transport Ekstrakurikuler",
    color: p ? "#b45309" : "#047857",
    sections: [
      {
        title: "Honor / Transport",
        fields: [
          { name: "pembina", label: p ? "Nama pembina / pelatih" : "Nama pembimbing", type: "text" },
          { name: "periode", label: "Periode pembayaran", type: "text", placeholder: "contoh: Januari - Maret 2025" },
          { name: "tanggal", label: "Tanggal pembayaran", type: "date" },
          { name: "honorPerPertemuan", label: "Honor / transport per pertemuan (Rp)", type: "number" },
          { name: "jumlahPertemuan", label: "Jumlah pertemuan", type: "number" },
        ],
      },
      {
        title: "Kegiatan & Daftar Hadir",
        desc: "Tanggal kegiatan dan nama peserta dipakai untuk membuat daftar hadir otomatis.",
        fields: [
          { name: "tanggalKegiatan", label: "Tanggal kegiatan", type: "dates", span: 3 },
          { name: "anggota", label: p ? "Nama anggota Pramuka (satu nama per baris)" : "Nama peserta (satu nama per baris)", type: "names", span: 3 },
        ],
      },
      {
        title: p ? "SK Pelatih Pramuka" : "SK Pembimbing Tahfidz",
        desc: "Data untuk SK dari Kepala Sekolah. Jika SK sudah ada, cukup unggah scan-nya.",
        fields: [
          { name: "skNomor", label: "Nomor SK", type: "text" },
          { name: "skTanggal", label: "Tanggal SK", type: "date" },
          { name: "tahunPelajaran", label: "Tahun pelajaran", type: "text", placeholder: "contoh: 2024/2025" },
        ],
      },
      kuitansiSection,
    ],
    slots: [
      { slot: "sk", label: `Scan SK ${p ? "Pelatih" : "Pembimbing"} (opsional)`, max: 5 },
      { slot: "dokumentasi", label: `Dokumentasi Kegiatan ${nm}`, max: 10, hint: "Maksimal 10 foto" },
    ],
    docs: [
      { key: "kuitansi", label: "Kuitansi", group: "dokumen" },
      { key: "transport", label: `Daftar Penerimaan Transport Pembina ${nm}`, group: "dokumen" },
      { key: "sk", label: p ? "SK Pelatih Pramuka" : "SK Pembimbing Baca Al-Qur'an", group: "dokumen", scan: "sk_scan" },
      { key: "sk_scan", label: "Scan SK (unggahan)", group: "lampiran", slot: "sk", isScan: true },
      { key: "hadir_pembina", label: p ? "Daftar Hadir Pelatih Pramuka" : "Daftar Hadir Pembina Tahfidz Al-Qur'an", group: "dokumen" },
      { key: "hadir_anggota", label: p ? "Daftar Hadir Anggota Pramuka" : "Daftar Hadir Ekstrakurikuler Tahfidz Al-Qur'an", group: "dokumen" },
      { key: "dokumentasi", label: `Dokumentasi Kegiatan ${nm}`, group: "lampiran", slot: "dokumentasi" },
    ],
    defaults: () => ({ tanggalKegiatan: [], anggota: "" }),
  };
}

export const CATEGORIES: Record<CatKey, CatDef> = {
  internet: {
    key: "internet",
    label: "Pembayaran Internet",
    short: "Internet",
    jenisBelanja: "Langganan Daya dan Jasa",
    color: "#0369a1",
    sections: [
      {
        title: "Data Pembayaran Internet",
        fields: [
          { name: "bulan", label: "Bulan pembayaran", type: "month" },
          { name: "tanggal", label: "Tanggal pembayaran", type: "date" },
          { name: "penyedia", label: "Nama penyedia layanan internet", type: "text" },
          { name: "noPelanggan", label: "Nomor pelanggan (opsional)", type: "text" },
          { name: "nominal", label: "Nominal pembayaran (Rp)", type: "number" },
        ],
      },
      kuitansiSection,
    ],
    slots: [{ slot: "nota", label: "Foto Nota / Bukti Pembayaran Internet", max: 5 }],
    docs: [
      { key: "kuitansi", label: "Kuitansi Pembayaran Internet", group: "dokumen" },
      { key: "nota", label: "Lampiran Nota Pembayaran Internet", group: "lampiran", slot: "nota" },
    ],
    defaults: () => ({}),
  },
  listrik: {
    key: "listrik",
    label: "Pembayaran Listrik",
    short: "Listrik",
    jenisBelanja: "Langganan Daya dan Jasa",
    color: "#a16207",
    sections: [
      {
        title: "Data Pembayaran Listrik",
        fields: [
          { name: "bulan", label: "Bulan pembayaran", type: "month" },
          { name: "tanggal", label: "Tanggal pembayaran", type: "date" },
          { name: "idPelanggan", label: "ID pelanggan", type: "text" },
          { name: "penerima", label: "Nama penerima pembayaran", type: "text", placeholder: "contoh: PT PLN (Persero)" },
          { name: "nominal", label: "Nominal pembayaran (Rp)", type: "number" },
        ],
      },
      kuitansiSection,
    ],
    slots: [{ slot: "bukti", label: "Foto Nota / Bukti Pembayaran Listrik", max: 5 }],
    docs: [
      { key: "kuitansi", label: "Kuitansi Pembayaran Listrik", group: "dokumen" },
      { key: "bukti", label: "Lampiran Bukti Pembayaran Listrik", group: "lampiran", slot: "bukti" },
    ],
    defaults: () => ({}),
  },
  konsumsi: {
    key: "konsumsi",
    label: "Konsumsi Rapat Guru",
    short: "Konsumsi Rapat",
    jenisBelanja: "Administrasi Kegiatan Sekolah (Konsumsi)",
    color: "#7c3aed",
    sections: [
      {
        title: "Data Rapat",
        fields: [
          { name: "namaKegiatan", label: "Nama kegiatan rapat", type: "text", span: 2 },
          { name: "tanggalRapat", label: "Hari dan tanggal rapat", type: "date" },
          { name: "waktu", label: "Waktu pelaksanaan", type: "text", placeholder: "contoh: 08.00 WIB - selesai" },
          { name: "tempatRapat", label: "Tempat pelaksanaan", type: "text" },
          { name: "penanggungJawab", label: "Nama penanggung jawab", type: "text" },
          { name: "jumlahPeserta", label: "Jumlah peserta", type: "number" },
          { name: "pimpinan", label: "Pimpinan rapat", type: "text" },
          { name: "notulis", label: "Notulis", type: "text" },
          { name: "nomorUndangan", label: "Nomor surat undangan", type: "text" },
          { name: "tanggalSurat", label: "Tanggal surat undangan", type: "date" },
          { name: "agenda", label: "Agenda rapat (satu agenda per baris)", type: "textarea", span: 3 },
        ],
      },
      {
        title: "Konsumsi & Pembayaran",
        fields: [
          { name: "penerima", label: "Nama penerima pembayaran (penyedia konsumsi)", type: "text", span: 2 },
          { name: "tanggal", label: "Tanggal pembayaran", type: "date" },
          {
            name: "items", label: "Rincian konsumsi", type: "items", span: 3,
            items: {
              qty: "jumlah", price: "harga", addLabel: "Tambah konsumsi", totalLabel: "Total pembayaran",
              cols: [
                { name: "jenis", label: "Jenis konsumsi", type: "text", w: "40%" },
                { name: "jumlah", label: "Jumlah", type: "number" },
                { name: "harga", label: "Harga satuan", type: "number" },
              ],
            },
          },
        ],
      },
      {
        title: "Isi Dokumen Rapat",
        desc: "Dipakai untuk notulen dan daftar hadir otomatis.",
        fields: [
          { name: "hasilRapat", label: "Hasil / pembahasan rapat (untuk notulen)", type: "textarea", span: 3 },
          { name: "peserta", label: "Nama peserta rapat (satu nama per baris)", type: "names", span: 3 },
        ],
      },
      kuitansiSection,
    ],
    slots: [
      { slot: "undangan", label: "Foto / Scan Undangan", max: 5 },
      { slot: "notulen", label: "Foto / Scan Notulen Rapat", max: 5 },
      { slot: "hadir", label: "Foto / Scan Daftar Hadir", max: 5 },
      { slot: "dokumentasi", label: "Foto Dokumentasi Rapat", max: 10 },
    ],
    docs: [
      { key: "kuitansi", label: "Kuitansi Konsumsi Rapat", group: "dokumen" },
      { key: "undangan", label: "Undangan Rapat", group: "dokumen", scan: "undangan_scan" },
      { key: "undangan_scan", label: "Scan Undangan (unggahan)", group: "lampiran", slot: "undangan", isScan: true },
      { key: "notulen", label: "Notulen Rapat", group: "dokumen", scan: "notulen_scan" },
      { key: "notulen_scan", label: "Scan Notulen (unggahan)", group: "lampiran", slot: "notulen", isScan: true },
      { key: "hadir", label: "Daftar Hadir Rapat", group: "dokumen", scan: "hadir_scan" },
      { key: "hadir_scan", label: "Scan Daftar Hadir (unggahan)", group: "lampiran", slot: "hadir", isScan: true },
      { key: "dokumentasi", label: "Dokumentasi Rapat", group: "lampiran", slot: "dokumentasi" },
    ],
    defaults: () => ({ items: [{ jenis: "", jumlah: "", harga: "" }] }),
  },
  pramuka: ekskul("pramuka"),
  tahfidz: ekskul("tahfidz"),
  barang: {
    key: "barang",
    label: "Pembelian Barang Persediaan Habis Pakai, Pemeliharaan & Kebersihan",
    short: "Pembelian Barang",
    jenisBelanja: "Barang Habis Pakai, Pemeliharaan & Kebersihan",
    color: "#be123c",
    sections: [
      {
        title: "Data Penyedia / Toko",
        fields: [
          { name: "namaToko", label: "Nama toko / penyedia", type: "text", span: 2 },
          { name: "noTransaksi", label: "Nomor transaksi / nota", type: "text" },
          { name: "alamatToko", label: "Alamat penyedia", type: "text", span: 2 },
          { name: "tanggal", label: "Tanggal pembelian", type: "date" },
        ],
      },
      {
        title: "Daftar Barang",
        desc: "Total harga = jumlah × harga satuan, dihitung otomatis.",
        fields: [
          {
            name: "items", label: "Tabel barang", type: "items", span: 3,
            items: {
              qty: "jumlah", price: "harga", addLabel: "Tambah barang", totalLabel: "Total keseluruhan",
              cols: [
                { name: "nama", label: "Nama barang", type: "text", w: "24%" },
                { name: "spesifikasi", label: "Spesifikasi", type: "text", w: "22%" },
                { name: "jumlah", label: "Jumlah", type: "number" },
                { name: "satuan", label: "Satuan", type: "text" },
                { name: "harga", label: "Harga satuan", type: "number" },
              ],
            },
          },
        ],
      },
      {
        title: "Berita Acara",
        desc: "Pihak yang menyerahkan, pihak yang menerima, dan hasil pemeriksaan barang.",
        fields: [
          { name: "nomorSP", label: "Nomor Surat Pesanan", type: "text" },
          { name: "nomorBA", label: "Nomor Berita Acara", type: "text" },
          { name: "tanggalBA", label: "Tanggal Berita Acara", type: "date", hint: "Kosong = tanggal pembelian" },
          { name: "namaPenyerah", label: "Pihak yang menyerahkan (nama)", type: "text" },
          { name: "jabatanPenyerah", label: "Jabatan penyerah", type: "text", placeholder: "contoh: Pemilik / Perwakilan toko" },
          { name: "namaPenerima", label: "Pihak yang menerima (nama)", type: "text" },
          { name: "jabatanPenerima", label: "Jabatan penerima", type: "text", placeholder: "contoh: Pengurus barang" },
          { name: "namaPemeriksa", label: "Pemeriksa barang (nama)", type: "text" },
          { name: "jabatanPemeriksa", label: "Jabatan pemeriksa", type: "text" },
          { name: "kondisi", label: "Hasil pemeriksaan barang", type: "select", options: ["Baik dan sesuai spesifikasi", "Baik, sebagian tidak sesuai spesifikasi", "Tidak sesuai spesifikasi"] },
          { name: "catatanPemeriksaan", label: "Catatan pemeriksaan (opsional)", type: "textarea", span: 3 },
        ],
      },
      kuitansiSection,
    ],
    slots: [
      { slot: "nota", label: "Nota / Bukti Transaksi", max: 10 },
      { slot: "dokumentasi", label: "Foto Dokumentasi Barang", max: 10 },
    ],
    docs: [
      { key: "kuitansi", label: "Kuitansi Pembelian Barang", group: "dokumen" },
      { key: "surat_pesanan", label: "Surat Pesanan", group: "dokumen" },
      { key: "ba_serah_terima", label: "Berita Acara Serah Terima Barang", group: "dokumen" },
      { key: "ba_pemeriksaan", label: "Berita Acara Pemeriksaan Teknis Hasil Pengadaan Barang/Jasa", group: "dokumen" },
      { key: "nota", label: "Lampiran Nota / Bukti Transaksi", group: "lampiran", slot: "nota" },
      { key: "dokumentasi", label: "Dokumentasi Pengadaan Barang", group: "lampiran", slot: "dokumentasi" },
    ],
    defaults: () => ({ items: [{ nama: "", spesifikasi: "", jumlah: "", satuan: "", harga: "" }], kondisi: "Baik dan sesuai spesifikasi" }),
  },
  tukang: {
    key: "tukang",
    label: "Ongkos Upah Tukang",
    short: "Upah Tukang",
    jenisBelanja: "Pemeliharaan Sarana & Prasarana (Upah)",
    color: "#0f766e",
    sections: [
      {
        title: "Data Pekerjaan",
        fields: [
          { name: "namaPekerjaan", label: "Nama pekerjaan", type: "text", span: 2 },
          { name: "lokasi", label: "Lokasi pekerjaan", type: "text" },
          { name: "periode", label: "Periode pekerjaan (teks)", type: "text", placeholder: "contoh: 3 - 8 Maret 2025" },
          { name: "periodeMulai", label: "Tanggal mulai", type: "date" },
          { name: "periodeSelesai", label: "Tanggal selesai", type: "date" },
          { name: "tanggal", label: "Tanggal pembayaran", type: "date" },
          { name: "penerima", label: "Nama penerima kuitansi (mandor / ketua tukang)", type: "text", span: 2 },
        ],
      },
      {
        title: "Daftar Tukang / Pekerja",
        desc: "Total upah = jumlah hari kerja × upah per hari, dihitung otomatis.",
        fields: [
          {
            name: "items", label: "Tabel pekerja", type: "items", span: 3,
            items: {
              qty: "hari", price: "upah", addLabel: "Tambah pekerja", totalLabel: "Total upah",
              cols: [
                { name: "nama", label: "Nama tukang / pekerja", type: "text", w: "28%" },
                { name: "jenis", label: "Jenis pekerjaan", type: "text", w: "22%" },
                { name: "hari", label: "Hari kerja", type: "number" },
                { name: "upah", label: "Upah per hari", type: "number" },
              ],
            },
          },
        ],
      },
      kuitansiSection,
    ],
    slots: [{ slot: "dokumentasi", label: "Dokumentasi Pekerjaan (opsional)", max: 10 }],
    docs: [
      { key: "kuitansi", label: "Kuitansi Upah Tukang", group: "dokumen" },
      { key: "daftar_upah", label: "Daftar Penerimaan Upah Kerja Tukang", group: "dokumen" },
      { key: "hadir_tukang", label: "Daftar Hadir Tukang / Pekerja", group: "dokumen" },
      { key: "dokumentasi", label: "Dokumentasi Pekerjaan", group: "lampiran", slot: "dokumentasi" },
    ],
    defaults: () => ({ items: [{ nama: "", jenis: "", hari: "", upah: "" }] }),
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
export const isCat = (k: string): k is CatKey => k in CATEGORIES;

export function computeAmount(cat: CatKey, d: Data): number {
  switch (cat) {
    case "internet":
    case "listrik":
      return num(d.nominal);
    case "konsumsi":
    case "barang":
      return sumItems(itemList(d.items), "jumlah", "harga");
    case "tukang":
      return sumItems(itemList(d.items), "hari", "upah");
    case "pramuka":
    case "tahfidz":
      return num(d.honorPerPertemuan) * num(d.jumlahPertemuan);
  }
}

export function receiverOf(cat: CatKey, d: Data): string {
  switch (cat) {
    case "internet": return String(d.penyedia ?? "");
    case "barang": return String(d.namaToko ?? "");
    case "pramuka":
    case "tahfidz": return String(d.pembina ?? "");
    default: return String(d.penerima ?? "");
  }
}

export function titleOf(cat: CatKey, d: Data): string {
  switch (cat) {
    case "internet": return [d.penyedia, bulanLabel(d.bulan)].filter(Boolean).join(" - ") || "Pembayaran Internet";
    case "listrik": return `Listrik ${bulanLabel(d.bulan)}`.trim();
    case "konsumsi": return String(d.namaKegiatan || "Konsumsi Rapat");
    case "pramuka": return `Honor Pembina Pramuka${d.pembina ? " - " + d.pembina : ""}${d.periode ? " (" + d.periode + ")" : ""}`;
    case "tahfidz": return `Honor Pembimbing Tahfidz${d.pembina ? " - " + d.pembina : ""}${d.periode ? " (" + d.periode + ")" : ""}`;
    case "barang": return `Pembelian barang${d.namaToko ? " - " + d.namaToko : ""}`;
    case "tukang": return String(d.namaPekerjaan || "Upah Tukang");
  }
}

export function purposeOf(cat: CatKey, d: Data): string {
  if (String(d.untukPembayaran ?? "").trim()) return String(d.untukPembayaran).trim();
  const dots = "....................";
  switch (cat) {
    case "internet":
      return `Pembayaran biaya langganan internet ${d.penyedia || dots} bulan ${bulanLabel(d.bulan, dots)}`;
    case "listrik":
      return `Pembayaran tagihan listrik bulan ${bulanLabel(d.bulan, dots)}, ID Pelanggan ${d.idPelanggan || dots}`;
    case "konsumsi":
      return `Pembayaran konsumsi ${d.namaKegiatan || "rapat guru"}${d.tanggalRapat ? " pada tanggal " + tgl(d.tanggalRapat) : ""}`;
    case "pramuka":
      return `Pembayaran honor/transport pembina Pramuka periode ${d.periode || dots} (${num(d.jumlahPertemuan)} pertemuan)`;
    case "tahfidz":
      return `Pembayaran honor/transport pembimbing Tahfidz Al-Qur'an periode ${d.periode || dots} (${num(d.jumlahPertemuan)} pertemuan)`;
    case "barang":
      return `Pembelian barang pada ${d.namaToko || dots}${d.noTransaksi ? " (No. Transaksi " + d.noTransaksi + ")" : ""}`;
    case "tukang":
      return `Pembayaran upah tukang untuk pekerjaan ${d.namaPekerjaan || dots}${d.periode ? " periode " + d.periode : ""}`;
  }
}

// ---------------- Validasi kelengkapan ----------------
export type Check = { level: "error" | "warn"; msg: string };
export type Status = "lengkap" | "belum" | "periksa";

export function validate(
  cat: CatKey,
  d: Data,
  amount: number,
  date: string,
  receiptNo: string,
  counts: Record<string, number>,
  schoolOk: boolean,
): Check[] {
  const c: Check[] = [];
  const err = (msg: string) => c.push({ level: "error", msg });
  const warn = (msg: string) => c.push({ level: "warn", msg });
  const n = (s: string) => counts[s] ?? 0;
  const items = itemList(d.items);

  if (!receiptNo) err("Kuitansi belum dibuat: nomor kuitansi kosong");
  if (amount <= 0) err("Kuitansi belum dapat dibuat: nominal / total pembayaran belum diisi");
  if (!receiverOf(cat, d).trim()) err("Kuitansi: nama penerima belum diisi");
  if (!date) err("Kuitansi: tanggal pembayaran belum diisi");
  if (!schoolOk) warn("Identitas sekolah (kepala sekolah / bendahara) belum lengkap");

  switch (cat) {
    case "internet":
      if (!d.bulan) err("Bulan pembayaran belum diisi");
      if (n("nota") === 0) err("Nota / bukti pembayaran internet belum diunggah");
      break;
    case "listrik":
      if (!d.bulan) err("Bulan pembayaran belum diisi");
      if (!String(d.idPelanggan ?? "").trim()) err("ID pelanggan belum diisi");
      if (n("bukti") === 0) err("Nota / bukti pembayaran listrik belum diunggah");
      break;
    case "konsumsi": {
      const peserta = lines(d.peserta);
      if (!(d.namaKegiatan && d.tanggalRapat && d.tempatRapat) && n("undangan") === 0)
        err("Undangan belum lengkap: isi nama kegiatan, tanggal & tempat rapat, atau unggah scan undangan");
      if (!String(d.hasilRapat ?? "").trim() && n("notulen") === 0)
        err("Notulen belum diisi / belum diunggah");
      if (!(peserta.length > 0 || num(d.jumlahPeserta) > 0) && n("hadir") === 0)
        err("Daftar hadir belum diisi (nama peserta / jumlah peserta) atau belum diunggah");
      if (n("dokumentasi") === 0) err("Dokumentasi rapat belum diunggah");
      if (peserta.length > 0 && num(d.jumlahPeserta) > 0 && peserta.length !== num(d.jumlahPeserta))
        warn(`Jumlah peserta (${num(d.jumlahPeserta)}) berbeda dengan daftar nama (${peserta.length})`);
      if (items.some((i) => !i.jenis || !num(i.jumlah) || !num(i.harga)))
        warn("Ada rincian konsumsi yang belum lengkap");
      break;
    }
    case "pramuka":
    case "tahfidz": {
      const nm = cat === "pramuka" ? "Pramuka" : "Tahfidz";
      const tg = dateList(d.tanggalKegiatan);
      if (!String(d.periode ?? "").trim()) err("Periode pembayaran belum diisi");
      if (!String(d.skNomor ?? "").trim() && n("sk") === 0) err("SK belum tersedia: isi nomor SK atau unggah scan SK");
      if (tg.length === 0 && num(d.jumlahPertemuan) === 0) err("Daftar hadir pembina belum diisi (tanggal kegiatan)");
      if (lines(d.anggota).length === 0) err(`Daftar hadir peserta ${nm} belum diisi (nama peserta)`);
      if (n("dokumentasi") === 0) err(`Dokumentasi kegiatan ${nm} belum diunggah`);
      if (tg.length > 0 && num(d.jumlahPertemuan) !== tg.length)
        warn(`Jumlah pertemuan (${num(d.jumlahPertemuan)}) berbeda dengan jumlah tanggal kegiatan (${tg.length})`);
      break;
    }
    case "barang":
      if (items.length === 0 || items.some((i) => !i.nama || !num(i.jumlah) || !num(i.harga)))
        err("Tabel barang belum lengkap (nama, jumlah, harga)");
      if (!String(d.namaToko ?? "").trim()) err("Nama toko / penyedia belum diisi");
      if (n("nota") === 0) err("Nota / bukti transaksi belum diunggah");
      if (n("dokumentasi") === 0) err("Dokumentasi barang belum diunggah");
      if (!d.namaPenyerah || !d.namaPenerima || !d.namaPemeriksa)
        err("Berita acara belum lengkap: pihak penyerah, penerima, dan pemeriksa harus diisi");
      if (!String(d.nomorSP ?? "").trim()) warn("Nomor Surat Pesanan belum diisi");
      if (d.kondisi && d.kondisi !== "Baik dan sesuai spesifikasi") warn("Hasil pemeriksaan barang tidak sepenuhnya sesuai");
      break;
    case "tukang": {
      const days = dateRange(d.periodeMulai, d.periodeSelesai).length;
      if (!String(d.namaPekerjaan ?? "").trim()) err("Nama pekerjaan belum diisi");
      if (items.length === 0 || items.some((i) => !i.nama || !num(i.hari) || !num(i.upah)))
        err("Tabel pekerja belum lengkap (nama, hari kerja, upah)");
      if (days === 0) err("Daftar hadir tukang belum dapat dibuat: tanggal mulai/selesai belum diisi");
      if (days > 0 && items.some((i) => num(i.hari) > days))
        warn("Jumlah hari kerja melebihi rentang periode pekerjaan");
      break;
    }
  }
  return c;
}

export function statusOf(checks: Check[]): Status {
  if (checks.some((x) => x.level === "error")) return "belum";
  if (checks.length > 0) return "periksa";
  return "lengkap";
}
export const STATUS_LABEL: Record<Status, string> = {
  lengkap: "Lengkap",
  belum: "Belum lengkap",
  periksa: "Perlu diperiksa",
};
