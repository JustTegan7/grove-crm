import type { Channel } from "./types";

/** Merge fields a message template can use, written like {{business}}. */
export const MERGE_FIELDS = ["business", "contact", "first_name", "owner", "company"] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];
export type MergeValues = Partial<Record<MergeField, string | null | undefined>>;

const FIELD_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/**
 * Fills merge fields in a template. Unknown fields are left as written so a typo is
 * visible. A known field with no value becomes a fallback ("there" for names) so a
 * message never goes out with a blank or a raw placeholder.
 */
export function renderMessage(text: string, values: MergeValues): string {
  const fallback: Record<MergeField, string> = {
    business: "your business",
    contact: "there",
    first_name: "there",
    owner: "our team",
    company: "our team",
  };
  return text.replace(FIELD_RE, (whole, raw: string) => {
    const key = raw.toLowerCase() as MergeField;
    if (!(MERGE_FIELDS as readonly string[]).includes(key)) return whole;
    const v = values[key]?.trim();
    return v ? v : fallback[key];
  });
}

/** First word of a full name, for "Hi Sam". */
export function firstName(full: string | null | undefined): string | null {
  const w = full?.trim().split(/\s+/)[0];
  return w ? w : null;
}

/** Unknown {{fields}} in a template, so the editor can warn before saving. */
export function unknownFields(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(FIELD_RE)) {
    const k = m[1].toLowerCase();
    if (!(MERGE_FIELDS as readonly string[]).includes(k)) out.add(m[1]);
  }
  return [...out];
}

export interface DefaultMessageTemplate {
  name: string;
  channel: Channel;
  /** The cadence day this template is used for, or null for any day. */
  day: number | null;
  subject: string | null;
  body: string;
}

/** Starting messages copied into every new workspace. Owners edit them on the Templates page. */
export const defaultMessageTemplates: DefaultMessageTemplate[] = [
  {
    name: "Day 1 email",
    channel: "email",
    day: 1,
    subject: "Quick hello from {{company}}",
    body: "Hi {{first_name}},\n\nThis is {{owner}} with {{company}}. I came across {{business}} and wanted to introduce myself.\n\nWould you be open to a quick conversation this week?\n\nThanks,\n{{owner}}",
  },
  {
    name: "Day 3 call notes",
    channel: "call",
    day: 3,
    subject: null,
    body: "Hi {{first_name}}, it's {{owner}} with {{company}}. I sent a note earlier this week about {{business}}. Do you have a minute?",
  },
  {
    name: "Day 5 text",
    channel: "text",
    day: 5,
    subject: null,
    body: "Hi {{first_name}}, this is {{owner}} with {{company}}. I reached out about {{business}} and wanted to make sure you saw it. Is now a good time to talk?",
  },
  {
    name: "Day 10 email",
    channel: "email",
    day: 10,
    subject: "Following up on {{business}}",
    body: "Hi {{first_name}},\n\nFollowing up on my earlier note about {{business}}. I would be glad to answer any questions.\n\nThanks,\n{{owner}}",
  },
  {
    name: "Day 14 call notes",
    channel: "call",
    day: 14,
    subject: null,
    body: "Hi {{first_name}}, it's {{owner}} with {{company}}. This is my last check-in for now about {{business}}. Is there anything I can help with?",
  },
];
