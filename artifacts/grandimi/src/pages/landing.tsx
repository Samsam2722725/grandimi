import {
  ArrowRight,
  CircleCheck,
  HeartHandshake,
  LineChart,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import { PublicFooter, PublicHeader } from "@/components/public-shell";

const promises = [
  {
    icon: HeartHandshake,
    title: "Une lecture, pas une étiquette",
    text: "Grandimi aide à mettre des mots sur une possibilité. Rien ne fige la personne qui grandit.",
  },
  {
    icon: LineChart,
    title: "Des repères simples",
    text: "Quelques informations concrètes donnent une première estimation, expliquée avec des mots clairs.",
  },
  {
    icon: ShieldCheck,
    title: "Une approche responsable",
    text: "Les limites de la méthode restent visibles. Une estimation ne remplace jamais un professionnel de santé.",
  },
];

export default function Landing() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-background">
      <PublicHeader />
      <section className="relative">
        <div className="pointer-events-none absolute -right-28 top-0 hidden size-[440px] rounded-full bg-accent/10 blur-3xl md:block" />
        <div className="pointer-events-none absolute left-[-100px] top-56 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:grid-cols-[1.04fr_0.96fr] lg:gap-20 lg:pt-24">
          <div className="animate-[fade-up_700ms_ease-out_both]">
            <p
              data-testid="text-landing-eyebrow"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-[0.15em] text-primary"
            >
              <span className="size-1.5 rounded-full bg-accent" />
              Grandir, à ton rythme
            </p>
            <h1
              data-testid="text-landing-title"
              className="mt-7 max-w-2xl font-display text-[3.8rem] leading-[0.92] tracking-[-0.045em] text-foreground sm:text-[5.5rem] lg:text-[6.25rem]"
            >
              Découvre jusqu’où ta croissance pourrait aller.
            </h1>
            <p
              data-testid="text-landing-subtitle"
              className="mt-7 max-w-lg text-[17px] leading-7 text-muted-foreground sm:text-lg"
            >
              Obtiens une estimation personnalisée de ta taille adulte et
              découvre bientôt comment mettre toutes les chances de ton côté.
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/onboarding"
                data-testid="button-start-onboarding"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-[0_12px_26px_hsl(var(--primary)/0.18)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Découvrir mon potentiel
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <span className="text-xs text-muted-foreground">
                Quelques minutes · sans compte
              </span>
            </div>
          </div>

          <div
            data-testid="visual-growth-story"
            className="relative mx-auto min-h-[360px] w-full max-w-[470px] animate-[fade-up_850ms_120ms_ease-out_both] sm:min-h-[470px]"
            aria-label="Illustration abstraite d'une croissance qui se déploie"
          >
            <div className="absolute inset-x-8 top-7 bottom-0 rounded-[45%_45%_23%_23%] border border-primary/10 bg-card/65 shadow-[0_24px_70px_hsl(var(--foreground)/0.06)] sm:inset-x-10" />
            <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-2xl sm:size-64" />
            <div className="absolute left-1/2 top-[15%] h-[72%] w-px -translate-x-1/2 bg-primary/25" />
            <div className="absolute left-1/2 top-[15%] size-5 -translate-x-1/2 rounded-full border-4 border-background bg-primary shadow-[0_0_0_8px_hsl(var(--primary)/0.1)]" />
            <div className="absolute left-[29%] top-[38%] h-px w-[43%] rotate-[22deg] bg-primary/35" />
            <div className="absolute left-[29%] top-[38%] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
            <div className="absolute right-[29%] top-[56%] h-px w-[40%] -rotate-[23deg] bg-primary/35" />
            <div className="absolute right-[29%] top-[56%] size-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-accent" />
            <div className="absolute bottom-[18%] left-[22%] rounded-2xl border border-border/80 bg-background/85 px-4 py-3 shadow-[0_10px_28px_hsl(var(--foreground)/0.06)]">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Une possibilité
              </p>
              <p className="mt-1 font-display text-2xl text-primary">
                à explorer
              </p>
            </div>
            <div className="absolute right-[12%] top-[20%] flex size-14 items-center justify-center rounded-[20px] border border-accent/25 bg-accent/10 text-accent-foreground sm:size-16">
              <span className="font-display text-3xl">+</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/45">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-xl">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
              Pensé pour les vraies conversations
            </p>
            <h2 className="mt-4 font-display text-4xl leading-[0.98] tracking-[-0.03em] sm:text-5xl">
              Grandir, ce n’est pas suivre une ligne droite.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Les chiffres peuvent aider à se situer. Ils ne racontent jamais
              toute l’histoire. Grandimi commence par là : un repère utile,
              présenté avec honnêteté.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {promises.map((promise, index) => {
              const Icon = promise.icon;
              return (
                <article
                  key={promise.title}
                  data-testid={`card-promise-${index}`}
                  className="rounded-[24px] border border-border/80 bg-background/75 p-6 transition-transform hover:-translate-y-1"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-7 font-display text-2xl leading-tight">
                    {promise.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {promise.text}
                  </p>
                  <div className="mt-7 flex items-center gap-2 text-xs font-semibold text-primary">
                    <CircleCheck size={15} />
                    <span>Au cœur de Grandimi</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-[30px] bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[32px] border-primary-foreground/10" />
          <div className="pointer-events-none absolute -bottom-40 left-1/2 size-80 rounded-full border-[42px] border-primary-foreground/5" />
          <div className="relative max-w-2xl">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary-foreground/65">
              Le premier pas est simple
            </p>
            <h2 className="mt-4 font-display text-4xl leading-[0.98] tracking-[-0.03em] sm:text-5xl">
              Une question à la fois.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-primary-foreground/75">
              Prends le temps de répondre. Tes informations restent dans cette
              expérience et servent uniquement à calculer ton aperçu.
            </p>
            <Link
              href="/onboarding"
              data-testid="button-bottom-onboarding"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-background px-5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
            >
              Commencer doucement <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
