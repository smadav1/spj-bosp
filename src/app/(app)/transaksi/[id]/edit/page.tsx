import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { isCat } from "@/lib/categories";
import { PageHeader } from "@/components/ui";
import TransactionForm from "@/components/TransactionForm";

export const dynamic = "force-dynamic";

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const r = (await db.select().from(transactions).where(eq(transactions.id, id)).limit(1))[0];
  if (!r || !isCat(r.category)) notFound();
  if (r.isFinal) redirect(`/transaksi/${id}`);
  return (
    <div>
      <PageHeader title="Edit Transaksi" desc={`${r.uid} - Tahun Anggaran ${r.fiscalYear}`}>
        <Link href={`/transaksi/${id}`} className="btn btn-outline">Kembali ke detail</Link>
      </PageHeader>
      <TransactionForm category={r.category} id={id} uid={r.uid} year={r.fiscalYear} initialData={r.data as Record<string, unknown>} initialReceiptNo={r.receiptNo} />
    </div>
  );
}
