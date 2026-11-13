import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ImageRun, Footer, PageNumber, PageOrientation, VerticalAlign, HeightRule,
  ShadingType, TableLayoutType, type IBorderOptions,
} from "docx";
import { Align, Block, Cell, Doc, Layout, Run, fitCm, normWidths, padSign, pageSize, F4 } from "./types";
import type { LoadedImg } from "./images";

const FONT = "Times New Roman";
const tw = (cm: number) => Math.round(cm * 567);
const NB: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOBORDERS = { top: NB, bottom: NB, left: NB, right: NB };
const LN: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const ALL = { top: LN, bottom: LN, left: LN, right: LN };

const AL: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED,
};

function runs(rs: Run[], size = 24): TextRun[] {
  return rs.flatMap((r) =>
    r.t.split("\n").map(
      (line, i) =>
        new TextRun({ text: line, bold: r.b, italics: r.i, underline: r.u ? {} : undefined, font: FONT, size, break: i > 0 ? 1 : undefined }),
    ),
  );
}
const para = (text: string, o: { b?: boolean; i?: boolean; u?: boolean; size?: number; align?: Align; after?: number } = {}) =>
  new Paragraph({
    alignment: AL[o.align ?? "left"],
    spacing: { after: (o.after ?? 0) * 20, line: 264 },
    children: runs([{ t: text, b: o.b, i: o.i, u: o.u }], o.size ?? 24),
  });

function imageRun(img: LoadedImg, bw: number, bh: number) {
  const f = fitCm(img.w, img.h, bw, bh);
  const px = 96 / 2.54;
  return new ImageRun({
    type: img.mime === "image/png" ? "png" : "jpg",
    data: img.data,
    transformation: { width: Math.max(1, Math.round(f.w * px)), height: Math.max(1, Math.round(f.h * px)) },
  });
}

