import type { CSSProperties } from "react";
import { Block, Cell, Layout, Run, normWidths, padSign, pageSize } from "@/lib/docs/types";

const runEl = (r: Run, i: number) => (
  <span key={i} style={{ fontWeight: r.b ? 700 : undefined, fontStyle: r.i ? "italic" : undefined, textDecoration: r.u ? "underline" : undefined, whiteSpace: "pre-line" }}>
    {r.t}
  </span>
);

export function Blocks({ blocks, layout }: { blocks: Block[]; layout: Layout }) {
  const { ch } = pageSize(layout);
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.k) {
          case "sp":
            return <div key={i} style={{ height: `${b.h ?? 8}pt` }} />;
          case "title":
            return (
              <div key={i} style={{ textAlign: "center", fontWeight: 700, marginBottom: 12 }} className="nobreak">
                <div style={{ textDecoration: b.u ? "underline" : undefined }}>{b.text}</div>
                {(b.sub ?? []).map((s, j) => <div key={j}>{s}</div>)}
              </div>
            );
          case "p": {
            const st: CSSProperties = {
              margin: 0, marginBottom: `${b.after ?? 6}pt`, textAlign: b.align ?? "left",
              marginLeft: b.ind ? `${b.ind}cm` : undefined, textIndent: b.first ? `${b.first}cm` : undefined,
              fontSize: b.size ? `${b.size}pt` : undefined, lineHeight: 1.35, minHeight: "1em",
            };
            return <p key={i} style={st}>{b.runs.map(runEl)}</p>;
          }
          case "kop":
            return (
              <div key={i} className="nobreak" style={{ display: "flex", alignItems: "center", gap: "0.4cm", borderBottom: "4px double #000", paddingBottom: 6, marginBottom: 14 }}>
                {b.logoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${b.logoId}`} alt="Logo" style={{ width: "2.2cm", height: "2.2cm", objectFit: "contain", margin: 0 }} />
                ) : null}
                <div style={{ flex: 1, textAlign: "center", paddingRight: b.logoId ? "2.6cm" : 0 }}>
                  {b.lines.map((l, j) => (
                    <div key={j} style={{ fontSize: `${l.size}pt`, fontWeight: l.b ? 700 : 400, lineHeight: 1.25 }}>{l.t}</div>
                  ))}
                </div>
              </div>
            );
          case "kv":
            return (
              <table key={i} className="kv nobreak" style={{ width: "100%", tableLayout: "fixed", marginBottom: 2 }}>
                <colgroup><col style={{ width: `${b.lw ?? 4}cm` }} /><col style={{ width: "0.5cm" }} /><col /></colgroup>
                <tbody>
                  {b.rows.map(([l, v, f], j) => (
                    <tr key={j}>
                      <td>{l}</td>
                      <td>:</td>
                      <td style={{ fontWeight: f?.includes("b") ? 700 : undefined, fontStyle: f?.includes("i") ? "italic" : undefined }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case "table": {
            const w = normWidths(b.widths);
            return (
              <table key={i} className="dt" style={{ fontSize: `${b.size ?? 12}pt` }}>
                <colgroup>{w.map((x, j) => <col key={j} style={{ width: `${(x * 100).toFixed(2)}%` }} />)}</colgroup>
                <thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                <tbody>
                  {b.rows.map((r, ri) => {
                    let ci = 0;
                    return (
                      <tr key={ri} style={{ height: b.rowH ? `${b.rowH}cm` : undefined }}>
                        {r.map((c, k) => {
                          const cell: Cell = typeof c === "string" ? { t: c } : c;
                          const al = cell.align ?? b.aligns?.[ci] ?? "left";
                          ci += cell.span ?? 1;
                          return <td key={k} colSpan={cell.span} style={{ textAlign: al, fontWeight: cell.b ? 700 : undefined, whiteSpace: "pre-line" }}>{cell.t}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          }
          case "sign": {
            const cols = padSign(b.cols);
            return (
              <table key={i} className="sg nobreak" style={{ width: "100%", tableLayout: "fixed", breakInside: "avoid" }}>
                <tbody>
                  <tr>
                    {cols.map((c, j) => (
                      <td key={j}>
                        {!c.empty && (
                          <>
                            {c.head.map((h, k) => <div key={k} style={{ minHeight: "1.3em" }}>{h}</div>)}
                            <div style={{ height: "2.2cm" }} />
                            <div style={{ fontWeight: 700, textDecoration: "underline" }}>{c.name}</div>
                            {c.nip && <div>{c.nip}</div>}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            );
          }
          case "images": {
            const two = b.cols === 2;
            const maxH = b.maxH ?? ch * 0.7;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: two ? "1fr 1fr" : "1fr", gap: "0.4cm" }}>
                {b.items.map((it) => (
                  <figure key={it.id} style={{ margin: 0, textAlign: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${it.id}`} alt={it.name} style={{ maxHeight: `${maxH}cm`, maxWidth: "100%", width: "auto", height: "auto", objectFit: "contain" }} />
                  </figure>
                ))}
              </div>
            );
          }
        }
      })}
    </>
  );
}
