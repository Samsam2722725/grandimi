import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleHelp,
  ClipboardList,
  Ruler,
  Scale,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { BrandMark } from "@/components/public-shell";
import {
  calculateGrowthObservation,
  createInitialOnboardingData,
  loadOnboardingData,
  parseOptionalGoal,
  RESULT_STORAGE_KEY,
  saveOnboardingData,
  toPredictionInput,
  type OnboardingData,
  type OnboardingSection,
  type PredictionRequiredData,
} from "@/domain/onboarding";
import {
  INPUT_LIMITS,
  calculateDecimalAge,
  type Sex as ModelSex,
} from "@/domain/growth";
import { runVerification } from "@/lib/verification-engine";

const TOTAL_STEPS = 13;
const AGE_LIMIT_MESSAGE =
  "La méthode actuellement utilisée par Grandimi couvre les âges de 4 à 17 ans et demi.";

type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

type StepMeta = {
  key: string;
  eyebrow: string;
  title: string;
  helper: string;
};

const stepMeta: StepMeta[] = [
  {
    key: "modelSex",
    eyebrow: "Pour commencer",
    title: "Quel sexe doit être utilisé pour ton estimation de croissance ?",
    helper:
      "Le modèle utilise des coefficients différents selon les courbes de croissance masculines et féminines.",
  },
  {
    key: "birthDate",
    eyebrow: "Ton histoire",
    title: "Quelle est ta date de naissance ?",
    helper:
      "La méthode actuellement utilisée par Grandimi couvre les âges de 4 à 17 ans et demi.",
  },
  {
    key: "currentHeightCm",
    eyebrow: "Aujourd’hui",
    title: "Quelle est ta taille aujourd’hui ?",
    helper:
      "Pour un résultat plus cohérent, mesure-toi pieds nus, droit contre un mur.",
  },
  {
    key: "currentWeightKg",
    eyebrow: "Aujourd’hui",
    title: "Quel est ton poids actuel ?",
    helper: "Cette donnée est utilisée uniquement dans le calcul statistique.",
  },
  {
    key: "fatherHeightCm",
    eyebrow: "Ton entourage",
    title: "Quelle est la taille de ton père biologique ?",
    helper: "Si possible, utilise une mesure plutôt qu’une estimation.",
  },
  {
    key: "motherHeightCm",
    eyebrow: "Ton entourage",
    title: "Quelle est la taille de ta mère biologique ?",
    helper: "Cette donnée est obligatoire pour cette première version.",
  },
  {
    key: "tracking",
    eyebrow: "Ton évolution",
    title: "As-tu une ancienne mesure de ta taille ?",
    helper:
      "Elle servira uniquement à calculer une vitesse de croissance observée, sans modifier l’estimation actuelle.",
  },
  {
    key: "goal",
    eyebrow: "Ton objectif",
    title: "Quelle taille aimerais-tu atteindre ?",
    helper:
      "Ton objectif nous aidera à personnaliser ton expérience. Il ne modifie pas le calcul statistique.",
  },
  {
    key: "sport",
    eyebrow: "Ton quotidien",
    title: "Combien de séances de sport fais-tu habituellement par semaine ?",
    helper: "Cette réponse servira au futur programme, pas à la prédiction.",
  },
  {
    key: "sleep",
    eyebrow: "Ton quotidien",
    title: "Combien d’heures dors-tu généralement par nuit ?",
    helper: "Cette réponse servira au futur programme, pas à la prédiction.",
  },
  {
    key: "habits",
    eyebrow: "Ton quotidien",
    title: "Qu’est-ce qui pourrait actuellement limiter ta routine ?",
    helper:
      "Tu peux sélectionner plusieurs réponses. Ces informations serviront plus tard à personnaliser le programme.",
  },
  {
    key: "maturity",
    eyebrow: "Ton contexte",
    title: "Où en est ton développement physique ?",
    helper:
      "Ces repères peuvent aider à comprendre ton contexte de croissance. Tu peux passer cette étape.",
  },
  {
    key: "summary",
    eyebrow: "Dernière vérification",
    title: "Vérifie tes réponses avant de calculer ton potentiel.",
    helper:
      "Les données de calcul sont séparées des informations qui serviront plus tard à personnaliser ton expérience.",
  },
];

