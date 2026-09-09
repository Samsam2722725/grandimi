// PostHog — analytics produit.
//
// L'app est une SPA sans routeur : `currentPage` change dans App.jsx
// sans que l'URL bouge. La capture automatique des pages vues ne
// verrait donc qu'une seule vue par session. On la désactive et on
// envoie `$pageview` à la main à chaque changement d'écran.
//
// Grandimi manipule des mesures d'enfants. Deux garde-fous ici :
// - session recording coupé (aucune vidéo des formulaires),
// - autocapture laissé actif, mais il n'enregistre jamais le contenu
//   saisi dans les champs, seulement les clics et les libellés.
import posthog from 'posthog-js';

const CLE = import.meta.env.VITE_POSTHOG_KEY;
const HOTE = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

let actif = false;

export function initAnalytics() {
  // Sans clé (dev local, ou variable absente du build), on ne charge
  // rien : pas d'erreur, pas de requête réseau.
  if (actif || !CLE) return;

  posthog.init(CLE, {
    api_host: HOTE,
    capture_pageview: false,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
  });

  actif = true;
}

export function capturePageview(page) {
  if (!actif) return;
  posthog.capture('$pageview', { page });
}

export function capture(evenement, proprietes) {
  if (!actif) return;
  posthog.capture(evenement, proprietes);
}

export function identify(id, proprietes) {
  if (!actif) return;
  posthog.identify(id, proprietes);
}

export function resetAnalytics() {
  if (!actif) return;
  posthog.reset();
}
