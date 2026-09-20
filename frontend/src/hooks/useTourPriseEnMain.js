import { useCallback, useEffect, useState } from 'react';

/* Le tour de prise en main : qui le voit, quand, et une seule fois.

   `localStorage` et non `sessionStorage` : contrairement à l'onglet
   actif, ce n'est pas le fil d'une visite mais un fait acquis — « cette
   personne a déjà vu comment ça marche ». Revenir demain ne doit pas
   rejouer le tour.

   Conséquence assumée : le tour rejoue une fois sur un nouvel appareil,
   parce que rien n'est enregistré côté serveur. Le corriger imposerait
   une colonne, une route et une migration pour mémoriser qu'on a lu
   trois bulles. Ce n'est pas le bon échange, et sur un second appareil
   un rappel de trois écrans ne coûte presque rien. */
const CLE = 'grandimi:tour-vu';

/* Les trois étapes, et pourquoi celles-là.

   Chacune explique quelque chose qu'on NE DEVINE PAS en regardant
   l'écran. Ce qui se devine — la barre d'onglets, le bouton d'aide, la
   liste d'exercices — n'a pas de bulle : la commenter apprend à
   l'utilisateur que les bulles ne servent à rien, juste avant celle qui
   compte. */
export const ETAPES_TOUR = [
  {
    cible: '.anneau',
    texte:
      'Cet anneau n’est pas un score unique : c’est six piliers, un par part. Une part en pointillés veut dire « pas encore de données », pas « zéro ».',
  },
  {
    cible: '.accueil__rebours-zone',
    texte:
      'Tu te mesures une fois par semaine. Plus souvent, tu n’enregistres que l’erreur de mesure : la croissance d’une semaine tient sous le millimètre.',
  },
  {
    cible: '.app-tabbar__item:nth-child(2)',
    texte:
      'Dans « Grandir », trois sections : tes exercices du jour, ton journal alimentaire et ton sommeil. C’est là que tout se coche.',
  },
];

export function useTourPriseEnMain(pretAAfficher) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!pretAAfficher) return;
    try {
      if (localStorage.getItem(CLE)) return;
    } catch {
      /* Stockage refusé (navigation privée) : on joue le tour. Le
         rejouer à chaque visite serait pénible, mais ne pas le jouer du
         tout priverait de l'explication quelqu'un qui n'a rien demandé
         de spécial. */
    }

    /* Un temps d'attente avant d'ouvrir.

       Les cibles sont mesurées par `getBoundingClientRect` : lancé au
       même rendu que l'écran, le tour mesure un anneau qui n'a pas
       encore sa taille finale et découpe à côté. Ce délai laisse le
       premier chargement se poser. */
    const t = setTimeout(() => setOuvert(true), 700);
    return () => clearTimeout(t);
  }, [pretAAfficher]);

  const terminer = useCallback(() => {
    setOuvert(false);
    try {
      localStorage.setItem(CLE, '1');
    } catch {
      // Écriture refusée : le tour rejouera. Sans conséquence.
    }
  }, []);

  // Rejouer depuis les réglages.
  const rejouer = useCallback(() => {
    try {
      localStorage.removeItem(CLE);
    } catch {
      // Rien à faire : `ouvert` suffit pour cette session.
    }
    setOuvert(true);
  }, []);

  return { ouvert, terminer, rejouer };
}

/* Exposé pour l'écran « Mon compte », qui n'a pas accès au hook :
   il vit en dehors de la coque de l'application. */
export function reinitialiserTour() {
  try {
    localStorage.removeItem(CLE);
    return true;
  } catch {
    return false;
  }
}
