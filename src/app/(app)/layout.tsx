import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { ensureBootstrap, getSchool } from "@/lib/settings";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  await ensureBootstrap();
  const school = await getSchool();
  return (
    <div className="min-h-screen">
      <Sidebar user={user.name || user.username} school={school.nama} year={school.tahunAnggaran} />
      <main className="p-4 sm:p-6 lg:ml-64 lg:p-8">{children}</main>
    </div>
  );
}
