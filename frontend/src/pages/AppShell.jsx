import { lazy, Suspense, useRef, useState } from 'react';
import Spinner from '../components/Spinner';
import CarteAbonnement from '../components/CarteAbonnement';
import CoachMark from '../components/CoachMark';
import { ETAPES_TOUR, useTourPriseEnMain } from '../hooks/useTourPriseEnMain';
import EnteteApp from '../components/EnteteApp';
import BarreOnglets from '../components/BarreOnglets';
import { ONGLETS, ongletValide } from '../lib/onglets';
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
const GrandirOnglet = lazy(() => import('./GrandirOnglet'));
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
  onGoToAccount,
  onReglages,
  abonne = true,
  onAbonner,
  idEnfant,
}) {
  /* L'onglet survit au rechargement.

     Sur un téléphone, recharger n'est pas un geste rare : revenir sur
     l'onglet du navigateur après quelques minutes suffit souvent à
     refaire tourner la page. Sans ceci, on retombait à chaque fois sur
     l'onglet d'arrivée, en perdant l'endroit où l'on était.

     `sessionStorage` et non `localStorage` : c'est le fil d'une visite,
     pas une préférence. Revenir demain doit rouvrir l'onglet d'arrivée,
     pas le dernier écran consulté la veille. L'accès est enveloppé : en
     navigation privée, le simple fait de lire peut lever. */
  const [onglet, setOnglet] = useState(() => {
    try {
      const garde = sessionStorage.getItem('grandimi:onglet');
      if (garde && ongletValide(garde)) return garde;
    } catch {
      // Stockage indisponible : on retombe sur l'onglet d'arrivée.
    }
    return ongletValide(ongletInitial) ? ongletInitial : 'accueil';
  });

  /* Où poser le focus après un changement d'onglet.

     Sans ça, un utilisateur au clavier reste sur le bouton d'onglet et
     doit retraverser tout l'en-tête pour atteindre le contenu qu'il
     vient d'ouvrir ; un lecteur d'écran, lui, n'annonce rien du tout —
     l'écran a changé sans qu'aucun mot ne le dise. */
  const zoneContenu = useRef(null);

  /* Le plan du mois est un écran DANS l'onglet Grandir, pas un onglet.
     Il se referme au changement d'onglet : revenir sur Grandir depuis
     l'accueil doit rouvrir la séance du jour, pas l'écran où l'on était
     parti il y a dix minutes. */
  const [planComplet, setPlanComplet] = useState(false);

  /* Le tour ne se joue QUE pour un abonné, et QUE sur l'accueil.

     Deux de ses trois bulles désignent l'anneau et le compte à rebours,
     qui n'existent pas dans l'état verrouillé : jouées là, elles
     pointeraient le vide. Un non-abonné a de toute façon une carte qui
     lui explique l'application en toutes lettres — c'est une meilleure
     présentation qu'un tour guidé. */
  const { ouvert: tourOuvert, terminer: finirTour } = useTourPriseEnMain(
    abonne && onglet === 'accueil',
  );

  const changerOnglet = (id) => {
    setOnglet(id);
    setPlanComplet(false);
    try {
      sessionStorage.setItem('grandimi:onglet', id);
    } catch {
      // Écriture refusée : l'onglet marche quand même, il ne survivra
      // simplement pas au rechargement.
    }

    /* On remonte en haut à chaque changement. Sans ça, passer d'un onglet
       long défilé à un onglet court affiche ce dernier par le bas, parfois
       entièrement vide — l'utilisateur croit que l'onglet ne marche pas.
       `instant` et non `smooth` : ce n'est pas un déplacement dans une
       page, c'est un changement d'écran. */
    window.scrollTo({ top: 0, behavior: 'instant' });
    zoneContenu.current?.focus();
  };

  return (
    <div className="night app-shell">
      {/* La roue crantée ouvre les horaires du plan (lever, coucher,
          jours de sport) : c'est le seul écran de réglage qui existe, et
          le plan entier en dépend.

          L'avatar ouvre le compte, d'où l'on ressort vers l'accueil
          marchand : c'est la seule sortie de l'application. Une prop
          `onQuitter` traînait ici depuis l'étape 0 ; elle ne servait plus
          depuis que le plan du mois se referme sur lui-même, et personne
          ne l'appelait. Retirée plutôt que laissée à faire croire qu'une
          seconde sortie existe. */}
      <EnteteApp onCompte={onGoToAccount} onReglages={onReglages} />

      {/* `tabIndex={-1}` : la zone devient une cible de focus programmée
          sans entrer dans l'ordre de tabulation. `key` force React à la
          remonter à chaque onglet, pour que le lecteur d'écran reparte
          du début du nouvel écran plutôt que de rester au milieu de
          l'ancien. */}
      <main
        className="app-contenu"
        key={onglet}
        ref={zoneContenu}
        tabIndex={-1}
        aria-label={ONGLETS.find((o) => o.id === onglet)?.label}
      >
        <Suspense fallback={<Spinner size="page" label="Chargement..." />}>
          {/* L'accueil d'un non-abonné garde son estimation — la page
              d'accueil du site promet « aucun résultat flouté », et la
              flouter ici vendrait une chose pour en livrer une autre sur
              la même marque. C'est le SUIVI quotidien qui est payant. */}
          {onglet === 'accueil' &&
            (abonne ? (
              <AccueilPage
                predictionData={predictionData}
                onAllerAuPlan={() => changerOnglet('grandir')}
              />
            ) : (
              <>
                <ApercuLibre predictionData={predictionData} />
                <CarteAbonnement zone="accueil" onAbonner={onAbonner} idEnfant={idEnfant} />
              </>
            ))}

          {/* L'onglet Grandir est maintenant la SÉANCE du jour : six
              exercices, un bandeau de sept jours, un écran
              d'entraînement. C'est ce qui fait disparaître la double
              navigation signalée à l'audit — la barre du bas plus les six
              sous-onglets du plan faisaient neuf cibles sur un écran de
              téléphone.

              Le plan du mois n'est pas supprimé pour autant : c'est le
              produit payant, et il reste à un geste, derrière « Voir le
              plan du mois en entier ». Les étapes 4 et 5 en sortiront la
              nutrition et le sommeil ; ce qui restera sera le plan
              mensuel seul. */}
          {onglet === 'grandir' && !planComplet && (
            abonne ? (
              <GrandirOnglet onVoirPlanComplet={() => setPlanComplet(true)} />
            ) : (
              <CarteAbonnement zone="exercices" onAbonner={onAbonner} idEnfant={idEnfant} />
            )
          )}

          {onglet === 'grandir' && planComplet && abonne && (
            <GrowthPlanPage
              predictionData={predictionData}
              avecEntete={false}
              onBackHome={() => setPlanComplet(false)}
              onGoToAccount={onGoToAccount}
            />
          )}

          {onglet === 'apercus' &&
            (abonne ? (
              <ApercusPage />
            ) : (
              <CarteAbonnement zone="apercus" onAbonner={onAbonner} idEnfant={idEnfant} />
            ))}

          {onglet === 'communaute' && <CommunautePage />}
        </Suspense>
      </main>

      {tourOuvert && <CoachMark etapes={ETAPES_TOUR} onFini={finirTour} />}

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

/* L'estimation seule, pour un compte non abonné.

   Volontairement minuscule : ce n'est pas l'accueil amputé, c'est le
   seul chiffre auquel il a droit — et il y a droit entièrement, sans
   flou ni cadenas, parce que la page d'accueil du site le promet. */
function ApercuLibre({ predictionData }) {
  const estimation = predictionData?.predicted_height_cm;
  const intervalle = predictionData?.confidence_range;
  if (!estimation) return null;

  return (
    <div className="libre">
      <p className="libre__label">Taille projetée</p>
      <p className="libre__chiffre">
        {Math.round(estimation)}
        <span className="libre__unite">cm</span>
      </p>
      {intervalle?.min != null && intervalle?.max != null && (
        <p className="libre__intervalle">
          entre {Math.round(intervalle.min)} et {Math.round(intervalle.max)} cm
        </p>
      )}
    </div>
  );
}
