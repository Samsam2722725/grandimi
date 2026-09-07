export const MIN_SUPPORTED_AGE = 4;
export const MAX_SUPPORTED_AGE = 17.5;

export const INPUT_LIMITS = {
  currentHeightCm: { min: 80, max: 220 },
  currentWeightKg: { min: 10, max: 200 },
  parentHeightCm: { min: 120, max: 230 },
} as const;

export class GrowthValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: readonly import("./types").ValidationIssue[],
  ) {
    super(message);
    this.name = "GrowthValidationError";
  }
}

export const WARNING_MESSAGES = [
  "C’est une estimation statistique, pas une mesure certaine.",
  "Ce résultat ne constitue pas un diagnostic médical.",
  "La méthode n’utilise pas l’âge osseux.",
  "Une puberté précoce ou tardive peut réduire la fiabilité de l’estimation.",
  "L’étude originale portait sur des enfants blancs américains en bonne santé.",
  "L’utilisation sur d’autres populations est une extrapolation.",
  "Des mesures imprécises de la taille ou du poids modifient le résultat.",
  "Aucun mode de vie ne garantit une taille particulière.",
] as const;

export const SCIENTIFIC_LIMITATIONS = [
  "La méthode est une régression de population : elle ne décrit pas la trajectoire individuelle.",
  "La fourchette affichée reprend une erreur moyenne observée dans l’échantillon original ; ce n’est pas un intervalle de confiance individuel.",
  "La table a été reproduite depuis des sources secondaires concordantes, sans vérification directe complète du document primaire.",
] as const;
