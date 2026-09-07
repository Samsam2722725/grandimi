import { describe, expect, it } from "vitest";
import { ACTION_TITLES } from "@workspace/grandimi-ai-contract";
import {
  createInitialOnboardingData,
  toPredictionInput,
  type OnboardingData,
} from "@/domain/onboarding";
import { buildGrowthReport } from "@/domain/report";
import { runVerification } from "@/lib/verification-engine";
import {
  ACTIONS_BY_ID,
  ACTION_CATALOG,
  buildSevenDayProgram,
  calculateCalendarAge,
  programsMatch,
  sleepGuidanceForAge,
  validateProgram,
} from "../index";

it("keeps the trusted AI action-title map exactly aligned with the local catalog", () => {
  expect(Object.isFrozen(ACTION_TITLES)).toBe(true);
  expect(Object.keys(ACTION_TITLES)).toHaveLength(30);
  expect(ACTION_CATALOG).toHaveLength(30);
  expect(
    Object.fromEntries(
      ACTION_CATALOG.map((action) => [action.id, action.title]),
    ),
  ).toEqual(ACTION_TITLES);
});

function fixture(): {
  data: OnboardingData;
  report: ReturnType<typeof buildGrowthReport>;
} {
  const data = createInitialOnboardingData();
  data.prediction_required = {
    modelSex: "male",
    birthDate: "2012-01-01",
    measurementDate: "2026-01-01",
    currentHeightCm: "150",
    currentWeightKg: "42",
    fatherHeightCm: "178",
    motherHeightCm: "165",
  };
  data.routine = {
    sportFrequency: "three_four",
    sleepDuration: "eight_nine",
    bedtime: "21:30",
    wakeTime: "07:00",
    habits: [],
  };
  const result = runVerification(toPredictionInput(data));
  if (!result.ok) throw new Error(result.errors.join(", "));
  return { data, report: buildGrowthReport(data, result.result) };
}

function reportWith(data: OnboardingData) {
  const result = runVerification(toPredictionInput(data));
  if (!result.ok) throw new Error(result.errors.join(", "));
  return buildGrowthReport(data, result.result);
}

describe("seven-day program structure and determinism", () => {
  it("has exactly seven days, three actions each, and one action per category", () => {
    const { data, report } = fixture();
    const program = buildSevenDayProgram(data, report);
    expect(program.days).toHaveLength(7);
    program.days.forEach((day) => {
      expect(day.actions).toHaveLength(3);
      expect(day.actions.map((action) => action.category).sort()).toEqual([
        "activity",
        "nutrition",
        "sleep",
      ]);
    });
  });

  it("is byte-for-byte stable for identical inputs and has no repeated daily triple", () => {
    const { data, report } = fixture();
    const program = buildSevenDayProgram(data, report);
    expect(JSON.stringify(buildSevenDayProgram(data, report))).toBe(
      JSON.stringify(program),
    );
    const triples = program.days.map((day) =>
      day.actions.map((action) => action.id).join("|"),
    );
    expect(new Set(triples).size).toBe(7);
  });

  it("uses a complete stable input fingerprint, including a non-routine answer and report priorities", () => {
    const { data, report } = fixture();
    const baseline = buildSevenDayProgram(data, report);
    const changedAnswer = buildSevenDayProgram(
      { ...data, goal_only: { desiredHeightCm: "185" } },
      report,
    );
    const changedPriority = buildSevenDayProgram(data, {
      ...report,
      priorities: [{ id: "sleep", title: "", description: "" }],
    });
    const changedRoutine = buildSevenDayProgram(
      { ...data, routine: { ...data.routine, sportFrequency: "none" } },
      report,
    );
    expect(changedAnswer.id).not.toBe(baseline.id);
    expect(changedPriority.id).not.toBe(baseline.id);
    expect(changedRoutine.id).not.toBe(baseline.id);
    expect(changedRoutine.days).not.toEqual(baseline.days);
  });
});

