import { describe, expect, it } from "vitest";
import {
  calculateDecimalAge,
  cmToInches,
  coefficientCount,
  GrowthValidationError,
  inchesToCm,
  KHAMIS_ROCHE_COEFFICIENTS,
  kgToPounds,
  predictAdultHeight,
} from "../index";

const referenceInput = {
  sex: "male" as const,
  dateOfBirth: "2016-01-01",
  measurementDate: "2026-01-01",
  currentHeightCm: 140,
  currentWeightKg: 35,
  biologicalFatherHeightCm: 178,
  biologicalMotherHeightCm: 165,
};

describe("conversions", () => {
  it("converts centimetres and inches without intermediate rounding", () => {
    expect(cmToInches(140)).toBeCloseTo(55.1181102362, 10);
    expect(inchesToCm(cmToInches(140))).toBe(140);
  });

  it("converts kilograms and pounds", () => {
    expect(kgToPounds(35)).toBeCloseTo(77.1617917647, 10);
  });
});

describe("decimal age", () => {
  it("handles before, on and after a birthday", () => {
    expect(calculateDecimalAge("2016-06-15", "2026-06-14")).toBeCloseTo(
      9.99726,
      4,
    );
    expect(calculateDecimalAge("2016-06-15", "2026-06-15")).toBe(10);
    expect(calculateDecimalAge("2016-06-15", "2026-06-16")).toBeCloseTo(
      10.00274,
      4,
    );
  });

  it("handles a leap-day birth date", () => {
    expect(calculateDecimalAge("2012-02-29", "2016-02-29")).toBe(4);
    expect(calculateDecimalAge("2012-02-29", "2020-02-29")).toBe(8);
  });

  it("rejects invalid date order and age boundaries", () => {
    expect(() => calculateDecimalAge("2020-01-01", "2019-01-01")).toThrow();
    expect(() => calculateDecimalAge("2020-01-01", "2024-01-01")).not.toThrow();
    expect(() => calculateDecimalAge("2020-01-01", "2023-12-31")).toThrow();
    expect(() => calculateDecimalAge("2000-01-01", "2017-07-01")).not.toThrow();
    expect(() => calculateDecimalAge("2000-01-01", "2017-07-03")).toThrow();
  });
});

describe("coefficient selection and prediction", () => {
  it("uses the exact age row", () => {
    const result = predictAdultHeight(referenceInput);
    expect(result.interpolation.lowerAge).toBe(10);
    expect(result.interpolation.upperAge).toBe(10);
    expect(result.interpolation.factor).toBe(0);
    expect(result.coefficients).toEqual({
      B0: -11.038,
      B1: 0.97135,
      B2: -0.039981,
      B3: 0.45932,
    });
  });

  it("interpolates each coefficient between rows", () => {
    const result = predictAdultHeight({
      ...referenceInput,
      dateOfBirth: "2015-10-01",
      measurementDate: "2026-01-01",
    });
    expect(result.decimalAge).toBeCloseTo(10.255, 2);
    expect(result.interpolation.lowerAge).toBe(10);
    expect(result.interpolation.upperAge).toBe(10.5);
    expect(result.interpolation.factor).toBeCloseTo(0.51, 1);
  });

  it("reproduces the mandatory reference case at about 178.9 cm", () => {
    const result = predictAdultHeight(referenceInput);
    expect(result.centralHeightCm).toBeCloseTo(178.9, 1);
  });

  it("reproduces the independent female age-4 example from the secondary source", () => {
    const result = predictAdultHeight({
      sex: "female",
      dateOfBirth: "2022-01-01",
      measurementDate: "2026-01-01",
      currentHeightCm: 100,
      currentWeightKg: 16,
      biologicalMotherHeightCm: 160,
      biologicalFatherHeightCm: 175,
    });
    expect(result.centralHeightCm).toBeCloseTo(161.7, 1);
  });

  it("reproduces an independent male mid-childhood case with published rows", () => {
    const result = predictAdultHeight({
      sex: "male",
      dateOfBirth: "2015-07-01",
      measurementDate: "2026-01-01",
      currentHeightCm: 170,
      currentWeightKg: 60,
      biologicalMotherHeightCm: 168,
      biologicalFatherHeightCm: 185,
    });
    expect(result.centralHeightCm).toBeCloseTo(201.5, 1);
  });

  it("does not round intermediate values", () => {
    const result = predictAdultHeight(referenceInput);
    expect(result.centralHeightInches * 2.54).toBe(result.centralHeightCm);
    expect(result.centralHeightCm.toFixed(1)).toBe("178.9");
  });

  it("is deterministic", () => {
    expect(predictAdultHeight(referenceInput)).toEqual(
      predictAdultHeight(referenceInput),
    );
  });
});

describe("validation and coefficient table", () => {
  it("rejects missing, non-numeric, infinite, negative and out-of-range data", () => {
    const cases = [
      { currentHeightCm: undefined },
      { currentHeightCm: "not-a-number" },
      { currentHeightCm: Number.NaN },
      { currentHeightCm: Number.POSITIVE_INFINITY },
      { currentHeightCm: -1 },
      { currentHeightCm: 79 },
      { currentWeightKg: 201 },
      { biologicalFatherHeightCm: 119 },
    ];
    for (const change of cases) {
      expect(() =>
        predictAdultHeight({ ...referenceInput, ...change }),
      ).toThrow(GrowthValidationError);
    }
  });

  it("rejects a missing biological parent height", () => {
    expect(() =>
      predictAdultHeight({ ...referenceInput, biologicalMotherHeightCm: null }),
    ).toThrow(GrowthValidationError);
  });

  it("contains 56 unique age rows and 224 finite coefficients", () => {
    const rows = Object.values(KHAMIS_ROCHE_COEFFICIENTS).flat();
    expect(KHAMIS_ROCHE_COEFFICIENTS.male).toHaveLength(28);
    expect(KHAMIS_ROCHE_COEFFICIENTS.female).toHaveLength(28);
    expect(new Set(rows.map((row) => row.age)).size).toBe(28);
    expect(
      rows.flatMap((row) => [row.B0, row.B1, row.B2, row.B3]),
    ).toHaveLength(224);
    expect(coefficientCount()).toBe(224);
    expect(
      rows
        .flatMap((row) => [row.B0, row.B1, row.B2, row.B3])
        .every(Number.isFinite),
    ).toBe(true);
  });
});
