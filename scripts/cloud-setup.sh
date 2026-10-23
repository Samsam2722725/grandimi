#!/bin/bash
# Démarrage d'une session Claude Code dans le cloud (téléphone, claude.ai/code).
# Sur l'ordinateur, ne fait rien : les dépendances y sont déjà installées.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}/frontend"
npm install --no-audit --no-fund --silent
