import type { SevenDayProgram } from "@/domain/program";
import { validateProgramRun } from "./core";
import { PROGRAM_RUN_STORAGE_KEY } from "./types";
import type { LoadProgramRunResult, ProgramRun } from "./types";

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
function browserStorage(): StorageLike | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}
export function loadProgramRun(program: SevenDayProgram, storage: StorageLike | null = browserStorage()): LoadProgramRunResult {
  if (!storage) return { kind: "unavailable", error: "Local storage is unavailable." };
  try {
    const raw = storage.getItem(PROGRAM_RUN_STORAGE_KEY);
    if (raw === null) return { kind: "missing" };
    let value: unknown; try { value = JSON.parse(raw); } catch { storage.removeItem(PROGRAM_RUN_STORAGE_KEY); return { kind: "invalid", error: "Saved tracking data is corrupt." }; }
    if (!validateProgramRun(value, program)) { storage.removeItem(PROGRAM_RUN_STORAGE_KEY); return { kind: "invalid", error: "Saved tracking data does not match this program." }; }
    return { kind: "valid", run: value };
  } catch (error) { return { kind: "unavailable", error: error instanceof Error ? error.message : "Local storage is unavailable." }; }
}
export function saveProgramRun(run: ProgramRun, storage: StorageLike | null = browserStorage()): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: "Local storage is unavailable." };
  try { storage.setItem(PROGRAM_RUN_STORAGE_KEY, JSON.stringify(run)); return { ok: true }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to save tracking data." }; }
}
export function removeProgramRun(storage: StorageLike | null = browserStorage()): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: "Local storage is unavailable." };
  try { storage.removeItem(PROGRAM_RUN_STORAGE_KEY); return { ok: true }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to remove tracking data." }; }
}