const sportOptions: ChoiceOption[] = [
  { value: "none", label: "Aucune" },
  { value: "one_two", label: "1 à 2" },
  { value: "three_four", label: "3 à 4" },
  { value: "five_plus", label: "5 ou plus" },
];

const sleepOptions: ChoiceOption[] = [
  { value: "under_six", label: "Moins de 6 heures" },
  { value: "six_seven", label: "6 à 7 heures" },
  { value: "seven_eight", label: "7 à 8 heures" },
  { value: "eight_nine", label: "8 à 9 heures" },
  { value: "over_nine", label: "Plus de 9 heures" },
];

const habitOptions: ChoiceOption[] = [
  { value: "irregular_sleep", label: "Je me couche à des heures irrégulières" },
  { value: "screens", label: "J’utilise beaucoup les écrans le soir" },
  { value: "skipped_meals", label: "Je saute parfois des repas" },
  { value: "low_movement", label: "Je bouge peu" },
  { value: "low_water", label: "Je ne bois pas assez d’eau" },
  { value: "nothing", label: "Rien de particulier" },
  { value: "unknown", label: "Je ne sais pas" },
];

const hairOptions: ChoiceOption[] = [
  { value: "none", label: "Aucune" },
  { value: "light", label: "Légère" },
  { value: "developed", label: "Développée" },
  { value: "prefer_not", label: "Je préfère ne pas répondre" },
];

function numericValue(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function dateIsBefore(first: string, second: string): boolean {
  return Boolean(first && second && first < second);
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          data-testid={`input-${id}`}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`focus-ring h-16 w-full rounded-2xl border bg-card px-5 text-xl placeholder:text-muted-foreground/40 ${error ? "border-destructive" : "border-border"} pr-16`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center font-mono-ui text-sm text-muted-foreground">
          {suffix}
        </span>
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceList({
  name,
  options,
  value,
  onChange,
  multiple = false,
}: {
  name: string;
  options: ChoiceOption[];
  value: string | string[];
  onChange: (value: string) => void;
  multiple?: boolean;
}) {
  const selected = Array.isArray(value) ? value : [value];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <label
            key={option.value}
            data-testid={`choice-${name}-${option.value}`}
            role={multiple ? "checkbox" : "radio"}
            aria-checked={isSelected}
            aria-label={option.label}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onChange(option.value);
              }
            }}
            className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border px-5 transition-colors ${
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card/60 text-foreground hover:border-primary/50"
            }`}
          >
            <input
              data-testid={`input-${name}-${option.value}`}
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              tabIndex={-1}
              className="absolute size-px opacity-0"
            />
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40"
              }`}
            >
              {isSelected ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            <span className="text-sm font-semibold">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  section,
  items,
  onEdit,
}: {
  title: string;
  section: OnboardingSection;
  items: Array<[string, string]>;
  onEdit: (section: OnboardingSection) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <button
          type="button"
          data-testid={`button-edit-${section}`}
          onClick={() => onEdit(section)}
          className="focus-ring text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Modifier
        </button>
      </div>
      <dl className="mt-4 space-y-2 border-t border-border/70 pt-4 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatDate(value: string): string {
  if (!value) return "Non renseignée";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
      }).format(date);
}

function formatValue(value: string, suffix = ""): string {
  return value
    ? `${value.replace(".", ",")} ${suffix}`.trim()
    : "Non renseignée";
}

