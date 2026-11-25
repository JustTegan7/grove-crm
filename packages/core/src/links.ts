/**
 * Turns what a person typed into a safe, tappable web link. Only http and https are ever returned,
 * so a stray "javascript:" or "file:" value can never become a link.
 */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const BARE_DOMAIN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

export function webHref(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v || /\s/.test(v)) return null;
  if (SCHEME.test(v)) return /^https?:\/\/\S+$/i.test(v) ? v : null;
  return BARE_DOMAIN.test(v) ? `https://${v}` : null;
}

/** Pulls every link out of free text such as a socials box ("instagram.com/x, facebook.com/y"). */
export function extractLinks(text: string | null | undefined): { label: string; href: string }[] {
  const seen = new Set<string>();
  const out: { label: string; href: string }[] = [];
  for (const token of (text ?? "").split(/[\s,;]+/)) {
    const clean = token.replace(/^[(<"']+|[)>"'.]+$/g, "");
    const href = webHref(clean);
    if (href && !seen.has(href)) {
      seen.add(href);
      out.push({ label: clean.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, ""), href });
    }
  }
  return out;
}
