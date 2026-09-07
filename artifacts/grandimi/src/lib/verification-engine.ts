import {
  GrowthValidationError,
  predictAdultHeight,
  type NumericInput,
  type Sex,
} from "@/domain/growth";

export type ModelSex = Sex;

export type VerificationInput = {
  modelSex: ModelSex | string;
  birthDate: string;
  measurementDate: string;
  currentHeightCm: NumericInput;
  currentWeightKg: NumericInput;
  fatherHeightCm: NumericInput;
  motherHeightCm: NumericInput;
};

export type EngineWarning = {
  severity: "warning" | "info";
  message: string;
};

export type VerificationResult = {
  centralEstimateCm: number;
  centralEstimateInches: number;
  rangeCm: { low: number; high: number };
  decimalAge: number;
  midParentalHeightCm: number;
  coefficients: Array<{ label: string; value: string }>;
  method: string;
  methodVersion: string;
  interpolation: {
    lowerAge: number;
    upperAge: number;
    factor: number;
  };
  warnings: EngineWarning[];
  limitations: readonly string[];
};

export type EngineResponse =
  { ok: true; result: VerificationResult } | { ok: false; errors: string[] };

export function runVerification(input: VerificationInput): EngineResponse {
  try {
    const result = predictAdultHeight({
      sex: input.modelSex,
      dateOfBirth: input.birthDate,
      measurementDate: input.measurementDate,
      currentHeightCm: input.currentHeightCm,
      currentWeightKg: input.currentWeightKg,
      biologicalFatherHeightCm: input.fatherHeightCm,
      biologicalMotherHeightCm: input.motherHeightCm,
    });

    return {
      ok: true,
      result: {
        centralEstimateCm: result.centralHeightCm,
        centralEstimateInches: result.centralHeightInches,
        rangeCm: {
          low: result.contextualRange.lowCm,
          high: result.contextualRange.highCm,
        },
        decimalAge: result.decimalAge,
        midParentalHeightCm: result.midParentalHeightCm,
        coefficients: [
          { label: "B0 · Constante", value: result.coefficients.B0.toString() },
          {
            label: "B1 · Taille actuelle",
            value: result.coefficients.B1.toString(),
          },
          {
            label: "B2 · Poids actuel",
            value: result.coefficients.B2.toString(),
          },
          {
            label: "B3 · Taille parentale",
            value: result.coefficients.B3.toString(),
          },
        ],
        method: result.method,
        methodVersion: result.methodVersion,
        interpolation: {
          lowerAge: result.interpolation.lowerAge,
          upperAge: result.interpolation.upperAge,
          factor: result.interpolation.factor,
        },
        warnings: result.warnings.map((message) => ({
          severity: "warning",
          message,
        })),
        limitations: result.scientificLimitations,
      },
    };
  } catch (error) {
    if (error instanceof GrowthValidationError) {
      return {
        ok: false,
        errors: error.issues.map((issue) => issue.message),
      };
    }
    return {
      ok: false,
      errors: [
        error instanceof Error
          ? error.message
          : "Erreur de validation inconnue.",
      ],
    };
  }
}
