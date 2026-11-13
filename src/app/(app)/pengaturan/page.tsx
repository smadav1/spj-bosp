import { getPrint, getSchool } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function Pengaturan() {
  const [school, print] = await Promise.all([getSchool(), getPrint()]);
  return (
    <div>
      <PageHeader title="Pengaturan Sekolah" desc="Identitas, kop surat, tanda tangan, format nomor kuitansi, dan pengaturan cetak. Semua dokumen mengambil data dari sini." />
      <SettingsForm school={school} print={print} />
    </div>
  );
}
