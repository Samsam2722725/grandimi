import { House, Sparkles, TrendingUp, Users } from 'lucide-react';

/* L'onglet Communauté est allumé depuis l'étape 8.

   La règle que portait le mockup de la vitrine — « pas de forum tant
   qu'il n'y a pas de forum » — est tenue : il y a maintenant un fil, en
   LECTURE SEULE, écrit par l'équipe. L'onglet n'ouvre plus sur
   « bientôt », il ouvre sur huit réponses.

   Ce qui n'est toujours pas là : l'écriture par les utilisateurs. Elle
   demande un bouton de signalement, une file de modération, une règle de
   rétention écrite et quelqu'un dont c'est le travail. Avant, pas
   après — et il n'existe aucune route d'écriture côté serveur. */

/* Dans un fichier à part, et pas à côté du composant : une constante
   exportée depuis un module qui exporte aussi un composant désactive le
   rafraîchissement à chaud de ce fichier (oxlint le signale). On perdrait
   l'aperçu instantané sur le fichier qu'on retouchera le plus souvent
   pendant les étapes 2 à 8. */
export const ONGLETS = [
  { id: 'accueil', label: 'Accueil', Icone: House },
  { id: 'grandir', label: 'Grandir', Icone: TrendingUp },
  { id: 'apercus', label: 'Aperçus', Icone: Sparkles },
  { id: 'communaute', label: 'Communauté', Icone: Users },
];

/* Un onglet demandé qui n'existe pas afficherait un écran vide sans rien
   dire. On retombe sur l'accueil. */
export function ongletValide(id) {
  return ONGLETS.some((onglet) => onglet.id === id);
}
