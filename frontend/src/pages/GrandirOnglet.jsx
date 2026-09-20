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
const SommeilPage = lazy(() => import('./SommeilPage'));

const SECTIONS = [
  { id: 'exercices', label: 'Exercices' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'sommeil', label: 'Sommeil' },
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
        {section === 'sommeil' && <SommeilPage />}
      </Suspense>
    </>
  );
}

export default GrandirOnglet;
