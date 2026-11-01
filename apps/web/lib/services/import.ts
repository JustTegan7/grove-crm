import "server-only";
import Papa from "papaparse";
import { uuidv7 } from "uuidv7";
import { and, eq, isNull } from "drizzle-orm";
import { activities, contacts, tasks } from "@grove/db";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_PREVIEW_ROWS,
  chunk,
  distinctStageValues,
  guessMapping,
  guessStage,
  importOptionsInput,
  importStartEffects,
  isSensitiveHeader,
  planImport,
  type ImportOptions,
  type ImportPlan,
} from "@grove/core";
import { db } from "../db";
import { requireRole, type Ctx } from "./ctx";
import { loadMembers, loadStages, loadSteps } from "./workspace";

const BATCH = 100;

export class ImportError extends Error {}

interface Parsed {
  headers: string[];
  rows: Record<string, string>[];
}

/** Reads the upload in memory. The raw file is never stored. */
async function parseCsv(file: unknown): Promise<Parsed> {
  if (!(file instanceof File) || file.size === 0) throw new ImportError("Choose a .csv file.");
  if (!file.name.toLowerCase().endsWith(".csv")) throw new ImportError("That is not a .csv file. In Google Sheets use File, Download, Comma separated values.");
  if (file.size > IMPORT_MAX_BYTES) throw new ImportError("That file is over 2 MB. Split it into smaller files.");
  const text = (await file.text()).replace(/^﻿/, "");
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (res.meta.fields ?? []).filter((h) => h !== "");
  if (!headers.length) throw new ImportError("We could not find a header row in that file.");
  if (res.data.length > IMPORT_MAX_ROWS) throw new ImportError(`That file has more than ${IMPORT_MAX_ROWS} rows. Split it into smaller files.`);
  return { headers, rows: res.data };
}

function canImport(ctx: Ctx) {
  requireRole(ctx, ["owner", "manager"]);
}

/** Step 1: headers, guessed fields and which columns look sensitive. */
export async function analyzeImport(ctx: Ctx, file: unknown) {
  canImport(ctx);
  const { headers, rows } = await parseCsv(file);
  return {
    headers,
    mapping: guessMapping(headers),
    sensitive: headers.filter(isSensitiveHeader),
    rowCount: rows.length,
  };
}

async function loadContext(ctx: Ctx, raw: unknown) {
  const options = importOptionsInput.parse(raw);
  const [stages, steps, members, existing] = await Promise.all([
    loadStages(ctx.workspace.id),
    loadSteps(ctx.workspace.id),
    loadMembers(ctx.workspace.id),
    db()
      .select({ name: contacts.name, phone: contacts.phone })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt))),
  ]);
  if (!members.some((m) => m.id === options.defaultOwnerId)) throw new ImportError("That owner is not on this team.");
  if (!stages.some((s) => s.id === options.defaultStageId)) throw new ImportError("Pick a default stage.");
  for (const v of Object.values(options.stageMap)) {
    if (v && !stages.some((s) => s.id === v)) throw new ImportError("One of the stage choices is not in this workspace.");
  }
  return { options, stages, steps, members, existing };
}

/** Fills in auto-matched stages for any CSV stage value the person has not mapped yet. */
function resolveStageMap(parsed: Parsed, options: ImportOptions, stages: Awaited<ReturnType<typeof loadStages>>) {
  const i = options.mapping.indexOf("stage");
  const header = i >= 0 ? parsed.headers[i] ?? null : null;
  const values = distinctStageValues(parsed.rows, header);
  const stageMap: Record<string, string> = {};
  for (const v of values) {
    const k = v.toLowerCase();
    stageMap[k] = k in options.stageMap ? options.stageMap[k] : guessStage(v, stages);
  }
  return { values, stageMap };
}

function buildPlan(ctx: Ctx, parsed: Parsed, c: Awaited<ReturnType<typeof loadContext>>): { plan: ImportPlan; values: string[]; stageMap: Record<string, string> } {
  if (!c.options.mapping.includes("name")) throw new ImportError("Pick which column is the business name.");
  const { values, stageMap } = resolveStageMap(parsed, c.options, c.stages);
  const plan = planImport({
    headers: parsed.headers,
    rows: parsed.rows,
    options: { ...c.options, stageMap },
    stages: c.stages,
    existing: c.existing,
    today: ctx.today,
  });
  return { plan, values, stageMap };
}

