import type { ProgramCategory, SevenDayProgram } from "@/domain/program";

export const PROGRAM_RUN_SCHEMA_VERSION = 1 as const;
export const PROGRAM_RUN_STORAGE_KEY = "grandimi:program-run:v1";

export type ActionStatus = "pending" | "completed" | "skipped";
export type ReplacementReasonCode =
  | "preference"
  | "accessibility"
  | "time"
  | "difficulty"
  | "other";

export interface ReplacementReason {
  code: ReplacementReasonCode;
  note?: string;
}

export interface ReplacementHistoryEntry {
  previousActionId: string;
  replacementActionId: string;
  reason: ReplacementReason;
  replacedAt: string;
}

export interface TrackedAction {
  originalActionId: string;
  currentActionId: string;
  category: ProgramCategory;
  status: ActionStatus;
  completedAt: string | null;
  skippedAt: string | null;
  replacementHistory: ReplacementHistoryEntry[];
}

export interface TrackedDay {
  dayNumber: number;
  unlockedOn: string | null;
  treatedOn: string | null;
  actions: [TrackedAction, TrackedAction, TrackedAction];
}

export interface ProgramRun {
  schemaVersion: 1;
  programId: string;
  programVersion: string;
  startedOn: string;
  currentDayNumber: number;
  lastActivityOn: string | null;
  days: [TrackedDay, TrackedDay, TrackedDay, TrackedDay, TrackedDay, TrackedDay, TrackedDay];
}

export interface Clock {
  now(): Date;
}
export type Now = Date | Clock | undefined;

export interface CategoryCompletionCounts {
  sleep: number;
  activity: number;
  nutrition: number;
}
export interface DayStats {
  dayNumber: number;
  total: number;
  completed: number;
  skipped: number;
  pending: number;
  completionRate: number;
  categoryCompletionCounts: CategoryCompletionCounts;
  treated: boolean;
}
export interface GlobalStats extends DayStats {
  daysTreated: number;
  mostConsistentCategories: ProgramCategory[];
}

export interface StoredRunMissing {
  kind: "missing";
}
export interface StoredRunValid {
  kind: "valid";
  run: ProgramRun;
}
export interface StoredRunInvalid {
  kind: "invalid";
  error: string;
}
export interface StoredRunUnavailable {
  kind: "unavailable";
  error: string;
}
export type LoadProgramRunResult =
  | StoredRunMissing
  | StoredRunValid
  | StoredRunInvalid
  | StoredRunUnavailable;

export type ProgramForTracking = SevenDayProgram;