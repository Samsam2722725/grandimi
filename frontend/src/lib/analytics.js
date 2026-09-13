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
import { API_BASE } from './api';

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

/* ============================================================
   Une copie de la mesure chez nous

   PostHog ne se lit qu'en s'y connectant, et le tableau de bord Whop
   ne voit qu'une seule page : le site est une application d'une seule
   page, son adresse ne change jamais. Vérifié le 13/09/2026 — 131 vues
   de grandimi.com, toutes comptées sur « / ». Aucun des deux ne peut
   donc répondre à « où les gens s'arrêtent ».

   Les mêmes événements partent aussi vers notre base, où la réponse se
   lit en SQL (migrations/lire_le_tunnel.sql).

   CE QUI PART, ET RIEN D'AUTRE
   Le nom de l'événement, le nom de l'écran (ou, à l'entrée du tunnel,
   le bouton par lequel on est entré) et son rang. Écrits en dur, un
   par un : volontairement PAS `...proprietes` — sans
   quoi une propriété ajoutée un jour à un événement partirait en base
   sans que personne ne l'ait décidé. Ni tranche d'âge, ni sexe, ni
   confiance : cette copie sait dire où on perd les gens, et rien sur
   qui ils sont.
   ============================================================ */

let idVolatile = '';

function nouvelId() {
  try {
    return crypto.randomUUID();
  } catch {
    return String(Date.now()) + String(Math.random()).slice(2);
  }
}

/* Identifiant de visite, tiré au hasard, sans aucun lien avec un
   compte. Il ne sert qu'à recoller les écrans d'une même visite, pour
   compter des visiteurs plutôt que des clics. */
function idDeVisite() {
  try {
    let id = localStorage.getItem('grandimi:mesure');
    if (!id) {
      id = nouvelId();
      localStorage.setItem('grandimi:mesure', id);
    }
    return id;
  } catch {
    // Navigation privée, stockage refusé : on mesure quand même, avec
    // un identifiant qui ne vivra que le temps de la page.
    if (!idVolatile) idVolatile = nouvelId();
    return idVolatile;
  }
}

function envoyerAuServeur(evenement, proprietes) {
  const rang = Number(proprietes && proprietes.rang);
  const corps = JSON.stringify({
    session: idDeVisite(),
    evenement,
    etape: String((proprietes && (proprietes.etape || proprietes.emplacement)) || ''),
    rang: Number.isFinite(rang) ? rang : 0,
  });

  try {
    /* sendBeacon plutôt que fetch : il part même si l'onglet se ferme
       dans la seconde, et c'est justement l'abandon qu'on cherche à
       mesurer. Le type text/plain évite la requête OPTIONS préalable,
       qu'un beacon ne sait pas négocier. */
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        API_BASE + '/api/v1/tunnel',
        new Blob([corps], { type: 'text/plain' }),
      );
      return;
    }

    fetch(API_BASE + '/api/v1/tunnel', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: corps,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Une mesure ne doit jamais casser la page qu'elle observe.
  }
}

/* L'envoi chez nous précède le `return` sur `actif` : il ne dépend pas
   de PostHog. Sans ça, une clé PostHog absente du build rendrait le
   site muet des deux côtés à la fois. */
export function capturePageview(page) {
  envoyerAuServeur('page_vue', { etape: page });
  if (!actif) return;
  posthog.capture('$pageview', { page });
}

export function capture(evenement, proprietes) {
  envoyerAuServeur(evenement, proprietes);
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

/* ============================================================
   Événements du tunnel

   Les noms d'événements sont écrits ICI et nulle part ailleurs.
   Un nom retapé dans une page crée un second événement PostHog qui
   ressemble au premier sans s'agréger avec lui : l'entonnoir se casse
   en silence et on ne s'en aperçoit qu'en lisant un graphique faux.
   Même raison que internal/billing/plans.go pour les montants.

   CE QU'ON N'ENVOIE JAMAIS
   Le produit mesure des enfants. Aucune propriété ci-dessous ne porte
   une taille, un poids, une date de naissance, une adresse e-mail ni
   la taille des parents. Ce qui part est volontairement grossier :
   sexe, tranche d'âge, niveau de confiance, offre choisie. C'est assez
   pour lire un entonnoir, pas assez pour reconstituer un profil.
   ============================================================ */

// Tranche plutôt qu'âge exact : segmente sans identifier.
function trancheAge(age) {
  const n = Number(age);
  if (!Number.isFinite(n)) return 'inconnue';
  if (n < 12) return '<12';
  if (n < 15) return '12-14';
  if (n < 18) return '15-17';
  return '18+';
}

/* Le visiteur entre dans le tunnel. `emplacement` dit PAR QUEL bouton :
   la landing en compte sept, et savoir lequel travaille vraiment décide
   quelles sections garder. */
export function tunnelDemarre(emplacement) {
  capture('tunnel_demarre', { emplacement });
}

// Une par écran : c'est la courbe de décrochage, écran par écran.
export function tunnelEtapeVue(etape, rang, total) {
  capture('tunnel_etape_vue', { etape, rang, total });
}

// Sortie par le bouton retour du premier écran (le seul abandon
// explicite qu'on puisse observer ; les autres sont des fermetures
// d'onglet, invisibles par construction).
export function tunnelAbandonne(etape, rang) {
  capture('tunnel_abandonne', { etape, rang });
}

export function emailSaisi() {
  capture('tunnel_email_saisi');
}

// Envoi au serveur : l'événement de départ permet de mesurer le taux
// d'échec réel (API endormie sur l'offre gratuite Render, entre autres).
export function estimationDemandee() {
  capture('estimation_demandee');
}

export function estimationObtenue({ age, sexe, confiance }) {
  capture('estimation_obtenue', {
    tranche_age: trancheAge(age),
    sexe,
    confiance,
  });
}

export function estimationEchouee(motif) {
  capture('estimation_echouee', { motif });
}

export function resultatVu({ age, sexe, confiance }) {
  capture('resultat_vu', { tranche_age: trancheAge(age), sexe, confiance });
}

export function resultatPartage(moyen) {
  capture('resultat_partage', { moyen });
}

export function paywallVue(plan) {
  capture('paywall_vue', { plan_par_defaut: plan });
}

export function planChoisi(plan) {
  capture('paywall_plan_choisi', { plan });
}

/* L'événement du brief : « taux paywall affichée → checkout Whop
   ouvert ». Il est émis AVANT la redirection, donc il part même si
   Whop met du temps à répondre. */
export function checkoutOuvert(plan) {
  capture('paywall_checkout_ouvert', { plan });
}

export function checkoutEchoue(plan, motif) {
  capture('paywall_checkout_echoue', { plan, motif });
}

// Chemin parent : promu en action de premier rang, jamais mesuré.
export function lienParentOuvert() {
  capture('lien_parent_ouvert');
}

export function lienParentCopie() {
  capture('lien_parent_copie');
}

export function parentPageVue() {
  capture('parent_page_vue');
}

export function resiliationDemandee() {
  capture('resiliation_demandee');
}
