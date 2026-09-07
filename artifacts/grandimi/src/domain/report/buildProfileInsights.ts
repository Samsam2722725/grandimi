import type { OnboardingData } from "@/domain/onboarding";
import type { ProfileInsight } from "./types";

const INSIGHTS: Record<"sleep" | "activity" | "nutrition", ProfileInsight> = {
  sleep: {
    id: "sleep",
    title: "Régulariser ton sommeil",
    description:
      "Tes réponses montrent que le sommeil pourrait être l’un des premiers éléments à structurer dans ton programme.",
  },
  activity: {
    id: "activity",
    title: "Construire une activité régulière",
    description:
      "Ton futur programme commencera par des actions simples et progressives adaptées à ton niveau actuel.",
  },
  nutrition: {
    id: "nutrition",
    title: "Stabiliser ton alimentation",
    description:
      "Ton programme proposera des repères simples pour améliorer la régularité de tes repas et de ton hydratation.",
  },
};

const STEADY_INSIGHT: ProfileInsight = {
  id: "steady",
  title: "Tu disposes déjà d’une base régulière",
  description:
    "Ton programme cherchera surtout à maintenir cette régularité et à suivre ton évolution.",
};

export function buildProfileInsights(
  onboardingData: OnboardingData,
): ProfileInsight[] {
  const { routine } = onboardingData;
  const habits = new Set(routine.habits);
  const priorities: ProfileInsight[] = [];

  if (
    ["under_six", "six_seven", "seven_eight"].includes(routine.sleepDuration) ||
    habits.has("irregular_sleep") ||
    habits.has("screens")
  ) {
    priorities.push(INSIGHTS.sleep);
  }

  if (routine.sportFrequency === "none" || habits.has("low_movement")) {
    priorities.push(INSIGHTS.activity);
  }

  if (habits.has("skipped_meals") || habits.has("low_water")) {
    priorities.push(INSIGHTS.nutrition);
  }

  return priorities.length > 0 ? priorities.slice(0, 3) : [STEADY_INSIGHT];
}
