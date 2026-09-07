import { personalizeAi } from "@workspace/api-client-react/generated-api";
import {
  AIPersonalizationContextSchema as aiPersonalizationContextSchema,
  AIPersonalizedCopySchema as aiPersonalizedCopySchema,
  AIPersonalizationOutcomeSchema,
  parseAIPersonalizedCopy,
  type AIPersonalizationContext,
  type AIPersonalizedCopy,
  type AIPersonalizationOutcome,
} from "@workspace/grandimi-ai-contract";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OnboardingData } from "@/domain/onboarding";
import {
  calculateCalendarAge,
  isSleepInsufficientForAge,
} from "@/domain/program";
import type { SevenDayProgram } from "@/domain/program";
import type { GrowthReport } from "@/domain/report";

export function validateAIPersonalizedCopy(
  value: unknown,
): AIPersonalizedCopy | null {
  return parseAIPersonalizedCopy(value);
}
export { aiPersonalizationContextSchema, aiPersonalizedCopySchema };
export type { AIPersonalizationContext, AIPersonalizedCopy };

function ageGroup(age: number | null): string {
  if (age === null) return "âge non précisé";
  if (age < 6) return "3-5 ans";
  if (age < 13) return "6-12 ans";
  if (age < 18) return "13-17 ans";
  return "18 ans ou plus";
}

/** Produces the only data permitted to leave the deterministic client domains. */
export function buildAIPersonalizationContext(
  data: OnboardingData,
  report: GrowthReport,
  program: SevenDayProgram,
): AIPersonalizationContext | null {
  const habits = new Set(data.routine.habits);
  const age = calculateCalendarAge(
    data.prediction_required.birthDate,
    data.prediction_required.measurementDate,
  );
  const sleepDuration = data.routine.sleepDuration;
  const context = {
    ageGroup: ageGroup(age),
    sex:
      data.prediction_required.modelSex === "male" ||
      data.prediction_required.modelSex === "female"
        ? data.prediction_required.modelSex
        : "prefer_not",
    goalPosition: report.goalComparison
      ? (
          {
            below: "below_range",
            within: "within_range",
            above: "above_range",
          } as const
        )[report.goalComparison.position]
      : "unknown",
    sleepProfile: {
      status:
        sleepDuration && age !== null
          ? isSleepInsufficientForAge(age, sleepDuration)
            ? "insufficient"
            : "appropriate"
          : "unknown",
      screensAtNight: habits.has("screens"),
      irregularSchedule: habits.has("irregular_sleep"),
    },
    activityProfile: {
      level:
        data.routine.sportFrequency === "none"
          ? "low"
          : data.routine.sportFrequency === "five_plus"
            ? "frequent"
            : "regular",
      recoveryNeeded: data.routine.sportFrequency === "five_plus",
    },
    nutritionProfile: {
      skipsMeals: habits.has("skipped_meals"),
      hydrationIssue: habits.has("low_water"),
    },
    developmentSummary:
      report.developmentMarkers.length > 0
        ? "Repères de développement renseignés."
        : null,
    primaryPriority: program.primaryPriority,
    secondaryPriorities: program.secondaryPriorities,
    programDays: program.days.map((day) => ({
      dayNumber: day.dayNumber,
      actionIds: day.actions.map((action) => action.id),
    })),
  };
  const parsed = aiPersonalizationContextSchema.safeParse(context);
  return parsed.success ? parsed.data : null;
}

const CACHE_PREFIX = "grandimi:ai:copy:";
const ATTEMPT_PREFIX = "grandimi:ai:attempted:";
const inFlight = new Map<string, Promise<AIPersonalizedCopy | null>>();
type PersonalizationRequester = (
  context: AIPersonalizationContext,
) => Promise<AIPersonalizationOutcome>;
const productionRequester: PersonalizationRequester = async (context) => {
  const transport = await personalizeAi(context);
  return AIPersonalizationOutcomeSchema.parse(transport);
};
let requester: PersonalizationRequester = productionRequester;

/** Test seam: production always starts with the generated API client. */
export function setAIPersonalizationRequesterForTests(
  next: PersonalizationRequester | null,
): void {
  requester = next ?? productionRequester;
}

/** Test seam for isolated Vitest module state. */
export function resetAIPersonalizationForTests(): void {
  inFlight.clear();
  requester = productionRequester;
}

