import type {
  EngineWarning,
  VerificationResult,
} from "@/lib/verification-engine";

export type GoalPosition = "within" | "above" | "below";
export type ProfileInsightId = "sleep" | "activity" | "nutrition" | "steady";

export interface GoalComparison {
  desiredHeightCm: number;
  position: GoalPosition;
  message: string;
}

export interface GrowthHistory {
  previousHeightCm: number;
  previousMeasurementDate: string;
  totalGrowthCm: number;
  daysBetween: number;
  annualGrowthCm: number | null;
  warning?: string;
}

export interface ProfileInsight {
  id: ProfileInsightId;
  title: string;
  description: string;
}

export interface DevelopmentMarker {
  id: string;
  label: string;
  value: string;
}

export interface ReportDataPoint {
  id: string;
  label: string;
  value: string;
}

export interface GrowthReport {
  centralEstimateCm: number;
  lowEstimateCm: number;
  highEstimateCm: number;
  remainingCentralCm: number;
  remainingHighCm: number;
  goalComparison: GoalComparison | null;
  history: GrowthHistory | null;
  priorities: ProfileInsight[];
  developmentMarkers: DevelopmentMarker[];
  dataUsed: ReportDataPoint[];
  method: VerificationResult["method"];
  methodVersion: VerificationResult["methodVersion"];
  warnings: EngineWarning[];
  limitations: readonly string[];
}
