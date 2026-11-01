"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getCtx, ForbiddenError } from "../../../lib/services/ctx";
import * as importer from "../../../lib/services/import";

// Thin wrappers: build ctx, call the import service, report errors in plain words.
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the import options." };
    if (e instanceof importer.ImportError || e instanceof ForbiddenError) return { ok: false, error: e.message };
    console.error("import failed", e);
    return { ok: false, error: "Something went wrong partway. Run the import again: rows already saved are skipped as duplicates." };
  }
}

const options = (f: FormData) => {
  try {
    return JSON.parse(String(f.get("options") ?? "{}"));
  } catch {
    return {};
  }
};

export async function analyzeImportAction(f: FormData) {
  const ctx = await getCtx();
  return run(() => importer.analyzeImport(ctx, f.get("file")));
}

export async function previewImportAction(f: FormData) {
  const ctx = await getCtx();
  return run(() => importer.previewImport(ctx, f.get("file"), options(f)));
}

export async function importContactsAction(f: FormData) {
  const ctx = await getCtx();
  const res = await run(() => importer.importContacts(ctx, f.get("file"), options(f)));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