/** Step 2: the dry run. Nothing is written. */
export async function previewImport(ctx: Ctx, file: unknown, rawOptions: unknown) {
  canImport(ctx);
  const parsed = await parseCsv(file);
  const c = await loadContext(ctx, rawOptions);
  const { plan, values, stageMap } = buildPlan(ctx, parsed, c);
  const stageLabel = (id: string) => c.stages.find((s) => s.id === id)?.label ?? "";
  const ownerName = (id: string) => c.members.find((m) => m.id === id)?.name ?? "";
  return {
    counts: { create: plan.create.length, duplicates: plan.duplicates.length, errors: plan.errors.length },
    sample: plan.create.slice(0, IMPORT_PREVIEW_ROWS).map((r) => ({
      line: r.line,
      name: r.name,
      contactName: r.contactName,
      phone: r.phone,
      email: r.email,
      stage: stageLabel(r.stageId),
      owner: ownerName(r.ownerId),
      createdOn: r.createdOn,
    })),
    duplicates: plan.duplicates.slice(0, IMPORT_PREVIEW_ROWS),
    errors: plan.errors.slice(0, IMPORT_PREVIEW_ROWS),
    stageValues: values.map((v) => ({ value: v, stageId: stageMap[v.toLowerCase()] ?? "" })),
  };
}

/** Step 3: the real import. Re-plans against fresh data, then writes in batches of 100. */
export async function importContacts(ctx: Ctx, file: unknown, rawOptions: unknown) {
  canImport(ctx);
  const parsed = await parseCsv(file);
  const c = await loadContext(ctx, rawOptions);
  const { plan } = buildPlan(ctx, parsed, c);
  if (!plan.create.length) throw new ImportError("Nothing new to import.");

  const d = db();
  const now = new Date();
  let created = 0;

  for (const group of chunk(plan.create, BATCH)) {
    const contactRows: (typeof contacts.$inferInsert)[] = [];
    const taskRows: (typeof tasks.$inferInsert)[] = [];
    const activityRows: (typeof activities.$inferInsert)[] = [];

    for (const r of group) {
      const id = uuidv7();
      const stage = c.stages.find((s) => s.id === r.stageId)!;
      const fx = importStartEffects({
        contact: { id, ownerId: r.ownerId, stageId: stage.id, cadenceActive: false, cadenceDone: [], cadenceStartedOn: null, checkinFrequencyDays: null },
        stage,
        steps: c.steps,
        createdOn: r.createdOn,
        today: ctx.today,
      });
      contactRows.push({
        id,
        workspaceId: ctx.workspace.id,
        name: r.name,
        niche: r.niche,
        source: r.source,
        contactName: r.contactName,
        contactRole: r.contactRole,
        phone: r.phone,
        email: r.email,
        website: r.website,
        social: r.social,
        notes: r.notes,
        tier: r.tier,
        siteUrl: r.siteUrl,
        launchDate: r.launchDate,
        stageId: stage.id,
        ownerId: r.ownerId,
        createdBy: ctx.userId,
        // Day-level created date from the sheet. Noon UTC keeps it on the same day in US time zones.
        createdAt: new Date(`${r.createdOn}T12:00:00Z`),
        stageChangedAt: now,
        lastActivityAt: now,
        cadenceActive: fx.contactPatch.cadenceActive ?? false,
        cadenceDone: fx.contactPatch.cadenceDone ?? [],
        cadenceStartedOn: fx.contactPatch.cadenceStartedOn ?? null,
      });
      for (const t of fx.createTasks) taskRows.push({ ...t, workspaceId: ctx.workspace.id, contactId: id, createdBy: ctx.userId });
      activityRows.push({ workspaceId: ctx.workspace.id, contactId: id, type: "system", body: "Imported from CSV", actorId: ctx.userId });
      for (const a of fx.activities) activityRows.push({ ...a, workspaceId: ctx.workspace.id, contactId: id, actorId: ctx.userId });
    }

    const queries: unknown[] = [d.insert(contacts).values(contactRows)];
    if (taskRows.length) queries.push(d.insert(tasks).values(taskRows));
    queries.push(d.insert(activities).values(activityRows));
    // One Neon batch per 100 rows: a batch is one transaction, so a group lands whole or not at all.
    await d.batch(queries as unknown as Parameters<typeof d.batch>[0]);
    created += contactRows.length;
  }

  return {
    created,
    duplicates: plan.duplicates.length,
    errors: plan.errors.length,
    message: `Imported ${created} ${created === 1 ? "business" : "businesses"}.`,
  };
}
