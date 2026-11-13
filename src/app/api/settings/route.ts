import { isResponse, requireUser } from "@/lib/auth";
import { setSetting, getSetting, ensureYear, DEFAULT_SCHOOL, DEFAULT_PRINT, getSchool } from "@/lib/settings";

export const dynamic = "force-dynamic";
const KEYS = ["school", "print", "templates"] as const;

export async function PUT(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const { key, value } = await req.json();
  if (!KEYS.includes(key) || typeof value !== "object" || !value) return Response.json({ error: "Data tidak valid" }, { status: 400 });
  if (key === "school") {
    const cur = await getSchool();
    const v = { ...DEFAULT_SCHOOL, ...value, logoFileId: cur.logoFileId };
    v.tahunAnggaran = Number(v.tahunAnggaran) || cur.tahunAnggaran;
    await setSetting("school", v);
    await ensureYear(v.tahunAnggaran);
  } else if (key === "print") {
    const v = { ...DEFAULT_PRINT, ...value };
    for (const k of ["mt", "mr", "mb", "ml"] as const) v[k] = Math.min(6, Math.max(0.5, Number(v[k]) || 2));
    await setSetting("print", v);
  } else {
    await setSetting("templates", value);
  }
  return Response.json({ ok: true, current: await getSetting(key, {}) });
}
