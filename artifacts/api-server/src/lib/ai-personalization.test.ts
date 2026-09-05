import { describe, expect, it } from "vitest";
import {
  AIPersonalizationContextSchema,
  AIPersonalizedCopySchema,
  createPersonalizationService,
  type AIPersonalizationContext,
  type AIPersonalizedCopy,
  type OpenAIResponsesClient,
} from "./ai-personalization";

const context: AIPersonalizationContext = {
  ageGroup: "13-17 ans",
  sex: "prefer_not",
  goalPosition: "within_range",
  sleepProfile: {
    status: "appropriate",
    screensAtNight: false,
    irregularSchedule: false,
  },
  activityProfile: { level: "regular", recoveryNeeded: false },
  nutritionProfile: { skipsMeals: false, hydrationIssue: false },
  developmentSummary: null,
  primaryPriority: "Régularité",
  secondaryPriorities: ["Sommeil"],
  programDays: Array.from({ length: 7 }, (_, index) => ({
    dayNumber: index + 1,
    actionIds: ["sleep-1", "activity-1", "nutrition-1"],
  })),
};

const copy: AIPersonalizedCopy = {
  reportHeadline: "Un cap clair pour ta semaine",
  profileSummary:
    "Ton profil montre une base utile sur laquelle construire une routine régulière.",
  keyInsight: "La régularité peut rendre tes journées plus faciles à suivre.",
  goalMessage:
    "Ton objectif reste cohérent avec le cadre affiché par Grandimi.",
  weeklyMission: "Reste présent à chaque rendez-vous de la semaine.",
  dayMessages: Array.from({ length: 7 }, (_, index) => ({
    dayNumber: index + 1,
    message: `Départ calme : avance avec calme et régularité.`,
  })),
  finalEncouragement:
    "Chaque journée suivie construit une routine plus solide.",
};

function clientWith(output: unknown): OpenAIResponsesClient {
  return {
    responses: {
      parse: async () => ({ output_parsed: output }),
    },
  };
}