function formatAge(data: PredictionRequiredData): string {
  try {
    return `${calculateDecimalAge(data.birthDate, data.measurementDate)
      .toFixed(1)
      .replace(".", ",")} ans`;
  } catch {
    return "À vérifier";
  }
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<OnboardingData>(createInitialOnboardingData);
  const [hydrated, setHydrated] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setData(loadOnboardingData());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveOnboardingData(data);
  }, [data, hydrated]);

  const step = stepMeta[stepIndex];
  const prediction = data.prediction_required;
  const currentAgeError = useMemo(() => {
    if (!prediction.birthDate || !prediction.measurementDate) return "";
    try {
      calculateDecimalAge(prediction.birthDate, prediction.measurementDate);
      return "";
    } catch (validationError) {
      const message =
        validationError instanceof Error ? validationError.message : "";
      return message.includes("compris entre") ? AGE_LIMIT_MESSAGE : message;
    }
  }, [prediction.birthDate, prediction.measurementDate]);

  const patchSection = <K extends OnboardingSection>(
    section: K,
    patch: Partial<OnboardingData[K]>,
  ) => {
    setData((current) => ({
      ...current,
      [section]: { ...current[section], ...patch },
    }));
    setError("");
  };

  const validateNumber = (
    value: string,
    min: number,
    max: number,
    label: string,
  ): string => {
    if (!value.trim()) return `${label} est nécessaire pour continuer.`;
    const parsed = numericValue(value);
    if (!Number.isFinite(parsed))
      return "Utilise un nombre, avec un point ou une virgule.";
    if (parsed < min || parsed > max) {
      return `${label} doit être compris entre ${min} et ${max}.`;
    }
    return "";
  };

  const validateCurrentStep = (): string => {
    switch (stepIndex) {
      case 0:
        return prediction.modelSex
          ? ""
          : "Choisis le repère utilisé pour ton estimation.";
      case 1:
        if (!prediction.birthDate)
          return "Ta date de naissance est nécessaire.";
        return currentAgeError;
      case 2:
        if (dateIsBefore(prediction.measurementDate, prediction.birthDate)) {
          return "La date de mesure doit suivre la naissance.";
        }
        if (currentAgeError) return currentAgeError;
        return validateNumber(
          prediction.currentHeightCm,
          INPUT_LIMITS.currentHeightCm.min,
          INPUT_LIMITS.currentHeightCm.max,
          "La taille",
        );
      case 3:
        return validateNumber(
          prediction.currentWeightKg,
          INPUT_LIMITS.currentWeightKg.min,
          INPUT_LIMITS.currentWeightKg.max,
          "Le poids",
        );
      case 4:
        return validateNumber(
          prediction.fatherHeightCm,
          INPUT_LIMITS.parentHeightCm.min,
          INPUT_LIMITS.parentHeightCm.max,
          "La taille du père",
        );
      case 5:
        return validateNumber(
          prediction.motherHeightCm,
          INPUT_LIMITS.parentHeightCm.min,
          INPUT_LIMITS.parentHeightCm.max,
          "La taille de la mère",
        );
      case 6: {
        const tracking = data.tracking;
        if (tracking.hasPreviousMeasurement === null) {
          return "Indique si tu as une ancienne mesure.";
        }
        if (tracking.hasPreviousMeasurement === false) return "";
        const heightError = validateNumber(
          tracking.previousHeightCm,
          INPUT_LIMITS.currentHeightCm.min,
          INPUT_LIMITS.currentHeightCm.max,
          "L’ancienne taille",
        );
        if (heightError) return heightError;
        if (!tracking.previousMeasurementDate) {
          return "La date de l’ancienne mesure est nécessaire.";
        }
        if (
          dateIsBefore(
            prediction.measurementDate,
            tracking.previousMeasurementDate,
          )
        ) {
          return "L’ancienne mesure doit précéder la mesure actuelle.";
        }
        return "";
      }
      case 7: {
        const goal = parseOptionalGoal(data.goal_only.desiredHeightCm);
        if (!data.goal_only.desiredHeightCm.trim()) return "";
        if (goal === null || goal < 120 || goal > 230) {
          return "La taille souhaitée doit être comprise entre 120 et 230 cm.";
        }
        return "";
      }
      case 8:
        return data.routine.sportFrequency
          ? ""
          : "Choisis une fréquence pour continuer.";
      case 9:
        return data.routine.sleepDuration
          ? ""
          : "Choisis une durée de sommeil pour continuer.";
      case 10:
        return data.routine.habits.length > 0
          ? ""
          : "Choisis au moins une réponse, y compris « Je ne sais pas ».";
      case 11:
      case 12:
        return "";
      default:
        return "";
    }
  };

  const calculate = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const response = runVerification(toPredictionInput(data));
    if (!response.ok) {
      setError(response.errors[0] ?? "Vérifie les informations de calcul.");
      setIsSubmitting(false);
      return;
    }
    saveOnboardingData(data);
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(response.result));
    setLocation("/result-preview");
  };

  const handleContinue = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    if (stepIndex === TOTAL_STEPS - 1) {
      calculate();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const goBack = () => {
    setError("");
    if (stepIndex === 0) {
      setLocation("/");
      return;
    }
    setStepIndex((current) => current - 1);
  };

  const editSection = (section: OnboardingSection) => {
    const indexBySection: Record<OnboardingSection, number> = {
      prediction_required: 0,
      tracking: 6,
      goal_only: 7,
      routine: 8,
      maturity_context: 11,
    };
    setStepIndex(indexBySection[section]);
    setError("");
  };

  const updateNumeric = (
    event: ChangeEvent<HTMLInputElement>,
    section: "prediction_required" | "tracking" | "goal_only",
    key: string,
  ) => {
    patchSection(section, { [key]: event.target.value } as never);
  };

  const renderSummary = () => {
    const observation = calculateGrowthObservation(data.tracking, prediction);
    const routineLabel = data.routine.sportFrequency || "Non renseigné";
    const sleepLabel = data.routine.sleepDuration || "Non renseigné";
    return (
      <div className="space-y-4">
        <SectionCard
          title="Calcul"
          section="prediction_required"
          onEdit={editSection}
          items={[
            [
              "Sexe utilisé",
              prediction.modelSex === "male" ? "Garçon" : "Fille",
            ],
            ["Âge à la mesure", formatAge(prediction)],
            ["Taille actuelle", formatValue(prediction.currentHeightCm, "cm")],
            ["Poids actuel", formatValue(prediction.currentWeightKg, "kg")],
            ["Père biologique", formatValue(prediction.fatherHeightCm, "cm")],
            ["Mère biologique", formatValue(prediction.motherHeightCm, "cm")],
          ]}
        />
        <SectionCard
          title="Suivi"
          section="tracking"
          onEdit={editSection}
          items={[
            [
              "Ancienne mesure",
              data.tracking.hasPreviousMeasurement === true
                ? formatValue(data.tracking.previousHeightCm, "cm")
                : "Non",
            ],
            [
              "Vitesse observée",
              observation
                ? `${observation.annualCm.toFixed(1).replace(".", ",")} cm/an`
                : "Non calculée",
            ],
          ]}
        />
        <SectionCard
          title="Objectif"
          section="goal_only"
          onEdit={editSection}
          items={[
            [
              "Taille souhaitée",
              formatValue(data.goal_only.desiredHeightCm, "cm"),
            ],
          ]}
        />
        <SectionCard
          title="Mode de vie"
          section="routine"
          onEdit={editSection}
          items={[
            ["Sport", routineLabel],
            ["Sommeil", sleepLabel],
            ["Habitudes sélectionnées", `${data.routine.habits.length}`],
            ["Contexte de développement", "Facultatif"],
          ]}
        />
        {observation?.warning ? (
          <p className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm leading-6 text-foreground">
            {observation.warning}
          </p>
        ) : null}
      </div>
    );
  };

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return (
          <ChoiceList
            name="onboarding-sex"
            value={prediction.modelSex}
            onChange={(value) =>
              patchSection("prediction_required", {
                modelSex: value as ModelSex,
              })
            }
            options={[
              { value: "male", label: "Garçon" },
              { value: "female", label: "Fille" },
            ]}
          />
        );
      case 1:
        return (
          <div className="max-w-xl">
            <label
              htmlFor="onboarding-birth-date"
              className="mb-2 block text-sm font-semibold"
            >
              Date de naissance
            </label>
            <div className="relative">
              <CalendarDays
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-primary"
                size={20}
              />
              <input
                id="onboarding-birth-date"
                data-testid="input-onboarding-birth-date"
                type="date"
                value={prediction.birthDate}
                onChange={(event) =>
                  patchSection("prediction_required", {
                    birthDate: event.target.value,
                  })
                }
                className={`focus-ring h-16 w-full rounded-2xl border bg-card pl-14 pr-5 text-base ${error ? "border-destructive" : "border-border"}`}
                aria-invalid={Boolean(error)}
              />
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <CircleHelp size={15} className="mt-0.5 shrink-0 text-primary" />
              La méthode actuellement utilisée par Grandimi couvre les âges de 4
              à 17 ans et demi.
            </p>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 max-w-xl">
            <NumberField
              id="onboarding-current-height"
              label="Taille actuelle"
              value={prediction.currentHeightCm}
              onChange={(value) =>
                patchSection("prediction_required", { currentHeightCm: value })
              }
              suffix="cm"
              placeholder="Ex. 146 ou 146,5"
              error={error}
            />
            <div>
              <label
                htmlFor="onboarding-measurement-date"
                className="mb-2 block text-sm font-semibold"
              >
                Date de mesure
              </label>
              <input
                id="onboarding-measurement-date"
                data-testid="input-onboarding-measurement-date"
                type="date"
                value={prediction.measurementDate}
                onChange={(event) =>
                  patchSection("prediction_required", {
                    measurementDate: event.target.value,
                  })
                }
                className="focus-ring h-14 w-full rounded-2xl border border-border bg-card px-5"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="max-w-xl">
            <NumberField
              id="onboarding-current-weight"
              label="Poids actuel"
              value={prediction.currentWeightKg}
              onChange={(value) =>
                patchSection("prediction_required", { currentWeightKg: value })
              }
              suffix="kg"
              placeholder="Ex. 38 ou 38,5"
              error={error}
            />
          </div>
        );
      case 4:
        return (
          <div className="max-w-xl">
            <NumberField
              id="onboarding-father-height"
              label="Taille du père biologique"
              value={prediction.fatherHeightCm}
              onChange={(value) =>
                patchSection("prediction_required", { fatherHeightCm: value })
              }
              suffix="cm"
              placeholder="Ex. 178"
              error={error}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Si possible, utilise une mesure plutôt qu’une estimation.
            </p>
          </div>
        );
      case 5:
        return (
          <div className="max-w-xl">
            <NumberField
              id="onboarding-mother-height"
              label="Taille de la mère biologique"
              value={prediction.motherHeightCm}
              onChange={(value) =>
                patchSection("prediction_required", { motherHeightCm: value })
              }
              suffix="cm"
              placeholder="Ex. 165"
              error={error}
            />
          </div>
        );
      case 6:
        return (
          <div className="max-w-xl space-y-5">
            <ChoiceList
              name="onboarding-previous-measurement"
              value={
                data.tracking.hasPreviousMeasurement === null
                  ? ""
                  : data.tracking.hasPreviousMeasurement
                    ? "yes"
                    : "no"
              }
              onChange={(value) => {
                patchSection("tracking", {
                  hasPreviousMeasurement: value === "yes",
                  ...(value === "no"
                    ? { previousHeightCm: "", previousMeasurementDate: "" }
                    : {}),
                });
              }}
              options={[
                { value: "yes", label: "Oui" },
                { value: "no", label: "Non" },
              ]}
            />
            {data.tracking.hasPreviousMeasurement === true ? (
              <div className="space-y-5 border-t border-border/70 pt-5">
                <NumberField
                  id="onboarding-previous-height"
                  label="Ancienne taille"
                  value={data.tracking.previousHeightCm}
                  onChange={(value) =>
                    patchSection("tracking", { previousHeightCm: value })
                  }
                  suffix="cm"
                  placeholder="Ex. 142"
                  error={error}
                />
                <div>
                  <label
                    htmlFor="onboarding-previous-date"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Date de cette mesure
                  </label>
                  <input
                    id="onboarding-previous-date"
                    data-testid="input-onboarding-previous-date"
                    type="date"
                    value={data.tracking.previousMeasurementDate}
                    onChange={(event) =>
                      patchSection("tracking", {
                        previousMeasurementDate: event.target.value,
                      })
                    }
                    className="focus-ring h-14 w-full rounded-2xl border border-border bg-card px-5"
                  />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Une vitesse annuelle n’est affichée que si les mesures sont
                  espacées d’au moins 90 jours.
                </p>
              </div>
            ) : null}
          </div>
        );
      case 7:
        return (
          <div className="max-w-xl">
            <NumberField
              id="onboarding-desired-height"
              label="Taille souhaitée (facultatif)"
              value={data.goal_only.desiredHeightCm}
              onChange={(value) =>
                patchSection("goal_only", { desiredHeightCm: value })
              }
              suffix="cm"
              placeholder="Ex. 180"
              error={error}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Ton objectif ne modifie pas le calcul statistique.
            </p>
          </div>
        );
      case 8:
        return (
          <ChoiceList
            name="onboarding-sport"
            value={data.routine.sportFrequency}
            onChange={(value) =>
              patchSection("routine", {
                sportFrequency:
                  value as OnboardingData["routine"]["sportFrequency"],
              })
            }
            options={sportOptions}
          />
        );
      case 9:
        return (
          <div className="space-y-6">
            <ChoiceList
              name="onboarding-sleep"
              value={data.routine.sleepDuration}
              onChange={(value) =>
                patchSection("routine", {
                  sleepDuration:
                    value as OnboardingData["routine"]["sleepDuration"],
                })
              }
              options={sleepOptions}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Heure habituelle du coucher (facultatif)
                <input
                  data-testid="input-onboarding-bedtime"
                  type="time"
                  value={data.routine.bedtime}
                  onChange={(event) =>
                    patchSection("routine", { bedtime: event.target.value })
                  }
                  className="focus-ring mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 font-normal"
                />
              </label>
              <label className="text-sm font-semibold">
                Heure habituelle du réveil (facultatif)
                <input
                  data-testid="input-onboarding-wake-time"
                  type="time"
                  value={data.routine.wakeTime}
                  onChange={(event) =>
                    patchSection("routine", { wakeTime: event.target.value })
                  }
                  className="focus-ring mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 font-normal"
                />
              </label>
            </div>
          </div>
        );
      case 10:
        return (
          <ChoiceList
            name="onboarding-habits"
            multiple
            value={data.routine.habits}
            onChange={(value) => {
              const current = data.routine.habits;
              const exclusive = value === "nothing" || value === "unknown";
              patchSection("routine", {
                habits: current.includes(value)
                  ? current.filter((item) => item !== value)
                  : exclusive
                    ? [value]
                    : [
                        ...current.filter(
                          (item) => item !== "nothing" && item !== "unknown",
                        ),
                        value,
                      ],
              });
            }}
            options={habitOptions}
          />
        );
      case 11:
        return (
          <div className="space-y-8">
            {prediction.modelSex === "male" ? (
              <>
                <div>
                  <h2 className="mb-3 text-sm font-semibold">
                    Ta voix a-t-elle changé ?
                  </h2>
                  <ChoiceList
                    name="onboarding-voice"
                    value={data.maturity_context.voiceChange}
                    onChange={(value) =>
                      patchSection("maturity_context", {
                        voiceChange:
                          value as OnboardingData["maturity_context"]["voiceChange"],
                      })
                    }
                    options={[
                      { value: "not_yet", label: "Pas encore" },
                      { value: "starting", label: "Elle commence à changer" },
                      { value: "clear", label: "Oui, clairement" },
                      { value: "unknown", label: "Je ne sais pas" },
                    ]}
                  />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-semibold">
                    As-tu de la pilosité sur le visage ?
                  </h2>
                  <ChoiceList
                    name="onboarding-facial-hair"
                    value={data.maturity_context.facialHair}
                    onChange={(value) =>
                      patchSection("maturity_context", {
                        facialHair:
                          value as OnboardingData["maturity_context"]["facialHair"],
                      })
                    }
                    options={hairOptions}
                  />
                </div>
              </>
            ) : (
              <div>
                <h2 className="mb-3 text-sm font-semibold">
                  As-tu déjà eu tes premières règles ?
                </h2>
                <ChoiceList
                  name="onboarding-periods"
                  value={data.maturity_context.periodStatus}
                  onChange={(value) =>
                    patchSection("maturity_context", {
                      periodStatus:
                        value as OnboardingData["maturity_context"]["periodStatus"],
                    })
                  }
                  options={[
                    { value: "no", label: "Non" },
                    { value: "yes", label: "Oui" },
                    {
                      value: "prefer_not",
                      label: "Je préfère ne pas répondre",
                    },
                  ]}
                />
                {data.maturity_context.periodStatus === "yes" ? (
                  <label className="mt-4 block text-sm font-semibold">
                    Environ quand ont-elles commencé ? (facultatif)
                    <input
                      data-testid="input-onboarding-period-date"
                      type="month"
                      value={data.maturity_context.periodStartedApprox}
                      onChange={(event) =>
                        patchSection("maturity_context", {
                          periodStartedApprox: event.target.value,
                        })
                      }
                      className="focus-ring mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 font-normal"
                    />
                  </label>
                ) : null}
              </div>
            )}
            <div>
              <h2 className="mb-3 text-sm font-semibold">
                As-tu de la pilosité sous les bras ?
              </h2>
              <ChoiceList
                name="onboarding-underarm-hair"
                value={data.maturity_context.underarmHair}
                onChange={(value) =>
                  patchSection("maturity_context", {
                    underarmHair:
                      value as OnboardingData["maturity_context"]["underarmHair"],
                  })
                }
                options={hairOptions}
              />
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold">
                Comment décrirais-tu ton acné actuellement ?
              </h2>
              <ChoiceList
                name="onboarding-acne"
                value={data.maturity_context.acne}
                onChange={(value) =>
                  patchSection("maturity_context", {
                    acne: value as OnboardingData["maturity_context"]["acne"],
                  })
                }
                options={[
                  { value: "none", label: "Aucune" },
                  { value: "light", label: "Légère" },
                  { value: "moderate", label: "Modérée" },
                  { value: "important", label: "Importante" },
                  { value: "prefer_not", label: "Je préfère ne pas répondre" },
                ]}
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Ces réponses sont facultatives et ne modifient jamais les
              coefficients Khamis–Roche.
            </p>
          </div>
        );
      case 12:
        return renderSummary();
      default:
        return null;
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background">
      <header className="mx-auto flex h-[72px] max-w-3xl items-center justify-between px-5 sm:px-8">
        <button
          type="button"
          data-testid="button-onboarding-back"
          onClick={goBack}
          className="focus-ring inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={
            stepIndex === 0 ? "Revenir à l’accueil" : "Question précédente"
          }
        >
          <ArrowLeft size={19} />
        </button>
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-2xl tracking-[-0.03em]">
            Grandimi
          </span>
        </div>
        <span className="w-10 text-right font-mono-ui text-[10px] text-muted-foreground">
          {Math.round(((stepIndex + 1) / TOTAL_STEPS) * 100)}%
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-10 pt-4 sm:px-8 sm:pt-8">
        <OnboardingProgress
          current={stepIndex + 1}
          total={TOTAL_STEPS}
          label="Ton aperçu, étape par étape"
        />
        <section
          key={step.key}
          aria-labelledby="onboarding-question"
          className="animate-[fade-up_420ms_ease-out_both] pb-8 pt-14 sm:pt-20"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {stepIndex === 0 ? (
              <UsersRound size={23} />
            ) : stepIndex === 2 ? (
              <Ruler size={23} />
            ) : stepIndex === 3 ? (
              <Scale size={23} />
            ) : stepIndex === 12 ? (
              <ClipboardList size={23} />
            ) : (
              <CalendarDays size={23} />
            )}
          </div>
          <p className="mt-7 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
            {step.eyebrow}
          </p>
          <h1
            id="onboarding-question"
            data-testid={`text-onboarding-question-${step.key}`}
            className="mt-3 max-w-2xl font-display text-[2.6rem] leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[4.15rem]"
          >
            {step.title}
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground sm:text-base">
            {step.helper}
          </p>
          <div className="mt-10">{renderStep()}</div>
          <div className="mt-5 min-h-6">
            {error ? (
              <p
                data-testid="status-onboarding-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {stepIndex === 12
                  ? "Tu peux encore modifier chaque section avant le calcul."
                  : "Tes réponses restent dans cette expérience."}
              </p>
            )}
          </div>
        </section>

        <div className="flex items-center justify-end border-t border-border/70 pt-6">
          <button
            type="button"
            data-testid={
              stepIndex === TOTAL_STEPS - 1
                ? "button-calculate-potential"
                : "button-onboarding-continue"
            }
            onClick={handleContinue}
            disabled={isSubmitting}
            className="focus-ring group inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.16)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {isSubmitting
              ? "Calcul en cours…"
              : stepIndex === TOTAL_STEPS - 1
                ? "Calculer mon potentiel"
                : "Continuer"}
            {!isSubmitting ? (
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            ) : null}
          </button>
        </div>
      </div>
    </main>
  );
}
