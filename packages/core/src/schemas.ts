import { z } from "zod";
import { TIERS } from "./types";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date");
const optText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const contactFields = {
  name: z.string().trim().min(1, "Business name is required").max(200),
  niche: optText(120),
  source: optText(120),
  contactName: optText(120),
  contactRole: optText(120),
  phone: optText(40),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Check the email"),
  website: optText(300),
  social: optText(500),
  tier: z
    .enum(TIERS)
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  siteUrl: optText(300),
  launchDate: ymd.optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null),
  checkinFrequencyDays: z.coerce.number().int().min(7).max(365).optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null),
  notes: optText(10000),
};

export const createContactInput = z.object({
  name: contactFields.name,
  niche: contactFields.niche,
  source: contactFields.source,
  contactName: contactFields.contactName,
  phone: contactFields.phone,
  email: contactFields.email,
  website: contactFields.website,
  ownerId: z.string().min(1).optional(),
  stageId: z.string().uuid().optional(),
});
export type CreateContactInput = z.input<typeof createContactInput>;

export const updateContactInput = z.object({
  id: z.string().uuid(),
  ...contactFields,
});

export const moveStageInput = z.object({ id: z.string().uuid(), stageId: z.string().uuid() });
export const assignOwnerInput = z.object({ id: z.string().uuid(), ownerId: z.string().min(1) });
export const idInput = z.object({ id: z.string().uuid() });

export const createReminderInput = z.object({
  contactId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  title: z.string().trim().min(1, "What should we remind you about?").max(200),
  dueDate: ymd,
  note: optText(1000),
});

export const logActivityInput = z.object({
  contactId: z.string().uuid(),
  type: z.enum(["call", "text", "email", "note"]),
  body: z.string().trim().min(1).max(5000),
});

export const updateTaskInput = z.object({
  id: z.string().uuid(),
  dueDate: ymd,
  title: z.string().trim().min(1, "Give it a title").max(200).optional(),
  note: optText(1000),
});
