import { Linking, Platform } from "react-native";
import { dialable } from "./shared";

export function callLink(phone: string) {
  return `tel:${dialable(phone)}`;
}

/** iPhone separates the message text with & and Android with ?. */
export function smsLink(phone: string, body?: string) {
  const n = dialable(phone);
  if (!body) return `sms:${n}`;
  return `sms:${n}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

export function mailLink(email: string, subject?: string | null, body?: string) {
  const q = [subject ? `subject=${encodeURIComponent(subject)}` : "", body ? `body=${encodeURIComponent(body)}` : ""].filter(Boolean).join("&");
  return `mailto:${email}${q ? `?${q}` : ""}`;
}

export function open(url: string) {
  return Linking.openURL(url);
}
