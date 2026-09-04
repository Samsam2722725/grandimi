# Grandimi

Outil interne de vérification du moteur déterministe d’estimation de taille adulte Khamis–Roche.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/grandimi/src/domain/growth/` — moteur indépendant de React, conversions, âge, validations et coefficients.
- `artifacts/grandimi/src/pages/prediction-lab.tsx` — page interne de vérification.
- `artifacts/grandimi/docs/PREDICTION_ENGINE.md` — sources, limites, décisions et contrôles.

## Architecture decisions

- Le calcul ne dépend d’aucun service externe, LLM, base de données ou appel réseau.
- Les coefficients sont stockés comme une table immuable de 28 lignes par sexe.
- Les âges intermédiaires utilisent une interpolation linéaire explicite, décision propre à Grandimi.
- Les valeurs sont converties en unités impériales pour la régression, sans arrondi intermédiaire.

## Product

La page `/prediction-lab` permet de contrôler les entrées et sorties du moteur Khamis–Roche, avec fourchette contextuelle, coefficients, avertissements et limites scientifiques.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
