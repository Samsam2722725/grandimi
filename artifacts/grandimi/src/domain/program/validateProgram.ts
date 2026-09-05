import { ACTIONS_BY_ID } from "./actionCatalog";
import { PROGRAM_SOURCE_IDS } from "./sources";
import type { ProgramAction, SevenDayProgram } from "./types";

const forbidden =
  /gagne?\s+\d+\s*cm|augmente?\s+ta\s+taille|r[ée]sultat\s+garanti|fera\s+grandir|m[ée]dicament|hormone|compl[ée]ment|je[uû]ne|r[ée]gime|calorie|dose|allonger\s+les\s+os/i;
const categories = new Set(["sleep", "activity", "nutrition"]);
const times = new Set(["morning", "daytime", "evening", "anytime"]);
const difficulties = new Set(["beginner", "maintenance", "progressive"]);
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function safeText(action: ProgramAction): boolean {
  return !forbidden.test(
    [
      action.title,
      action.instruction,
      action.reason,
      action.completionCriteria,
      ...action.personalizationReasons,
    ].join(" "),
  );
}

function isAction(value: unknown): value is ProgramAction {
  if (!record(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.category === "string" &&
    typeof value.title === "string" &&
    value.title.length > 0 &&
    typeof value.instruction === "string" &&
    value.instruction.length > 0 &&
    typeof value.reason === "string" &&
    value.reason.length > 0 &&
    typeof value.durationMinutes === "number" &&
    Number.isFinite(value.durationMinutes) &&
    value.durationMinutes >= 0 &&
    typeof value.timeOfDay === "string" &&
    times.has(value.timeOfDay) &&
    typeof value.difficulty === "string" &&
    difficulties.has(value.difficulty) &&
    typeof value.completionCriteria === "string" &&
    value.completionCriteria.length > 0 &&
    Array.isArray(value.sourceIds) &&
    Array.isArray(value.alternativeActionIds) &&
    Array.isArray(value.personalizationReasons) &&
    value.personalizationReasons.every((reason) => typeof reason === "string")
  );
}

export function validateProgram(value: unknown): value is SevenDayProgram {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.createdAt !== "string" ||
    !value.createdAt ||
    typeof value.profileSummary !== "string" ||
    !value.profileSummary ||
    typeof value.primaryPriority !== "string" ||
    !["sleep", "activity", "nutrition", "steady"].includes(
      value.primaryPriority,
    ) ||
    !Array.isArray(value.secondaryPriorities) ||
    !value.secondaryPriorities.every(
      (priority) =>
        typeof priority === "string" &&
        ["sleep", "activity", "nutrition", "steady"].includes(priority),
    ) ||
    typeof value.version !== "string" ||
    !Array.isArray(value.days) ||
    value.days.length !== 7 ||
    !Array.isArray(value.sourceIds) ||
    value.sourceIds.length === 0 ||
    !value.sourceIds.every(
      (id) => typeof id === "string" && PROGRAM_SOURCE_IDS.has(id),
    )
  )
    return false;
  const programSourceIds = value.sourceIds as string[];
  const selectedIds = new Set<string>();
  const actionSourceIds = new Set<string>();
  const validDays = value.days.every((day, index) => {
    if (
      !record(day) ||
      day.dayNumber !== index + 1 ||
      typeof day.title !== "string" ||
      !day.title ||
      typeof day.focus !== "string" ||
      !day.focus ||
      !Array.isArray(day.actions) ||
      day.actions.length !== 3
    )
      return false;
    const seen = new Set<string>();
    return day.actions.every((action) => {
      if (
        !isAction(action) ||
        !categories.has(action.category) ||
        seen.has(action.category) ||
        selectedIds.has(action.id)
      )
        return false;
      seen.add(action.category);
      selectedIds.add(action.id);
      const catalogued = ACTIONS_BY_ID.get(action.id);
      if (
        !catalogued ||
        catalogued.category !== action.category ||
        !Array.isArray(action.sourceIds) ||
        action.sourceIds.length === 0 ||
        !action.sourceIds.every(
          (id) => typeof id === "string" && PROGRAM_SOURCE_IDS.has(id),
        ) ||
        !Array.isArray(action.alternativeActionIds) ||
        action.alternativeActionIds.length === 0 ||
        !action.alternativeActionIds.every((id) => {
          const alternative =
            typeof id === "string" ? ACTIONS_BY_ID.get(id) : undefined;
          return alternative?.category === action.category;
        }) ||
        !Array.isArray(action.personalizationReasons)
      )
        return false;
      action.sourceIds.forEach((id) => actionSourceIds.add(id));
      return safeText(action);
    });
  });
  return (
    validDays &&
    [...actionSourceIds].every((id) => programSourceIds.includes(id))
  );
}