describe("AI personalization safety boundary", () => {
  it("accepts only the privacy-safe request shape and exactly seven days", () => {
    expect(AIPersonalizationContextSchema.safeParse(context).success).toBe(
      true,
    );
    expect(
      AIPersonalizationContextSchema.safeParse({
        ...context,
        birthDate: "2010-01-01",
      }).success,
    ).toBe(false);
    expect(
      AIPersonalizationContextSchema.safeParse({
        ...context,
        programDays: context.programDays.slice(0, 6),
      }).success,
    ).toBe(false);
    expect(
      AIPersonalizationContextSchema.safeParse({
        ...context,
        programDays: context.programDays.map((day, index) =>
          index === 0
            ? { ...day, actionIds: ["sleep-1", "sleep-2", "nutrition-1"] }
            : day,
        ),
      }).success,
    ).toBe(false);
    expect(
      AIPersonalizationContextSchema.safeParse({
        ...context,
        programDays: context.programDays.map((day) => ({
          ...day,
          actionTitles: ["forged", "forged", "forged"],
        })),
      }).success,
    ).toBe(false);
    expect(
      AIPersonalizationContextSchema.safeParse({
        ...context,
        programDays: context.programDays.map((day) => ({
          ...day,
          actionIds: ["sleep-1", "activity-1", "nutrition-11"],
        })),
      }).success,
    ).toBe(false);
  });

  it("requires a strict, complete seven-day copy response", () => {
    expect(AIPersonalizedCopySchema.safeParse(copy).success).toBe(true);
    expect(
      AIPersonalizedCopySchema.safeParse({ ...copy, extra: true }).success,
    ).toBe(false);
    expect(
      AIPersonalizedCopySchema.safeParse({
        ...copy,
        dayMessages: copy.dayMessages.slice(0, 6),
      }).success,
    ).toBe(false);
    expect(
      AIPersonalizedCopySchema.safeParse({
        ...copy,
        dayMessages: [
          ...copy.dayMessages.slice(0, 6),
          { dayNumber: 6, message: "Doublon" },
        ],
      }).success,
    ).toBe(false);
    expect(
      AIPersonalizedCopySchema.safeParse({
        ...copy,
        reportHeadline: "x".repeat(141),
      }).success,
    ).toBe(false);
  });

  it("returns personalized copy only for a valid, safe structured response", async () => {
    const service = createPersonalizationService({
      client: clientWith(copy),
      available: true,
      model: "test",
    });
    await expect(service.personalize(context)).resolves.toEqual({
      status: "personalized",
      copy,
    });
  });

  it.each([
    ["invalid structured JSON", undefined],
    ["additional output fields", { ...copy, unexpected: "field" }],
    ["forbidden guarantee", { ...copy, keyInsight: "C'est garanti." }],
    ["medical content", { ...copy, keyInsight: "Demande un traitement." }],
    ["markdown", { ...copy, keyInsight: "**Texte**" }],
  ])("uses deterministic fallback for %s", async (_name, output) => {
    const service = createPersonalizationService({
      client: clientWith(output),
      available: true,
      model: "test",
    });
    await expect(service.personalize(context)).resolves.toEqual({
      status: "fallback",
      copy: null,
    });
  });

  it("rejects a daily message that invents an imperative action", async () => {
    const output = structuredClone(copy);
    output.dayMessages[0].message =
      "Fais une course supplémentaire pour compléter cette journée.";
    const service = createPersonalizationService({
      client: clientWith(output),
      available: true,
      model: "test",
    });
    await expect(service.personalize(context)).resolves.toEqual({
      status: "fallback",
      copy: null,
    });
  });

  it("rejects a daily message grounded only in another day's title", async () => {
    const output = structuredClone(copy);
    output.dayMessages[0].message =
      "Titre d'un autre jour : avance avec calme.";
    await expect(
      createPersonalizationService({
        client: clientWith(output),
        available: true,
        model: "test",
      }).personalize(context),
    ).resolves.toEqual({ status: "fallback", copy: null });
  });

  it.each([
    "Départ calme; va nager ensuite.",
    "Départ calme : une course de vingt minutes compléterait la journée.",
    "Départ calme : tu pourrais pratiquer davantage.",
  ])("rejects adversarial extra-action wording", async (message) => {
    const output = structuredClone(copy);
    output.dayMessages[0].message = message;
    await expect(
      createPersonalizationService({
        client: clientWith(output),
        available: true,
      }).personalize(context),
    ).resolves.toEqual({ status: "fallback", copy: null });
  });

  it("uses fallback for missing configuration, SDK errors, timeouts and refusals", async () => {
    const unavailable = createPersonalizationService({
      client: null,
      available: false,
    });
    await expect(unavailable.personalize(context)).resolves.toEqual({
      status: "fallback",
      copy: null,
    });

    const rejects: OpenAIResponsesClient = {
      responses: { parse: async () => Promise.reject(new Error("network")) },
    };
    await expect(
      createPersonalizationService({
        client: rejects,
        available: true,
      }).personalize(context),
    ).resolves.toEqual({ status: "fallback", copy: null });

    const refusal: OpenAIResponsesClient = {
      responses: {
        parse: async () => ({
          output: [{ content: [{ refusal: "refused" }] }],
        }),
      },
    };
    await expect(
      createPersonalizationService({
        client: refusal,
        available: true,
      }).personalize(context),
    ).resolves.toEqual({ status: "fallback", copy: null });

    const waitsForAbort: OpenAIResponsesClient = {
      responses: {
        parse: async (_request, options) =>
          new Promise((_, reject) => {
            options?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      },
    };
    await expect(
      createPersonalizationService({
        client: waitsForAbort,
        available: true,
        timeoutMs: 5,
      }).personalize(context),
    ).resolves.toEqual({ status: "fallback", copy: null });
  });
});
