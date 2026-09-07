import type { OnboardingData } from "@/domain/onboarding";
import type { GrowthReport, ProfileInsightId } from "@/domain/report";
import { selectActions } from "./selectActions";
import {
  calculateCalendarAge,
  isSleepInsufficientForAge,
  sleepGuidanceForAge,
} from "./sleepGuidance";
import type { SevenDayProgram } from "./types";

const DAY_STEPS = [
  ["Démarrage", "Un premier pas simple et réalisable."],
  ["Environnement", "Prépare ce qui rend la routine plus facile."],
  ["Consolidation", "Répète des repères utiles."],
  ["Régularité", "Ancre les habitudes dans ta journée."],
  ["Approfondissement", "Renforce ce qui te convient."],
  ["Défi réaliste", "Fais un pas ambitieux mais raisonnable."],
  ["Bilan et suite", "Garde ce qui fonctionne pour la suite."],
] as const;

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function programPriorities(
  data: OnboardingData,
  report: GrowthReport,
  age: number | null,
): ProfileInsightId[] {
  const priorities = report.priorities.map((item) => item.id);
  if (
    isSleepInsufficientForAge(age, data.routine.sleepDuration) &&
    !priorities.includes("sleep")
  ) {
    priorities.unshift("sleep");
  }
  const withoutSteady =
    priorities.length > 1
      ? priorities.filter((priority) => priority !== "steady")
      : priorities;
  const resolved: ProfileInsightId[] =
    withoutSteady.length > 0 ? withoutSteady : ["steady"];
  return resolved.slice(0, 3);
}

export function buildSevenDayProgram(
  data: OnboardingData,
  report: GrowthReport,
): SevenDayProgram {
  const date = data.prediction_required.measurementDate;
  const age = calculateCalendarAge(data.prediction_required.birthDate, date);
  const priorities = programPriorities(data, report, age);
  const primaryPriority = priorities[0];
  const secondaryPriorities = priorities.slice(1);
  const selected = selectActions(data, primaryPriority);
  const programFingerprint = fingerprint(
    canonicalize({
      data,
      priorityIds: priorities,
    }),
  );
  const sleepGuide = sleepGuidanceForAge(age);
  const priorityLabel = {
    sleep: "le sommeil",
    activity: "l’activité et la récupération",
    nutrition: "l’alimentation et l’hydratation",
    steady: "la régularité",
  }[primaryPriority];
  return {
    id: `program-${programFingerprint}`,
    createdAt: `${date}T00:00:00.000Z`,
    profileSummary:
      primaryPriority === "steady"
        ? `Tu disposes déjà d’une base régulière : ce programme consolide tes repères. Repère sommeil pour ton âge : ${sleepGuide}.`
        : `Ta priorité actuelle concerne ${priorityLabel}. Repère sommeil pour ton âge : ${sleepGuide}.`,
    primaryPriority,
    secondaryPriorities,
    days: DAY_STEPS.map(([title, focus], index) => ({
      dayNumber: index + 1,
      title: `Jour ${index + 1} — ${title}`,
      focus,
      actions: selected[index],
    })),
    sourceIds: ["aasm-sleep-2016", "who-physical-activity", "who-healthy-diet"],
    version: "4A",
  };
}
