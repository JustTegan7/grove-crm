"use client";

import { useCallback, useTransition } from "react";
import { undoAction, type ActionResult } from "../../app/(app)/actions";
import { useToast } from "./Toast";

/** Shows an action's result as a toast, with an Undo button when the action supports it. */
export function useResultToast() {
  const toast = useToast();
  return useCallback(
    (r: ActionResult) => {
      if (!r.ok) return toast(r.error, "error");
      const token = r.undo;
      toast(
        r.message,
        "ok",
        token
          ? {
              label: "Undo",
              run: async () => {
                const u = await undoAction(token);
                if (u.ok) toast(u.message);
                else toast(u.error, "error");
              },
            }
          : undefined,
      );
    },
    [toast],
  );
}

/** Runs a server action and shows its message as a toast. */
export function useAct() {
  const show = useResultToast();
  const [pending, start] = useTransition();
  function act(fn: () => Promise<ActionResult>, onOk?: (r: Extract<ActionResult, { ok: true }>) => void, onError?: () => void) {
    start(async () => {
      const r = await fn();
      show(r);
      if (r.ok) onOk?.(r);
      else onError?.();
    });
  }
  return { act, pending };
}
