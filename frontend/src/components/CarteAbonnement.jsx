import { useState } from 'react';
import { Check, Lock, Send } from 'lucide-react';

/* L'écran que voit un compte non abonné, à l'intérieur de l'application.

   DEUX CHOSES QUE CETTE CARTE NE FAIT PAS, et ce sont les deux décisions
   de conception.

   1. ELLE NE FLOUTE PAS L'ESTIMATION.

   Le concurrent affiche la taille projetée derrière un flou avec un
   cadenas. C'est efficace, et c'est impossible ici : la page d'accueil
   du site promet en toutes lettres « Estimation gratuite — sans compte »
   et « aucun résultat flouté ». Reprendre le flou reviendrait à vendre
   une chose et à en livrer une autre, sur la même marque, à deux clics
   d'écart. Ce qui est payant, c'est le PROGRAMME quotidien : exercices,
   nutrition, sommeil, aperçus. L'estimation reste visible, entière.

   2. ELLE NE DEMANDE PAS À L'ENFANT DE FAIRE PAYER SES PARENTS.

   Le concurrent affiche « Ask your parents to subscribe » à un mineur.
   En UE, la directive 2005/29/CE, annexe I, point 28 interdit
   *per se* — sans test de proportionnalité, c'est sur la liste noire —
   « une exhortation directe des enfants à acheter ou à persuader leurs
   parents d'acheter ». Un bouton « demande à tes parents de s'abonner »
   tombe dedans mot pour mot.

   Le chemin retenu est différent en nature, pas en habillage : l'enfant
   PARTAGE SES RÉSULTATS. Il n'est invité ni à acheter, ni à convaincre.
   C'est la page destinée au parent qui présente l'offre, à un adulte,
   et c'est lui qui décide. Le tuyau existait déjà (ParentPage et le lien
   `?parent=<id>`), il ne manquait que de le rendre atteignable depuis
   l'application. */

const CONTENU = {
  exercices: {
    titre: 'Ta séance du jour',
    lignes: [
      'Six exercices par jour, cinq minutes trente',
      'Un minuteur guidé, exercice par exercice',
      'Le bénéfice réel de chacun, sans promesse en l’air',
    ],
  },
  nutrition: {
    titre: 'Ton journal alimentaire',
    lignes: [
      'Des objectifs calculés sur TON poids, pas les mêmes pour tous',
      'Calories, protéines, calcium et vitamine D suivis chaque jour',
      'Un catalogue de plus de cinquante aliments',
    ],
  },
  sommeil: {
    titre: 'Ton suivi de sommeil',
    lignes: [
      'Tes sept dernières nuits en un coup d’œil',
      'Un objectif de durée, et où tu en es',
    ],
  },
  apercus: {
    titre: 'Tes aperçus',
    lignes: [
      'Ta courbe de taille dans le temps',
      'Ta vitesse de croissance en cm/an, avec sa marge d’erreur',
      'Le pilier sur lequel il te reste le plus à gagner',
    ],
  },
  accueil: {
    titre: 'Ton suivi quotidien',
    lignes: [
      'Ta mesure hebdomadaire et ta courbe',
      'Les six piliers de ta croissance, notés',
      'Ta série de jours consécutifs',
    ],
  },
};

function CarteAbonnement({ zone = 'accueil', onAbonner, idEnfant }) {
  const [copie, setCopie] = useState(false);
  const bloc = CONTENU[zone] || CONTENU.accueil;

  const lienParent = idEnfant
    ? `${window.location.origin}/?parent=${encodeURIComponent(idEnfant)}`
    : '';

  const partager = async () => {
    if (!lienParent) return;
    const texte =
      'Voici mon estimation de taille sur Grandimi, et le programme qui va avec.';

    /* `navigator.share` d'abord : sur un téléphone il ouvre le vrai
       sélecteur de partage, donc WhatsApp ou les messages — c'est par là
       que passe réellement un adolescent. Le presse-papier est le repli
       du bureau, où l'API n'existe pas. */
    try {
      if (navigator.share) {
        await navigator.share({ text: texte, url: lienParent });
        return;
      }
    } catch {
      // Partage annulé : on retombe sur la copie, pas sur une erreur.
    }

    try {
      await navigator.clipboard.writeText(lienParent);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  };

  return (
    <section className="verrou">
      <span className="verrou__icone">
        <Lock size={24} aria-hidden="true" />
      </span>

      <h2 className="verrou__titre">{bloc.titre}</h2>
      <p className="verrou__soustitre">Cette partie fait partie de l’abonnement.</p>

      <ul className="verrou__liste">
        {bloc.lignes.map((l) => (
          <li key={l}>
            <Check size={15} aria-hidden="true" />
            <span>{l}</span>
          </li>
        ))}
      </ul>

      <button type="button" className="verrou__principal" onClick={onAbonner}>
        Voir l’abonnement
      </button>

      {idEnfant && (
        <>
          <button type="button" className="verrou__partage" onClick={partager}>
            <Send size={16} aria-hidden="true" />
            {copie ? 'Lien copié' : 'Envoyer mes résultats à un parent'}
          </button>
          {/* Dit ce que fait le bouton, plutôt que de laisser croire
              qu'il déclenche un achat. C'est le parent qui voit l'offre,
              et c'est lui qui décide. */}
          <p className="verrou__note">
            Il recevra ton estimation et le détail du programme. C’est lui qui
            choisit.
          </p>
        </>
      )}
    </section>
  );
}

export default CarteAbonnement;
