import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAIPersonalizationContext,
  aiPersonalizationContextSchema,
  getCachedPersonalization,
  purgeStaleAIPersonalizations,
  requestAIPersonalization,
  resetAIPersonalizationForTests,
  setAIPersonalizationRequesterForTests,
  validateAIPersonalizedCopy,
} from "../personalization";
import {
  createInitialOnboardingData,
  toPredictionInput,
} from "@/domain/onboarding";
import { buildSevenDayProgram } from "@/domain/program";
import { buildGrowthReport } from "@/domain/report";
import { runVerification } from "@/lib/verification-engine";

class MemoryStorage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

const session = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  value: { sessionStorage: session },
  configurable: true,
});

function fixture(ageFive = false) {
  const data = createInitialOnboardingData();
  data.prediction_required = {
    modelSex: "male",
    birthDate: ageFive ? "2020-01-01" : "2012-01-01",
    measurementDate: "2026-01-01",
    currentHeightCm: ageFive ? "110" : "150",
    currentWeightKg: ageFive ? "18" : "42",
    fatherHeightCm: "178",
    motherHeightCm: "165",
  };
  data.routine = {
    sportFrequency: "three_four",
    sleepDuration: "eight_nine",
    bedtime: "21:30",
    wakeTime: "07:00",
    habits: ["screens", "skipped_meals", "low_water"],
  };
  data.maturity_context = {
    voiceChange: "clear",
    facialHair: "developed",
    underarmHair: "moderate",
    periodStatus: "prefer_not",
    periodStartedApprox: "2024",
    acne: "important",
  };
  const verification = runVerification(toPredictionInput(data));
  if (!verification.ok) throw new Error(verification.errors.join(", "));
  const report = buildGrowthReport(data, verification.result);
  const program = buildSevenDayProgram(data, report);
  const context = buildAIPersonalizationContext(data, report, program);
  if (!context) throw new Error("context missing");
  return { data, report, program, context };
}

function copy() {
  return {
    reportHeadline: "Une base claire pour avancer.",
    profileSummary: "Ton programme suit tes priorités actuelles.",
    keyInsight: "La régularité donne un cadre utile.",
    goalMessage: "Garde un objectif réaliste.",
    weeklyMission: "Avance avec constance chaque jour.",
    dayMessages: [1, 2, 3, 4, 5, 6, 7].map((dayNumber) => ({
      dayNumber,
      message: `Repère utile pour le jour ${dayNumber}.`,
    })),
    finalEncouragement: "Continue avec confiance.",
  };
}

beforeEach(() => {
  session.clear();
  resetAIPersonalizationForTests();
});

