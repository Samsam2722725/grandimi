import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import type {
  AIPersonalizationContext,
  AIPersonalizedCopy,
} from "@workspace/grandimi-ai-contract";
import { createAiRouter } from "./ai";

const context: AIPersonalizationContext = {
  ageGroup: "13-17 ans",
  sex: "prefer_not",
  goalPosition: "unknown",
  sleepProfile: {
    status: "unknown",
    screensAtNight: false,
    irregularSchedule: false,
  },
  activityProfile: { level: "regular", recoveryNeeded: false },
  nutritionProfile: { skipsMeals: false, hydrationIssue: false },
  developmentSummary: null,
  primaryPriority: "Régularité",
  secondaryPriorities: [],
  programDays: Array.from({ length: 7 }, (_, index) => ({
    dayNumber: index + 1,
    actionIds: ["sleep-1", "activity-1", "nutrition-1"],
  })),
};
const copy: AIPersonalizedCopy = {
  reportHeadline: "Une semaine claire",
  profileSummary: "Une routine régulière peut rendre tes repères plus simples.",
  keyInsight: "La régularité reste ton point d'appui.",
  goalMessage: "Ton objectif est traité avec calme et honnêteté.",
  weeklyMission: "Avance à ton rythme tout au long de la semaine.",
  dayMessages: Array.from({ length: 7 }, (_, index) => ({
    dayNumber: index + 1,
    message: "Départ calme : un rendez-vous stable pour ta journée.",
  })),
  finalEncouragement: "Chaque repère suivi renforce ta routine.",
};

const servers: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

async function request(
  service: {
    available(): boolean;
    personalize(
      context: AIPersonalizationContext,
    ): Promise<
      | { status: "personalized"; copy: AIPersonalizedCopy }
      | { status: "fallback"; copy: null }
    >;
  },
  path: string,
  init?: RequestInit,
) {
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.use(createAiRouter(service));
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test address");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("AI routes", () => {
  const service = {
    available: () => true,
    personalize: async () => ({ status: "personalized" as const, copy }),
  };

  it("exposes only availability and accepts a valid injected service request", async () => {
    const status = await request(service, "/ai/status");
    expect(await status.json()).toEqual({ available: true });
    const response = await request(service, "/ai/personalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(context),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "personalized", copy });
  });

  it("rejects extra context fields and rate limits repeated valid requests", async () => {
    const invalid = await request(service, "/ai/personalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...context, OPENAI_API_KEY: "never accepted" }),
    });
    expect(invalid.status).toBe(400);
    const forgedTitle = await request(service, "/ai/personalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...context,
        programDays: context.programDays.map((day) => ({
          ...day,
          actionTitles: ["forged", "forged", "forged"],
        })),
      }),
    });
    expect(forgedTitle.status).toBe(400);

    const app = express();
    app.use(express.json());
    app.use(createAiRouter(service));
    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No test address");
    const url = `http://127.0.0.1:${address.port}/ai/personalize`;
    for (let index = 0; index < 10; index += 1) {
      expect(
        (
          await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(context),
          })
        ).status,
      ).toBe(200);
    }
    expect(
      (
        await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(context),
        })
      ).status,
    ).toBe(429);
  });
});
