import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, auditLogs, files, fiscalYears, transactions } from "@/db/schema";
import { isResponse, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const [s, fy, t, f, a] = await Promise.all([
    db.select().from(appSettings),
    db.select().from(fiscalYears),
    db.select().from(transactions),
    db.select().from(files),
    db.select().from(auditLogs),
  ]);
  const payload = {
    app: "spj-bosp", version: 1, exportedAt: new Date().toISOString(),
    settings: s, fiscalYears: fy, transactions: t, auditLogs: a,
    files: f.map((x) => ({ ...x, data: x.data.toString("base64") })),
  };
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-spj-bosp-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const D = (v: any) => (v ? new Date(v) : new Date());

export async function POST(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  let p: any;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    if (!(f instanceof File)) throw new Error("no file");
    p = JSON.parse(await f.text());
  } catch {
    return Response.json({ error: "Berkas backup tidak valid" }, { status: 400 });
  }
  if (p?.app !== "spj-bosp" || !Array.isArray(p.transactions) || !Array.isArray(p.files))
    return Response.json({ error: "Berkas ini bukan backup Aplikasi SPJ BOSP" }, { status: 400 });
  try {
    await db.transaction(async (tx) => {
      await tx.delete(auditLogs);
      await tx.delete(files);
      await tx.delete(transactions);
      await tx.delete(fiscalYears);
      await tx.delete(appSettings);
      if (p.settings.length) await tx.insert(appSettings).values(p.settings);
      if (p.fiscalYears.length) await tx.insert(fiscalYears).values(p.fiscalYears.map((x: any) => ({ ...x, createdAt: D(x.createdAt) })));
      for (let i = 0; i < p.transactions.length; i += 100)
        await tx.insert(transactions).values(p.transactions.slice(i, i + 100).map((x: any) => ({ ...x, createdAt: D(x.createdAt), updatedAt: D(x.updatedAt) })));
      for (let i = 0; i < p.files.length; i += 20)
        await tx.insert(files).values(p.files.slice(i, i + 20).map((x: any) => ({ ...x, data: Buffer.from(x.data, "base64"), createdAt: D(x.createdAt) })));
      for (let i = 0; i < (p.auditLogs ?? []).length; i += 200)
        await tx.insert(auditLogs).values(p.auditLogs.slice(i, i + 200).map((x: any) => ({ ...x, createdAt: D(x.createdAt) })));
      await tx.execute(sql`select setval(pg_get_serial_sequence('transactions','id'), greatest((select coalesce(max(id),0) from transactions),1))`);
      await tx.execute(sql`select setval(pg_get_serial_sequence('files','id'), greatest((select coalesce(max(id),0) from files),1))`);
      await tx.execute(sql`select setval(pg_get_serial_sequence('audit_logs','id'), greatest((select coalesce(max(id),0) from audit_logs),1))`);
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Restore gagal: " + (e instanceof Error ? e.message : "") }, { status: 500 });
  }
  return Response.json({ ok: true, transaksi: p.transactions.length, berkas: p.files.length });
}
