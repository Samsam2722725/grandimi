import { lazy, Suspense, useState } from 'react';
import Spinner from '../components/Spinner';

/* L'onglet Grandir et ses sections.

   Trois sections, pas six sous-onglets. L'audit reprochait neuf cibles
   de navigation sur un écran de téléphone (la barre du bas plus les six
   sous-onglets du plan) ; un sélecteur de trois en ajoute trois, ce qui
   reste lisible et correspond à ce que fait le concurrent.

   Le regroupement n'est pas arbitraire : « Grandir » rassemble les trois
   choses qu'on FAIT chaque jour. L'accueil montre où l'on en est, les
   aperçus montrent d'où l'on vient ; ici on agit. */

const SeanceExercices = lazy(() => import('./GrandirPage'));
const NutritionPage = lazy(() => import('./NutritionPage'));

/* Le sommeil arrive à l'étape 5 et sa section est DÉCLARÉE mais éteinte,
   pour la même raison que l'onglet Communauté : un bouton qui n'ouvre
   que « bientôt » apprend à l'utilisateur que certains boutons ne
   servent à rien, et il ne l'oubliera pas le jour où celui-là marchera.
   La bascule tient en un mot. */
const SOMMEIL_ACTIF = false;

const SECTIONS = [
  { id: 'exercices', label: 'Exercices' },
  { id: 'nutrition', label: 'Nutrition' },
  ...(SOMMEIL_ACTIF ? [{ id: 'sommeil', label: 'Sommeil' }] : []),
];

function GrandirOnglet({ onVoirPlanComplet }) {
  const [section, setSection] = useState('exercices');

  return (
    <>
      {/* `role="tablist"` et non une simple rangée de boutons : c'est ce
          qui fait annoncer « onglet 2 sur 2 » à un lecteur d'écran, et
          ce qui active les flèches gauche/droite du clavier dans les
          navigateurs qui l'implémentent. */}
      <div className="sections" role="tablist" aria-label="Sections de Grandir">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className={`section ${section === s.id ? 'section--actif' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<Spinner size="page" label="Chargement..." />}>
        {section === 'exercices' && (
          <SeanceExercices onVoirPlanComplet={onVoirPlanComplet} />
        )}
        {section === 'nutrition' && <NutritionPage />}
      </Suspense>
    </>
  );
}

export default GrandirOnglet;
