import type { OnboardingData } from "@/domain/onboarding";
import type { ProfileInsightId } from "@/domain/report";
import { ACTIONS_BY_ID } from "./actionCatalog";
import {
  calculateCalendarAge,
  isSleepInsufficientForAge,
  sleepGuidanceForAge,
} from "./sleepGuidance";
import type { ProgramAction, ProgramCategory } from "./types";

function ids(category: ProgramCategory, variant: number): string[] {
  return Array.from(
    { length: 7 },
    (_, day) => `${category}-${((day + variant) % 10) + 1}`,
  );
}

export function selectActions(
  data: OnboardingData,
  priority: ProfileInsightId,
): ProgramAction[][] {
  const habits = new Set(data.routine.habits);
  const age = calculateCalendarAge(
    data.prediction_required.birthDate,
    data.prediction_required.measurementDate,
  );
  const sleepInsufficient = isSleepInsufficientForAge(
    age,
    data.routine.sleepDuration,
  );
  const sleepVariant = habits.has("screens")
    ? 1
    : habits.has("irregular_sleep")
      ? 2
      : priority === "sleep"
        ? 0
        : 3;
  const activityVariant =
    data.routine.sportFrequency === "none" || habits.has("low_movement")
      ? 0
      : data.routine.sportFrequency === "five_plus"
        ? 5
        : 2;
  const nutritionVariant = habits.has("skipped_meals")
    ? 0
    : habits.has("low_water")
      ? 1
      : priority === "nutrition"
        ? 2
        : 3;
  const byCategory = {
    sleep: ids("sleep", sleepVariant),
    activity: ids("activity", activityVariant),
    nutrition: ids("nutrition", nutritionVariant),
  };
  return Array.from({ length: 7 }, (_, day) =>
    (Object.keys(byCategory) as ProgramCategory[]).map((category) => {
      const action = ACTIONS_BY_ID.get(byCategory[category][day]);
      if (!action) throw new Error("Action catalogue introuvable.");
      const reasons = [
        priority === category
          ? "Cette action revient car elle correspond à ta priorité principale."
          : "Cette action soutient une routine équilibrée.",
      ];
      if (category === "sleep" && habits.has("screens"))
        reasons.push("Tu as indiqué utiliser des écrans le soir.");
      if (category === "sleep" && sleepInsufficient)
        reasons.push(
          `Ta durée déclarée est inférieure au repère de ${sleepGuidanceForAge(age)} pour ton âge.`,
        );
      if (
        category === "activity" &&
        data.routine.sportFrequency === "five_plus"
      )
        reasons.push(
          "Ton niveau déclaré invite à privilégier aussi la récupération.",
        );
      if (category === "nutrition" && habits.has("skipped_meals"))
        reasons.push("Tu as indiqué sauter parfois des repas.");
      return { ...action, personalizationReasons: reasons };
    }),
  );
}
