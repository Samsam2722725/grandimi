import type { VerificationInput } from "@/lib/verification-engine";
import type {
  GrowthObservation,
  OnboardingData,
  PredictionRequiredData,
} from "./types";

export * from "./types";

export const ONBOARDING_STORAGE_KEY = "grandimi:onboarding";
export const RESULT_STORAGE_KEY = "grandimi:result";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function todayIsoDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialOnboardingData(): OnboardingData {
  return {
    prediction_required: {
      modelSex: "",
      birthDate: "",
      measurementDate: todayIsoDate(),
      currentHeightCm: "",
      currentWeightKg: "",
      fatherHeightCm: "",
      motherHeightCm: "",
    },
    tracking: {
      hasPreviousMeasurement: null,
      previousHeightCm: "",
      previousMeasurementDate: "",
    },
    goal_only: {
      desiredHeightCm: "",
    },
    routine: {
      sportFrequency: "",
      sleepDuration: "",
      bedtime: "",
      wakeTime: "",
      habits: [],
    },
    maturity_context: {
      voiceChange: "",
      facialHair: "",
      underarmHair: "",
      periodStatus: "",
      periodStartedApprox: "",
      acne: "",
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mergeStoredData(value: unknown): OnboardingData {
  const initial = createInitialOnboardingData();
  if (!isRecord(value)) return initial;

  const section = <T extends keyof OnboardingData>(
    key: T,
  ): OnboardingData[T] => {
    const stored = value[key];
    return isRecord(stored) ? { ...initial[key], ...stored } : initial[key];
  };

  const routine = section("routine");
  const maturity = section("maturity_context");
  return {
    prediction_required: section("prediction_required"),
    tracking: section("tracking"),
    goal_only: section("goal_only"),
    routine: {
      ...routine,
      habits: Array.isArray(routine.habits)
        ? routine.habits.filter(
            (habit): habit is string => typeof habit === "string",
          )
        : [],
    },
    maturity_context: maturity,
  };
}

export function loadOnboardingData(): OnboardingData {
  if (typeof window === "undefined") return createInitialOnboardingData();
  try {
    const stored = window.sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    return stored
      ? mergeStoredData(JSON.parse(stored))
      : createInitialOnboardingData();
  } catch {
    return createInitialOnboardingData();
  }
}

export function saveOnboardingData(data: OnboardingData): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
}

export function clearOnboardingSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
  window.sessionStorage.removeItem(RESULT_STORAGE_KEY);
}

function normalizeNumericValue(value: string): string {
  return value.trim().replace(",", ".");
}

export function toPredictionInput(data: OnboardingData): VerificationInput {
  const required = data.prediction_required;
  return {
    modelSex: required.modelSex,
    birthDate: required.birthDate,
    measurementDate: required.measurementDate,
    currentHeightCm: normalizeNumericValue(required.currentHeightCm),
    currentWeightKg: normalizeNumericValue(required.currentWeightKg),
    fatherHeightCm: normalizeNumericValue(required.fatherHeightCm),
    motherHeightCm: normalizeNumericValue(required.motherHeightCm),
  };
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function calculateGrowthObservation(
  tracking: OnboardingData["tracking"],
  prediction: PredictionRequiredData,
): GrowthObservation | null {
  if (
    tracking.hasPreviousMeasurement !== true ||
    !tracking.previousHeightCm ||
    !tracking.previousMeasurementDate ||
    !prediction.measurementDate
  ) {
    return null;
  }

  const previousDate = parseDateOnly(tracking.previousMeasurementDate);
  const currentDate = parseDateOnly(prediction.measurementDate);
  const previousHeight = Number(
    normalizeNumericValue(tracking.previousHeightCm),
  );
  const currentHeight = Number(
    normalizeNumericValue(prediction.currentHeightCm),
  );
  if (
    !previousDate ||
    !currentDate ||
    !Number.isFinite(previousHeight) ||
    !Number.isFinite(currentHeight)
  ) {
    return null;
  }

  const daysBetween = Math.round(
    (currentDate.getTime() - previousDate.getTime()) / MS_PER_DAY,
  );
  if (daysBetween < 90) return null;

  const annualCm = ((currentHeight - previousHeight) / daysBetween) * 365.2425;
  return {
    annualCm,
    daysBetween,
    warning:
      previousHeight > currentHeight
        ? "L’ancienne mesure est supérieure à la mesure actuelle. Vérifie les dates et les conditions de mesure."
        : undefined,
  };
}

export function parseOptionalGoal(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(normalizeNumericValue(value));
  return Number.isFinite(parsed) ? parsed : null;
}
