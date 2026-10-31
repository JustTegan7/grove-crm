"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { GroveLogo, GroveMark } from "../Logo";
import { BottomTabs, SideNav } from "./Nav";
import { NewLeadDialog, ReminderDialog, type BizOpt, type MemberOpt } from "./Dialogs";
import { IconBell, IconPlus, IconSun } from "./Icons";

function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const isDark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("grove-theme", next); } catch {}
  }
  return <button type="button" onClick={toggle} className="btn btn-ghost btn-sm" aria-label="Switch light or dark"><IconSun /></button>;
}

export function Shell({
  children,
  me,
  members,
  businesses,
  badge,
  today,
  workspaceName,
}: {
  children: React.ReactNode;
  me: { id: string; name: string; role: string };
  members: MemberOpt[];
  businesses: BizOpt[];
  badge: number;
  today: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [lead, setLead] = useState(false);
  const [rem, setRem] = useState(false);

  // Shortcut: "n" for a new lead when not typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setLead(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const color = members.find((m) => m.id === me.id)?.color ?? "#4FB39C";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href="/today" className="mb-6 px-2" aria-label="Today"><GroveLogo /></Link>
        <SideNav badge={badge} />
        <div className="mt-auto space-y-2 border-t border-line pt-4">
          <p className="px-2 text-xs text-muted">{workspaceName}</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-6">
          <Link href="/today" className="md:hidden" aria-label="Today"><GroveMark size={26} /></Link>
          <div className="flex-1" />
          <button type="button" className="btn btn-soft btn-sm" onClick={() => setRem(true)}><IconBell /> <span className="hidden sm:inline">Reminder</span></button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setLead(true)}><IconPlus /> New lead</button>
          <div className="md:hidden"><ThemeToggle /></div>
          <details className="relative">
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: color }} aria-label="Account">
              {me.name.slice(0, 1).toUpperCase()}
            </summary>
            <div className="card absolute right-0 mt-2 w-48 p-2 shadow-lg">
              <p className="px-2 py-1 text-sm font-semibold">{me.name}</p>
              <p className="px-2 pb-2 text-xs capitalize text-muted">{me.role}</p>
              <button type="button" className="btn btn-ghost btn-sm w-full justify-start" onClick={signOut}>Sign out</button>
            </div>
          </details>
        </header>
        <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>

      <BottomTabs badge={badge} onAdd={() => setLead(true)} />
      <NewLeadDialog open={lead} onClose={() => setLead(false)} members={members} meId={me.id} />
      <ReminderDialog open={rem} onClose={() => setRem(false)} businesses={businesses} today={today} />
    </div>
  );
}
