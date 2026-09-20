import { useEffect, useState } from 'react';
import { Clock, LockOpen } from 'lucide-react';

/* Le compte à rebours de la prochaine mesure.

   Il part d'une DATE d'ouverture, pas d'un nombre de secondes.

   La première version recevait une durée du serveur, au motif qu'une
   date absolue dépendrait de l'horloge du téléphone. C'était la mauvaise
   précaution : les deux bornes du calcul serveur sont des dates à minuit,
   donc la durée valait toujours un multiple de 24 h. En conditions
   réelles, le rebours annonçait « 7j 0h 0m » du matin au soir, puis
   sautait d'un bloc entier à minuit — jamais une heure ni une minute qui
   bouge, c'est-à-dire l'inverse d'un compte à rebours.

   La règle du produit est un JOUR, pas un instant. Le téléphone reçoit
   donc ce jour et calcule lui-même le temps qui le sépare de SON minuit
   local — il est le seul à connaître son fuseau, et c'est déjà lui qui
   fournit le jour courant au serveur. */

// Minuit local du jour donné (ISO). `new Date('2026-09-27')` est
// volontairement évité : cette forme est interprétée en UTC, ce qui
// décale l'échéance d'une ou deux heures selon la saison.
function minuitLocal(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j, 0, 0, 0, 0).getTime();
}

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

function restantDepuis(dateOuverture) {
  if (!dateOuverture) return 0;
  return Math.max(0, Math.floor((minuitLocal(dateOuverture) - Date.now()) / 1000));
}

function CompteARebours({ dateOuverture, onDeverrouiller }) {
  const [restant, setRestant] = useState(() => restantDepuis(dateOuverture));

  /* Resynchronisation quand le serveur renvoie une autre date (après une
     mesure enregistrée, par exemple).

     Ajusté PENDANT le rendu, pas depuis un effet. Un effet ferait peindre
     une première fois l'ancienne valeur, puis déclencherait un second
     rendu : le rebours afficherait brièvement le temps d'avant. Comparer
     la propriété à la dernière vue est le motif que React recommande pour
     ce cas ; il relance le rendu du composant avant de peindre. */
  const [derniereRecue, setDerniereRecue] = useState(dateOuverture);
  if (dateOuverture !== derniereRecue) {
    setDerniereRecue(dateOuverture);
    setRestant(restantDepuis(dateOuverture));
  }

  /* Une seconde quand la fin approche, une minute sinon. À six jours de
     distance, se réveiller soixante fois par minute pour changer un
     chiffre qui ne bouge pas vide la batterie sans rien afficher de plus.

     Ces deux valeurs sont dérivées AVANT l'effet, pour que sa liste de
     dépendances ne contienne que des choses stables. Écrite avec
     `restant` dedans, elle recrée une minuterie à chaque battement. */
  const fini = restant <= 0;
  const pas = restant > 3600 ? 60 : 1;

  useEffect(() => {
    if (fini) return undefined;

    /* On RECALCULE depuis la date plutôt que de décrémenter un compteur.
       Un téléphone met son onglet en veille : au réveil, un compteur
       décrémenté a pris des minutes de retard et annonce une échéance
       déjà passée. Recalculer coûte une soustraction et ne dérive
       jamais. */
    const minuterie = setInterval(() => {
      setRestant(restantDepuis(dateOuverture));
    }, pas * 1000);

    return () => clearInterval(minuterie);
  }, [fini, pas, dateOuverture]);

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
