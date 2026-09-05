import { z } from "zod";
import { ACTIONS_BY_ID } from "@/domain/program";
import type { ProgramAction, ProgramCategory, SevenDayProgram } from "@/domain/program";
import { isCivilDate, isTimestamp, localCivilDate, nextCivilDate, timestamp } from "./clock";
import type {
  CategoryCompletionCounts, DayStats, GlobalStats, Now, ProgramRun, ReplacementReason,
  TrackedAction, TrackedDay,
} from "./types";
import { PROGRAM_RUN_SCHEMA_VERSION } from "./types";

const categories = ["sleep", "activity", "nutrition"] as const;
const reasonCodes = ["preference", "accessibility", "time", "difficulty", "other"] as const;
const rawSchema = z.object({
  schemaVersion: z.literal(1), programId: z.string().min(1), programVersion: z.string().min(1),
  startedOn: z.string(), currentDayNumber: z.number().int().min(1).max(7), lastActivityOn: z.string().nullable(),
  days: z.array(z.object({
    dayNumber: z.number().int(), unlockedOn: z.string().nullable(), treatedOn: z.string().nullable(),
    actions: z.array(z.object({
      originalActionId: z.string().min(1), currentActionId: z.string().min(1),
      category: z.enum(categories), status: z.enum(["pending", "completed", "skipped"]),
      completedAt: z.string().nullable(), skippedAt: z.string().nullable(),
      replacementHistory: z.array(z.object({
        previousActionId: z.string().min(1), replacementActionId: z.string().min(1),
        reason: z.object({ code: z.enum(reasonCodes), note: z.string().min(1).max(500).optional() }).strict(),
        replacedAt: z.string(),
      }).strict()),
    }).strict()),
  }).strict()),
}).strict();

export const ProgramRunSchema = rawSchema;

function assertProgram(program: SevenDayProgram): void {
  if (program.days.length !== 7 || program.days.some((day, index) => day.dayNumber !== index + 1 || day.actions.length !== 3))
    throw new RangeError("Tracking requires a canonical seven-day program.");
}
function actionFor(id: string): ProgramAction {
  const action = ACTIONS_BY_ID.get(id);
  if (!action) throw new RangeError(`Unknown action: ${id}`);
  return action;
}
function reachable(from: string, target: string, category: ProgramCategory): boolean {
  const seen = new Set<string>(); const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === target) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const action = actionFor(id);
    for (const alternative of action.alternativeActionIds) {
      const candidate = actionFor(alternative);
      if (candidate.category === category && !seen.has(alternative)) queue.push(alternative);
    }
  }
  return false;
}
function validateAction(action: TrackedAction, source: ProgramAction): boolean {
  if (action.originalActionId !== source.id || action.category !== source.category) return false;
  if (!actionForSafe(action.currentActionId, action.category) || !reachable(source.id, action.currentActionId, action.category)) return false;
  if (!isTimestampNullable(action.completedAt) || !isTimestampNullable(action.skippedAt)) return false;
  if ((action.status === "completed") !== (action.completedAt !== null)) return false;
  if ((action.status === "skipped") !== (action.skippedAt !== null)) return false;
  if (action.status === "pending" && (action.completedAt || action.skippedAt)) return false;
  let previous = source.id; const seen = new Set([previous]);
  for (const entry of action.replacementHistory) {
    if (!isTimestamp(entry.replacedAt) || entry.previousActionId !== previous || !actionForSafe(entry.replacementActionId, action.category)) return false;
    if (!actionFor(previous).alternativeActionIds.includes(entry.replacementActionId) || seen.has(entry.replacementActionId)) return false;
    seen.add(entry.replacementActionId); previous = entry.replacementActionId;
  }
  return previous === action.currentActionId;
}
function actionForSafe(id: string, category: ProgramCategory): ProgramAction | null {
  const action = ACTIONS_BY_ID.get(id);
  return action?.category === category ? action : null;
}
function isTimestampNullable(value: string | null): boolean { return value === null || isTimestamp(value); }