function convert(b: Block, L: Layout, imgs: Map<number, LoadedImg>): (Paragraph | Table)[] {
  const { cw, ch } = pageSize(L);
  const CW = tw(cw);
  switch (b.k) {
    case "sp":
      return [new Paragraph({ spacing: { after: (b.h ?? 8) * 20 }, children: [] })];
    case "title": {
      const out: Paragraph[] = [para(b.text, { b: true, u: b.u, align: "center", after: b.sub?.length ? 0 : 12 })];
      (b.sub ?? []).forEach((s, i, arr) => out.push(para(s, { b: true, align: "center", after: i === arr.length - 1 ? 12 : 0 })));
      return out;
    }
    case "p":
      return [
        new Paragraph({
          alignment: AL[b.align ?? "left"],
          spacing: { after: (b.after ?? 6) * 20, line: 276 },
          indent: { left: b.ind ? tw(b.ind) : undefined, firstLine: b.first ? tw(b.first) : undefined },
          children: runs(b.runs, (b.size ?? 12) * 2),
        }),
      ];
    case "kop": {
      const img = b.logoId ? imgs.get(b.logoId) : undefined;
      const lineParas = b.lines.map((l) => para(l.t, { b: l.b, size: l.size * 2, align: "center" }));
      const out: (Paragraph | Table)[] = [];
      if (img) {
        const lw = tw(2.4);
        out.push(
          new Table({
            width: { size: CW, type: WidthType.DXA }, columnWidths: [lw, CW - lw], layout: TableLayoutType.FIXED,
            borders: { ...NOBORDERS, insideHorizontal: NB, insideVertical: NB },
            rows: [
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({ width: { size: lw, type: WidthType.DXA }, borders: NOBORDERS, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [imageRun(img, 2.2, 2.2)] })] }),
                  new TableCell({ width: { size: CW - lw, type: WidthType.DXA }, borders: NOBORDERS, verticalAlign: VerticalAlign.CENTER, children: lineParas }),
                ],
              }),
            ],
          }),
        );
      } else out.push(...lineParas);
      out.push(
        new Paragraph({
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.DOUBLE, size: 12, color: "000000", space: 1 } },
          children: [],
        }),
      );
      return out;
    }
    case "kv": {
      const lw = tw(b.lw ?? 4);
      const cw2 = tw(0.5);
      return [
        new Table({
          width: { size: CW, type: WidthType.DXA }, columnWidths: [lw, cw2, CW - lw - cw2], layout: TableLayoutType.FIXED,
          borders: { ...NOBORDERS, insideHorizontal: NB, insideVertical: NB },
          rows: b.rows.map(
            ([l, v, f]) =>
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({ width: { size: lw, type: WidthType.DXA }, borders: NOBORDERS, children: [new Paragraph({ spacing: { after: 60 }, children: runs([{ t: l }]) })] }),
                  new TableCell({ width: { size: cw2, type: WidthType.DXA }, borders: NOBORDERS, children: [new Paragraph({ spacing: { after: 60 }, children: runs([{ t: ":" }]) })] }),
                  new TableCell({ width: { size: CW - lw - cw2, type: WidthType.DXA }, borders: NOBORDERS, children: [new Paragraph({ spacing: { after: 60 }, children: runs([{ t: v, b: f?.includes("b"), i: f?.includes("i") }]) })] }),
                ],
              }),
          ),
        }),
      ];
    }
    case "table": {
      const nw = normWidths(b.widths);
      const cols = nw.map((x) => Math.round(x * CW));
      const sz = (b.size ?? 12) * 2;
      const mk = (c: Cell, ci: number, header: boolean) => {
        const span = c.span ?? 1;
        const width = cols.slice(ci, ci + span).reduce((a, x) => a + x, 0);
        const align = header ? "center" : c.align ?? b.aligns?.[ci] ?? "left";
        return new TableCell({
          width: { size: width, type: WidthType.DXA }, columnSpan: span > 1 ? span : undefined, borders: ALL,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 50, bottom: 50, left: 80, right: 80 },
          shading: header ? { type: ShadingType.CLEAR, fill: "E5E7EB", color: "auto" } : undefined,
          children: [new Paragraph({ alignment: AL[align], children: runs([{ t: c.t, b: header || c.b }], sz) })],
        });
      };
      const rowsOut = [
        new TableRow({ tableHeader: true, cantSplit: true, children: b.head.map((h, i) => mk({ t: h }, i, true)) }),
        ...b.rows.map((r) => {
          let ci = 0;
          const cells = r.map((c) => {
            const cell: Cell = typeof c === "string" ? { t: c } : c;
            const out = mk(cell, ci, false);
            ci += cell.span ?? 1;
            return out;
          });
          return new TableRow({
            cantSplit: true,
            height: b.rowH ? { value: tw(b.rowH), rule: HeightRule.ATLEAST } : undefined,
            children: cells,
          });
        }),
      ];
      return [new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: cols, layout: TableLayoutType.FIXED, rows: rowsOut })];
    }
    case "sign": {
      const cols = padSign(b.cols);
      const n = cols.length;
      const w = Math.floor(CW / n);
      const cells = cols.map(
        (c) =>
          new TableCell({
            width: { size: w, type: WidthType.DXA }, borders: NOBORDERS,
            children: c.empty
              ? [new Paragraph({ children: [] })]
              : [
                  ...c.head.map((h) => para(h, { align: "center" })),
                  para("", { after: 0 }), para("", { after: 0 }), para("", { after: 0 }), para("", { after: 0 }),
                  para(c.name, { b: true, u: true, align: "center" }),
                  ...(c.nip ? [para(c.nip, { align: "center" })] : []),
                ],
          }),
      );
      return [
        new Table({
          width: { size: w * n, type: WidthType.DXA }, columnWidths: cols.map(() => w), layout: TableLayoutType.FIXED,
          borders: { ...NOBORDERS, insideHorizontal: NB, insideVertical: NB },
          rows: [new TableRow({ cantSplit: true, children: cells })],
        }),
      ];
    }
    case "images": {
      const items = b.items.filter((i) => imgs.has(i.id));
      if (b.cols === 1) {
        return items.map(
          (it) =>
            new Paragraph({
              alignment: AlignmentType.CENTER, spacing: { after: 160 }, keepNext: false,
              children: [imageRun(imgs.get(it.id)!, cw, b.maxH ?? ch * 0.7)],
            }),
        );
      }
      const w = Math.floor(CW / 2);
      const rows: TableRow[] = [];
      for (let i = 0; i < items.length; i += 2) {
        const cells = [items[i], items[i + 1]].map(
          (it) =>
            new TableCell({
              width: { size: w, type: WidthType.DXA }, borders: NOBORDERS, verticalAlign: VerticalAlign.CENTER,
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: it ? [imageRun(imgs.get(it.id)!, cw / 2 - 0.4, b.maxH ?? 8)] : [],
                }),
              ],
            }),
        );
        rows.push(new TableRow({ cantSplit: true, children: cells }));
      }
      if (!rows.length) return [];
      return [
        new Table({
          width: { size: w * 2, type: WidthType.DXA }, columnWidths: [w, w], layout: TableLayoutType.FIXED,
          borders: { ...NOBORDERS, insideHorizontal: NB, insideVertical: NB }, rows,
        }),
      ];
    }
  }
}

export async function renderDocx(docs: Doc[], L: Layout, imgs: Map<number, LoadedImg>, title: string): Promise<Buffer> {
  const sections = docs.map((d) => ({
    properties: {
      page: {
        size: { width: tw(F4.w), height: tw(F4.h), orientation: L.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
        margin: { top: tw(L.mt), right: tw(L.mr), bottom: tw(L.mb), left: tw(L.ml), footer: tw(Math.min(1, L.mb / 2)) },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })] })],
      }),
    },
    children: d.blocks.flatMap((b) => convert(b, L, imgs)),
  }));
  const doc = new Document({
    creator: "Aplikasi SPJ BOSP",
    title,
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: sections.length ? sections : [{ children: [new Paragraph("")] }],
  });
  return Packer.toBuffer(doc);
}
