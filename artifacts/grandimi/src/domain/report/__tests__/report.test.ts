import { describe, expect, it } from "vitest";
import {
  createInitialOnboardingData,
  toPredictionInput,
  type OnboardingData,
} from "@/domain/onboarding";
import {
  runVerification,
  type VerificationResult,
} from "@/lib/verification-engine";
import {
  buildGrowthReport,
  buildProfileInsights,
  isVerificationResult,
  verificationResultsMatch,
} from "../index";

function fixture(sex: "male" | "female" = "male"): {
  data: OnboardingData;
  result: VerificationResult;
} {
  const data = createInitialOnboardingData();
  data.prediction_required = {
    modelSex: sex,
    birthDate: "2016-01-01",
    measurementDate: "2026-01-01",
    currentHeightCm: "140",
    currentWeightKg: "35",
    fatherHeightCm: "178",
    motherHeightCm: "165",
  };
  data.routine = {
    sportFrequency: "three_four",
    sleepDuration: "eight_nine",
    bedtime: "21:30",
    wakeTime: "07:00",
    habits: ["nothing"],
  };
  const response = runVerification(toPredictionInput(data));
  if (!response.ok) throw new Error(response.errors.join(", "));
  return { data, result: response.result };
}

describe("growth report", () => {
  it("builds the mandatory male reference report at 178.9 cm", () => {
    const { data, result } = fixture();
    expect(buildGrowthReport(data, result).centralEstimateCm).toBeCloseTo(
      178.9,
      1,
    );
  });

  it("builds a female report from the female engine branch", () => {
    const { data, result } = fixture("female");
    expect(buildGrowthReport(data, result).centralEstimateCm).toBeCloseTo(
      166.2,
      1,
    );
  });

  it("calculates central and high remaining growth", () => {
    const { data, result } = fixture();
    const report = buildGrowthReport(data, result);
    expect(report.remainingCentralCm).toBeCloseTo(
      result.centralEstimateCm - 140,
      8,
    );
    expect(report.remainingHighCm).toBeCloseTo(result.rangeCm.high - 140, 8);
  });

  it("never returns negative remaining growth", () => {
    const { data, result } = fixture();
    data.prediction_required.currentHeightCm = "220";
    expect(buildGrowthReport(data, result).remainingCentralCm).toBe(0);
    expect(buildGrowthReport(data, result).remainingHighCm).toBe(0);
  });

  it.each([
    ["178", "within"],
    ["200", "above"],
    ["150", "below"],
  ] as const)("classifies a %s cm goal as %s", (goal, position) => {
    const { data, result } = fixture();
    data.goal_only.desiredHeightCm = goal;
    expect(buildGrowthReport(data, result).goalComparison?.position).toBe(
      position,
    );
  });

  it("includes a valid previous measurement and annual speed", () => {
    const { data, result } = fixture();
    data.tracking = {
      hasPreviousMeasurement: true,
      previousHeightCm: "135",
      previousMeasurementDate: "2025-01-01",
    };
    const history = buildGrowthReport(data, result).history;
    expect(history?.totalGrowthCm).toBe(5);
    expect(history?.annualGrowthCm).toBeCloseTo(5, 1);
  });

  it("keeps history but omits annual speed below 90 days", () => {
    const { data, result } = fixture();
    data.tracking = {
      hasPreviousMeasurement: true,
      previousHeightCm: "139",
      previousMeasurementDate: "2025-12-01",
    };
    const history = buildGrowthReport(data, result).history;
    expect(history?.daysBetween).toBe(31);
    expect(history?.annualGrowthCm).toBeNull();
  });

  it.each([
    ["sleep", { sleepDuration: "under_six" as const }],
    ["activity", { sportFrequency: "none" as const }],
  ])("creates the %s priority", (id, patch) => {
    const { data } = fixture();
    data.routine = { ...data.routine, ...patch, habits: [] };
    expect(buildProfileInsights(data).map((insight) => insight.id)).toContain(
      id,
    );
  });

  it("creates the nutrition priority from meals or hydration", () => {
    const { data } = fixture();
    data.routine.habits = ["skipped_meals", "low_water"];
    expect(buildProfileInsights(data)[0]?.id).toBe("nutrition");
  });

  it("uses the regular-base profile when no difficulty is declared", () => {
    const { data } = fixture();
    expect(buildProfileInsights(data)).toHaveLength(1);
    expect(buildProfileInsights(data)[0]?.id).toBe("steady");
  });

  it("returns no more than three priorities", () => {
    const { data } = fixture();
    data.routine.sportFrequency = "none";
    data.routine.sleepDuration = "under_six";
    data.routine.habits = [
      "irregular_sleep",
      "screens",
      "low_movement",
      "skipped_meals",
      "low_water",
    ];
    expect(buildProfileInsights(data)).toHaveLength(3);
  });

  it("hides development markers when optional answers are absent", () => {
    const { data, result } = fixture();
    expect(buildGrowthReport(data, result).developmentMarkers).toEqual([]);
  });

  it("summarizes declared development markers without changing height", () => {
    const { data, result } = fixture();
    const baseline = buildGrowthReport(data, result).centralEstimateCm;
    data.maturity_context.voiceChange = "clear";
    data.maturity_context.facialHair = "developed";
    data.maturity_context.acne = "moderate";
    const report = buildGrowthReport(data, result);
    expect(report.developmentMarkers).toHaveLength(3);
    expect(report.centralEstimateCm).toBe(baseline);
  });

  it("changes priorities but never engine estimates", () => {
    const { data, result } = fixture();
    const baseline = buildGrowthReport(data, result);
    data.routine.sleepDuration = "under_six";
    data.routine.sportFrequency = "none";
    data.routine.habits = ["low_water"];
    const personalized = buildGrowthReport(data, result);
    expect(personalized.priorities.map((item) => item.id)).toEqual([
      "sleep",
      "activity",
      "nutrition",
    ]);
    expect(personalized.centralEstimateCm).toBe(baseline.centralEstimateCm);
    expect(personalized.lowEstimateCm).toBe(baseline.lowEstimateCm);
    expect(personalized.highEstimateCm).toBe(baseline.highEstimateCm);
  });

  it("changes goal comparison but never engine estimates", () => {
    const { data, result } = fixture();
    const baseline = buildGrowthReport(data, result);
    data.goal_only.desiredHeightCm = "200";
    const personalized = buildGrowthReport(data, result);
    expect(personalized.goalComparison?.position).toBe("above");
    expect(personalized.centralEstimateCm).toBe(baseline.centralEstimateCm);
  });

  it("rejects malformed stored result collections", () => {
    const { result } = fixture();
    expect(isVerificationResult(result)).toBe(true);
    expect(isVerificationResult({ ...result, limitations: null })).toBe(false);
    expect(isVerificationResult({ ...result, warnings: [{}] })).toBe(false);
  });

  it("detects a stored result that does not match recalculated inputs", () => {
    const { result } = fixture();
    expect(verificationResultsMatch(result, result)).toBe(true);
    expect(
      verificationResultsMatch(
        { ...result, centralEstimateCm: result.centralEstimateCm + 1 },
        result,
      ),
    ).toBe(false);
  });
});
