export const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const roman = (n: number) => ROMAN[n] ?? String(n);

export function rupiah(n: number | string | undefined | null) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("id-ID").format(Math.round(v));
}
export const rp = (n: number | string | undefined | null) => "Rp " + rupiah(n);

function parseYMD(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
export function tgl(s?: string, fallback = ""): string {
  const d = parseYMD(s);
  if (!d) return fallback;
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
export function hariOf(s?: string, fallback = ""): string {
  const d = parseYMD(s);
  return d ? HARI[d.getDay()] : fallback;
}
export function hariTgl(s?: string, fallback = ""): string {
  const d = parseYMD(s);
  return d ? `${HARI[d.getDay()]}, ${tgl(s)}` : fallback;
}
export function tglShort(s?: string): string {
  const d = parseYMD(s);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function bulanLabel(ym?: string, fallback = ""): string {
  const m = /^(\d{4})-(\d{2})/.exec(ym ?? "");
  if (!m) return fallback;
  return `${BULAN[Number(m[2]) - 1]} ${m[1]}`;
}

/** Rentang tanggal (inklusif), maksimum 62 hari. */
export function dateRange(a?: string, b?: string): string[] {
  const s = parseYMD(a);
  const e = parseYMD(b);
  if (!s || !e || e < s) return [];
  const out: string[] = [];
  const c = new Date(s);
  while (c <= e && out.length < 62) {
    out.push(
      `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-${String(c.getDate()).padStart(2, "0")}`,
    );
    c.setDate(c.getDate() + 1);
  }
  return out;
}

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function say(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return say(n - 10) + " belas";
  if (n < 100) return say(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + say(n % 10) : "");
  if (n < 200) return "seratus" + (n - 100 ? " " + say(n - 100) : "");
  if (n < 1000) return say(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + say(n % 100) : "");
  if (n < 2000) return "seribu" + (n - 1000 ? " " + say(n - 1000) : "");
  if (n < 1e6) return say(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + say(n % 1000) : "");
  if (n < 1e9) return say(Math.floor(n / 1e6)) + " juta" + (n % 1e6 ? " " + say(n % 1e6) : "");
  if (n < 1e12) return say(Math.floor(n / 1e9)) + " miliar" + (n % 1e9 ? " " + say(n % 1e9) : "");
  if (n < 1e15) return say(Math.floor(n / 1e12)) + " triliun" + (n % 1e12 ? " " + say(n % 1e12) : "");
  return String(n);
}

/** Terbilang bahasa Indonesia, contoh: "Seratus dua puluh lima ribu rupiah" */
export function terbilang(n: number | string | undefined | null): string {
  const v = Math.round(Number(n) || 0);
  if (v === 0) return "Nol rupiah";
  const s = (v < 0 ? "minus " : "") + say(Math.abs(v)) + " rupiah";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatReceiptNo(fmt: string, seq: number, year: number, month: number, kode = "") {
  return fmt
    .replace(/\{NO3\}/g, String(seq).padStart(3, "0"))
    .replace(/\{NO4\}/g, String(seq).padStart(4, "0"))
    .replace(/\{NO\}/g, String(seq))
    .replace(/\{TAHUN\}/g, String(year))
    .replace(/\{BULAN\}/g, roman(month || new Date().getMonth() + 1))
    .replace(/\{KODE\}/g, kode);
}

export function dateTimeId(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
