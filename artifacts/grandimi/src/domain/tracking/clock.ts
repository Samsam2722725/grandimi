import type { Now } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveNow(value: Now = undefined): Date {
  const date = value instanceof Date ? value : value?.now() ?? new Date();
  if (Number.isNaN(date.getTime())) throw new RangeError("A valid clock date is required.");
  return new Date(date.getTime());
}

/** Formats a Date as the user's local civil date, rather than UTC. */
export function localCivilDate(value: Now = undefined): string {
  const date = resolveNow(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function nextCivilDate(date: string): string {
  if (!isCivilDate(date)) throw new RangeError("Invalid civil date.");
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day + 1);
  return localCivilDate(next);
}

export function timestamp(value: Now = undefined): string {
  return resolveNow(value).toISOString();
}

export function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}