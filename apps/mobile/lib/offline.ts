import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError } from "./api";

const KEY = "grove.queue.v1";

export interface QueuedLead {
  key: string;
  name: string;
  body: Record<string, string>;
  savedAt: string;
}

async function read(): Promise<QueuedLead[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  } catch {
    return [];
  }
}

async function write(items: QueuedLead[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function pendingLeads() {
  return read();
}

/** Keeps a new lead on the phone until there is signal. Only leads are queued, so nothing else can fall out of order. */
export async function queueLead(body: Record<string, string>) {
  const items = await read();
  items.push({ key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: body.name, body, savedAt: new Date().toISOString() });
  await write(items);
}

let flushing = false;

/** Sends queued leads one at a time. Stops at the first request that cannot reach Grove. A rejected lead is dropped with its reason returned. */
export async function flushLeads(): Promise<{ sent: number; left: number; rejected: string[] }> {
  if (flushing) return { sent: 0, left: (await read()).length, rejected: [] };
  flushing = true;
  let sent = 0;
  const rejected: string[] = [];
  try {
    let items = await read();
    for (const item of [...items]) {
      try {
        await api("/businesses", { method: "POST", body: item.body });
        sent++;
      } catch (e) {
        if (e instanceof ApiError && (e.offline || e.status === 0 || e.status === 401 || e.status === 402 || e.status >= 500)) break;
        rejected.push(`${item.name}: ${e instanceof Error ? e.message : "not accepted"}`);
      }
      items = items.filter((i) => i.key !== item.key);
      await write(items);
    }
    return { sent, left: items.length, rejected };
  } finally {
    flushing = false;
  }
}
