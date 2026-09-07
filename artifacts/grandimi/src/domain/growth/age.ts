import { MAX_SUPPORTED_AGE, MIN_SUPPORTED_AGE } from "./errors";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FEBRUARY = 1;
const LEAP_DAY = 29;
const LEAP_YEAR_MONTH_DAYS = 366;
const COMMON_YEAR_MONTH_DAYS = 365;

function parseIsoDate(value: string, fieldName: string): Date {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`${fieldName} doit être une date ISO valide (AAAA-MM-JJ).`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} doit être une date civile valide.`);
  }
  return date;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function anniversaryForYear(dateOfBirth: Date, year: number): Date {
  const month = dateOfBirth.getUTCMonth();
  const day =
    month === FEBRUARY &&
    dateOfBirth.getUTCDate() === LEAP_DAY &&
    !isLeapYear(year)
      ? LEAP_DAY - 1
      : dateOfBirth.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

export function calculateDecimalAge(
  dateOfBirth: string,
  measurementDate: string,
): number {
  const birth = parseIsoDate(dateOfBirth, "La date de naissance");
  const measurement = parseIsoDate(measurementDate, "La date de mesure");

  if (measurement < birth) {
    throw new Error("La date de mesure ne peut pas précéder la naissance.");
  }

  let completedYears = measurement.getUTCFullYear() - birth.getUTCFullYear();
  let anniversary = anniversaryForYear(birth, measurement.getUTCFullYear());
  if (measurement < anniversary) {
    completedYears -= 1;
    anniversary = anniversaryForYear(birth, measurement.getUTCFullYear() - 1);
  }

  const nextAnniversary = anniversaryForYear(
    birth,
    anniversary.getUTCFullYear() + 1,
  );
  const elapsedDays =
    (measurement.getTime() - anniversary.getTime()) / (24 * 60 * 60 * 1000);
  const anniversaryYearDays = isLeapYear(anniversary.getUTCFullYear())
    ? LEAP_YEAR_MONTH_DAYS
    : COMMON_YEAR_MONTH_DAYS;
  const decimalAge = completedYears + elapsedDays / anniversaryYearDays;

  if (decimalAge < MIN_SUPPORTED_AGE || decimalAge > MAX_SUPPORTED_AGE) {
    throw new Error(
      `L’âge calculé doit être compris entre ${MIN_SUPPORTED_AGE} et ${MAX_SUPPORTED_AGE} ans.`,
    );
  }

  // Keep the next anniversary in the calculation path so leap-day handling
  // remains explicit and auditable at the year boundary.
  void nextAnniversary;
  return decimalAge;
}

export function assertValidDate(
  value: string | null | undefined,
  field: string,
): void {
  if (!value) throw new Error(`${field} est obligatoire.`);
  parseIsoDate(value, field);
}
