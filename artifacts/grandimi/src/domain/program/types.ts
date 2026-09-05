import type { OnboardingData } from "@/domain/onboarding";
import type { GrowthReport, ProfileInsightId } from "@/domain/report";

export type ProgramCategory = "sleep" | "activity" | "nutrition";
export type ProgramDifficulty = "beginner" | "maintenance" | "progressive";
export type ProgramTimeOfDay = "morning" | "daytime" | "evening" | "anytime";

export interface ProgramAction {
  id: string;
  category: ProgramCategory;
  title: string;
  instruction: string;
  reason: string;
  durationMinutes: number;
  timeOfDay: ProgramTimeOfDay;
  difficulty: ProgramDifficulty;
  completionCriteria: string;
  sourceIds: string[];
  alternativeActionIds: string[];
  personalizationReasons: string[];
}

export interface ProgramDay {
  dayNumber: number;
  title: string;
  focus: string;
  actions: ProgramAction[];
}

export interface SevenDayProgram {
  id: string;
  createdAt: string;
  profileSummary: string;
  primaryPriority: ProfileInsightId;
  secondaryPriorities: ProfileInsightId[];
  days: ProgramDay[];
  sourceIds: string[];
  version: string;
}

export type ProgramInput = Pick<OnboardingData, keyof OnboardingData>;
export type ProgramReport = GrowthReport;
