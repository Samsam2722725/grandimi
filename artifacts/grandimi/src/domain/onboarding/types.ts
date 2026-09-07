import type { ModelSex, VerificationInput } from "@/lib/verification-engine";

export type OnboardingStepCategory =
  | "prediction_required"
  | "tracking"
  | "goal_only"
  | "routine"
  | "maturity_context";

export type SportFrequency = "none" | "one_two" | "three_four" | "five_plus";
export type SleepDuration =
  "under_six" | "six_seven" | "seven_eight" | "eight_nine" | "over_nine";
export type VoiceChange = "not_yet" | "starting" | "clear" | "unknown";
export type HairGrowth =
  "none" | "light" | "developed" | "moderate" | "prefer_not";
export type AcneLevel =
  "none" | "light" | "moderate" | "important" | "prefer_not";
export type PeriodStatus = "no" | "yes" | "prefer_not";

export interface PredictionRequiredData {
  modelSex: ModelSex | "";
  birthDate: string;
  measurementDate: string;
  currentHeightCm: string;
  currentWeightKg: string;
  fatherHeightCm: string;
  motherHeightCm: string;
}

export interface TrackingData {
  hasPreviousMeasurement: boolean | null;
  previousHeightCm: string;
  previousMeasurementDate: string;
}

export interface GoalOnlyData {
  desiredHeightCm: string;
}

export interface RoutineData {
  sportFrequency: SportFrequency | "";
  sleepDuration: SleepDuration | "";
  bedtime: string;
  wakeTime: string;
  habits: string[];
}

export interface MaturityContextData {
  voiceChange: VoiceChange | "";
  facialHair: HairGrowth | "";
  underarmHair: HairGrowth | "";
  periodStatus: PeriodStatus | "";
  periodStartedApprox: string;
  acne: AcneLevel | "";
}

export interface OnboardingData {
  prediction_required: PredictionRequiredData;
  tracking: TrackingData;
  goal_only: GoalOnlyData;
  routine: RoutineData;
  maturity_context: MaturityContextData;
}

export type OnboardingSection = keyof OnboardingData;

export interface GrowthObservation {
  annualCm: number;
  daysBetween: number;
  warning?: string;
}

export interface OnboardingSnapshot {
  data: OnboardingData;
  predictionInput: VerificationInput;
}
