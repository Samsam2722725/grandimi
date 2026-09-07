import {
  ArrowLeft,
  Clock,
  Sun,
  MoonStar,
  Sunrise,
  CalendarDays,
  ExternalLink,
  Activity,
  Apple,
  Moon,
  ChevronDown,
  CheckCircle2,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import {
  loadOnboardingData,
  toPredictionInput,
  RESULT_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
} from "@/domain/onboarding";
import { runVerification } from "@/lib/verification-engine";
import {
  isVerificationResult,
  verificationResultsMatch,
  buildGrowthReport,
} from "@/domain/report";
import {
  buildSevenDayProgram,
  validateProgram,
  PROGRAM_SOURCES,
  PROGRAM_STORAGE_KEY,
  programsMatch,
  type SevenDayProgram,
  type ProgramAction,
} from "@/domain/program";
import type { OnboardingData } from "@/domain/onboarding";
import type { GrowthReport } from "@/domain/report";
import {
  buildAIPersonalizationContext,
  useAIPersonalization,
} from "@/domain/ai";

const CATEGORY_META = {
  sleep: { label: "Sommeil", icon: Moon },
  activity: { label: "Activité", icon: Activity },
  nutrition: { label: "Nutrition", icon: Apple },
};

const TIME_OF_DAY_META = {
  morning: { label: "Matin", icon: Sunrise },
  daytime: { label: "Journée", icon: Sun },
  evening: { label: "Soir", icon: MoonStar },
  anytime: { label: "Au choix", icon: Clock },
};

const PRIORITY_LABELS: Record<string, string> = {
  sleep: "Sommeil",
  activity: "Activité physique",
  nutrition: "Nutrition",
  steady: "Régularité globale",
};

function ActionCard({ action }: { action: ProgramAction }) {
  const cat = CATEGORY_META[action.category] || {
    label: action.category,
    icon: Target,
  };
  const CatIcon = cat.icon;
  const time = TIME_OF_DAY_META[action.timeOfDay] || TIME_OF_DAY_META.anytime;
  const TimeIcon = time.icon;

  return (
    <div
      data-testid={`action-${action.id}`}
      className="rounded-[24px] border border-border/80 bg-card/65 p-6 mb-4 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CatIcon size={16} />
          </span>
          <span className="text-[10px] font-mono-ui uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            {cat.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1 text-xs font-semibold text-secondary-foreground border border-border/50">
            <TimeIcon size={12} /> {time.label}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1 text-xs font-semibold text-secondary-foreground border border-border/50">
            <Clock size={12} /> {action.durationMinutes} min
          </span>
        </div>
      </div>

      <h4 className="font-display text-xl font-semibold text-foreground">
        {action.title}
      </h4>
      <p className="mt-2 text-sm leading-6 text-foreground/90">
        {action.instruction}
      </p>

      <div className="mt-5 pt-5 border-t border-border/50 grid gap-5 sm:grid-cols-2">
        <div>
          <span className="block text-[10px] font-mono-ui uppercase tracking-[0.1em] text-muted-foreground mb-2">
            Pourquoi
          </span>
          <p className="text-xs text-muted-foreground leading-5">
            {action.reason}
          </p>
        </div>
        {action.personalizationReasons.length > 0 && (
          <div>
            <span className="block text-[10px] font-mono-ui uppercase tracking-[0.1em] text-accent mb-2">
              Pour toi
            </span>
            <ul className="space-y-1.5">
              {action.personalizationReasons.map((pr, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground leading-5 flex gap-2 items-start"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{pr}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-5 pt-5 border-t border-border/50 flex items-start gap-3 bg-primary/5 -mx-6 -mb-6 px-6 py-4">
        <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs font-semibold text-foreground leading-5">
          {action.completionCriteria}
        </p>
      </div>
    </div>
  );
}

export default function Program() {
  const [, setLocation] = useLocation();
  const [program, setProgram] = useState<SevenDayProgram | null>(null);
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(
    null,
  );

  useEffect(() => {
    const documentTitle = document.title;
    document.title = "Ton Programme - Grandimi";
    return () => {
      document.title = documentTitle;
    };
  }, []);

  useEffect(() => {
    const storedResult = sessionStorage.getItem(RESULT_STORAGE_KEY);
    const storedOnboarding = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    const storedProgram = sessionStorage.getItem(PROGRAM_STORAGE_KEY);

    if (!storedResult || !storedOnboarding || !storedProgram) {
      setLocation("/onboarding");
      return;
    }

    try {
      const parsedResult: unknown = JSON.parse(storedResult);
      if (!isVerificationResult(parsedResult)) {
        throw new Error("Résultat de session invalide.");
      }
      const onboardingData = loadOnboardingData();
      const verification = runVerification(toPredictionInput(onboardingData));
      if (
        !verification.ok ||
        !verificationResultsMatch(parsedResult, verification.result)
      ) {
        throw new Error("La session ne correspond plus aux réponses.");
      }

      const generatedReport = buildGrowthReport(
        onboardingData,
        verification.result,
      );
      setReport(generatedReport);
      setOnboardingData(onboardingData);
      const expectedProgram = buildSevenDayProgram(
        onboardingData,
        generatedReport,
      );

      const parsedProgram = JSON.parse(storedProgram);
      if (!validateProgram(parsedProgram)) {
        throw new Error("Programme invalide.");
      }

      if (parsedProgram.id === expectedProgram.id) {
        if (!programsMatch(parsedProgram, expectedProgram)) {
          throw new Error("Programme corrompu.");
        }
        setProgram(parsedProgram);
      } else {
        sessionStorage.setItem(
          PROGRAM_STORAGE_KEY,
          JSON.stringify(expectedProgram),
        );
        setProgram(expectedProgram);
      }
    } catch {
      sessionStorage.removeItem(PROGRAM_STORAGE_KEY);
      setLocation("/onboarding");
    }
  }, [setLocation]);

  const aiContext = useMemo(
    () =>
      program && report && onboardingData
        ? buildAIPersonalizationContext(onboardingData, report, program)
        : null,
    [program, report, onboardingData],
  );
  const ai = useAIPersonalization(aiContext, program);

  if (!program) {
    return null;
  }

  return (
    <main className="min-h-[100dvh] bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays size={22} />
          </span>
          <h1
            data-testid="text-program-title"
            className="mt-6 font-display text-[3.25rem] leading-[0.94] tracking-[-0.04em] sm:text-6xl"
          >
            Ton programme Grandimi de 7 jours
          </h1>
          <p
            data-testid="text-program-summary"
            className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base"
          >
            {program.profileSummary}
          </p>
          <PersonalizationStatus ai={ai} />
        </div>

        <section className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-[24px] border border-border/80 bg-card/65 p-6 flex items-center gap-4 justify-center">
            <span className="text-sm text-muted-foreground">
              Priorité principale :
            </span>
            <span
              data-testid="text-program-priority"
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
            >
              <Target size={16} />{" "}
              {PRIORITY_LABELS[program.primaryPriority] ||
                program.primaryPriority}
            </span>
          </div>
        </section>
        {ai.copy && (
          <section className="mx-auto mt-5 max-w-3xl rounded-[24px] border border-primary/20 bg-primary/5 p-6">
            <p className="text-xs font-medium text-primary">
              Analyse personnalisée
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {ai.copy.weeklyMission}
            </p>
          </section>
        )}

        <div className="mx-auto max-w-3xl mt-16 space-y-16">
          {program.days.map((day) => (
            <section
              key={day.dayNumber}
              data-testid={`program-day-${day.dayNumber}`}
            >
              <div className="mb-6">
                <h2 className="font-display text-3xl font-bold">{day.title}</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  {day.focus}
                </p>
                {ai.copy && (
                  <p className="mt-3 text-sm leading-6 text-foreground/80">
                    {
                      ai.copy.dayMessages.find(
                        (message) => message.dayNumber === day.dayNumber,
                      )?.message
                    }
                  </p>
                )}
              </div>
              <div className="space-y-6">
                {day.actions.map((action) => (
                  <ActionCard key={action.id} action={action} />
                ))}
              </div>
            </section>
          ))}
        </div>
        {ai.copy && (
          <p className="mx-auto mt-12 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
            {ai.copy.finalEncouragement}
          </p>
        )}

        <details
          data-testid="disclosure-sources"
          className="mx-auto mt-16 max-w-3xl rounded-[24px] border border-border/80 bg-background/55"
        >
          <summary
            data-testid="summary-sources-accordion"
            className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-foreground focus-ring rounded-[24px] [&::-webkit-details-marker]:hidden"
          >
            <span>Sources de ce programme</span>
            <ChevronDown size={18} className="shrink-0 text-muted-foreground" />
          </summary>
          <div className="border-t border-border/70 px-6 py-6 space-y-4 text-sm leading-6 text-muted-foreground">
            <ul className="space-y-4">
              {PROGRAM_SOURCES.filter((s) =>
                program.sourceIds.includes(s.id),
              ).map((source) => (
                <li key={source.id} className="space-y-1">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors focus-ring rounded-sm"
                  >
                    {source.title} <ExternalLink size={14} />
                  </a>
                  <p>{source.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <div className="mx-auto mt-12 mb-4 flex max-w-3xl justify-center">
          <Link
            data-testid="button-back-to-report"
            href="/result-preview"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-transparent px-6 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-ring"
          >
            <ArrowLeft size={16} /> Retour à mon résultat
          </Link>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

function PersonalizationStatus({
  ai,
}: {
  ai: ReturnType<typeof useAIPersonalization>;
}) {
  if (ai.copy)
    return (
      <p className="mt-4 text-xs font-medium text-primary">
        Analyse personnalisée
      </p>
    );
  if (ai.loading)
    return (
      <p className="mt-4 text-xs text-muted-foreground" role="status">
        Personnalisation en cours…
      </p>
    );
  if (ai.error)
    return (
      <button
        type="button"
        onClick={ai.retry}
        className="mt-4 text-xs font-medium text-primary underline underline-offset-4 focus-ring rounded-sm"
      >
        Réessayer la personnalisation
      </button>
    );
  return null;
}
