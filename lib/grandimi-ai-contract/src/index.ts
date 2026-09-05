import { z } from "zod";

const text = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine(
      (value) => !/[<>{}[\]`*_#]|https?:\/\/|www\.|<[^>]*>/iu.test(value),
      "Text must be plain text without markup or URLs.",
    );

export const ACTION_TITLES = Object.freeze({
  "sleep-1": "Départ calme",
  "sleep-2": "Téléphone hors du lit",
  "sleep-3": "Prépare le lendemain",
  "sleep-4": "Heure de lever stable",
  "sleep-5": "Transition sans écran",
  "sleep-6": "Routine en trois étapes",
  "sleep-7": "Lumière du matin",
  "sleep-8": "Vérifie ton horaire",
  "sleep-9": "Soirée apaisée",
  "sleep-10": "Bilan de routine",
  "activity-1": "Marche de départ",
  "activity-2": "Pause mouvement",
  "activity-3": "Activité choisie",
  "activity-4": "Mobilité douce",
  "activity-5": "Marche avec un proche",
  "activity-6": "Récupération active",
  "activity-7": "Renforcement maîtrisé",
  "activity-8": "Alignement confortable",
  "activity-9": "Bouger entre deux tâches",
  "activity-10": "Bilan récupération",
  "nutrition-1": "Repas prévu",
  "nutrition-2": "Eau accessible",
  "nutrition-3": "Fruit ou légume",
  "nutrition-4": "Protéine alimentaire",
  "nutrition-5": "Assiette variée",
  "nutrition-6": "Préparation simple",
  "nutrition-7": "Collation planifiée",
  "nutrition-8": "Diversité du jour",
  "nutrition-9": "Repas sans écran",
  "nutrition-10": "Bilan alimentaire",
} as const);
export type ActionId = keyof typeof ACTION_TITLES;
export function resolveActionTitle(id: string): string | null {
  return Object.prototype.hasOwnProperty.call(ACTION_TITLES, id)
    ? ACTION_TITLES[id as ActionId]
    : null;
}
const actionId = z
  .string()
  .refine(
    (id): id is ActionId => resolveActionTitle(id) !== null,
    "Unknown local action ID.",
  );
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function hasExactlyDays(days: number[]): boolean {
  return new Set(days).size === 7 && DAYS.every((day) => days.includes(day));
}

export const AIPersonalizationContextSchema = z
  .object({
    ageGroup: z.enum([
      "3-5 ans",
      "6-12 ans",
      "13-17 ans",
      "18 ans ou plus",
      "âge non précisé",
    ]),
    sex: z.enum(["male", "female", "prefer_not"]),
    goalPosition: z.enum([
      "below_range",
      "within_range",
      "above_range",
      "unknown",
    ]),
    sleepProfile: z
      .object({
        status: z.enum(["insufficient", "appropriate", "unknown"]),
        screensAtNight: z.boolean(),
        irregularSchedule: z.boolean(),
      })
      .strict(),
    activityProfile: z
      .object({
        level: z.enum(["low", "regular", "frequent"]),
        recoveryNeeded: z.boolean(),
      })
      .strict(),
    nutritionProfile: z
      .object({
        skipsMeals: z.boolean(),
        hydrationIssue: z.boolean(),
      })
      .strict(),
    developmentSummary: z.string().trim().min(1).max(300).nullable(),
    primaryPriority: text(200),
    secondaryPriorities: z.array(text(200)).max(5),
    programDays: z
      .array(
        z
          .object({
            dayNumber: z.number().int().min(1).max(7),
            actionIds: z.array(actionId).length(3),
          })
          .strict(),
      )
      .length(7),
  })
  .strict()
  .superRefine((context, issue) => {
    if (!hasExactlyDays(context.programDays.map((day) => day.dayNumber))) {
      issue.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Days 1 through 7 are required exactly once.",
      });
    }
    context.programDays.forEach((day, index) => {
      const categories = day.actionIds.map((id) => id.split("-")[0]);
      if (
        new Set(categories).size !== 3 ||
        !["sleep", "activity", "nutrition"].every((category) =>
          categories.includes(category),
        )
      ) {
        issue.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["programDays", index, "actionIds"],
          message:
            "Each day requires one sleep, activity, and nutrition action.",
        });
      }
    });
  });

export const AIPersonalizedCopySchema = z
  .object({
    reportHeadline: text(140),
    profileSummary: text(500),
    keyInsight: text(300),
    goalMessage: text(300),
    weeklyMission: text(300),
    dayMessages: z
      .array(
        z
          .object({
            dayNumber: z.number().int().min(1).max(7),
            message: text(220),
          })
          .strict(),
      )
      .length(7),
    finalEncouragement: text(200),
  })
  .strict()
  .superRefine((copy, issue) => {
    if (!hasExactlyDays(copy.dayMessages.map((day) => day.dayNumber))) {
      issue.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Days 1 through 7 are required exactly once.",
      });
    }
    const allText = copyText(copy);
    if (
      /(?:\bgaranti(?:e|s)?\b|tu vas gagner|gagner\s+\d+\s*(?:cm|centimètre)|\d+(?:[,.]\d+)?\s*%\s*(?:de\s*)?(?:précision|fiabilit)|\b(?:hormone|médicament|complément|supplément|traitement|diagnostic|maladie|prescription|médical(?:e|es|aux)?)\b)/iu.test(
        allText,
      )
    ) {
      issue.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsafe medical or growth promise content.",
      });
    }
  });

export const AIPersonalizationOutcomeSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("personalized"),
      copy: AIPersonalizedCopySchema,
    })
    .strict(),
  z.object({ status: z.literal("fallback"), copy: z.null() }).strict(),
]);

export type AIPersonalizationContext = z.infer<
  typeof AIPersonalizationContextSchema
>;
export type AIPersonalizedCopy = z.infer<typeof AIPersonalizedCopySchema>;
export type AIPersonalizationOutcome = z.infer<
  typeof AIPersonalizationOutcomeSchema
>;

function copyText(copy: AIPersonalizedCopy): string {
  return [
    copy.reportHeadline,
    copy.profileSummary,
    copy.keyInsight,
    copy.goalMessage,
    copy.weeklyMission,
    copy.finalEncouragement,
    ...copy.dayMessages.map((day) => day.message),
  ].join("\n");
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Server-side grounding: daily copy must name a verbatim action title for that day. */
export function validateGroundedAIPersonalizedCopy(
  value: unknown,
  context: AIPersonalizationContext,
): AIPersonalizedCopy | null {
  const parsed = AIPersonalizedCopySchema.safeParse(value);
  if (!parsed.success) return null;
  const recommendation =
    /\b(?:tu devrais|tu pourrais|pourrais|devrais|il faut|pense à|essaie de|je te conseille|recommande|propose|pratique|réalise|ajoute(?:z)?|remplace(?:z)?|nouvel?(?:le)?\s+(?:exercice|action)|va nager|(?:une\s+)?course\s+de\s+.+?\s+compléterait|fais|faites|prends|prenez|commence(?:z)?|arrête(?:z)?|évite(?:z)?)\b/iu;
  if (recommendation.test(copyText(parsed.data))) return null;
  const byDay = new Map(context.programDays.map((day) => [day.dayNumber, day]));
  const isGrounded = parsed.data.dayMessages.every((message) => {
    const day = byDay.get(message.dayNumber);
    if (
      /[\n;]|\s(?:[-•]|\d+\.)\s/u.test(message.message) ||
      (message.message.match(/[.!?]+/gu)?.length ?? 0) > 1
    )
      return false;
    const normalizedMessage = normalized(message.message);
    return Boolean(
      day?.actionIds.some((id) => {
        const title = resolveActionTitle(id);
        return title !== null && normalizedMessage.includes(normalized(title));
      }),
    );
  });
  return isGrounded ? parsed.data : null;
}

export function parseAIPersonalizationContext(
  value: unknown,
): AIPersonalizationContext | null {
  const parsed = AIPersonalizationContextSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseAIPersonalizedCopy(
  value: unknown,
): AIPersonalizedCopy | null {
  const parsed = AIPersonalizedCopySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseAIPersonalizationOutcome(
  value: unknown,
): AIPersonalizationOutcome | null {
  const parsed = AIPersonalizationOutcomeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
