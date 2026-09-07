import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Beaker,
  CalendarDays,
  Check,
  CircleHelp,
  ClipboardCheck,
  Info,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  runVerification,
  type EngineWarning,
  type ModelSex,
  type VerificationInput,
  type VerificationResult,
} from "@/lib/verification-engine";

type FormState = {
  modelSex: ModelSex;
  birthDate: string;
  measurementDate: string;
  currentHeightCm: string;
  currentWeightKg: string;
  fatherHeightCm: string;
  motherHeightCm: string;
};

const initialForm: FormState = {
  modelSex: "male",
  birthDate: "",
  measurementDate: "",
  currentHeightCm: "",
  currentWeightKg: "",
  fatherHeightCm: "",
  motherHeightCm: "",
};

function formatCm(value: number | null | undefined) {
  return value == null ? "—" : `${value.toFixed(1).replace(".", ",")} cm`;
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return value == null ? "—" : value.toFixed(digits).replace(".", ",");
}

function Field({
  id,
  label,
  hint,
  suffix,
  value,
  onChange,
  type = "number",
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "number" | "date";
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-3 text-sm font-semibold text-foreground"
      >
        <span>{label}</span>
        {hint ? (
          <span className="font-normal text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={id}
          data-testid={`input-${id}`}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`focus-ring h-12 w-full rounded-lg border bg-card px-3.5 text-[15px] text-foreground shadow-[0_1px_0_hsl(var(--foreground)/0.03)] transition-colors placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:outline-none ${suffix ? "pr-14" : ""} ${error ? "border-destructive focus:border-destructive" : "border-input"}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center font-mono-ui text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  accent = false,
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
  testId: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${accent ? "border-accent/40 bg-accent/10" : "border-border bg-background/45"}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        data-testid={testId}
        className={`mt-2 font-display text-3xl leading-none ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

function WarningRow({
  warning,
  index,
}: {
  warning: EngineWarning;
  index: number;
}) {
  const isInfo = warning.severity === "info";
  return (
    <li
      data-testid={`warning-${index}`}
      className="flex gap-3 border-b border-border/70 py-3 last:border-0 last:pb-0"
    >
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${isInfo ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}
      >
        {isInfo ? <Info size={14} /> : <AlertTriangle size={14} />}
      </span>
      <p className="text-sm leading-5 text-foreground/80">{warning.message}</p>
    </li>
  );
}

function ResultPanel({
  result,
  engineErrors,
  submitted,
}: {
  result: VerificationResult | null;
  engineErrors: string[];
  submitted: boolean;
}) {
  const warnings = result?.warnings ?? [];
  return (
    <section aria-labelledby="results-title" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.18em] text-primary">
            02 / lecture
          </p>
          <h2
            id="results-title"
            className="mt-2 font-display text-4xl leading-none text-foreground sm:text-5xl"
          >
            Résultat de vérification
          </h2>
        </div>
        <span className="hidden rounded-full border border-border px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:inline-flex">
          Déterministe
        </span>
      </div>

      {!submitted ? (
        <div
          data-testid="empty-results"
          className="paper-grid flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardCheck size={22} />
          </span>
          <h3 className="mt-4 font-semibold text-foreground">
            Une lecture attend vos données
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Renseignez les sept mesures et dates, puis lancez le calcul pour
            afficher uniquement les sorties du moteur.
          </p>
        </div>
      ) : engineErrors.length > 0 ? (
        <div
          data-testid="engine-errors"
          className="rounded-2xl border border-accent/45 bg-accent/10 p-5"
        >
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
              <ShieldAlert size={18} />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">
                Vérification non disponible
              </h3>
              <p className="mt-1 text-sm leading-6 text-foreground/75">
                Le moteur a refusé ou n'a pas pu traiter cette entrée. Aucune
                valeur n'est inventée pour compléter le relevé.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-accent-foreground">
                {engineErrors.map((error) => (
                  <li key={error}>— {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric
          label="Estimation centrale"
          value={formatCm(result?.centralEstimateCm)}
          detail="Hauteur adulte estimée"
          accent
          testId="value-central-estimate"
        />
        <Metric
          label="Fourchette contextuelle"
          value={
            result
              ? `${formatNumber(result.rangeCm.low, 1)}–${formatNumber(result.rangeCm.high, 1)} cm`
              : "—"
          }
          detail="À lire comme un contexte, pas une certitude"
          testId="value-context-range"
        />
        <Metric
          label="Âge décimal"
          value={formatNumber(result?.decimalAge)}
          detail="Au moment de la mesure"
          testId="value-decimal-age"
        />
        <Metric
          label="Taille parentale moyenne"
          value={formatCm(result?.midParentalHeightCm)}
          detail="Repère familial corrigé par le sexe du modèle"
          testId="value-mid-parental-height"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-primary" />
            <h3 className="font-semibold">Coefficients utilisés</h3>
          </div>
          <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
            {(
              result?.coefficients ?? [
                { label: "Constante", value: "—" },
                { label: "Taille mesurée", value: "—" },
                { label: "Poids mesuré", value: "—" },
                { label: "Taille parentale", value: "—" },
              ]
            ).map((coefficient) => (
              <div
                key={coefficient.label}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {coefficient.label}
                </span>
                <span
                  data-testid={`coefficient-${coefficient.label.toLowerCase().replaceAll(" ", "-")}`}
                  className="font-mono-ui text-xs text-foreground"
                >
                  {coefficient.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            <h3 className="font-semibold">Interpolation d'âge</h3>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ligne basse
              </p>
              <p
                data-testid="value-lower-age"
                className="mt-1 font-mono-ui text-sm"
              >
                {result ? `${result.interpolation.lowerAge} ans` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ligne haute
              </p>
              <p
                data-testid="value-upper-age"
                className="mt-1 font-mono-ui text-sm"
              >
                {result ? `${result.interpolation.upperAge} ans` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-primary">
                Facteur
              </p>
              <p
                data-testid="value-interpolation-factor"
                className="mt-1 font-mono-ui text-sm text-primary"
              >
                {result ? formatNumber(result.interpolation.factor, 3) : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Les lignes encadrent l'âge décimal transmis au moteur pour
            l'interpolation des tables.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-accent-foreground" />
            <h3 className="font-semibold">Avertissements du moteur</h3>
          </div>
          {warnings.length > 0 ? (
            <ul className="mt-2">
              {warnings.map((warning, index) => (
                <WarningRow
                  key={`${warning.message}-${index}`}
                  warning={warning}
                  index={index}
                />
              ))}
            </ul>
          ) : (
            <p
              data-testid="warnings-empty"
              className="mt-4 text-sm leading-6 text-muted-foreground"
            >
              Aucun avertissement transmis. Les limites générales restent
              applicables.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CircleHelp size={16} className="text-primary" />
            <h3 className="font-semibold">Limites scientifiques</h3>
          </div>
          <ul className="mt-2 divide-y divide-border/70">
            {(
              result?.limitations ?? [
                "Les limites scientifiques apparaîtront après un calcul valide.",
              ]
            ).map((limitation, index) => (
              <li
                data-testid={`limitation-${index}`}
                key={limitation}
                className="py-3 text-sm leading-5 text-muted-foreground"
              >
                {limitation}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function PredictionLab() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [engineErrors, setEngineErrors] = useState<string[]>([]);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const calculate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.birthDate) errors.birthDate = "Requis";
    if (!form.measurementDate) errors.measurementDate = "Requis";
    if (
      form.birthDate &&
      form.measurementDate &&
      form.measurementDate < form.birthDate
    )
      errors.measurementDate = "La date doit suivre la naissance";
    const numberFields: Array<[keyof FormState, string]> = [
      ["currentHeightCm", "La taille est requise"],
      ["currentWeightKg", "Le poids est requis"],
      ["fatherHeightCm", "La taille du père est requise"],
      ["motherHeightCm", "La taille de la mère est requise"],
    ];
    numberFields.forEach(([key, message]) => {
      if (!form[key]) errors[key] = message;
    });
    setValidationErrors(errors);
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      setResult(null);
      setEngineErrors(["Entrées invalides : corrigez les champs signalés."]);
      return;
    }
    const input: VerificationInput = {
      modelSex: form.modelSex,
      birthDate: form.birthDate,
      measurementDate: form.measurementDate,
      currentHeightCm: form.currentHeightCm,
      currentWeightKg: form.currentWeightKg,
      fatherHeightCm: form.fatherHeightCm,
      motherHeightCm: form.motherHeightCm,
    };
    const response = runVerification(input);
    if (response.ok) {
      setResult(response.result);
      setEngineErrors([]);
    } else {
      setResult(null);
      setEngineErrors(response.errors);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/75">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Beaker size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-2xl leading-none">Grandimi</p>
              <p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Prediction lab
              </p>
            </div>
          </div>
          <div
            data-testid="status-internal"
            className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:flex"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            Environnement interne
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(290px,0.72fr)_minmax(0,1.6fr)] lg:gap-16 lg:px-12 lg:py-16">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.18em] text-primary">
            01 / paramètres
          </p>
          <h1 className="mt-4 max-w-md font-display text-[3.25rem] leading-[0.92] tracking-[-0.02em] text-foreground sm:text-6xl">
            Lire une estimation, sans surpromesse.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-7 text-muted-foreground">
            Un espace de vérification pour inspecter les entrées et les sorties
            du modèle Khamis–Roche. Chaque valeur reste traçable.
          </p>
          <div className="mt-7 border-l-2 border-accent pl-4">
            <p className="text-sm font-semibold text-foreground">
              Outil interne de vérification — pas encore le produit final
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Les données restent dans cette session de travail.
            </p>
          </div>
          <div className="mt-10 hidden items-start gap-3 border-t border-border pt-5 lg:flex">
            <Sparkles size={15} className="mt-0.5 text-accent-foreground" />
            <p className="text-xs leading-5 text-muted-foreground">
              La précision affichée ne doit jamais être confondue avec une
              certitude individuelle.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-16">
          <form
            onSubmit={calculate}
            noValidate
            className="rounded-2xl border border-border bg-card p-5 shadow-[0_12px_32px_hsl(var(--foreground)/0.04)] sm:p-7"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border pb-5">
              <div>
                <h2 className="font-semibold text-foreground">
                  Entrées du modèle
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Unités métriques · tous les champs sont nécessaires
                </p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
                v.0.1
              </span>
            </div>
            <div className="mt-7 space-y-7">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-foreground">
                  Sexe utilisé par le modèle
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["male", "female"] as const).map((sex) => (
                    <label
                      key={sex}
                      className={`focus-within:ring-2 focus-within:ring-ring/30 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3.5 transition-colors ${form.modelSex === sex ? "border-primary bg-primary/8 text-primary" : "border-input bg-background/30 text-foreground hover:border-primary/50"}`}
                    >
                      <input
                        data-testid={`input-model-sex-${sex}`}
                        type="radio"
                        name="modelSex"
                        value={sex}
                        checked={form.modelSex === sex}
                        onChange={() => update("modelSex", sex)}
                        className="sr-only"
                      />
                      <span
                        className={`flex size-5 items-center justify-center rounded-full border ${form.modelSex === sex ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}
                      >
                        {form.modelSex === sex ? (
                          <Check size={12} strokeWidth={3} />
                        ) : null}
                      </span>
                      <span className="text-sm font-medium">
                        {sex === "male" ? "Masculin" : "Féminin"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="birth-date"
                  label="Date de naissance"
                  type="date"
                  value={form.birthDate}
                  onChange={(value) => update("birthDate", value)}
                  error={validationErrors.birthDate}
                />
                <Field
                  id="measurement-date"
                  label="Date de mesure"
                  type="date"
                  value={form.measurementDate}
                  onChange={(value) => update("measurementDate", value)}
                  error={validationErrors.measurementDate}
                />
                <Field
                  id="current-height"
                  label="Taille actuelle"
                  hint="mesurée"
                  suffix="cm"
                  value={form.currentHeightCm}
                  onChange={(value) => update("currentHeightCm", value)}
                  error={validationErrors.currentHeightCm}
                />
                <Field
                  id="current-weight"
                  label="Poids actuel"
                  hint="mesuré"
                  suffix="kg"
                  value={form.currentWeightKg}
                  onChange={(value) => update("currentWeightKg", value)}
                  error={validationErrors.currentWeightKg}
                />
                <Field
                  id="father-height"
                  label="Taille du père"
                  suffix="cm"
                  value={form.fatherHeightCm}
                  onChange={(value) => update("fatherHeightCm", value)}
                  error={validationErrors.fatherHeightCm}
                />
                <Field
                  id="mother-height"
                  label="Taille de la mère"
                  suffix="cm"
                  value={form.motherHeightCm}
                  onChange={(value) => update("motherHeightCm", value)}
                  error={validationErrors.motherHeightCm}
                />
              </div>
              <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info size={14} className="text-primary" />
                  <span>
                    Le moteur est déterministe : mêmes entrées, même sortie.
                  </span>
                </div>
                <button
                  data-testid="button-run-verification"
                  type="submit"
                  className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0 sm:w-auto"
                >
                  Lancer la vérification <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </form>

          <ResultPanel
            result={result}
            engineErrors={engineErrors}
            submitted={submitted}
          />

          <footer className="flex flex-col gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-lg">
              Grandimi est un espace de recherche interne. Ce relevé ne
              constitue ni un diagnostic, ni un conseil, ni une promesse sur la
              taille adulte.
            </p>
            <p className="shrink-0 font-mono-ui text-[10px] uppercase tracking-[0.12em]">
              Mesure / modèle / contexte
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
