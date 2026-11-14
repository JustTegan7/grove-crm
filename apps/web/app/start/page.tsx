import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { openSignupEnabled } from "../../lib/services/workspace";
import { GroveLogo } from "../../components/Logo";
import { StartForm } from "./StartForm";

export const metadata: Metadata = { title: "Set up your workspace", robots: { index: false } };

// Reads the session and database on every request, so it must not be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function StartPage() {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!openSignupEnabled()) redirect("/login");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="Grove home" className="mb-8"><GroveLogo size={36} /></Link>
      <StartForm />
    </div>
  );
}
