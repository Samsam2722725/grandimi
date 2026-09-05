import { describe, expect, it } from "vitest";
import {
  calculateGrowthObservation,
  createInitialOnboardingData,
  parseOptionalGoal,
  toPredictionInput,
} from "../index";

describe("onboarding data projection", () => {
  it("projects only the seven prediction fields and normalizes commas", () => {
    const data = createInitialOnboardingData();
    data.prediction_required = {
      modelSex: "male",
      birthDate: "2016-01-01",
      measurementDate: "2026-01-01",
      currentHeightCm: "170,5",
      currentWeightKg: "60,2",
      fatherHeightCm: "180",
      motherHeightCm: "165",
    };
    data.goal_only.desiredHeightCm = "190";
    data.routine.sleepDuration = "under_six";
    data.maturity_context.voiceChange = "clear";

    expect(toPredictionInput(data)).toEqual({
      modelSex: "male",
      birthDate: "2016-01-01",
      measurementDate: "2026-01-01",
      currentHeightCm: "170.5",
      currentWeightKg: "60.2",
      fatherHeightCm: "180",
      motherHeightCm: "165",
    });
  });

  it("does not compute growth speed before 90 days", () => {
    const data = createInitialOnboardingData();
    data.prediction_required.currentHeightCm = "150";
    data.prediction_required.measurementDate = "2026-03-01";
    data.tracking = {
      hasPreviousMeasurement: true,
      previousHeightCm: "145",
      previousMeasurementDate: "2026-01-01",
    };
    expect(
      calculateGrowthObservation(data.tracking, data.prediction_required),
    ).toBeNull();
  });

  it("calculates annual observed growth without changing prediction data", () => {
    const data = createInitialOnboardingData();
    data.prediction_required.currentHeightCm = "155";
    data.prediction_required.measurementDate = "2026-07-01";
    data.tracking = {
      hasPreviousMeasurement: true,
      previousHeightCm: "150",
      previousMeasurementDate: "2025-07-01",
    };
    const observation = calculateGrowthObservation(
      data.tracking,
      data.prediction_required,
    );
    expect(observation?.annualCm).toBeCloseTo(5, 1);
  });

  it("keeps an optional goal absent when blank", () => {
    expect(parseOptionalGoal("")).toBeNull();
    expect(parseOptionalGoal("178,5")).toBe(178.5);
  });
});
