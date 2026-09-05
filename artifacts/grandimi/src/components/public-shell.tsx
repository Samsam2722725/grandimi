import { ArrowUpRight, Leaf } from "lucide-react";
import { Link } from "wouter";

export function BrandMark() {
  return (
    <span className="flex size-9 items-center justify-center rounded-[13px] bg-primary text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/0.16)]">
      <Leaf size={18} strokeWidth={2.4} />
    </span>
  );
}

export function PublicHeader() {
  return (
    <header className="relative z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          data-testid="link-home-logo"
          className="flex items-center gap-2.5 text-foreground"
          aria-label="Grandimi, accueil"
        >
          <BrandMark />
          <span className="font-display text-[26px] leading-none tracking-[-0.03em]">
            Grandimi
          </span>
        </Link>
        <Link
          href="/onboarding"
          data-testid="link-header-onboarding"
          className="group inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card/70 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          Commencer
          <ArrowUpRight
            size={15}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Grandimi · une lecture pour ouvrir la conversation.</p>
        <p className="max-w-md sm:text-right">
          Une estimation n’est pas une promesse, ni un avis médical.
        </p>
      </div>
    </footer>
  );
}
