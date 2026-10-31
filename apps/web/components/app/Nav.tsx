"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBiz, IconPipeline, IconPlus, IconTasks, IconToday } from "./Icons";

const ITEMS = [
  { href: "/today", label: "Today", Icon: IconToday },
  { href: "/pipeline", label: "Pipeline", Icon: IconPipeline },
  { href: "/businesses", label: "Businesses", Icon: IconBiz },
  { href: "/tasks", label: "Tasks", Icon: IconTasks },
];

export function SideNav({ badge }: { badge: number }) {
  const path = usePathname();
  return (
    <nav aria-label="App" className="space-y-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const on = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold ${on ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
          >
            <Icon />
            <span className="flex-1">{label}</span>
            {href === "/today" && badge > 0 && <span className="pill bg-accent text-accent-fg">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomTabs({ badge, onAdd }: { badge: number; onAdd: () => void }) {
  const path = usePathname();
  const tab = (i: number) => {
    const { href, label, Icon } = ITEMS[i];
    const on = path === href || path.startsWith(href + "/");
    return (
      <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${on ? "text-fg" : "text-muted"}`}>
        <Icon />
        {label}
        {href === "/today" && badge > 0 && <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full bg-overdue" />}
      </Link>
    );
  };
  return (
    <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {tab(0)}
      {tab(1)}
      <button type="button" onClick={onAdd} aria-label="New lead" className="mx-2 -mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg">
        <IconPlus />
      </button>
      {tab(2)}
      {tab(3)}
    </nav>
  );
}
