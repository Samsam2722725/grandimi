export type Sex = "male" | "female";

export type NumericInput = number | string | null | undefined;
export type SexInput = Sex | string | null | undefined;

export interface Coefficients {
  B0: number;
  B1: number;
  B2: number;
  B3: number;
}

export interface CoefficientRow extends Coefficients {
  age: number;
}

export interface InterpolationDetails {
  lowerAge: number;
  upperAge: number;
  factor: number;
  lowerCoefficients: Coefficients;
  upperCoefficients: Coefficients;
}

export interface PredictionInput {
  sex: SexInput;
  dateOfBirth: string | null | undefined;
  measurementDate: string | null | undefined;
  currentHeightCm: NumericInput;
  currentWeightKg: NumericInput;
  biologicalFatherHeightCm: NumericInput;
  biologicalMotherHeightCm: NumericInput;
}

export interface ContextualRange {
  lowCm: number;
  highCm: number;
  errorMarginCm: number;
  basis: string;
}

export interface PredictionResult {
  centralHeightCm: number;
  centralHeightInches: number;
  decimalAge: number;
  midParentalHeightCm: number;
  midParentalHeightInches: number;
  method: "Khamis–Roche";
  methodVersion: "1994, corrected by 1995 erratum";
  coefficients: Coefficients;
  interpolation: InterpolationDetails;
  contextualRange: ContextualRange;
  warnings: readonly string[];
  scientificLimitations: readonly string[];
}

export interface ValidationIssue {
  field: string;
  code:
    | "missing"
    | "invalid_date"
    | "not_numeric"
    | "not_finite"
    | "negative"
    | "out_of_range"
    | "invalid_sex"
    | "date_order"
    | "age_out_of_range";
  message: string;
}