function cacheKey(programId: string, version?: string) {
  return `${CACHE_PREFIX}${programId}:${version ?? ""}`;
}
function attemptKey(programId: string, version?: string) {
  return `${ATTEMPT_PREFIX}${programId}:${version ?? ""}`;
}
function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

/** Removes cache and attempt markers for programs other than the active one. */
export function purgeStaleAIPersonalizations(
  programId: string,
  version?: string,
): void {
  const currentCache = cacheKey(programId, version);
  const currentAttempt = attemptKey(programId, version);
  const session = storage();
  if (!session) return;
  for (let index = session.length - 1; index >= 0; index -= 1) {
    const key = session.key(index);
    if (
      key &&
      (key.startsWith(CACHE_PREFIX) || key.startsWith(ATTEMPT_PREFIX)) &&
      key !== currentCache &&
      key !== currentAttempt
    )
      session.removeItem(key);
  }
}

export function getCachedPersonalization(
  programId: string,
  version?: string,
): AIPersonalizedCopy | null {
  try {
    const raw = storage()?.getItem(cacheKey(programId, version));
    const parsed = raw
      ? aiPersonalizedCopySchema.safeParse(JSON.parse(raw))
      : null;
    return parsed?.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function requestPersonalization(
  context: AIPersonalizationContext,
  programId: string,
  version?: string,
): Promise<AIPersonalizedCopy | null> {
  const key = cacheKey(programId, version);
  const cached = getCachedPersonalization(programId, version);
  if (cached) return cached;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const request = requester(context)
    .then((outcome) => {
      const parsed =
        outcome.status === "personalized"
          ? aiPersonalizedCopySchema.safeParse(outcome.copy)
          : undefined;
      if (!parsed?.success) return null;
      storage()?.setItem(key, JSON.stringify(parsed.data));
      return parsed.data;
    })
    .catch(() => null)
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

/** Shared cache-aware orchestration used by the UI and deterministic tests. */
export function requestAIPersonalization(
  context: AIPersonalizationContext,
  programId: string,
  version?: string,
  automatic = true,
): Promise<AIPersonalizedCopy | null> {
  const cached = getCachedPersonalization(programId, version);
  if (cached) return Promise.resolve(cached);
  const requestKey = cacheKey(programId, version);
  if (
    automatic &&
    storage()?.getItem(attemptKey(programId, version)) &&
    !inFlight.has(requestKey)
  ) {
    return Promise.resolve(null);
  }
  if (automatic) storage()?.setItem(attemptKey(programId, version), "1");
  return requestPersonalization(context, programId, version);
}

export function useAIPersonalization(
  context: AIPersonalizationContext | null,
  program: Pick<SevenDayProgram, "id" | "version"> | null,
) {
  const [copy, setCopy] = useState<AIPersonalizedCopy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const id = program?.id;
  const version = program?.version;
  const currentRequestKey = id ? cacheKey(id, version) : null;
  const currentRequestKeyRef = useRef<string | null>(currentRequestKey);
  currentRequestKeyRef.current = currentRequestKey;

  const run = useCallback(
    (explicit: boolean) => {
      if (!context || !id) return;
      const saved = getCachedPersonalization(id, version);
      if (saved) {
        setCopy(saved);
        setError(false);
        return;
      }
      const requestKey = cacheKey(id, version);
      // A route that mounts while the first request is pending subscribes to it;
      // after it settles, the marker still prevents an automatic retry.
      if (
        !explicit &&
        storage()?.getItem(attemptKey(id, version)) &&
        !inFlight.has(requestKey)
      ) {
        setError(true);
        return;
      }
      setLoading(true);
      setError(false);
      void requestAIPersonalization(context, id, version, !explicit).then(
        (result) => {
          if (currentRequestKeyRef.current !== requestKey) return;
          setCopy(result);
          setError(result === null);
          setLoading(false);
        },
      );
    },
    [context, id, version],
  );

  useEffect(() => {
    setCopy(null);
    setError(false);
    setLoading(false);
    if (context && id) {
      purgeStaleAIPersonalizations(id, version);
      run(false);
    }
  }, [context, id, run]);

  return { copy, loading, error, retry: () => run(true) };
}
