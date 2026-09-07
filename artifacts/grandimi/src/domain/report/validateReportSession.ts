import type { VerificationResult } from "@/lib/verification-engine";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isVerificationResult(
  value: unknown,
): value is VerificationResult {
  if (!isRecord(value) || !isRecord(value.rangeCm)) return false;

  return (
    isFiniteNumber(value.centralEstimateCm) &&
    isFiniteNumber(value.centralEstimateInches) &&
    isFiniteNumber(value.rangeCm.low) &&
    isFiniteNumber(value.rangeCm.high) &&
    isFiniteNumber(value.decimalAge) &&
    isFiniteNumber(value.midParentalHeightCm) &&
    typeof value.method === "string" &&
    typeof value.methodVersion === "string" &&
    Array.isArray(value.coefficients) &&
    value.coefficients.every(
      (coefficient) =>
        isRecord(coefficient) &&
        typeof coefficient.label === "string" &&
        typeof coefficient.value === "string",
    ) &&
    isRecord(value.interpolation) &&
    isFiniteNumber(value.interpolation.lowerAge) &&
    isFiniteNumber(value.interpolation.upperAge) &&
    isFiniteNumber(value.interpolation.factor) &&
    Array.isArray(value.warnings) &&
    value.warnings.every(
      (warning) =>
        isRecord(warning) &&
        (warning.severity === "warning" || warning.severity === "info") &&
        typeof warning.message === "string",
    ) &&
    Array.isArray(value.limitations) &&
    value.limitations.every((limitation) => typeof limitation === "string")
  );
}

export function verificationResultsMatch(
  stored: VerificationResult,
  calculated: VerificationResult,
): boolean {
  const tolerance = 1e-9;
  return (
    Math.abs(stored.centralEstimateCm - calculated.centralEstimateCm) <
      tolerance &&
    Math.abs(stored.rangeCm.low - calculated.rangeCm.low) < tolerance &&
    Math.abs(stored.rangeCm.high - calculated.rangeCm.high) < tolerance &&
    Math.abs(stored.decimalAge - calculated.decimalAge) < tolerance
  );
}