describe("AI personalization privacy and validation", () => {
  it("builds a valid coarse context with existing seven-day actions", () => {
    const { context, data, report, program } = fixture();
    expect(buildAIPersonalizationContext(data, report, program)).not.toBeNull();
    expect(context.programDays).toHaveLength(7);
    context.programDays.forEach((day, index) => {
      expect(day.actionIds).toEqual(
        program.days[index].actions.map((action) => action.id),
      );
      expect(day).not.toHaveProperty("actionTitles");
      expect(day.actionIds).toHaveLength(3);
    });
    expect(JSON.stringify(context)).not.toContain("actionTitles");
  });

  it("excludes dates, measurements, raw development and all exact numeric inputs", () => {
    const { context, data } = fixture();
    const serialized = JSON.stringify(context);
    expect(Object.keys(context)).not.toContain("birthDate");
    [
      data.prediction_required.birthDate,
      data.prediction_required.measurementDate,
      data.prediction_required.currentHeightCm,
      data.prediction_required.currentWeightKg,
      data.prediction_required.fatherHeightCm,
      data.prediction_required.motherHeightCm,
    ].forEach((secret) => expect(serialized).not.toContain(secret));
    [
      "voiceChange",
      "facialHair",
      "clear",
      "developed",
      "moderate",
      "2024",
    ].forEach((rawAnswer) => expect(serialized).not.toContain(rawAnswer));
  });

  it("uses the Step 4A age-aware sleep rule", () => {
    expect(fixture(true).context.sleepProfile.status).toBe("insufficient");
    expect(fixture().context.sleepProfile.status).toBe("appropriate");
  });

  it("rejects invalid strict context payloads", () => {
    const { context } = fixture();
    expect(
      aiPersonalizationContextSchema.safeParse({ ...context, extra: true })
        .success,
    ).toBe(false);
    expect(
      aiPersonalizationContextSchema.safeParse({
        ...context,
        programDays: context.programDays.slice(0, 6),
      }).success,
    ).toBe(false);
    expect(() => JSON.parse("{")).toThrow();
    expect(context.programDays.map((day) => day.dayNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("accepts only strict, safe copy with all seven days", () => {
    expect(validateAIPersonalizedCopy(copy())).not.toBeNull();
    expect(validateAIPersonalizedCopy({ ...copy(), extra: true })).toBeNull();
    expect(
      validateAIPersonalizedCopy({
        ...copy(),
        dayMessages: copy().dayMessages.slice(0, 6),
      }),
    ).toBeNull();
    expect(
      validateAIPersonalizedCopy({
        ...copy(),
        dayMessages: [
          ...copy().dayMessages.slice(0, 6),
          { dayNumber: 6, message: "Doublon." },
        ],
      }),
    ).toBeNull();
    expect(
      validateAIPersonalizedCopy({
        ...copy(),
        reportHeadline: "x".repeat(141),
      }),
    ).toBeNull();
    expect(
      validateAIPersonalizedCopy({ ...copy(), keyInsight: "C'est garanti." }),
    ).toBeNull();
    expect(
      validateAIPersonalizedCopy({ ...copy(), keyInsight: "<b>HTML</b>" }),
    ).toBeNull();
    expect(
      validateAIPersonalizedCopy({
        ...copy(),
        keyInsight: "https://example.test",
      }),
    ).toBeNull();
  });
});

describe("AI personalization orchestration", () => {
  it("uses one request for the same program and reuses a valid reload cache", async () => {
    const { context, program, report } = fixture();
    const programBefore = JSON.stringify(program);
    const reportBefore = JSON.stringify(report);
    const request = vi
      .fn()
      .mockResolvedValue({ status: "personalized", copy: copy() });
    setAIPersonalizationRequesterForTests(request);
    await requestAIPersonalization(context, program.id, program.version);
    await requestAIPersonalization(context, program.id, program.version);
    expect(request).toHaveBeenCalledTimes(1);
    expect(getCachedPersonalization(program.id, program.version)).toEqual(
      copy(),
    );
    expect(JSON.stringify(program)).toBe(programBefore);
    expect(JSON.stringify(report)).toBe(reportBefore);
    expect(copy().dayMessages.map((message) => message.dayNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("shares a concurrent request", async () => {
    const { context, program } = fixture();
    let resolve!: (value: {
      status: "personalized";
      copy: ReturnType<typeof copy>;
    }) => void;
    const request = vi.fn(
      () =>
        new Promise<
          typeof resolve extends (value: infer T) => void ? T : never
        >((done) => {
          resolve = done;
        }),
    );
    setAIPersonalizationRequesterForTests(request);
    const first = requestAIPersonalization(
      context,
      program.id,
      program.version,
    );
    const second = requestAIPersonalization(
      context,
      program.id,
      program.version,
    );
    resolve({ status: "personalized", copy: copy() });
    await expect(Promise.all([first, second])).resolves.toEqual([
      copy(),
      copy(),
    ]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("purges stale program keys and requests changed programs", async () => {
    const one = fixture();
    const two = fixture();
    two.data.routine.habits = ["low_movement"];
    const changed = buildAIPersonalizationContext(
      two.data,
      two.report,
      buildSevenDayProgram(two.data, two.report),
    )!;
    const changedProgram = buildSevenDayProgram(two.data, two.report);
    const request = vi
      .fn()
      .mockResolvedValue({ status: "personalized", copy: copy() });
    setAIPersonalizationRequesterForTests(request);
    await requestAIPersonalization(
      one.context,
      one.program.id,
      one.program.version,
    );
    purgeStaleAIPersonalizations(changedProgram.id, changedProgram.version);
    expect(
      getCachedPersonalization(one.program.id, one.program.version),
    ).toBeNull();
    await requestAIPersonalization(
      changed,
      changedProgram.id,
      changedProgram.version,
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not cache fallback failures, retries automatically once, and permits explicit retry", async () => {
    const { context, program } = fixture();
    const request = vi
      .fn()
      .mockResolvedValueOnce({ status: "fallback", copy: null })
      .mockResolvedValueOnce({ status: "personalized", copy: copy() });
    setAIPersonalizationRequesterForTests(request);
    expect(
      await requestAIPersonalization(context, program.id, program.version),
    ).toBeNull();
    expect(
      await requestAIPersonalization(context, program.id, program.version),
    ).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    await requestAIPersonalization(context, program.id, program.version, false);
    expect(request).toHaveBeenCalledTimes(2);
    expect(getCachedPersonalization(program.id, program.version)).toEqual(
      copy(),
    );
  });
});
