import {
  ArrowRight,
  ChevronDown,
  RotateCcw,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  BrandMark,
  PublicFooter,
  PublicHeader,
} from "@/components/public-shell";
import {
  clearOnboardingSession,
  loadOnboardingData,
  ONBOARDING_STORAGE_KEY,
  RESULT_STORAGE_KEY,
  toPredictionInput,
} from "@/domain/onboarding";
import {
  buildGrowthReport,
  isVerificationResult,
  verificationResultsMatch,
  type GrowthReport,
} from "@/domain/report";
import { runVerification } from "@/lib/verification-engine";

function formatHeight(value: number) {
  return `${value.toFixed(1).replace(".", ",")} cm`;
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function ProgramDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = () => onClose();
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      data-testid="dialog-program"
      className="backdrop:bg-background/80 backdrop:backdrop-blur-sm rounded-[24px] border border-border/80 bg-card p-0 shadow-2xl shadow-black/10 sm:max-w-md w-full m-auto open:animate-in open:fade-in open:zoom-in-95"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">Ton programme</h2>
          <button
            type="button"
            data-testid="button-close-dialog"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted text-muted-foreground transition-colors focus-ring"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 text-muted-foreground text-sm leading-6 mb-8">
          <p data-testid="text-dialog-content">
            Le programme personnalisé sera construit à l’étape suivante.
          </p>
        </div>
        <button
          type="button"
          data-testid="button-confirm-dialog"
          onClick={onClose}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 focus-ring"
        >
          J'ai compris
        </button>
      </div>
    </dialog>
  );
}

