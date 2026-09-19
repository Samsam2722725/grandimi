import { lazy, Suspense, useState } from 'react';
import Spinner from '../components/Spinner';
import EnteteApp from '../components/EnteteApp';
import BarreOnglets from '../components/BarreOnglets';
import { ongletValide } from '../lib/onglets';
/* funnel.css porte les jetons `--funnel-*` sur `.night` ; app-shell.css ne
   fait que les consommer. Sans le premier, le second n'a aucune valeur à
   résoudre et la coque s'affiche en noir sur noir. L'ordre compte. */
import '../styles/funnel.css';
import '../styles/app-shell.css';

/* Chaque onglet est un morceau séparé, pour la même raison qu'en haut de
   App.jsx : ouvrir l'application ne doit pas télécharger les trois autres
   onglets, dont un qui embarque des graphiques. Le premier onglet affiché
   est le seul à être demandé au réseau. */
const AccueilPage = lazy(() => import('./AccueilPage'));
const ApercusPage = lazy(() => import('./ApercusPage'));
const CommunautePage = lazy(() => import('./CommunautePage'));
const GrowthPlanPage = lazy(() => import('./GrowthPlanPage'));

/* Coque de l'application connectée.

   Elle ne connaît RIEN du contenu des onglets : elle pose l'en-tête, la
   barre basse, et décide lequel des quatre écrans occupe l'espace du
   milieu. Tout ce qui est métier vit dans les pages d'onglet. C'est ce qui
   permettra aux étapes 2 à 6 d'ajouter un écran sans toucher à ce fichier.

   L'onglet actif est un état local, pas une adresse : cette application
   est une seule page (cf. le commentaire en tête d'App.jsx) et n'a pas de
   routeur. Conséquence assumée et connue : le bouton « retour » du
   navigateur ne revient pas à l'onglet précédent, il quitte l'application.
   Le jour où ça gênera, c'est un routeur qu'il faudra, pas un rustine
   d'historique. */
function AppShell({
  predictionData,
  ongletInitial = 'accueil',
  onQuitter,
  onGoToAccount,
  onReglages,
}) {
  const [onglet, setOnglet] = useState(() =>
    ongletValide(ongletInitial) ? ongletInitial : 'accueil',
  );

  const changerOnglet = (id) => {
    setOnglet(id);
    /* On remonte en haut à chaque changement. Sans ça, passer d'un onglet
       long défilé à un onglet court affiche ce dernier par le bas, parfois
       entièrement vide — l'utilisateur croit que l'onglet ne marche pas.
       `instant` et non `smooth` : ce n'est pas un déplacement dans une
       page, c'est un changement d'écran. */
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="night app-shell">
      {/* La roue crantée ouvre les horaires du plan (lever, coucher,
          jours de sport) : c'est le seul écran de réglage qui existe, et
          le plan entier en dépend. L'avatar ouvre le compte, d'où l'on
          ressort vers l'accueil marchand — c'est aujourd'hui la seule
          sortie de l'application, puisque l'en-tête du plan qui portait
          « ← Accueil » est masqué ici. */}
      <EnteteApp onCompte={onGoToAccount} onReglages={onReglages} />

      <main className="app-contenu">
        <Suspense fallback={<Spinner size="page" label="Chargement..." />}>
          {onglet === 'accueil' && (
            <AccueilPage
              predictionData={predictionData}
              onAllerAuPlan={() => changerOnglet('grandir')}
            />
          )}

          {/* L'onglet Grandir réutilise le plan existant tel quel, sans son
              en-tête : la coque en pose déjà un, et deux en-têtes empilés
              mangent un tiers de l'écran sur un téléphone.

              Il garde ses propres sous-onglets (Aujourd'hui / Exercices /
              Nutrition / Sommeil) pour l'instant. Les étapes 3 à 5 les
              sortiront en écrans à part entière ; les déplacer maintenant
              casserait un écran qui fonctionne pour ne rien livrer de
              plus. */}
          {onglet === 'grandir' && (
            <GrowthPlanPage
              predictionData={predictionData}
              avecEntete={false}
              onBackHome={onQuitter}
              onGoToAccount={onGoToAccount}
            />
          )}

          {onglet === 'apercus' && <ApercusPage />}

          {onglet === 'communaute' && <CommunautePage />}
        </Suspense>
      </main>

      <BarreOnglets
        actif={onglet}
        onChange={changerOnglet}
        /* L'assistance ouvre encore le compte : l'écran de conversation est
           l'étape 8. Un bouton qui n'ouvre rien du tout serait pire qu'un
           bouton qui ouvre l'endroit où l'on peut nous écrire. */
        onAssistance={onGoToAccount}
      />
    </div>
  );
}

export default AppShell;
