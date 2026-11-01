"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fuzzyFilter } from "@grove/core";

export type PaletteBiz = { id: string; name: string; niche: string | null; contactName: string | null };
type Item = { id: string; section: "Actions" | "Businesses"; label: string; hint?: string; run: () => void };

/**
 * Ctrl or Cmd K anywhere, or "/" when not typing. Arrow keys move, Enter runs, Esc closes.
 * Built as an ARIA combobox: focus stays in the input, the list is announced through aria-activedescendant.
 */
export function CommandPalette({
  open,
  onOpenChange,
  businesses,
  canImport,
  onNewLead,
  onReminder,
  onTheme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businesses: PaletteBiz[];
  canImport: boolean;
  onNewLead: () => void;
  onReminder: () => void;
  onTheme: () => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  // Global shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement).closest("input,textarea,select,[contenteditable]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      inputRef.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  function close() {
    onOpenChange(false);
    setQ("");
    setActive(0);
  }

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const actions: Item[] = [
      { id: "a-lead", section: "Actions", label: "Add a lead", hint: "N", run: onNewLead },
      { id: "a-rem", section: "Actions", label: "Set a reminder", run: onReminder },
      { id: "a-today", section: "Actions", label: "Go to Today", run: go("/today") },
      { id: "a-pipe", section: "Actions", label: "Go to Pipeline", run: go("/pipeline") },
      { id: "a-biz", section: "Actions", label: "Go to Businesses", run: go("/businesses") },
      { id: "a-tasks", section: "Actions", label: "Go to Tasks", run: go("/tasks") },
      { id: "a-theme", section: "Actions", label: "Switch theme", run: onTheme },
      ...(canImport ? [{ id: "a-import", section: "Actions" as const, label: "Import from CSV", run: go("/import") }] : []),
    ];
    const acts = fuzzyFilter(q, actions, (a) => [a.label], q ? 5 : actions.length);
    const biz = q
      ? fuzzyFilter(q, businesses, (b) => [b.name, b.niche, b.contactName], 8).map<Item>((b) => ({
          id: `b-${b.id}`,
          section: "Businesses",
          label: b.name,
          hint: [b.niche, b.contactName].filter(Boolean).join(" · "),
          run: go(`/businesses/${b.id}`),
        }))
      : [];
    return [...acts, ...biz];
  }, [q, businesses, canImport, onNewLead, onReminder, onTheme, router]);

  const current = Math.min(active, Math.max(items.length - 1, 0));

  function run(item: Item | undefined) {
    if (!item) return;
    close();
    item.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[current]);
    }
  }

  const optionId = (i: number) => `${listId}-${i}`;
  let lastSection = "";

  return (
    <dialog
      ref={ref}
      onClose={close}
      onClick={(e) => { if (e.target === ref.current) close(); }}
      aria-label="Search or jump"
      className="mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/40"
    >
      <div className="border-b border-line p-3">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder="Search businesses or type a command"
          className="w-full bg-transparent px-2 py-1.5 text-base outline-none"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={items.length ? optionId(current) : undefined}
          aria-label="Search businesses or type a command"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
        {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches that.</li>}
        {items.map((item, i) => {
          const header = item.section !== lastSection ? item.section : null;
          lastSection = item.section;
          const on = i === current;
          return (
            <li key={item.id} role="presentation">
              {header && <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted" aria-hidden>{header}</p>}
              <div
                id={optionId(i)}
                role="option"
                aria-selected={on}
                onMouseMove={() => setActive(i)}
                onClick={() => run(item)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${on ? "bg-surface-2 font-semibold" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 truncate text-xs text-muted">{item.hint}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-4 py-2 text-xs text-muted">Arrows to move, Enter to open, Esc to close</p>
    </dialog>
  );
}
