export type Align = "left" | "center" | "right" | "justify";
export type Run = { t: string; b?: boolean; i?: boolean; u?: boolean };
export type Cell = { t: string; span?: number; align?: Align; b?: boolean };
export type ImgRef = { id: number; w: number; h: number; name: string };
export type SignCol = { head: string[]; name: string; nip?: string; empty?: boolean };

export type Block =
  | { k: "kop"; logoId?: number | null; lines: { t: string; size: number; b?: boolean }[] }
  | { k: "title"; text: string; sub?: string[]; u?: boolean }
  | { k: "p"; runs: Run[]; align?: Align; ind?: number; first?: number; after?: number; size?: number }
  | { k: "kv"; rows: [string, string, string?][]; lw?: number; ind?: number }
  | {
      k: "table";
      widths: number[];
      head: string[];
      rows: (string | Cell)[][];
      aligns?: Align[];
      size?: number;
      rowH?: number;
    }
  | { k: "sign"; cols: SignCol[] }
  | { k: "images"; items: ImgRef[]; cols: 1 | 2; maxH?: number }
  | { k: "sp"; h?: number };

export type Doc = {
  key: string;
  label: string;
  group: "dokumen" | "lampiran";
  inPackage: boolean;
  blocks: Block[];
};

export type Layout = { landscape: boolean; mt: number; mr: number; mb: number; ml: number };
export const F4 = { w: 21.5, h: 33 };
export function pageSize(l: Layout) {
  const pw = l.landscape ? F4.h : F4.w;
  const ph = l.landscape ? F4.w : F4.h;
  return { pw, ph, cw: pw - l.ml - l.mr, ch: ph - l.mt - l.mb };
}
export const runsText = (r: Run[]) => r.map((x) => x.t).join("");

/** Samakan jumlah baris judul tanda tangan (diisi dari atas) agar nama sejajar. */
export function padSign(cols: SignCol[]): SignCol[] {
  const max = Math.max(0, ...cols.filter((c) => !c.empty).map((c) => c.head.length));
  return cols.map((c) => ({ ...c, head: [...Array(Math.max(0, max - c.head.length)).fill(""), ...c.head] }));
}
export const normWidths = (w: number[]) => {
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x) => x / s);
};
export function fitCm(w: number, h: number, bw: number, bh: number) {
  const pxcm = 96 / 2.54;
  const cw = (w || 4) / pxcm;
  const ch = (h || 3) / pxcm;
  const s = Math.min(bw / cw, bh / ch);
  return { w: cw * s, h: ch * s };
}
