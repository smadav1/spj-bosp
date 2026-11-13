import pdfmake from "pdfmake";
import Times from "pdfmake/standard-fonts/Times";
import { Align, Block, Cell, Doc, Layout, Run, fitCm, normWidths, padSign, pageSize } from "./types";
import type { LoadedImg } from "./images";

const PT = 28.3465;
const pt = (cm: number) => cm * PT;
let fontsReady = false;

const uri = (i: LoadedImg) => `data:${i.mime};base64,${i.data.toString("base64")}`;
const txt = (rs: Run[]) =>
  rs.map((r) => ({ text: r.t, bold: r.b, italics: r.i, decoration: r.u ? "underline" : undefined }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function convert(b: Block, L: Layout, imgs: Map<number, LoadedImg>): Any[] {
  const { cw, ch } = pageSize(L);
  const CW = pt(cw);
  const noB = "noBorders";
  switch (b.k) {
    case "sp":
      return [{ text: " ", fontSize: 1, margin: [0, 0, 0, b.h ?? 8] }];
    case "title": {
      const out: Any[] = [{ text: b.text, bold: true, alignment: "center", decoration: b.u ? "underline" : undefined, margin: [0, 0, 0, b.sub?.length ? 0 : 12] }];
      (b.sub ?? []).forEach((s, i, a) => out.push({ text: s, bold: true, alignment: "center", margin: [0, 0, 0, i === a.length - 1 ? 12 : 0] }));
      return out;
    }
    case "p":
      return [{
        text: txt(b.runs), alignment: b.align ?? "left", fontSize: b.size ?? 12,
        margin: [b.ind ? pt(b.ind) : 0, 0, 0, b.after ?? 6],
        leadingIndent: b.first ? pt(b.first) : undefined,
      }];
    case "kop": {
      const img = b.logoId ? imgs.get(b.logoId) : undefined;
      const lines = { stack: b.lines.map((l) => ({ text: l.t, bold: l.b, fontSize: l.size, alignment: "center" })) };
      const out: Any[] = [];
      if (img) {
        const f = fitCm(img.w, img.h, 2.2, 2.2);
        out.push({
          table: { widths: [pt(2.4), "*"], body: [[{ image: uri(img), width: pt(f.w), height: pt(f.h) }, { ...lines, margin: [0, 0, pt(2.4), 0] }]] },
          layout: noB,
        });
      } else out.push(lines);
      out.push({
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: CW, y2: 0, lineWidth: 2 },
          { type: "line", x1: 0, y1: 3, x2: CW, y2: 3, lineWidth: 0.6 },
        ],
        margin: [0, 3, 0, 10],
      });
      return out;
    }
    case "kv":
      return [{
        table: {
          widths: [pt(b.lw ?? 4), 10, "*"],
          body: b.rows.map(([l, v, f]) => [
            { text: l, margin: [0, 0, 0, 3] },
            { text: ":", margin: [0, 0, 0, 3] },
            { text: v, bold: f?.includes("b"), italics: f?.includes("i"), margin: [0, 0, 0, 3] },
          ]),
        },
        layout: noB,
      }];
    case "table": {
      const nw = normWidths(b.widths);
      const fs = b.size ?? 12;
      const body: Any[][] = [b.head.map((h) => ({ text: h, bold: true, alignment: "center", fillColor: "#e5e7eb", fontSize: fs }))];
      for (const r of b.rows) {
        const row: Any[] = [];
        let ci = 0;
        for (const c of r) {
          const cell: Cell = typeof c === "string" ? { t: c } : c;
          const span = cell.span ?? 1;
          row.push({ text: cell.t, bold: cell.b, alignment: cell.align ?? b.aligns?.[ci] ?? "left", fontSize: fs, colSpan: span > 1 ? span : undefined });
          for (let k = 1; k < span; k++) row.push({});
          ci += span;
        }
        body.push(row);
      }
      return [{
        table: {
          headerRows: 1, dontBreakRows: true,
          widths: nw.map((x) => x * CW - 8.7),
          heights: (ri: number) => (ri > 0 && b.rowH ? pt(b.rowH) : undefined),
          body,
        },
        layout: {
          hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => "#000", vLineColor: () => "#000",
          paddingTop: () => 3, paddingBottom: () => 3, paddingLeft: () => 4, paddingRight: () => 4,
        },
      }];
    }
    case "sign": {
      const cols = padSign(b.cols);
      return [{
        unbreakable: true,
        table: {
          widths: cols.map(() => "*"),
          body: [cols.map((c) => c.empty
            ? { text: "" }
            : {
                stack: [
                  ...c.head.map((h) => ({ text: h || " ", alignment: "center" })),
                  { text: " ", margin: [0, 0, 0, 58] },
                  { text: c.name, bold: true, decoration: "underline", alignment: "center" },
                  ...(c.nip ? [{ text: c.nip, alignment: "center" }] : []),
                ],
              })],
        },
        layout: noB,
      }];
    }
    case "images": {
      const items = b.items.filter((i) => imgs.has(i.id));
      if (b.cols === 1)
        return items.map((it) => {
          const im = imgs.get(it.id)!;
          const f = fitCm(im.w, im.h, cw, b.maxH ?? ch * 0.7);
          return { image: uri(im), width: pt(f.w), height: pt(f.h), alignment: "center", margin: [0, 0, 0, 8] };
        });
      const body: Any[][] = [];
      for (let i = 0; i < items.length; i += 2) {
        body.push([items[i], items[i + 1]].map((it) => {
          if (!it) return { text: "" };
          const im = imgs.get(it.id)!;
          const f = fitCm(im.w, im.h, cw / 2 - 0.6, b.maxH ?? 8);
          return { image: uri(im), width: pt(f.w), height: pt(f.h), alignment: "center", margin: [0, 3, 0, 3] };
        }));
      }
      return body.length ? [{ table: { widths: ["*", "*"], dontBreakRows: true, body }, layout: noB }] : [];
    }
  }
}

export async function renderPdf(docs: Doc[], L: Layout, imgs: Map<number, LoadedImg>, title: string): Promise<Buffer> {
  if (!fontsReady) {
    pdfmake.addFonts(Times);
    fontsReady = true;
  }
  const { pw, ph } = pageSize(L);
  const content: Any[] = [];
  docs.forEach((d, di) => {
    const items = d.blocks.flatMap((b) => convert(b, L, imgs));
    if (di > 0 && items.length) items[0] = { ...items[0], pageBreak: "before" };
    content.push(...items);
  });
  if (!content.length) content.push({ text: "Tidak ada dokumen." });
  const def = {
    info: { title, creator: "Aplikasi SPJ BOSP" },
    pageSize: { width: pt(pw), height: pt(ph) },
    pageMargins: [pt(L.ml), pt(L.mt), pt(L.mr), pt(L.mb)],
    defaultStyle: { font: "Times", fontSize: 12, lineHeight: 1.15 },
    footer: (cur: number) => ({ text: String(cur), alignment: "center", fontSize: 9, margin: [0, 8, 0, 0] }),
    content,
  };
  const pdf = pdfmake.createPdf(def);
  return Buffer.from(await pdf.getBuffer());
}

export type { Align };
