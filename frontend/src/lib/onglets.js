import { House, Sparkles, TrendingUp, Users } from 'lucide-react';

/* L'onglet Communauté est DÉCLARÉ mais éteint.

   Le mockup de la vitrine porte déjà la règle, en toutes lettres :
   « Quatre entrées comme chez eux, mais les nôtres : pas de "forum" tant
   qu'il n'y a pas de forum. » Un onglet qui n'ouvre que « bientôt » coûte
   une place dans la barre, un clic déçu par visiteur, et il apprend à
   l'utilisateur que certains onglets ne servent à rien — ce qu'il
   n'oubliera pas le jour où celui-là marchera.

   La bascule tient en un mot le jour où le fil existe (étape 8), parce
   que la barre est construite à partir de cette liste et non écrite à la
   main dans le JSX. */
const COMMUNAUTE_ACTIVE = false;

/* Dans un fichier à part, et pas à côté du composant : une constante
   exportée depuis un module qui exporte aussi un composant désactive le
   rafraîchissement à chaud de ce fichier (oxlint le signale). On perdrait
   l'aperçu instantané sur le fichier qu'on retouchera le plus souvent
   pendant les étapes 2 à 8. */
export const ONGLETS = [
  { id: 'accueil', label: 'Accueil', Icone: House },
  { id: 'grandir', label: 'Grandir', Icone: TrendingUp },
  { id: 'apercus', label: 'Aperçus', Icone: Sparkles },
  ...(COMMUNAUTE_ACTIVE
    ? [{ id: 'communaute', label: 'Communauté', Icone: Users }]
    : []),
];

/* Un onglet demandé qui n'existe pas (ou qui est éteint, comme
   « communaute » aujourd'hui) afficherait un écran vide sans rien dire.
   On retombe sur l'accueil. */
export function ongletValide(id) {
  return ONGLETS.some((onglet) => onglet.id === id);
}
