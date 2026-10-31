import type { Metadata } from "next";
import Link from "next/link";
import { GroveLogo } from "../../components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="Grove home" className="mb-8"><GroveLogo size={36} /></Link>
      <LoginForm next={safeNext} />
    </div>
  );
}