/** Validates untrusted persisted data against this exact canonical program. */
export function validateProgramRun(value: unknown, program: SevenDayProgram): value is ProgramRun {
  assertProgram(program);
  const parsed = rawSchema.safeParse(value);
  if (!parsed.success) return false;
  const run = parsed.data;
  if (run.programId !== program.id || run.programVersion !== program.version || !isCivilDate(run.startedOn) || !isTimestampNullable(run.lastActivityOn) || run.days.length !== 7) return false;
  for (let index = 0; index < 7; index += 1) {
    const day = run.days[index]; const source = program.days[index];
    if (!day || day.dayNumber !== index + 1 || day.actions.length !== 3 || !isCivilNullable(day.unlockedOn) || !isCivilNullable(day.treatedOn)) return false;
    if ((day.unlockedOn === null) !== (index >= run.currentDayNumber)) return false;
    if (day.unlockedOn && day.unlockedOn < run.startedOn) return false;
    if (day.treatedOn && (!day.unlockedOn || day.treatedOn < day.unlockedOn)) return false;
    const slots = new Set<string>();
    for (const tracked of day.actions) {
      const sourceAction = source.actions.find((item) => item.id === tracked.originalActionId);
      if (!sourceAction || slots.has(tracked.category) || !validateAction(tracked, sourceAction)) return false;
      slots.add(tracked.category);
    }
  }
  const maxUnlocked = run.days.reduce((last, day) => day.unlockedOn ? day.dayNumber : last, 0);
  return maxUnlocked === run.currentDayNumber && run.days[0].unlockedOn !== null;
}
export const parseProgramRun = validateProgramRun;

