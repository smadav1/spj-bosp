import { buildReportDocs } from "@/lib/trx";
import { getPrint, getSchool } from "@/lib/settings";
import PrintViewer from "@/components/PrintViewer";

export const dynamic = "force-dynamic";

export default async function CetakLaporan({ searchParams }: { searchParams: Promise<{ tahun?: string; docs?: string; print?: string }> }) {
  const sp = await searchParams;
  const school = await getSchool();
  const year = Number(sp.tahun) || school.tahunAnggaran;
  const print = await getPrint();
  const docs = await buildReportDocs(year);
  const want = (sp.docs ?? "").split(",").filter(Boolean);
  return (
    <PrintViewer
      docs={docs}
      title={`Laporan SPJ BOSP Tahun Anggaran ${year}`}
      exportQuery={`src=laporan&year=${year}`}
      defaults={{ landscape: true, mt: print.mt, mr: print.mr, mb: print.mb, ml: print.ml }}
      initial={want.length ? want : docs.map((d) => d.key)}
      autoPrint={sp.print === "1"}
      backHref={`/laporan?tahun=${year}`}
      showPresets={false}
    />
  );
}
