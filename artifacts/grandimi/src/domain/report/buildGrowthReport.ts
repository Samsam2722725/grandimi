import { parseOptionalGoal, type OnboardingData } from "@/domain/onboarding";
import type { VerificationResult } from "@/lib/verification-engine";
import { buildProfileInsights } from "./buildProfileInsights";
import type {
  DevelopmentMarker,
  GoalComparison,
  GrowthHistory,
  GrowthReport,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const VOICE_LABELS = {
  not_yet: "Pas encore",
  starting: "Elle commence à changer",
  clear: "Oui, clairement",
  unknown: "Je ne sais pas",
} as const;

const HAIR_LABELS = {
  none: "Aucune",
  light: "Légère",
  developed: "Développée",
  moderate: "Modérée",
  prefer_not: "Réponse non précisée",
} as const;

const PERIOD_LABELS = {
  no: "Non",
  yes: "Oui",
  prefer_not: "Réponse non précisée",
} as const;

const ACNE_LABELS = {
  none: "Aucune",
  light: "Légère",
  moderate: "Modérée",
  important: "Importante",
  prefer_not: "Réponse non précisée",
} as const;

function parseNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function daysBetween(start: string, end: string): number {
  return Math.round(
    (new Date(`${end}T00:00:00Z`).getTime() -
      new Date(`${start}T00:00:00Z`).getTime()) /
      MS_PER_DAY,
  );
}

function buildGoalComparison(
  data: OnboardingData,
  result: VerificationResult,
): GoalComparison | null {
  const desiredHeightCm = parseOptionalGoal(data.goal_only.desiredHeightCm);
  if (desiredHeightCm === null) return null;

  if (desiredHeightCm > result.rangeCm.high) {
    return {
      desiredHeightCm,
      position: "above",
      message:
        "Ton objectif dépasse la zone actuellement estimée. Grandimi peut t’aider à optimiser les facteurs contrôlables, sans garantir une taille précise.",
    };
  }

  if (desiredHeightCm < result.rangeCm.low) {
    return {
      desiredHeightCm,
      position: "below",
      message:
        "Ton estimation centrale est déjà supérieure à l’objectif indiqué.",
    };
  }

  return {
    desiredHeightCm,
    position: "within",
    message: "Ton objectif se situe dans ta zone actuellement estimée.",
  };
}

function buildHistory(data: OnboardingData): GrowthHistory | null {
  const { tracking, prediction_required: prediction } = data;
  if (
    tracking.hasPreviousMeasurement !== true ||
    !tracking.previousHeightCm ||
    !tracking.previousMeasurementDate
  ) {
    return null;
  }

  const previousHeightCm = parseNumber(tracking.previousHeightCm);
  const currentHeightCm = parseNumber(prediction.currentHeightCm);
  const elapsedDays = daysBetween(
    tracking.previousMeasurementDate,
    prediction.measurementDate,
  );
  if (
    !Number.isFinite(previousHeightCm) ||
    !Number.isFinite(currentHeightCm) ||
    !Number.isFinite(elapsedDays) ||
    elapsedDays <= 0
  ) {
    return null;
  }

  const totalGrowthCm = currentHeightCm - previousHeightCm;
  return {
    previousHeightCm,
    previousMeasurementDate: tracking.previousMeasurementDate,
    totalGrowthCm,
    daysBetween: elapsedDays,
    annualGrowthCm:
      elapsedDays >= 90 ? (totalGrowthCm / elapsedDays) * 365.2425 : null,
    warning:
      totalGrowthCm < 0
        ? "L’ancienne mesure est supérieure à la mesure actuelle. Vérifie les dates et les conditions de mesure."
        : undefined,
  };
}

function buildDevelopmentMarkers(data: OnboardingData): DevelopmentMarker[] {
  const markers: DevelopmentMarker[] = [];
  const maturity = data.maturity_context;

  if (data.prediction_required.modelSex === "male") {
    if (maturity.voiceChange) {
      markers.push({
        id: "voice",
        label: "Évolution de la voix",
        value: VOICE_LABELS[maturity.voiceChange],
      });
    }
    if (maturity.facialHair) {
      markers.push({
        id: "facial-hair",
        label: "Pilosité faciale",
        value: HAIR_LABELS[maturity.facialHair],
      });
    }
  } else if (maturity.periodStatus) {
    markers.push({
      id: "periods",
      label: "Premières règles",
      value:
        maturity.periodStatus === "yes" && maturity.periodStartedApprox
          ? `${PERIOD_LABELS[maturity.periodStatus]} · ${maturity.periodStartedApprox}`
          : PERIOD_LABELS[maturity.periodStatus],
    });
  }

  if (maturity.underarmHair) {
    markers.push({
      id: "underarm-hair",
      label: "Pilosité sous les bras",
      value: HAIR_LABELS[maturity.underarmHair],
    });
  }

  if (maturity.acne) {
    markers.push({
      id: "acne",
      label: "Acné déclarée",
      value: ACNE_LABELS[maturity.acne],
    });
  }

  return markers;
}

export function buildGrowthReport(
  data: OnboardingData,
  result: VerificationResult,
): GrowthReport {
  const currentHeightCm = parseNumber(data.prediction_required.currentHeightCm);
  if (
    !Number.isFinite(currentHeightCm) ||
    !Number.isFinite(result.centralEstimateCm) ||
    !Number.isFinite(result.rangeCm.low) ||
    !Number.isFinite(result.rangeCm.high)
  ) {
    throw new Error("Les données du rapport sont invalides.");
  }

  return {
    centralEstimateCm: result.centralEstimateCm,
    lowEstimateCm: result.rangeCm.low,
    highEstimateCm: result.rangeCm.high,
    remainingCentralCm: Math.max(0, result.centralEstimateCm - currentHeightCm),
    remainingHighCm: Math.max(0, result.rangeCm.high - currentHeightCm),
    goalComparison: buildGoalComparison(data, result),
    history: buildHistory(data),
    priorities: buildProfileInsights(data),
    developmentMarkers: buildDevelopmentMarkers(data),
    dataUsed: [
      {
        id: "age",
        label: "Âge au moment de la mesure",
        value: `${result.decimalAge.toFixed(1).replace(".", ",")} ans`,
      },
      {
        id: "sex",
        label: "Sexe utilisé par le modèle",
        value:
          data.prediction_required.modelSex === "male" ? "Garçon" : "Fille",
      },
      {
        id: "height",
        label: "Taille actuelle",
        value: `${currentHeightCm.toFixed(1).replace(".", ",")} cm`,
      },
      {
        id: "weight",
        label: "Poids actuel",
        value: `${parseNumber(data.prediction_required.currentWeightKg).toFixed(1).replace(".", ",")} kg`,
      },
      {
        id: "father",
        label: "Taille du père",
        value: `${parseNumber(data.prediction_required.fatherHeightCm).toFixed(1).replace(".", ",")} cm`,
      },
      {
        id: "mother",
        label: "Taille de la mère",
        value: `${parseNumber(data.prediction_required.motherHeightCm).toFixed(1).replace(".", ",")} cm`,
      },
    ],
    method: result.method,
    methodVersion: result.methodVersion,
    warnings: result.warnings,
    limitations: result.limitations,
  };
}
