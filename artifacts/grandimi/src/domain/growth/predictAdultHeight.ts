import { calculateDecimalAge, assertValidDate } from "./age";
import {
  GrowthValidationError,
  INPUT_LIMITS,
  MAX_SUPPORTED_AGE,
  MIN_SUPPORTED_AGE,
  SCIENTIFIC_LIMITATIONS,
  WARNING_MESSAGES,
} from "./errors";
import { cmToInches, inchesToCm, kgToPounds } from "./conversions";
import { KHAMIS_ROCHE_COEFFICIENTS } from "./khamisRocheCoefficients";
import type {
  Coefficients,
  CoefficientRow,
  NumericInput,
  PredictionInput,
  PredictionResult,
  Sex,
  ValidationIssue,
} from "./types";

const HALF_YEAR = 0.5;
const MALE_ERROR_MARGIN_CM = 5.34;
const FEMALE_ERROR_MARGIN_CM = 4.25;
const COEFFICIENT_KEYS: (keyof Coefficients)[] = ["B0", "B1", "B2", "B3"];

function numericValue(
  value: NumericInput,
  field: string,
  min: number,
  max: number,
  issues: ValidationIssue[],
): number | undefined {
  if (value === null || value === undefined || value === "") {
    issues.push({
      field,
      code: "missing",
      message: `${field} est obligatoire.`,
    });
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (typeof value === "string" && value.trim() === "") {
    issues.push({
      field,
      code: "missing",
      message: `${field} est obligatoire.`,
    });
    return undefined;
  }
  if (Number.isNaN(parsed)) {
    issues.push({
      field,
      code: "not_numeric",
      message: `${field} doit être numérique.`,
    });
    return undefined;
  }
  if (!Number.isFinite(parsed)) {
    issues.push({
      field,
      code: "not_finite",
      message: `${field} doit être une valeur finie.`,
    });
    return undefined;
  }
  if (parsed < 0) {
    issues.push({
      field,
      code: "negative",
      message: `${field} ne peut pas être négatif.`,
    });
    return undefined;
  }
  if (parsed < min || parsed > max) {
    issues.push({
      field,
      code: "out_of_range",
      message: `${field} doit être compris entre ${min} et ${max}.`,
    });
    return undefined;
  }
  return parsed;
}

function validateSex(
  value: PredictionInput["sex"],
  issues: ValidationIssue[],
): Sex | undefined {
  if (value === null || value === undefined || value === "") {
    issues.push({
      field: "sex",
      code: "missing",
      message: "Le sexe utilisé par le modèle est obligatoire.",
    });
    return undefined;
  }
  if (value !== "male" && value !== "female") {
    issues.push({
      field: "sex",
      code: "invalid_sex",
      message: "Le sexe doit être male ou female.",
    });
    return undefined;
  }
  return value;
}

function interpolateRows(rows: readonly CoefficientRow[], age: number) {
  const exactRow = rows.find((row) => Math.abs(row.age - age) < Number.EPSILON);
  if (exactRow) {
    return {
      lowerAge: exactRow.age,
      upperAge: exactRow.age,
      factor: 0,
      lowerCoefficients: exactRow,
      upperCoefficients: exactRow,
      coefficients: {
        B0: exactRow.B0,
        B1: exactRow.B1,
        B2: exactRow.B2,
        B3: exactRow.B3,
      },
    };
  }

  const lower = rows.find((row, index) => {
    const upper = rows[index + 1];
    return upper !== undefined && row.age < age && age < upper.age;
  });
  if (!lower) {
    throw new Error("Aucune ligne de coefficients ne couvre cet âge.");
  }
  const upper = rows[rows.indexOf(lower) + 1];
  if (!upper) throw new Error("Ligne supérieure de coefficients introuvable.");
  const factor = (age - lower.age) / (upper.age - lower.age);
  const coefficients = (key: keyof Coefficients) =>
    lower[key] + (upper[key] - lower[key]) * factor;
  return {
    lowerAge: lower.age,
    upperAge: upper.age,
    factor,
    lowerCoefficients: lower,
    upperCoefficients: upper,
    coefficients: {
      B0: coefficients("B0"),
      B1: coefficients("B1"),
      B2: coefficients("B2"),
      B3: coefficients("B3"),
    },
  };
}

function getCoefficients(
  rows: readonly CoefficientRow[],
  age: number,
): {
  coefficients: Coefficients;
  interpolation: ReturnType<typeof interpolateRows>;
} {
  const interpolation = interpolateRows(rows, age);
  return { coefficients: interpolation.coefficients, interpolation };
}

export function predictAdultHeight(input: PredictionInput): PredictionResult {
  const issues: ValidationIssue[] = [];
  const sex = validateSex(input.sex, issues);

  try {
    assertValidDate(input.dateOfBirth, "La date de naissance");
    assertValidDate(input.measurementDate, "La date de mesure");
  } catch (error) {
    issues.push({
      field: "date",
      code: "invalid_date",
      message: error instanceof Error ? error.message : "Date invalide.",
    });
  }

  const currentHeightCm = numericValue(
    input.currentHeightCm,
    "La taille actuelle",
    INPUT_LIMITS.currentHeightCm.min,
    INPUT_LIMITS.currentHeightCm.max,
    issues,
  );
  const currentWeightKg = numericValue(
    input.currentWeightKg,
    "Le poids actuel",
    INPUT_LIMITS.currentWeightKg.min,
    INPUT_LIMITS.currentWeightKg.max,
    issues,
  );
  const fatherHeightCm = numericValue(
    input.biologicalFatherHeightCm,
    "La taille du père biologique",
    INPUT_LIMITS.parentHeightCm.min,
    INPUT_LIMITS.parentHeightCm.max,
    issues,
  );
  const motherHeightCm = numericValue(
    input.biologicalMotherHeightCm,
    "La taille de la mère biologique",
    INPUT_LIMITS.parentHeightCm.min,
    INPUT_LIMITS.parentHeightCm.max,
    issues,
  );

  if (issues.length > 0) {
    throw new GrowthValidationError(
      "Les données de calcul sont invalides.",
      issues,
    );
  }

  const dateOfBirth = input.dateOfBirth as string;
  const measurementDate = input.measurementDate as string;
  let decimalAge: number;
  try {
    decimalAge = calculateDecimalAge(dateOfBirth, measurementDate);
  } catch (error) {
    throw new GrowthValidationError("L’âge calculé est invalide.", [
      {
        field: "date",
        code: "age_out_of_range",
        message: error instanceof Error ? error.message : "Âge invalide.",
      },
    ]);
  }
  if (decimalAge < MIN_SUPPORTED_AGE || decimalAge > MAX_SUPPORTED_AGE) {
    throw new GrowthValidationError("L’âge est hors de la plage supportée.", [
      {
        field: "date",
        code: "age_out_of_range",
        message: `L’âge doit être compris entre ${MIN_SUPPORTED_AGE} et ${MAX_SUPPORTED_AGE} ans.`,
      },
    ]);
  }

  const resolvedSex = sex as Sex;
  const { coefficients, interpolation } = getCoefficients(
    KHAMIS_ROCHE_COEFFICIENTS[resolvedSex],
    decimalAge,
  );
  const currentHeightInches = cmToInches(currentHeightCm as number);
  const currentWeightPounds = kgToPounds(currentWeightKg as number);
  const midParentalHeightCm =
    ((fatherHeightCm as number) + (motherHeightCm as number)) / 2;
  const midParentalHeightInches = cmToInches(midParentalHeightCm);
  const centralHeightInches =
    coefficients.B0 +
    coefficients.B1 * currentHeightInches +
    coefficients.B2 * currentWeightPounds +
    coefficients.B3 * midParentalHeightInches;
  const centralHeightCm = inchesToCm(centralHeightInches);
  const errorMarginCm =
    resolvedSex === "male" ? MALE_ERROR_MARGIN_CM : FEMALE_ERROR_MARGIN_CM;

  // Preserve full precision internally. Display rounding belongs to the UI.
  return {
    centralHeightCm,
    centralHeightInches,
    decimalAge,
    midParentalHeightCm,
    midParentalHeightInches,
    method: "Khamis–Roche",
    methodVersion: "1994, corrected by 1995 erratum",
    coefficients,
    interpolation,
    contextualRange: {
      lowCm: centralHeightCm - errorMarginCm,
      highCm: centralHeightCm + errorMarginCm,
      errorMarginCm,
      basis:
        "Fourchette contextuelle fondée sur l’erreur moyenne observée dans l’échantillon original.",
    },
    warnings: WARNING_MESSAGES,
    scientificLimitations: SCIENTIFIC_LIMITATIONS,
  };
}

export function coefficientCount(): number {
  return Object.values(KHAMIS_ROCHE_COEFFICIENTS)
    .flat()
    .reduce((count) => count + COEFFICIENT_KEYS.length, 0);
}