export default function ResultPreview() {
  const [, setLocation] = useLocation();
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);

  useEffect(() => {
    const storedResult = sessionStorage.getItem(RESULT_STORAGE_KEY);
    const storedOnboarding = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);

    if (!storedResult || !storedOnboarding) {
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
    } catch {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
      setLocation("/onboarding");
    }
  }, [setLocation]);

  if (!report) {
    return null;
  }

  return (
    <main className="min-h-[100dvh] bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">
            <Sparkles size={22} />
          </span>
          <h1
            data-testid="text-result-title"
            className="mt-6 font-display text-[3.25rem] leading-[0.94] tracking-[-0.04em] sm:text-6xl"
          >
            Ton potentiel de croissance
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
                <h2 className="font-mono-ui text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Ta taille adulte estimée
                </h2>
                <p
                  data-testid="value-result-central"
                  className="mt-3 font-display text-6xl leading-none text-primary sm:text-7xl"
                >
                  {formatHeight(report.centralEstimateCm)}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/75 px-4 py-3 sm:max-w-[210px]">
                <p
                  data-testid="value-result-range"
                  className="text-xs font-semibold text-foreground"
                >
                  Zone estimée : {formatHeight(report.lowEstimateCm)} à{" "}
                  {formatHeight(report.highEstimateCm)}
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">
              Cette estimation repose sur la méthode {report.method} (v
              {report.methodVersion}) et les données que tu as renseignées. Elle
              peut évoluer avec le temps et ne décrit pas toute ton histoire.
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
            <h3 className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Ton potentiel haut estimé
            </h3>
            <p
              data-testid="value-result-high"
              className="mt-4 font-display text-2xl leading-tight text-primary"
            >
              {formatHeight(report.highEstimateCm)}
            </p>
            <p
              data-testid="text-result-high-disclaimer"
              className="mt-2 text-xs leading-5 text-muted-foreground"
            >
              Il s’agit du haut de la zone estimée, pas d’une taille garantie.
            </p>
          </div>
          <div className="rounded-[24px] border border-border/80 bg-card/65 p-6">
            <h3 className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Croissance restante estimée
            </h3>
            <p
              data-testid="value-result-remaining"
              className="mt-4 font-display text-2xl leading-tight text-primary"
            >
              {report.remainingCentralCm > 0
                ? formatHeight(report.remainingCentralCm)
                : "Atteinte"}
            </p>
            <div className="mt-2 text-xs leading-5 text-muted-foreground space-y-1">
              {report.remainingCentralCm > 0 ? (
                <>
                  <p data-testid="text-remaining-central">
                    Environ {formatHeight(report.remainingCentralCm)} selon
                    l’estimation centrale
                  </p>
                  <p data-testid="text-remaining-high">
                    Jusqu’à {formatHeight(report.remainingHighCm)} vers le haut
                    de la zone estimée
                  </p>
                </>
              ) : (
                <p data-testid="text-remaining-zero">
                  L’estimation actuelle suggère que l’essentiel de ta croissance
                  staturale pourrait déjà être atteint.
                </p>
              )}
            </div>
          </div>
        </div>

        {(report.history || report.goalComparison) && (
          <div className="mx-auto mt-5 grid max-w-3xl gap-5 sm:grid-cols-2">
            {report.history ? (
              <div className="rounded-[24px] border border-border/80 bg-card/65 p-6">
                <h3 className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Évolution observée
                </h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">
                      Ancienne mesure (
                      {formatDate(report.history.previousMeasurementDate)})
                    </span>
                    <span
                      data-testid="value-history-previous"
                      className="font-medium"
                    >
                      {formatHeight(report.history.previousHeightCm)}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">
                      Évolution totale
                    </span>
                    <span
                      data-testid="value-history-total"
                      className="font-medium"
                    >
                      {report.history.totalGrowthCm > 0 ? "+" : ""}
                      {formatHeight(report.history.totalGrowthCm)}
                    </span>
                  </p>
                  {report.history.annualGrowthCm !== null && (
                    <p className="flex justify-between text-primary items-center pt-1 border-t border-border/40 mt-2">
                      <span>Vitesse annuelle</span>
                      <span
                        data-testid="value-history-annual"
                        className="font-medium font-display text-xl"
                      >
                        {report.history.annualGrowthCm
                          .toFixed(1)
                          .replace(".", ",")}{" "}
                        cm/an
                      </span>
                    </p>
                  )}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Calculée sur {report.history.daysBetween} jours. Cette
                  observation n'a pas modifié la méthode de calcul Khamis-Roche.
                </p>
                {report.history.warning && (
                  <p
                    data-testid="text-result-observed-warning"
                    className="mt-3 text-xs leading-5 text-accent-foreground"
                  >
                    {report.history.warning}
                  </p>
                )}
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}

            {report.goalComparison && (
              <div className="rounded-[24px] border border-accent/35 bg-accent/10 p-6">
                <h3 className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Ton objectif
                </h3>
                <p
                  data-testid="value-result-goal"
                  className="mt-4 font-display text-2xl leading-tight text-foreground"
                >
                  {formatHeight(report.goalComparison.desiredHeightCm)}
                </p>
                <p
                  data-testid="text-result-goal-message"
                  className="mt-2 text-sm leading-6 text-foreground/80"
                >
                  {report.goalComparison.message}
                </p>
              </div>
            )}
          </div>
        )}

        <section className="mx-auto mt-8 max-w-3xl">
          <div className="rounded-[24px] border border-border/80 bg-card/65 p-6 sm:p-8">
            <h2 className="text-xl font-display font-semibold mb-6">
              Ce qui influence ta croissance
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-4">
                  Principalement non contrôlable
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-muted-foreground/50">—</span>Génétique
                  </li>
                  <li className="flex gap-3">
                    <span className="text-muted-foreground/50">—</span>Taille
                    des parents
                  </li>
                  <li className="flex gap-3">
                    <span className="text-muted-foreground/50">—</span>
                    Rythme naturel de maturation
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary mb-4">
                  Habitudes que tu peux structurer
                </h3>
                <ul className="space-y-3 text-sm text-foreground">
                  <li className="flex gap-3">
                    <Check size={16} className="text-primary shrink-0" />
                    Sommeil
                  </li>
                  <li className="flex gap-3">
                    <Check size={16} className="text-primary shrink-0" />
                    Activité physique
                  </li>
                  <li className="flex gap-3">
                    <Check size={16} className="text-primary shrink-0" />
                    Alimentation régulière
                  </li>
                  <li className="flex gap-3">
                    <Check size={16} className="text-primary shrink-0" />
                    Suivi régulier des mesures
                  </li>
                  <li className="flex gap-3">
                    <Check size={16} className="text-primary shrink-0" />
                    Posture et mobilité
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-xs leading-5 text-muted-foreground text-center">
              Ces habitudes ne garantissent pas une taille précise. Elles
              servent à soutenir une routine saine et à éviter de négliger les
              facteurs contrôlables.
            </p>
          </div>
        </section>

        {report.priorities.length > 0 && (
          <section className="mx-auto mt-8 max-w-3xl">
            <h2 className="text-xl font-display font-semibold mb-4 px-2">
              Tes priorités personnalisées
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {report.priorities.map((p) => (
                <div
                  key={p.id}
                  data-testid={`priority-${p.id}`}
                  className="rounded-[24px] border border-border/80 bg-card/65 p-6"
                >
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {report.developmentMarkers.length > 0 && (
          <section className="mx-auto mt-8 max-w-3xl">
            <h2 className="text-xl font-display font-semibold mb-2 px-2">
              Tes repères de développement
            </h2>
            <p className="px-2 text-sm text-muted-foreground mb-4">
              Ces repères ajoutent du contexte pour mieux comprendre ta
              croissance, mais ils ne modifient pas le calcul statistique.
            </p>
            <div className="rounded-[24px] border border-border/80 bg-card/65 p-6 space-y-4">
              {report.developmentMarkers.map((m) => (
                <div
                  key={m.id}
                  data-testid={`marker-${m.id}`}
                  className="flex justify-between items-center border-b border-border/50 pb-4 last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground text-sm">
                    {m.label}
                  </span>
                  <span className="font-medium text-sm text-right max-w-[60%]">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto mt-8 max-w-3xl">
          <h2 className="text-xl font-display font-semibold mb-4 px-2">
            Ton estimation repose sur 6 facteurs
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.dataUsed.map((d) => (
              <div
                key={d.id}
                data-testid={`data-used-${d.id}`}
                className="rounded-[20px] border border-border/50 bg-background/50 px-5 py-4 flex justify-between items-center gap-4"
              >
                <span className="text-xs text-muted-foreground">{d.label}</span>
                <span className="text-sm font-medium text-right shrink-0">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-[30px] bg-primary text-primary-foreground p-7 sm:p-10 relative overflow-hidden shadow-[0_18px_40px_hsl(var(--primary)/0.2)]">
            <div className="relative z-10 sm:w-2/3">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-4 leading-tight">
                Ton programme personnalisé arrive ensuite
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-primary-foreground/90 mb-8">
                <li className="flex items-start gap-3">
                  <Check size={18} className="shrink-0 mt-0.5" /> 3 actions par
                  jour
                </li>
                <li className="flex items-start gap-3">
                  <Check size={18} className="shrink-0 mt-0.5" /> Sommeil,
                  activité/mobilité, nutrition
                </li>
                <li className="flex items-start gap-3">
                  <Check size={18} className="shrink-0 mt-0.5" /> Progression
                  sur 7 jours
                </li>
                <li className="flex items-start gap-3">
                  <Check size={18} className="shrink-0 mt-0.5" /> Adaptation à
                  tes habitudes
                </li>
              </ul>
              <button
                type="button"
                data-testid="button-discover-program"
                onClick={() => setProgramDialogOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3.5 text-sm font-semibold text-primary transition-transform hover:scale-105 focus-ring"
              >
                Créer mon programme de 7 jours <ArrowRight size={16} />
              </button>
            </div>
            <div className="absolute -right-20 -bottom-20 size-72 rounded-full bg-background/10 blur-3xl pointer-events-none hidden sm:block" />
          </div>
        </section>

        <details
          data-testid="disclosure-scientific-limitations"
          className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-border/80 bg-background/55"
        >
          <summary
            data-testid="summary-accordion"
            className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-foreground focus-ring rounded-[24px] [&::-webkit-details-marker]:hidden"
          >
            <span>Comment Grandimi calcule cette estimation ?</span>
            <ChevronDown size={18} className="shrink-0 text-muted-foreground" />
          </summary>
          <div className="border-t border-border/70 px-6 py-6 space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              Cette estimation repose sur la méthode {report.method} (v
              {report.methodVersion}), un modèle statistique utilisant 6
              facteurs (l'âge, le sexe, la taille, le poids, ainsi que la taille
              du père et de la mère). Cette méthode a l'avantage de ne pas
              nécessiter d'âge osseux.
            </p>
            <p>
              La zone estimée reflète les marges d'erreur inhérentes au modèle.
              La méthode a été développée à l'origine sur des populations
              d'enfants américains caucasiens, ce qui peut influencer sa
              précision selon les profils.
            </p>
            <ul className="mt-5 space-y-3">
              {report.limitations.map((limitation, index) => (
                <li
                  key={`${limitation.substring(0, 10)}-${index}`}
                  data-testid={`text-result-limitation-${index}`}
                  className="flex gap-3 text-sm leading-6 text-foreground/80"
                >
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <div className="mx-auto mt-12 mb-4 flex max-w-3xl flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            data-testid="button-modify-answers"
            href="/onboarding#summary"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-6 py-3.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-ring"
          >
            Modifier mes réponses
          </Link>
          <button
            type="button"
            data-testid="button-restart-onboarding"
            onClick={() => {
              if (
                window.confirm(
                  "Recommencer supprimera les réponses et le résultat de cette session. Continuer ?",
                )
              ) {
                clearOnboardingSession();
                setLocation("/onboarding");
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border bg-transparent px-6 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-ring"
          >
            <RotateCcw size={16} /> Recommencer
          </button>
        </div>
      </div>

      <ProgramDialog
        open={programDialogOpen}
        onClose={() => setProgramDialogOpen(false)}
      />
      <PublicFooter />
    </main>
  );
}
