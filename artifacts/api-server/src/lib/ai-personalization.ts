import {
  createOpenAIClient,
  isOpenAIConfigured,
  zodTextFormat,
} from "@workspace/integrations-openai-ai-server/client";
import {
  AIPersonalizedCopySchema,
  resolveActionTitle,
  type AIPersonalizationContext,
  type AIPersonalizationOutcome,
  validateGroundedAIPersonalizedCopy,
} from "@workspace/grandimi-ai-contract";

export {
  AIPersonalizationContextSchema,
  AIPersonalizedCopySchema,
} from "@workspace/grandimi-ai-contract";
export type {
  AIPersonalizedCopy,
  AIPersonalizationContext,
  AIPersonalizationOutcome,
} from "@workspace/grandimi-ai-contract";

export interface OpenAIResponsesClient {
  responses: {
    parse: (
      request: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ) => Promise<{
      output_parsed?: unknown;
      output?: Array<{ content?: Array<{ refusal?: string }> }>;
    }>;
  };
}

const SYSTEM_PROMPT = `Tu es le rédacteur personnalisé de Grandimi. Écris uniquement en français naturel, direct, motivant, concret et rassurant, sans ton infantilisant ni culpabilisant. Tu rédiges de courts textes adaptés à un écran mobile.
N'utilise jamais Markdown, HTML, URL, chiffres de prédiction, promesse de résultat physique, garantie, pourcentage de précision, conseil médical, hormone, médicament, complément, supplément, traitement ou diagnostic.
Tu ne calcules ni ne modifies aucune estimation. Tu ne proposes, ajoutes, remplaces ou modifies jamais une action. Chaque message quotidien doit reproduire textuellement au moins un titre d'action fourni pour ce jour, puis seulement commenter ou encourager. Ne prescris jamais d'action et n'en invente aucune.
Pour goalPosition : below_range signifie un objectif prudent par rapport à la zone affichée, within_range un objectif dans la zone statistique, above_range un objectif ambitieux à traiter avec motivation et honnêteté, unknown signifie qu'aucun objectif précis n'a été fourni. N'invente aucune valeur ni action.`;

function promptContext(context: AIPersonalizationContext) {
  return {
    ...context,
    programDays: context.programDays.map((day) => ({
      ...day,
      actionTitles: day.actionIds.map((id) => resolveActionTitle(id)),
    })),
  };
}

function modelRefused(
  response: Awaited<ReturnType<OpenAIResponsesClient["responses"]["parse"]>>,
): boolean {
  return (
    response.output?.some((item) =>
      item.content?.some((content) => Boolean(content.refusal)),
    ) ?? false
  );
}

export interface PersonalizationService {
  available(): boolean;
  personalize(
    context: AIPersonalizationContext,
  ): Promise<AIPersonalizationOutcome>;
}

export function createPersonalizationService(dependencies: {
  client: OpenAIResponsesClient | null;
  available: boolean;
  model?: string;
  timeoutMs?: number;
}): PersonalizationService {
  const model =
    dependencies.model ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  const timeoutMs = dependencies.timeoutMs ?? 12_000;
  return {
    available: () => dependencies.available,
    async personalize(context): Promise<AIPersonalizationOutcome> {
      if (!dependencies.available || !dependencies.client)
        return { status: "fallback", copy: null };
      try {
        const response = await dependencies.client.responses.parse(
          {
            model,
            store: false,
            reasoning: { effort: "low" },
            max_output_tokens: 1100,
            input: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: JSON.stringify(promptContext(context)) },
            ],
            text: {
              format: zodTextFormat(
                AIPersonalizedCopySchema,
                "ai_personalized_copy",
              ),
            },
          },
          { signal: AbortSignal.timeout(timeoutMs) },
        );
        if (modelRefused(response)) return { status: "fallback", copy: null };
        const copy = validateGroundedAIPersonalizedCopy(
          response.output_parsed,
          context,
        );
        return copy
          ? { status: "personalized", copy }
          : { status: "fallback", copy: null };
      } catch {
        return { status: "fallback", copy: null };
      }
    },
  };
}

export function createDefaultPersonalizationService(): PersonalizationService {
  return createPersonalizationService({
    client: createOpenAIClient() as OpenAIResponsesClient | null,
    available: isOpenAIConfigured(),
  });
}
