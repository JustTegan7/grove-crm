import Link from "next/link";
import { Container } from "./Container";
import { GroveLogo } from "../Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="Grove home">
          <GroveLogo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4" aria-label="Primary">
          <a href="#why" className="hidden text-sm text-muted hover:text-fg sm:inline">Why grove</a>
          <a href="#how" className="hidden text-sm text-muted hover:text-fg sm:inline">How it works</a>
          <a href="#faq" className="hidden text-sm text-muted hover:text-fg sm:inline">FAQ</a>
          <Link href="/login" className="btn btn-primary btn-sm">Log in</Link>
        </nav>
      </Container>
    </header>
  );
}
