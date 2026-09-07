import { Router, type IRouter, type Request } from "express";
import {
  AIPersonalizationContextSchema,
  createDefaultPersonalizationService,
  type PersonalizationService,
} from "../lib/ai-personalization";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

function createRateLimiter() {
  const requests = new Map<string, { count: number; startedAt: number }>();
  return (req: Request): boolean => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const current = requests.get(key);
    if (!current || now - current.startedAt >= WINDOW_MS) {
      requests.set(key, { count: 1, startedAt: now });
      return true;
    }
    current.count += 1;
    return current.count <= MAX_REQUESTS_PER_WINDOW;
  };
}

export function createAiRouter(
  service: PersonalizationService = createDefaultPersonalizationService(),
): IRouter {
  const router: IRouter = Router();
  const rateLimit = createRateLimiter();

  router.get("/ai/status", (_req, res) => {
    res.json({ available: service.available() });
  });

  router.post("/ai/personalize", async (req, res): Promise<void> => {
    if (!rateLimit(req)) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    const context = AIPersonalizationContextSchema.safeParse(req.body);
    if (!context.success) {
      res.status(400).json({ error: "Invalid personalization context" });
      return;
    }
    // Do not log the request context or generated copy.
    res.json(await service.personalize(context.data));
  });

  return router;
}

export default createAiRouter();