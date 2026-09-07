import type { SleepDuration } from "@/domain/onboarding";

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function parseIsoDate(value: string): DateParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const monthDays = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]
    ? { year, month, day }
    : null;
}

function dayOfYear(date: DateParts): number {
  const monthDays = [
    31,
    isLeapYear(date.year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return (
    monthDays
      .slice(0, date.month - 1)
      .reduce((total, days) => total + days, 0) + date.day
  );
}

function ordinalDay(date: DateParts): number {
  let days = dayOfYear(date);
  for (let year = 0; year < date.year; year += 1) {
    days += isLeapYear(year) ? 366 : 365;
  }
  return days;
}

/** Calendar age expressed as completed years plus the current birthday-year fraction. */
export function calculateCalendarAge(
  birthDate: string,
  measurementDate: string,
): number | null {
  const birth = parseIsoDate(birthDate);
  const measured = parseIsoDate(measurementDate);
  if (!birth || !measured || measurementDate < birthDate) return null;
  let completedYears = measured.year - birth.year;
  const birthdayPassed =
    measured.month > birth.month ||
    (measured.month === birth.month && measured.day >= birth.day);
  if (!birthdayPassed) completedYears -= 1;
  const anniversaryYear = birth.year + completedYears;
  const anniversary = { ...birth, year: anniversaryYear };
  const nextAnniversary = { ...birth, year: anniversaryYear + 1 };
  const elapsed = ordinalDay(measured) - ordinalDay(anniversary);
  const span = ordinalDay(nextAnniversary) - ordinalDay(anniversary);
  return completedYears + elapsed / span;
}

export function sleepGuidanceForAge(age: number | null): string {
  if (age !== null && age >= 3 && age < 6) return "10 à 13 heures";
  if (age !== null && age >= 6 && age < 13) return "9 à 12 heures";
  return "8 à 10 heures";
}

export function isSleepInsufficientForAge(
  age: number | null,
  duration: SleepDuration | "",
): boolean {
  if (age === null || !duration) return false;
  if (age < 6) return duration !== "over_nine";
  if (age < 13) return duration !== "over_nine";
  return ["under_six", "six_seven", "seven_eight"].includes(duration);
}
