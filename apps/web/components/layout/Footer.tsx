import Link from "next/link";
import { Container } from "./Container";
import { siteConfig } from "../../lib/site-config";
import { GroveLogo } from "../Logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <GroveLogo size={24} />
          <p className="mt-2 text-sm text-muted">
            A product from{" "}
            <a href={siteConfig.parentUrl} className="underline">{siteConfig.parent}</a>
          </p>
        </div>
        <nav aria-label="Legal" className="flex gap-4 text-sm text-muted">
          <Link href="/privacy" className="hover:text-fg">Privacy</Link>
          <Link href="/terms" className="hover:text-fg">Terms</Link>
          <span>thegrovecms.com</span>
        </nav>
      </Container>
    </footer>
  );
}
