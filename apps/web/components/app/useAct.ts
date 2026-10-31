"use client";

import { useTransition } from "react";
import type { ActionResult } from "../../app/(app)/actions";
import { useToast } from "./Toast";

/** Runs a server action and shows its message as a toast. */
export function useAct() {
  const toast = useToast();
  const [pending, start] = useTransition();
  function act(fn: () => Promise<ActionResult>, onOk?: (r: Extract<ActionResult, { ok: true }>) => void) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(r.message);
        onOk?.(r);
      } else toast(r.error, "error");
    });
  }
  return { act, pending };
}
