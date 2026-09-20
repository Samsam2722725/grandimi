import { useEffect, useState } from 'react';
import { Clock, LockOpen } from 'lucide-react';

/* Le compte à rebours de la prochaine mesure.

   Il part d'une DURÉE reçue du serveur, pas d'une date butoir. L'horloge
   d'un téléphone peut être décalée de plusieurs minutes, parfois de jours
   quand elle est réglée à la main : un rebours calculé sur une date
   absolue afficherait alors un temps faux, et parfois négatif. Une durée
   décomptée localement peut dériver de quelques secondes sur une semaine,
   ce qui n'a aucune importance ici. */

function formater(secondes) {
  if (secondes <= 0) return null;

  const j = Math.floor(secondes / 86400);
  const h = Math.floor((secondes % 86400) / 3600);
  const m = Math.floor((secondes % 3600) / 60);

  /* On n'affiche jamais les secondes au-delà d'une heure. Un chiffre qui
     change chaque seconde sur un écran qu'on consulte attire l'œil en
     permanence pour une information qui, à six jours de distance, ne sert
     à rien. Sous l'heure, il devient au contraire le sujet de l'écran. */
  if (j > 0) return `${j}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;

  const s = Math.floor(secondes % 60);
  return `${m}m ${s}s`;
}

function CompteARebours({ secondes, onDeverrouiller }) {
  const [restant, setRestant] = useState(secondes);

  /* Resynchronisation quand le serveur renvoie une nouvelle durée
     (après une mesure enregistrée, par exemple).

     Ajusté PENDANT le rendu, pas depuis un effet. Un effet ferait
     peindre une première fois l'ancienne valeur, puis déclencherait un
     second rendu : le rebours afficherait brièvement le temps d'avant.
     Comparer la propriété à la dernière vue est le motif que React
     recommande pour ce cas ; React relance simplement le rendu du
     composant avant de peindre quoi que ce soit. */
  const [derniereRecue, setDerniereRecue] = useState(secondes);
  if (secondes !== derniereRecue) {
    setDerniereRecue(secondes);
    setRestant(secondes);
  }

  /* Une seconde quand la fin approche, une minute sinon. À six jours de
     distance, se réveiller soixante fois par minute pour changer un
     chiffre qui ne bouge pas vide la batterie sans rien afficher de plus.

     Ces deux valeurs sont dérivées AVANT l'effet, pour que sa liste de
     dépendances ne contienne que des choses stables. Écrite avec
     `restant` dedans, elle recrée une minuterie à chaque battement ;
     écrite avec des expressions (`restant > 3600`), elle oblige à faire
     taire la règle de lint — ce qui revient à désactiver la vérification
     à l'endroit précis où elle sert. */
  const fini = restant <= 0;
  const pas = restant > 3600 ? 60 : 1;

  useEffect(() => {
    if (fini) return undefined;

    // Mise à jour fonctionnelle : la minuterie n'a pas besoin de
    // connaître `restant`, donc n'a pas à être recréée quand il change.
    const minuterie = setInterval(() => {
      setRestant((v) => Math.max(0, v - pas));
    }, pas * 1000);

    return () => clearInterval(minuterie);
  }, [fini, pas]);

  const texte = formater(restant);

  /* Rebours terminé : la pilule devient le bouton qui ouvre la mesure.
     Deux éléments distincts auraient laissé une pilule morte à l'écran
     à côté du bouton vivant. */
  if (!texte) {
    return (
      <button type="button" className="rebours rebours--pret" onClick={onDeverrouiller}>
        <LockOpen size={15} aria-hidden="true" />
        Mesurer ma taille
      </button>
    );
  }

  return (
    <div className="rebours">
      <Clock size={15} aria-hidden="true" />
      <span>{texte}</span>
    </div>
  );
}

export default CompteARebours;
