import { ArrowRight, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BrandMark,
  PublicFooter,
  PublicHeader,
} from "@/components/public-shell";
import {
  calculateGrowthObservation,
  clearOnboardingSession,
  loadOnboardingData,
  parseOptionalGoal,
  RESULT_STORAGE_KEY,
  type OnboardingData,
} from "@/domain/onboarding";
import type { VerificationResult } from "@/lib/verification-engine";

function formatHeight(value: number) {
  return `${value.toFixed(1).replace(".", ",")} cm`;
}

export default function ResultPreview() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem(RESULT_STORAGE_KEY);
    if (!storedResult) return;
    try {
      setResult(JSON.parse(storedResult) as VerificationResult);
      setOnboarding(loadOnboardingData());
    } catch {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
    }
  }, []);

  if (!result) {
    return (
      <main className="min-h-[100dvh] bg-background">
        <PublicHeader />
        <section className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center sm:px-8">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BrandMark />
          </span>
          <h1
            data-testid="text-no-result-title"
            className="mt-7 font-display text-4xl leading-tight"
          >
            Ton aperçu t’attend.
          </h1>
          <p
            data-testid="text-no-result"
            className="mt-4 text-sm leading-6 text-muted-foreground"
          >
            Réponds à quelques questions pour obtenir une première lecture basée
            sur tes informations.
          </p>
          <Link
            href="/onboarding"
            data-testid="button-no-result-onboarding"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Commencer <ArrowRight size={16} />
          </Link>
        </section>
        <PublicFooter />
      </main>
    );
  }

  const currentHeight = onboarding
    ? Number(
        onboarding.prediction_required.currentHeightCm.trim().replace(",", "."),
      )
    : 0;
  const remainingCentral = Math.max(
    0,
    result.centralEstimateCm - currentHeight,
  );
  const remainingHigh = Math.max(0, result.rangeCm.high - currentHeight);
  const observation = onboarding
    ? calculateGrowthObservation(
        onboarding.tracking,
        onboarding.prediction_required,
      )
    : null;
  const desiredHeight = onboarding
    ? parseOptionalGoal(onboarding.goal_only.desiredHeightCm)
    : null;
  const goalMessage =
    desiredHeight === null
      ? null
      : desiredHeight >= result.rangeCm.low &&
          desiredHeight <= result.rangeCm.high
        ? "Ton objectif se situe dans la zone actuellement estimée."
        : desiredHeight < result.rangeCm.low
          ? "Ton objectif se situe en dessous de la zone actuellement estimée."
          : "Ton objectif est supérieur à la zone actuellement estimée. Grandimi pourra t’aider à optimiser les facteurs contrôlables, sans pouvoir garantir une taille précise.";

  const restart = () => {
    if (
      window.confirm(
        "Recommencer supprimera les réponses et le résultat de cette session. Continuer ?",
      )
    ) {
      clearOnboardingSession();
      setLocation("/onboarding");
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">
            <Sparkles size={22} />
          </span>
          <p className="mt-6 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
            Ton aperçu Grandimi
          </p>
          <h1
            data-testid="text-result-title"
            className="mt-4 font-display text-[3.25rem] leading-[0.94] tracking-[-0.04em] sm:text-6xl"
          >
            Une possibilité se dessine.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base">
            Voici la lecture de tes informations par notre modèle. Elle donne un
            repère, pas une destination écrite à l’avance.
          </p>
        </div>

        <section
          data-testid="card-result-summary"
          className="relative mx-auto mt-12 max-w-3xl overflow-hidden rounded-[30px] border border-primary/20 bg-card p-6 shadow-[0_18px_50px_hsl(var(--foreground)/0.07)] sm:p-10"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/15 blur-2xl" />
          <div className="relative">
            <div className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Estimation centrale
                </p>
                <p
                  data-testid="value-result-central"
                  className="mt-3 font-display text-6xl leading-none text-primary sm:text-7xl"
                >
                  {formatHeight(result.centralEstimateCm)}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/75 px-4 py-3 sm:max-w-[210px]">
                <p className="text-xs font-semibold text-foreground">
                  Fourchette contextuelle
                </p>
                <p
                  data-testid="value-result-range"
                  className="mt-1 font-mono-ui text-sm text-primary"
                >
                  {formatHeight(result.rangeCm.low)} –{" "}
                  {formatHeight(result.rangeCm.high)}
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">
              Cette estimation repose sur la méthode Khamis–Roche et les données
              que tu as renseignées. Elle peut évoluer avec le temps et ne
              décrit pas toute ton histoire.
            </p>
            <p
              data-testid="text-result-disclaimer"
              className="mt-4 text-sm font-semibold text-foreground"
            >
              Estimation statistique, pas une garantie individuelle.
            </p>
          </div>
        </section>

        <div className="mx-auto mt-5 grid max-w-3xl gap-5 sm:grid-cols-2">
          <div className="rounded-[24px] border border-border/80 bg-card/65 p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Ce que tu peux retenir
            </p>
            <p
              data-testid="text-result-takeaway"
              className="mt-4 font-display text-2xl leading-tight"
            >
              Un repère pour avancer, jamais une limite.
            </p>
          </div>
          <div className="rounded-[24px] border border-border/80 bg-card/65 p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Méthode
            </p>
            <p
              data-testid="text-result-method"
              className="mt-4 font-display text-2xl leading-tight"
            >
              {result.method}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Une méthode statistique, expliquée avec transparence.
            </p>
          </div>
          <div className="rounded-[24px] border border-border/80 bg-card/65 p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Potentiel haut estimé
            </p>
            <p
              data-testid="value-result-high"
              className="mt-4 font-display text-2xl leading-tight text-primary"
            >
              {formatHeight(result.rangeCm.high)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Borne haute de la fourchette contextuelle.
            </p>
          </div>
          <div className="rounded-[24px] border border-border/80 bg-card/65 p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Croissance restante estimée
            </p>
            <p
              data-testid="value-result-remaining"
              className="mt-4 font-display text-2xl leading-tight text-primary"
            >
              {formatHeight(remainingCentral)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Jusqu’à l’estimation centrale · {formatHeight(remainingHigh)}{" "}
              jusqu’à la borne haute.
            </p>
          </div>
        </div>

        {observation || goalMessage ? (
          <div className="mx-auto mt-5 grid max-w-3xl gap-5 sm:grid-cols-2">
            {observation ? (
              <div className="rounded-[24px] border border-border/80 bg-card/65 p-6">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Évolution observée
                </p>
                <p
                  data-testid="value-result-observed-growth"
                  className="mt-4 font-display text-2xl leading-tight"
                >
                  {observation.annualCm.toFixed(1).replace(".", ",")} cm/an
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Calculée sur {observation.daysBetween} jours, sans modifier la
                  prédiction.
                </p>
                {observation.warning ? (
                  <p
                    data-testid="text-result-observed-warning"
                    className="mt-3 text-xs leading-5 text-accent-foreground"
                  >
                    {observation.warning}
                  </p>
                ) : null}
              </div>
            ) : null}
            {goalMessage ? (
              <div className="rounded-[24px] border border-accent/35 bg-accent/10 p-6">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Comparaison avec ton objectif
                </p>
                <p
                  data-testid="text-result-goal-message"
                  className="mt-4 text-sm leading-6 text-foreground"
                >
                  {goalMessage}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <details
          data-testid="disclosure-scientific-limitations"
          className="mx-auto mt-8 max-w-3xl rounded-[22px] border border-border/80 bg-background/55"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span>Comprendre les limites de cette estimation</span>
            <ChevronDown size={18} className="shrink-0 text-muted-foreground" />
          </summary>
          <div className="border-t border-border/70 px-5 py-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Une estimation statistique ne peut pas prédire avec certitude une
              trajectoire individuelle. Elle ne constitue ni un diagnostic ni un
              conseil médical.
            </p>
            <ul className="mt-4 space-y-3">
              {result.limitations.map((limitation, index) => (
                <li
                  key={`${limitation}-${index}`}
                  data-testid={`text-result-limitation-${index}`}
                  className="flex gap-3 text-sm leading-6 text-foreground/75"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <div className="mx-auto mt-8 flex max-w-3xl flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            data-testid="button-restart-onboarding"
            href="/onboarding"
            onClick={(event) => {
              event.preventDefault();
              restart();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw size={16} /> Refaire l’aperçu
          </Link>
          <p className="text-center text-xs leading-5 text-muted-foreground sm:max-w-xs sm:text-right">
            Garde ce résultat comme une conversation à ouvrir, pas comme une
            réponse définitive.
          </p>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