export function initializeProgramRun(program: SevenDayProgram, now?: Now): ProgramRun {
  assertProgram(program); const today = localCivilDate(now);
  return {
    schemaVersion: PROGRAM_RUN_SCHEMA_VERSION, programId: program.id, programVersion: program.version,
    startedOn: today, currentDayNumber: 1, lastActivityOn: null,
    days: program.days.map((day, index) => ({
      dayNumber: day.dayNumber, unlockedOn: index === 0 ? today : null, treatedOn: null,
      actions: day.actions.map((action) => ({
        originalActionId: action.id, currentActionId: action.id, category: action.category,
        status: "pending", completedAt: null, skippedAt: null, replacementHistory: [],
      })),
    })) as ProgramRun["days"],
  };
}
function clone(run: ProgramRun): ProgramRun { return structuredClone(run); }
function locate(run: ProgramRun, dayNumber: number, originalActionId: string): [TrackedDay, TrackedAction] {
  const day = run.days[dayNumber - 1]; const action = day?.actions.find((item) => item.originalActionId === originalActionId);
  if (!day || !action) throw new RangeError("Tracked action was not found.");
  return [day, action];
}
export function canModifyDay(run: ProgramRun, dayNumber: number, now?: Now): boolean {
  const day = run.days[dayNumber - 1];
  return Boolean(day?.unlockedOn) && dayNumber === run.currentDayNumber && day.unlockedOn! <= localCivilDate(now);
}
function modify(run: ProgramRun, dayNumber: number, id: string, now: Now, callback: (action: TrackedAction) => void): ProgramRun {
  if (!canModifyDay(run, dayNumber, now)) throw new RangeError("This day is not available to modify.");
  const copy = clone(run); const [, action] = locate(copy, dayNumber, id); callback(action);
  copy.lastActivityOn = timestamp(now); return copy;
}
export function completeAction(run: ProgramRun, dayNumber: number, originalActionId: string, now?: Now): ProgramRun {
  if (locate(run, dayNumber, originalActionId)[1].status === "completed") return run;
  return modify(run, dayNumber, originalActionId, now, (action) => { action.status = "completed"; action.completedAt = timestamp(now); action.skippedAt = null; });
}
export function undoCompletion(run: ProgramRun, dayNumber: number, originalActionId: string, now?: Now): ProgramRun {
  if (locate(run, dayNumber, originalActionId)[1].status !== "completed") return run;
  return modify(run, dayNumber, originalActionId, now, (action) => { action.status = "pending"; action.completedAt = null; });
}
export function skipAction(run: ProgramRun, dayNumber: number, originalActionId: string, now?: Now): ProgramRun {
  if (locate(run, dayNumber, originalActionId)[1].status === "skipped") return run;
  return modify(run, dayNumber, originalActionId, now, (action) => { action.status = "skipped"; action.skippedAt = timestamp(now); action.completedAt = null; });
}
export function undoSkip(run: ProgramRun, dayNumber: number, originalActionId: string, now?: Now): ProgramRun {
  if (locate(run, dayNumber, originalActionId)[1].status !== "skipped") return run;
  return modify(run, dayNumber, originalActionId, now, (action) => { action.status = "pending"; action.skippedAt = null; });
}
export function getNextReplacementCandidate(action: TrackedAction): string | null {
  const current = actionFor(action.currentActionId);
  const used = new Set([action.originalActionId, ...action.replacementHistory.map((entry) => entry.replacementActionId)]);
  return current.alternativeActionIds.find((id) => !used.has(id)) ?? current.alternativeActionIds[0] ?? null;
}
export function replaceAction(run: ProgramRun, dayNumber: number, originalActionId: string, candidateId: string, reason: ReplacementReason, now?: Now): ProgramRun {
  if (!reasonCodes.includes(reason.code) || (reason.note !== undefined && (!reason.note.trim() || reason.note.length > 500))) throw new RangeError("Invalid replacement reason.");
  const original = locate(run, dayNumber, originalActionId)[1];
  const current = actionFor(original.currentActionId); const candidate = actionForSafe(candidateId, original.category);
  if (!candidate || !current.alternativeActionIds.includes(candidateId) || candidateId === original.currentActionId || original.replacementHistory.some((entry) => entry.replacementActionId === candidateId)) throw new RangeError("Invalid replacement candidate.");
  return modify(run, dayNumber, originalActionId, now, (action) => {
    action.replacementHistory.push({ previousActionId: action.currentActionId, replacementActionId: candidateId, reason: { ...reason }, replacedAt: timestamp(now) });
    action.currentActionId = candidateId; action.status = "pending"; action.completedAt = null; action.skippedAt = null;
  });
}
export function isDayTreated(day: TrackedDay): boolean { return day.actions.every((action) => action.status !== "pending"); }
export function reconcileAvailableDay(run: ProgramRun, now?: Now): ProgramRun {
  const today = localCivilDate(now); const current = run.days[run.currentDayNumber - 1];
  if (!current || !isDayTreated(current)) return run;
  if (current.treatedOn === null) {
    const copy = clone(run);
    copy.days[copy.currentDayNumber - 1].treatedOn = today;
    return copy;
  }
  if (current.treatedOn === today || run.currentDayNumber === 7 || today < nextCivilDate(current.treatedOn)) return run;
  const copy = clone(run);
  if (today >= nextCivilDate(current.treatedOn)) {
    copy.currentDayNumber += 1; copy.days[copy.currentDayNumber - 1].unlockedOn = today;
  }
  return copy;
}
function isCivilNullable(value: string | null): boolean { return value === null || isCivilDate(value); }
function counts(actions: TrackedAction[]): CategoryCompletionCounts {
  return { sleep: actions.filter((a) => a.category === "sleep" && a.status === "completed").length, activity: actions.filter((a) => a.category === "activity" && a.status === "completed").length, nutrition: actions.filter((a) => a.category === "nutrition" && a.status === "completed").length };
}
export function getDayStats(day: TrackedDay): DayStats {
  const completed = day.actions.filter((a) => a.status === "completed").length; const skipped = day.actions.filter((a) => a.status === "skipped").length;
  return { dayNumber: day.dayNumber, total: 3, completed, skipped, pending: 3 - completed - skipped, completionRate: completed / 3, categoryCompletionCounts: counts(day.actions), treated: isDayTreated(day) };
}
export function getGlobalStats(run: ProgramRun): GlobalStats {
  const actions = run.days.flatMap((day) => day.actions); const completed = actions.filter((a) => a.status === "completed").length; const skipped = actions.filter((a) => a.status === "skipped").length; const categoryCompletionCounts = counts(actions);
  const highest = Math.max(...categories.map((category) => categoryCompletionCounts[category]));
  return { dayNumber: run.currentDayNumber, total: 21, completed, skipped, pending: 21 - completed - skipped, completionRate: completed / 21, categoryCompletionCounts, treated: run.days.every(isDayTreated), daysTreated: run.days.filter(isDayTreated).length, mostConsistentCategories: highest === 0 ? [] : categories.filter((category) => categoryCompletionCounts[category] === highest) };
}
export const getFinalStats = getGlobalStats;