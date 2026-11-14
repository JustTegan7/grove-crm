/**
 * Phone numbers are stored as typed, so formatting and country codes are kept. A number must look
 * like a phone number: digits with optional spaces, dashes, dots and parentheses, an optional
 * leading + and country code, and an optional extension. 7 to 15 digits (15 is the international maximum).
 */
const EXT = /\s*(?:x|ext\.?|extension)\s*\d{1,6}\s*$/i;

function split(raw: string): { main: string; hasExt: boolean } {
  const trimmed = raw.trim();
  const main = trimmed.replace(EXT, "");
  return { main, hasExt: main !== trimmed };
}

export function isValidPhone(raw: string): boolean {
  const { main } = split(raw);
  if (!/^\+?[\d\s().-]+$/.test(main)) return false;
  const digits = main.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

export const PHONE_ERROR = "Check the phone number. Use 7 to 15 digits, and start with + and the country code for numbers outside the US.";

/** What a phone or text link needs: digits and a leading +, no extension. */
export function dialable(raw: string | null | undefined): string {
  if (!raw) return "";
  const { main } = split(raw);
  const plus = main.trim().startsWith("+") ? "+" : "";
  return plus + main.replace(/\D/g, "");
}
