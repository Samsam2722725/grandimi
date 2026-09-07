import type { SevenDayProgram } from "./types";

export const PROGRAM_STORAGE_KEY = "grandimi:program";

export function programsMatch(
  stored: SevenDayProgram,
  expected: SevenDayProgram,
): boolean {
  return JSON.stringify(stored) === JSON.stringify(expected);
}
