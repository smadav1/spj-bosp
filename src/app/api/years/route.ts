import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fiscalYears } from "@/db/schema";
import { isResponse, requireUser } from "@/lib/auth";
import { ensureYear, getSchool, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const b = await req.json();
  const year = Number(b.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return Response.json({ error: "Tahun tidak valid" }, { status: 400 });
  if (b.action === "add") {
    await ensureYear(year);
    if (b.note) await db.update(fiscalYears).set({ note: String(b.note) }).where(eq(fiscalYears.year, year));
  } else if (b.action === "activate") {
    await ensureYear(year);
    const s = await getSchool();
    await setSetting("school", { ...s, tahunAnggaran: year });
  } else if (b.action === "archive" || b.action === "unarchive") {
    await db.update(fiscalYears).set({ archived: b.action === "archive" }).where(eq(fiscalYears.year, year));
  } else return Response.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  return Response.json({ ok: true });
}
