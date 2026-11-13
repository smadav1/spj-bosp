import { getTemplates } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import TemplateEditor from "@/components/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function TemplatePage() {
  return (
    <div>
      <PageHeader title="Template Dokumen" desc="Sesuaikan redaksi surat dan SK agar sesuai ketentuan administrasi dan juknis BOSP yang berlaku. Perubahan berlaku untuk semua dokumen yang dicetak berikutnya." />
      <TemplateEditor saved={await getTemplates()} />
    </div>
  );
}