describe("calendar age and personalisation", () => {
  it("calculates exact calendar age across birthdays and selects all sleep guidance bands", () => {
    expect(calculateCalendarAge("2012-06-10", "2025-06-09")).toBeCloseTo(
      12 + 364 / 365,
      8,
    );
    expect(calculateCalendarAge("2012-06-10", "2025-06-10")).toBe(13);
    expect(
      sleepGuidanceForAge(calculateCalendarAge("2021-06-10", "2025-06-10")),
    ).toBe("10 à 13 heures");
    expect(
      sleepGuidanceForAge(calculateCalendarAge("2016-06-10", "2025-06-10")),
    ).toBe("9 à 12 heures");
    expect(
      sleepGuidanceForAge(calculateCalendarAge("2010-06-10", "2025-06-10")),
    ).toBe("8 à 10 heures");
  });

  it("prioritises short sleep and uses the age guidance", () => {
    const { data } = fixture();
    data.routine.sleepDuration = "under_six";
    const program = buildSevenDayProgram(data, reportWith(data));
    expect(program.primaryPriority).toBe("sleep");
    expect(program.profileSummary).toContain("8 à 10 heures");
  });

  it("uses age-aware sleep priority for a young child", () => {
    const { data } = fixture();
    data.prediction_required.birthDate = "2021-01-01";
    data.prediction_required.measurementDate = "2026-01-01";
    data.routine.sleepDuration = "eight_nine";
    const program = buildSevenDayProgram(data, reportWith(data));
    expect(program.primaryPriority).toBe("sleep");
    expect(program.profileSummary).toContain("10 à 13 heures");
    expect(
      program.days[0].actions
        .find((action) => action.category === "sleep")
        ?.personalizationReasons.join(" "),
    ).toContain("inférieure");
  });

  it("starts inactive profiles gently, and uses recovery rather than automatic overload for five-plus", () => {
    const { data } = fixture();
    data.routine.sportFrequency = "none";
    const inactive = buildSevenDayProgram(data, reportWith(data));
    expect(
      inactive.days[0].actions.find((action) => action.category === "activity")
        ?.difficulty,
    ).toBe("beginner");
    data.routine.sportFrequency = "five_plus";
    const frequent = buildSevenDayProgram(data, reportWith(data));
    expect(
      frequent.days
        .flatMap((day) => day.actions)
        .some((action) => action.title === "Récupération active"),
    ).toBe(true);
  });

  it("adapts skipped meals and low water, while regular profiles receive maintenance", () => {
    const { data } = fixture();
    data.routine.habits = ["skipped_meals", "low_water"];
    const nutrition = buildSevenDayProgram(data, reportWith(data));
    expect(nutrition.primaryPriority).toBe("nutrition");
    expect(
      nutrition.days
        .flatMap((day) => day.actions)
        .some((action) =>
          action.personalizationReasons.join(" ").includes("repas"),
        ),
    ).toBe(true);
    expect(
      nutrition.days
        .flatMap((day) => day.actions)
        .some((action) => action.title === "Eau accessible"),
    ).toBe(true);
    data.routine.habits = [];
    const steady = buildSevenDayProgram(data, reportWith(data));
    expect(steady.primaryPriority).toBe("steady");
    expect(steady.profileSummary).toContain("base régulière");
  });
});

describe("catalogue safety and validation", () => {
  it("contains at least ten actions per category and multiple difficulties", () => {
    ["sleep", "activity", "nutrition"].forEach((category) => {
      const actions = ACTION_CATALOG.filter(
        (action) => action.category === category,
      );
      expect(actions.length).toBeGreaterThanOrEqual(10);
      expect(
        new Set(actions.map((action) => action.difficulty)).size,
      ).toBeGreaterThan(1);
    });
  });

  it("uses valid sources and category-compatible alternatives, with no prohibited phrasing", () => {
    const prohibited =
      /gagne?\s+\d+\s*cm|augmente?\s+ta\s+taille|r[ée]sultat\s+garanti|fera\s+grandir|m[ée]dicament|hormone|compl[ée]ment|je[uû]ne|r[ée]gime|calorie|dose|allonger\s+les\s+os/i;
    ACTION_CATALOG.forEach((action) => {
      expect(action.sourceIds.length).toBeGreaterThan(0);
      expect(prohibited.test(JSON.stringify(action))).toBe(false);
      action.alternativeActionIds.forEach((id) =>
        expect(ACTIONS_BY_ID.get(id)?.category).toBe(action.category),
      );
    });
  });

  it("validates source coverage and rejects malformed, unsafe, duplicate, and incompatible actions", () => {
    const { data, report } = fixture();
    const program = buildSevenDayProgram(data, report);
    expect(validateProgram(program)).toBe(true);
    const missingCoverage = structuredClone(program);
    missingCoverage.sourceIds = [];
    expect(validateProgram(missingCoverage)).toBe(false);
    const unsafe = structuredClone(program);
    unsafe.days[0].actions[0].instruction =
      "Résultat garanti : augmente ta taille.";
    expect(validateProgram(unsafe)).toBe(false);
    const duplicate = structuredClone(program);
    duplicate.days[1].actions[0].id = duplicate.days[0].actions[0].id;
    expect(validateProgram(duplicate)).toBe(false);
    const incompatible = structuredClone(program);
    incompatible.days[0].actions[0].alternativeActionIds = ["nutrition-1"];
    expect(validateProgram(incompatible)).toBe(false);
  });

  it("rejects a structurally valid program altered after generation", () => {
    const { data, report } = fixture();
    const expected = buildSevenDayProgram(data, report);
    const altered = structuredClone(expected);
    altered.days[0].actions[0].instruction =
      "Choisis une autre routine calme ce soir.";
    expect(validateProgram(altered)).toBe(true);
    expect(programsMatch(altered, expected)).toBe(false);
    expect(programsMatch(expected, expected)).toBe(true);
  });
});

describe("growth result isolation and pure execution", () => {
  it("does not modify the Khamis–Roche report estimates", () => {
    const { data, report } = fixture();
    const before = {
      central: report.centralEstimateCm,
      low: report.lowEstimateCm,
      high: report.highEstimateCm,
    };
    buildSevenDayProgram(data, report);
    expect([
      report.centralEstimateCm,
      report.lowEstimateCm,
      report.highEstimateCm,
    ]).toEqual([before.central, before.low, before.high]);
  });

  it("has no runtime network, storage, randomness, or clock dependency", () => {
    const source = buildSevenDayProgram.toString();
    expect(source).not.toMatch(
      /fetch|XMLHttpRequest|sessionStorage|localStorage|Math\.random|new Date|Date\./,
    );
  });
});
