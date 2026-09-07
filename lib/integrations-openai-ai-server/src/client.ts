import OpenAI from "openai";
export { zodTextFormat } from "openai/helpers/zod";

export type OpenAIEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  | "OPENAI_API_KEY"
  | "AI_INTEGRATIONS_OPENAI_API_KEY"
  | "AI_INTEGRATIONS_OPENAI_BASE_URL"
>>;

export function isOpenAIConfigured(env: OpenAIEnvironment = process.env): boolean {
  return Boolean(
    env.OPENAI_API_KEY ||
      (env.AI_INTEGRATIONS_OPENAI_API_KEY && env.AI_INTEGRATIONS_OPENAI_BASE_URL),
  );
}

/** Creates a client only when a complete direct or managed configuration exists. */
export function createOpenAIClient(
  env: OpenAIEnvironment = process.env,
): OpenAI | null {
  if (env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  if (env.AI_INTEGRATIONS_OPENAI_API_KEY && env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    return new OpenAI({
      apiKey: env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }

  return null;
}

// Kept for existing integrations. New server code should use createOpenAIClient.
export const openai = createOpenAIClient();
