// CSV import rules. Pure functions: the web app parses the file and loads
// existing contacts, then hands plain data in here. No stage names appear in
// logic; behavior comes from the stage fields.

import { z } from "zod";
import { decideTask, onCreate } from "./cadence";
import { diffDays, type Ymd } from "./dates";
import { contactFields } from "./schemas";
import { TIERS, type CadenceStepDef, type ContactState, type Effects, type StageDef, type Tier } from "./types";

export const IMPORT_FIELDS = [
  { key: "name", label: "Business name" },
  { key: "niche", label: "Niche" },
  { key: "contactName", label: "Contact name" },
  { key: "contactRole", label: "Contact role" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "social", label: "Social" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
  { key: "tier", label: "Tier" },
  { key: "siteUrl", label: "Site URL" },
  { key: "launchDate", label: "Launch date" },
  { key: "createdDate", label: "Created date" },
  { key: "stage", label: "Stage" },
  { key: "skip", label: "Skip" },
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
const FIELD_KEYS = IMPORT_FIELDS.map((f) => f.key) as [ImportField, ...ImportField[]];

/** Leads in a cadence stage this many days old or more land as one decide task. */
export const STALE_IMPORT_DAYS = 14;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;
export const IMPORT_PREVIEW_ROWS = 20;

// ---------- Headers ----------

const SENSITIVE = /(financ|credit|\bssn\b|social\s*security|\bloan|\bapr\b|bank|routing|account\s*(no|num|#)|income|salary|down\s*payment|\bfico\b)/i;

/** Headers that look like financing, credit, SSN or loan data. Grove never stores these. */
export function isSensitiveHeader(header: string): boolean {
  return SENSITIVE.test(header);
}

const GUESSES: [RegExp, ImportField][] = [
  [/^(business|company|biz|account)?\s*(name)$|^business$|^company$/i, "name"],
  [/niche|industry|category|vertical|type of business/i, "niche"],
  [/(contact|owner|manager|person|point of contact|poc)\s*(name)?$/i, "contactName"],
  [/role|title|position/i, "contactRole"],
  [/phone|mobile|cell|tel/i, "phone"],
  [/e-?mail/i, "email"],
  [/^(live\s*)?site\s*url$|live\s*(site|url)/i, "siteUrl"],
  [/website|web site|^url$|^site$|yelp/i, "website"],
  [/social|instagram|facebook|tiktok|linkedin|^ig$/i, "social"],
  [/source|how (we|did we) (found|find)|found (them|via)|lead source|referr/i, "source"],
  [/note|comment|details/i, "notes"],
  [/tier|plan|package|subscription/i, "tier"],
  [/launch/i, "launchDate"],
  [/created|date added|added on|^added$|first contact|^date$/i, "createdDate"],
  [/stage|status|pipeline/i, "stage"],
];

/** Best guess for one header. Sensitive-looking headers are always Skip. */
export function guessField(header: string): ImportField {
  const h = header.trim();
  if (!h || isSensitiveHeader(h)) return "skip";
  for (const [re, field] of GUESSES) if (re.test(h)) return field;
  return "skip";
}

/** Guesses for every header, each field used at most once (first match wins). */
export function guessMapping(headers: string[]): ImportField[] {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const g = guessField(h);
    if (g === "skip" || used.has(g)) return "skip";
    used.add(g);
    return g;
  });
}

// ---------- Values ----------

/** Digits only, US country code dropped, for duplicate checks. */
export function normalizePhone(v: string | null | undefined): string {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

export function normalizeName(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function ymdOf(y: number, m: number, d: number): Ymd | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null; // e.g. Feb 30
  return dt.toISOString().slice(0, 10);
}

/** Accepts 2026-10-05, 10/5/2026, 10/5/26, Oct 5 2026, 5 Oct 2026. Times are ignored. Returns null otherwise. */
export function parseDay(v: string | null | undefined): Ymd | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ymdOf(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/);
  if (m) return ymdOf(+m[3], +m[1], +m[2]);
  m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (m && MONTHS.includes(m[1].toLowerCase())) return ymdOf(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  m = s.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})/i);
  if (m && MONTHS.includes(m[2].toLowerCase())) return ymdOf(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  return null;
}

/** Matches "growth", "ULTRA LITE", "ultra-lite" to a tier. */
export function parseTier(v: string | null | undefined): Tier | null {
  const k = (v ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return TIERS.find((t) => t.toLowerCase().replace(/[^a-z]/g, "") === k) ?? null;
}

/** Distinct non-empty values in the Stage column, in first-seen order. */
export function distinctStageValues(rows: Record<string, string>[], header: string | null): string[] {
  if (!header) return [];
  const seen = new Map<string, string>();
  for (const r of rows) {
    const v = (r[header] ?? "").trim();
    if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
  }
  return [...seen.values()];
}

/** Auto-match a CSV stage value to a workspace stage by label or key. "" means use default. */
export function guessStage(value: string, stages: StageDef[]): string {
  const k = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = stages.find((s) => s.label.toLowerCase().replace(/[^a-z0-9]/g, "") === k || s.key.toLowerCase().replace(/[^a-z0-9]/g, "") === k);
  return hit?.id ?? "";
}

// ---------- Input schema ----------

export const importOptionsInput = z.object({
  /** One entry per CSV header, same order as the file. */
  mapping: z.array(z.enum(FIELD_KEYS)).max(200),
  defaultOwnerId: z.string().min(1),
  defaultStageId: z.string().uuid(),
  /** CSV stage value (lowercased) to stage id, or "" for the default stage. */
  stageMap: z.record(z.string(), z.string()).default({}),
});
export type ImportOptions = z.infer<typeof importOptionsInput>;

// ---------- Planning ----------

export interface ImportRow {
  line: number;
  name: string;
  niche: string | null;
  contactName: string | null;
  contactRole: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  social: string | null;
  source: string | null;
  notes: string | null;
  tier: Tier | null;
  siteUrl: string | null;
  launchDate: Ymd | null;
  createdOn: Ymd;
  stageId: string;
  ownerId: string;
}

export interface ImportPlan {
  create: ImportRow[];
  duplicates: { line: number; name: string; reason: string }[];
  errors: { line: number; error: string }[];
}

const rowSchema = z.object({
  name: contactFields.name,
  niche: contactFields.niche,
  contactName: contactFields.contactName,
  contactRole: contactFields.contactRole,
  phone: contactFields.phone,
  email: contactFields.email,
  website: contactFields.website,
  social: contactFields.social,
  source: contactFields.source,
  notes: contactFields.notes,
  siteUrl: contactFields.siteUrl,
});

/**
 * Turns parsed CSV rows into a plan: what gets created, what is a duplicate,
 * and what has errors. Duplicates are checked against existing contacts and
 * earlier rows in the same file. `line` is the spreadsheet row number (header is row 1).
 */
export function planImport(args: {
  headers: string[];
  rows: Record<string, string>[];
  options: ImportOptions;
  stages: StageDef[];
  existing: { name: string; phone: string | null }[];
  today: Ymd;
}): ImportPlan {
  const { headers, rows, options, stages, existing, today } = args;
  const col = (f: ImportField) => {
    const i = options.mapping.indexOf(f);
    return i >= 0 && headers[i] !== undefined && !isSensitiveHeader(headers[i]) ? headers[i] : null;
  };
  const cols = Object.fromEntries(FIELD_KEYS.map((f) => [f, col(f)])) as Record<ImportField, string | null>;
  const get = (r: Record<string, string>, f: ImportField) => {
    const h = cols[f];
    return h ? (r[h] ?? "").trim() : "";
  };
  const validStage = new Set(stages.map((s) => s.id));

  const names = new Set(existing.map((e) => normalizeName(e.name)));
  const phones = new Set(existing.map((e) => normalizePhone(e.phone)).filter((p) => p.length >= 7));
  const plan: ImportPlan = { create: [], duplicates: [], errors: [] };

  rows.forEach((r, i) => {
    const line = i + 2;
    if (Object.values(r).every((v) => !(v ?? "").trim())) return; // blank line

    const parsed = rowSchema.safeParse({
      name: get(r, "name"),
      niche: get(r, "niche"),
      contactName: get(r, "contactName"),
      contactRole: get(r, "contactRole"),
      phone: get(r, "phone"),
      email: get(r, "email"),
      website: get(r, "website"),
      social: get(r, "social"),
      source: get(r, "source"),
      notes: get(r, "notes"),
      siteUrl: get(r, "siteUrl"),
    });
    if (!parsed.success) {
      plan.errors.push({ line, error: parsed.error.issues[0]?.message ?? "Check this row." });
      return;
    }
    const v = parsed.data;

    const launchRaw = get(r, "launchDate");
    const launchDate = parseDay(launchRaw);
    if (launchRaw && !launchDate) {
      plan.errors.push({ line, error: `Launch date "${launchRaw}" is not a date` });
      return;
    }
    const tierRaw = get(r, "tier");
    const tier = parseTier(tierRaw);

    const created = parseDay(get(r, "createdDate"));
    const createdOn = created && created <= today ? created : today;

    const stageRaw = get(r, "stage");
    const mapped = stageRaw ? options.stageMap[stageRaw.toLowerCase()] : "";
    const stageId = mapped && validStage.has(mapped) ? mapped : options.defaultStageId;

    const nameKey = normalizeName(v.name);
    const phoneKey = normalizePhone(v.phone);
    if (names.has(nameKey)) {
      plan.duplicates.push({ line, name: v.name, reason: "Same business name" });
      return;
    }
    if (phoneKey.length >= 7 && phones.has(phoneKey)) {
      plan.duplicates.push({ line, name: v.name, reason: "Same phone" });
      return;
    }
    names.add(nameKey);
    if (phoneKey.length >= 7) phones.add(phoneKey);

    plan.create.push({
      line,
      name: v.name,
      niche: v.niche,
      contactName: v.contactName,
      contactRole: v.contactRole,
      phone: v.phone,
      email: v.email,
      website: v.website,
      social: v.social,
      source: v.source,
      notes: tierRaw && !tier ? [v.notes, `Tier from import: ${tierRaw}`].filter(Boolean).join("\n") : v.notes,
      tier,
      siteUrl: v.siteUrl,
      launchDate,
      createdOn,
      stageId,
      ownerId: options.defaultOwnerId,
    });
  });
  return plan;
}

/**
 * The starting tasks for one imported record. Reuses the cadence engine:
 * - Stages that start a cadence: Day 1 is the created date and the next step is
 *   never due before today. If the lead is STALE_IMPORT_DAYS or more old, it gets
 *   one decide task due today instead of a burst of overdue follow-ups.
 * - Every other stage: the engine's normal entry behavior from today
 *   (client check-ins, resurface reminders, clearing).
 */
export function importStartEffects(args: {
  contact: ContactState;
  stage: StageDef;
  steps: CadenceStepDef[];
  createdOn: Ymd;
  today: Ymd;
}): Effects {
  const { contact, stage, steps, createdOn, today } = args;
  if (stage.cadenceBehavior === "start") {
    if (diffDays(today, createdOn) >= STALE_IMPORT_DAYS) {
      return {
        createTasks: [decideTask(today, contact.ownerId)],
        cancelTaskIds: [],
        contactPatch: { cadenceActive: false, cadenceDone: [], cadenceStartedOn: createdOn },
        activities: [],
        message: "Older lead. Decide: recycle or do not contact.",
      };
    }
    return onCreate(contact, stage, steps, today, createdOn);
  }
  return onCreate(contact, stage, steps, today);
}

/** Splits a list into chunks for batched inserts. */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

