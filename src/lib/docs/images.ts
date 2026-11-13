import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import type { Block, Doc } from "./types";

export type LoadedImg = { data: Buffer; mime: string; w: number; h: number };

export function collectImageIds(docs: Doc[]): number[] {
  const ids = new Set<number>();
  for (const d of docs)
    for (const b of d.blocks) {
      if (b.k === "images") b.items.forEach((i) => ids.add(i.id));
      if (b.k === "kop" && b.logoId) ids.add(b.logoId);
    }
  return [...ids];
}

export async function loadImages(docs: Doc[]): Promise<Map<number, LoadedImg>> {
  const ids = collectImageIds(docs);
  const m = new Map<number, LoadedImg>();
  if (!ids.length) return m;
  const rows = await db
    .select({ id: files.id, data: files.data, mime: files.mime, w: files.width, h: files.height })
    .from(files)
    .where(inArray(files.id, ids));
  for (const r of rows) if (r.mime === "image/jpeg" || r.mime === "image/png") m.set(r.id, { data: r.data, mime: r.mime, w: r.w, h: r.h });
  return m;
}

export type { Block };
