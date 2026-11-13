import { notFound } from "next/navigation";
import { loadDocs } from "@/lib/trx";
import { getPrint } from "@/lib/settings";
import PrintViewer from "@/components/PrintViewer";

export const dynamic = "force-dynamic";

export default async function Cetak({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string; docs?: string; print?: string }> }) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const r = await loadDocs(id);
  if (!r) notFound();
  const print = await getPrint();
  const { docs } = r;
  let initial: string[];
  const want = (sp.docs ?? "").split(",").filter(Boolean);
  switch (sp.mode) {
    case "dokumen": initial = docs.filter((d) => d.group === "dokumen").map((d) => d.key); break;
    case "lampiran": initial = docs.filter((d) => d.group === "lampiran").map((d) => d.key); break;
    case "single": initial = want.length ? want : docs.slice(0, 1).map((d) => d.key); break;
    default: initial = docs.filter((d) => d.inPackage).map((d) => d.key);
  }
  return (
    <PrintViewer
      docs={docs}
      title={`SPJ ${r.ctx.trx.uid} - ${r.ctx.trx.receiptNo}`}
      exportQuery={`src=trx&id=${id}`}
      defaults={{ landscape: print.orientation === "landscape", mt: print.mt, mr: print.mr, mb: print.mb, ml: print.ml }}
      initial={initial}
      autoPrint={sp.print === "1"}
      backHref={`/transaksi/${id}`}
      checks={r.checks}
      showPresets
    />
  );
}
