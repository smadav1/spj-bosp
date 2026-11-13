import { STATUS_LABEL, Status } from "@/lib/categories";

export function StatusBadge({ status }: { status: Status }) {
  const cls =
    status === "lengkap"
      ? "bg-emerald-100 text-emerald-800"
      : status === "periksa"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";
  return <span className={`badge ${cls}`}>{STATUS_LABEL[status]}</span>;
}

export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
