import { PageHeader } from "@/components/ui";
import BackupPanel from "@/components/BackupPanel";

export const dynamic = "force-dynamic";

export default function BackupPage() {
  return (
    <div>
      <PageHeader title="Backup & Restore" desc="Data tersimpan permanen di database server. Lakukan backup berkala sebagai cadangan tambahan." />
      <BackupPanel />
    </div>
  );
}
