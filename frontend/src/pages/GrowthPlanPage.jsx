import { useState, useEffect } from 'react';
import { ArrowUp, CalendarCheck, ChevronRight, Ruler, Settings, TrendingUp, User } from 'lucide-react';
import Spinner from '../components/Spinner';
/* funnel.css porte les jetons `--funnel-*` sur la classe `.night` : sans lui,
   le skin sombre plus bas dans growth-plan.css n'a aucune valeur à résoudre. */
import '../styles/funnel.css';
import '../styles/growth-plan.css';
import '../styles/parcours.css';
import apiClient from '../lib/api';
import { APERCU_PLAN, PLAN_APERCU } from '../lib/plan-apercu';
/* Le graphique à deux trajectoires existait déjà dans le projet — construit
   pour cet écran précisément (il lit predicted_height_cm ET
   potential_height_cm, tous deux verrouillés avant paiement) — mais n'était
   monté nulle part. C'est la courbe que le résultat sous cadenas promettait ;
   elle apparaît maintenant ici, une fois l'accès payé, avec les seules
   valeurs que le calcul a réellement produites. */
import { GrowthProjectionChart } from '../components/ui/growth-projection-chart';
import { MaTaille } from '../components/ui/ma-taille';
import { TailleAccueil } from '../components/ui/taille-accueil';
import { RepasDuJour } from '../components/ui/repas';
import { Reglages } from '../components/ui/reglages';
import { genererCarteResultat, partagerCarte } from '../lib/share-card';
import { pointsFaibles } from '../lib/offres';
import { capture } from '../lib/analytics';
import {
  CLE_SEANCE,
  SeanceGuidee,
} from '../components/ui/app-grandir';
import {
  CARNET_PARCOURS,
  FicheSeance,
  JOURS_PAR_NIVEAU,
  NB_JOURS_PARCOURS,
  Parcours,
  PreferencesParcours,
  Seances,
  cleJourParcours,
  cleLibre,
  clePref,
  dureeSecondes,
  etatParcours,
  jourDansNiveau,
  lirePrefs,
  niveauDuJour,
  numeroJourParcours,
  piments,
  profilParcours,
  seanceDuParcours,
  seanceLibre,
} from '../components/ui/parcours';
import { MonteeEnGamme } from '../components/ui/montee-en-gamme';
import { VisiteGuidee, visiteDejaVue } from '../components/ui/visite-guidee';

// Date au format YYYY-MM-DD dans le fuseau local (pas toISOString, qui
// bascule sur UTC et peut donner la veille ou le lendemain selon l'heure).
function dateDuJour(decalageJours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/* Les 12 thèmes mensuels du plan (internal/planner/monthly_plan.go,
   themesMensuels), dans l'ordre du serveur : le thème n°k est servi quand
   on demande month=k. */
// Le test du mur, coché chaque jour depuis la carte posture de l'accueil.
const CLE_TEST_MUR = 'posture-test-mur';

const THEMES = [
  'Le sommeil', 'La posture', 'Les protéines', 'L’étirement et la suspension',
  'Le dos et les épaules', 'La régularité du sommeil', 'Le calcium et la vitamine D',
  'La mobilité des hanches', 'La natation et le cardio', 'Le gainage',
  'La récupération et le stress', 'Le bilan',
];

/* Le plan démarre par SON point faible : le paywall promet « on corrige
   d'abord ce qui te freine ». Ses points faibles (pointsFaibles, dans
   l'ordre) donnent les premiers thèmes ; viennent ensuite les autres dans
   l'ordre habituel, le bilan toujours en dernier. Le serveur ne change pas :
   on lui demande simplement le thème voulu. */
const THEME_DU_POINT_FAIBLE = {
  'ta posture': 2,
  'ton sommeil': 1,
  'ton téléphone au lit': 1,
  'ton heure de coucher': 6,
  'tes protéines': 3,
  'ton calcium': 7,
  'ton sport': 9,
};

function ordreDesThemes(faibles) {
  const ordre = [];
  for (const f of faibles) {
    const n = THEME_DU_POINT_FAIBLE[f];
    if (n && !ordre.includes(n)) ordre.push(n);
  }
  for (let n = 1; n <= 11; n++) if (!ordre.includes(n)) ordre.push(n);
  ordre.push(12);
  return ordre;
}

function GrowthPlanPage({ predictionData, onBackHome, onGoToAccount, onMiseAJourPrediction, onLogout, onAbonnementTermine }) {
  const [plan, setPlan] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('taille');
  // Comme Taller, « grow » s'ouvre sur les séances (Train).
  const [sousOnglet, setSousOnglet] = useState('seances');
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [partageEnCours, setPartageEnCours] = useState(false);
  // Onglet Taille : le détail (mesure, courbe complète) et les points à corriger.
  const [tailleDetail, setTailleDetail] = useState(false);
  const [pointsOuverts, setPointsOuverts] = useState(false);
  const [seanceOuverte, setSeanceOuverte] = useState(false);
  const [moisAbonnement, setMoisAbonnement] = useState(1);
  const [testMurOuvert, setTestMurOuvert] = useState(false);

  /* Le parcours (16 niveaux de 7 jours) : les jours déjà faits, la fiche
     ouverte et la séance en cours. En aperçu, ?parcours=N simule N jours faits. */
  const [joursFaits, setJoursFaits] = useState(() => {
    const simules = APERCU_PLAN ? Number(new URLSearchParams(window.location.search).get('parcours')) || 0 : 0;
    return new Set(Array.from({ length: simules }, (_, i) => i + 1));
  });
  // Le serveur coche OU décoche : tant que le carnet n'est pas lu, on
  // n'y écrit rien, sinon refaire un jour déjà noté l'effacerait.
  const [carnetLu, setCarnetLu] = useState(APERCU_PLAN);
  // Les deux réglages du parcours (temps par jour, douleur), lus du carnet.
  const [prefs, setPrefs] = useState({});
  // La fiche ouverte : { n } pour un jour du parcours, { libre } pour une séance libre.
  const [fiche, setFiche] = useState(null);
  const [seanceParcours, setSeanceParcours] = useState(null);

  /* Mesure de l'usage (après paiement) : savoir qui revient, qui fait sa
     séance, qui coche, pour comprendre qui résilie. Lu par
     scripts/stats.mjs, section « Dans l'app ». */
  useEffect(() => {
    capture('app_ouverte', { etape: 'accueil' });
  }, []);
  /* L'offre du client : la taille estimée est réservée aux offres 3 mois
     et À vie. Tant qu'on ne sait pas (erreur, ancienne offre), on montre :
     mieux vaut donner trop que bloquer quelqu'un qui a payé. */
  const [planKey, setPlanKey] = useState(() =>
    APERCU_PLAN && new URLSearchParams(window.location.search).get('offre') ? new URLSearchParams(window.location.search).get('offre') : null,
  );
  useEffect(() => {
    if (APERCU_PLAN) return;
    apiClient.getSubscription().then((s) => setPlanKey(s?.plan_key || null)).catch(() => {});
  }, []);
  const tailleVerrouillee = planKey === 'm1' || planKey === 'm1_normal';
  const [monteeOuverte, setMonteeOuverte] = useState(false);
  const [visite, setVisite] = useState(() => !visiteDejaVue() || new URLSearchParams(window.location.search).get('visite') === '1');

  // Todo-liste quotidienne : quelles tâches sont cochées aujourd'hui, et
  // quel "pourquoi" est actuellement déplié.
  const [completedKeys, setCompletedKeys] = useState(new Set());
  const [openWhy, setOpenWhy] = useState(new Set());
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchPlan = async () => {
      if (APERCU_PLAN) {
        setPlan(PLAN_APERCU.plan);
        setMonthlyPlan(PLAN_APERCU.monthly_plan);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // Le contenu dépend du mois d'abonnement en cours : chaque mois
        // payé donne un plan différent. Si le statut est illisible, on
        // sert le premier mois plutôt que de bloquer l'accès.
        let mois = 1;
        try {
          const statut = await apiClient.checkPremium();
          if (statut?.subscription_month > 0) mois = statut.subscription_month;
        } catch {
          mois = 1;
        }

        const data = await apiClient.getGrowthPlan({
          age: predictionData.age,
          sex: predictionData.sex,
          current_height_cm: predictionData.current_height_cm,
          predicted_height_cm: predictionData.predicted_height_cm,
          weight_kg: predictionData.weight_kg,
          // Les réponses du questionnaire : sans elles, le serveur prenait
          // ses valeurs par défaut et tout le monde lisait « tu bouges
          // 30 min par jour » dans un plan dit personnalisé.
          sleep_hours_per_night: predictionData.sleep_hours_per_night || undefined,
          exercise_min_per_day: predictionData.exercise_min_per_day || undefined,
          month: ordreDesThemes(pointsFaibles(predictionData))[(mois - 1) % 12],
        });

        setMoisAbonnement(mois);
        setPlan(data.plan);
        setMonthlyPlan(data.monthly_plan);
        setLoading(false);
      } catch (err) {
        // 402 : plus d'abonnement actif. On le dit clairement au lieu du
        // message brut du serveur (« abonnement requis »).
        setError(err.status === 402 ? 'termine' : err.message);
        setLoading(false);
      }
    };

    fetchPlan();
    if (APERCU_PLAN) return;

    // La todo du jour et l'historique sont indépendants du plan : une
    // panne ici ne doit pas empêcher d'afficher le plan lui-même, donc on
    // avale l'erreur plutôt que de la remonter à setError.
    apiClient
      .getTodayTasks(dateDuJour())
      .then((res) => setCompletedKeys(new Set(res.completed_keys || [])))
      .catch(() => {});

    apiClient
      .getTodayTasks(CARNET_PARCOURS)
      .then((res) => {
        const cles = res.completed_keys || [];
        setJoursFaits(new Set(cles.map(numeroJourParcours).filter(Boolean)));
        setPrefs(lirePrefs(cles));
        setCarnetLu(true);
      })
      .catch(() => {});

    apiClient
      .getTaskHistory(7)
      .then((res) => setHistory(res.history || []))
      .catch(() => {});
  }, [predictionData]);

  const basculerTache = (cle) => {
    if (!completedKeys.has(cle)) {
      const famille = cle.startsWith('nutri-') ? 'nutrition' : cle.startsWith('sommeil-h-') ? 'sommeil' : cle === 'posture-test-mur' ? 'posture' : cle === 'seance-du-jour' ? 'seance' : cle.startsWith('parcours-') ? 'parcours' : cle.startsWith('libre-') ? 'libre' : 'tache';
      capture('app_coche', { etape: famille });
    }
    setCompletedKeys((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });

    if (APERCU_PLAN) return;
    apiClient.toggleTask(cle, dateDuJour()).catch(() => {
      // Échec réseau : on annule l'optimisme plutôt que de laisser
      // l'écran mentir sur ce qui est réellement enregistré.
      setCompletedKeys((prev) => {
        const suivant = new Set(prev);
        if (suivant.has(cle)) suivant.delete(cle);
        else suivant.add(cle);
        return suivant;
      });
    });
  };

  const basculerPourquoi = (cle) => {
    setOpenWhy((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  };

  /* Un jour du parcours terminé. Seul un jour nouveau fait avancer : le
     noter dans le carnet (tous les jours faits) et à la date du jour (le
     jour d'aujourd'hui est fait, la série compte). Refaire un jour déjà
     fait ne change rien. */
  const terminerJour = (n) => {
    capture('seance_terminee', { etape: `j${n}` });
    if (joursFaits.has(n)) return;
    setJoursFaits((prev) => new Set(prev).add(n));
    if (!APERCU_PLAN && carnetLu) {
      apiClient.toggleTask(cleJourParcours(n), CARNET_PARCOURS).catch(() => {
        setJoursFaits((prev) => {
          const suivant = new Set(prev);
          suivant.delete(n);
          return suivant;
        });
      });
    }
    if (!completedKeys.has(cleJourParcours(n))) basculerTache(cleJourParcours(n));
    if (!completedKeys.has(CLE_SEANCE)) basculerTache(CLE_SEANCE);
  };

  // Une séance libre terminée : elle compte pour la série, pas pour le parcours.
  const terminerLibre = (id) => {
    capture('seance_terminee', { etape: id });
    if (!completedKeys.has(cleLibre(id))) basculerTache(cleLibre(id));
  };

  /* Changer un réglage : le serveur coche ou décoche, donc on décoche
     l'ancienne valeur avant de cocher la nouvelle. */
  const changerPref = (groupe, valeur) => {
    const ancienne = prefs[groupe];
    if (ancienne === valeur) return;
    setPrefs((p) => ({ ...p, [groupe]: valeur }));
    if (APERCU_PLAN || !carnetLu) return;
    if (ancienne) apiClient.toggleTask(clePref(groupe, ancienne), CARNET_PARCOURS).catch(() => {});
    apiClient.toggleTask(clePref(groupe, valeur), CARNET_PARCOURS).catch(() => {});
  };

  const profil = profilParcours(predictionData, prefs);
  const ouvrirJour = (n) => setFiche({ n });
  const ouvrirLibre = (libre) => setFiche({ libre });
  const seanceDeLaFiche = fiche ? (fiche.libre ? seanceLibre(fiche.libre, profil) : seanceDuParcours(fiche.n, profil)) : null;

  const commencer = (etapes) => {
    const { n, libre } = fiche;
    capture('seance_commencee', { etape: libre || `j${n}` });
    setSeanceParcours({ n, libre, titre: seanceDeLaFiche.titre, etapes, nouveau: libre ? false : !joursFaits.has(n) });
    setFiche(null);
  };

  // Le texte de l'écran de fin : trophée au bout des 7 jours.
  const finDuJour = ({ n, libre, nouveau }) => {
    if (libre) return { emoji: '💪', titre: 'Séance terminée', texte: 'Bien joué. Elle compte pour ta série d’aujourd’hui.' };
    const jour = jourDansNiveau(n);
    const niveau = niveauDuJour(n);
    if (!nouveau) return { emoji: '💪', titre: 'Séance refaite', texte: 'Bien joué. Ton prochain jour t’attend sur ton parcours.' };
    if (n === NB_JOURS_PARCOURS) return { emoji: '🏆', titre: 'Parcours terminé', texte: 'Tu as fait les 112 jours. Garde ces habitudes : ton corps les a apprises.' };
    if (jour === JOURS_PAR_NIVEAU) return { emoji: '🏆', titre: `Niveau ${niveau} terminé`, texte: `Trophée gagné. Le niveau ${niveau + 1} ${piments(niveau + 1)} se débloque demain, un cran plus dur.` };
    return { emoji: '🔥', titre: `Jour ${jour} terminé`, texte: `Le jour ${jour + 1} se débloque demain. Reviens pour garder ta série.` };
  };

  if (loading) {
    return (
      <div className="night growth-plan-page">
        <Spinner size="page" label="Création de ton plan personnalisé..." />
      </div>
    );
  }

  if (error === 'termine') {
    return (
      <div className="night growth-plan-page">
        <div className="error-container app-termine">
          <p className="app-termine-emoji" aria-hidden="true">⏸️</p>
          <h1 className="app-titre">Ton abonnement n’est plus actif</h1>
          <p className="app-texte">Ton parcours, ta série et tes réglages sont gardés. Reprends ton abonnement pour retrouver ton plan là où tu l’as laissé.</p>
          <button type="button" className="funnel-cta" onClick={onAbonnementTermine || onBackHome}>Reprendre mon abonnement</button>
          {onGoToAccount && <button type="button" className="btn-secondary" onClick={onGoToAccount}>Mon compte</button>}
          <p className="app-texte app-termine-aide">Une erreur ? Écris-nous à bonjour@grandimi.com.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="night growth-plan-page">
        <div className="error-container">
          <div className="alert alert-error">
            <span className="alert-icon">✕</span>
            <div>{error}</div>
          </div>
          <button className="btn-secondary" onClick={onBackHome}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  // Toutes les tâches du jour, tous moments confondus (Matin/Journée/Soir/
  // Coucher), avec leur moment d'origine gardé pour l'affichage groupé.
  const tachesBrutes = monthlyPlan
    ? monthlyPlan.daily_routine.flatMap((bloc) =>
        bloc.tasks.map((tache) => ({ ...tache, moment: bloc.moment, heure: bloc.heure }))
      )
    : [];
  /* La liste du serveur se répète au mois du sommeil : « Chambre à
     18-20 °C » deux fois, « même heure » deux fois, et une « Séance du
     mois — Le sommeil » qui n'est pas une séance. On garde la première
     de chaque doublon et on renomme l'objectif. Les clés ne changent pas. */
  const autreQue = (cle, motif) => tachesBrutes.some((t) => t.key !== cle && motif.test(t.label));
  const tachesDuJour = tachesBrutes
    .filter((t) => !(t.key === 'coucher-1' && autreQue(t.key, /18-20/)))
    .filter((t) => !(t.key === 'coucher-2' && autreQue(t.key, /même heure/i)))
    .map((t) => (t.key === 'soir-0' ? { ...t, label: t.label.replace(/^Séance du mois — [^:]+ : /, 'Objectif du mois : ') } : t));

  const nbFaites = tachesDuJour.filter((t) => completedKeys.has(t.key)).length;

  // Bande de 7 jours pour visualiser la constance, du plus ancien à
  // aujourd'hui. Un jour "fait" est un jour où au moins une tâche a été
  // cochée (history ne liste que les jours avec au moins une ligne).
  const joursAvecAuMoinsUneTache = new Set(
    history.filter((h) => h.nb_faites > 0).map((h) => h.date)
  );
  const septDerniersJours = Array.from({ length: 7 }, (_, i) => dateDuJour(i - 6));
  let serieEnCours = 0;
  // Tant qu'aujourd'hui n'est pas encore fait, la série d'hier tient
  // toujours : on compte à partir d'hier, pas de zéro dès le réveil.
  const departSerie = completedKeys.size > 0 ? 6 : 5;
  for (let i = departSerie; i >= 0; i--) {
    if (joursAvecAuMoinsUneTache.has(septDerniersJours[i]) || (i === 6 && completedKeys.size > 0)) {
      serieEnCours++;
    } else {
      break;
    }
  }

  /* Classement des tâches du jour par domaine, pour les trois cartes de
     l'accueil. Les clés du serveur disent le moment (matin-0…), pas le
     domaine : on le déduit du libellé, qui est stable et en français. */
  const domaineDe = (tache) => {
    // La séance du mois suit le thème du mois (sommeil, protéines, posture…).
    const texte = (tache.key === 'soir-0' && monthlyPlan ? monthlyPlan.focus : `${tache.key} ${tache.label}`).toLowerCase();
    if (/suspension|étirement|gainage|planche|posture|marcher|séance|natation|cardio|mobilité|squat|pompe/.test(texte)) return 'exercices';
    if (/^coucher|écran|chambre|sommeil|dormir|rituel|heure qu/.test(texte)) return 'sommeil';
    if (/protéine|œuf|oeuf|lait|calcium|repas|petit-déj|boire|eau|poisson|légumineuse|manger|vitamine/.test(texte)) return 'nutrition';
    return 'exercices';
  };
  const parDomaine = (domaine) => tachesDuJour.filter((t) => domaineDe(t) === domaine);

  // Ce qui te freine : les points faibles du questionnaire, et où les corriger.
  const mois = moisAbonnement;
  const ordreThemes = ordreDesThemes(pointsFaibles(predictionData));
  const themeSuivant = THEMES[ordreThemes[mois % 12] - 1];
  // Le thème du mois vient-il d'un de ses points faibles ?
  const themeVientDeSesFaibles = pointsFaibles(predictionData).some(
    (f) => THEME_DU_POINT_FAIBLE[f] === ordreThemes[(mois - 1) % 12],
  );
  const seanceFaite = completedKeys.has(CLE_SEANCE);
  const aujourdhuiFait = [...completedKeys].some((k) => numeroJourParcours(k));
  const parcours = etatParcours(joursFaits, aujourdhuiFait);
  // Sur l'accueil : le jour à faire, ou celui qu'on vient de finir aujourd'hui.
  const jourAccueil = parcours.ouvert || parcours.fini ? parcours.prochain : Math.max(1, parcours.prochain - 1);
  const premierDuNiveau = (niveauDuJour(jourAccueil) - 1) * JOURS_PAR_NIVEAU + 1;

  const faibles = pointsFaibles(predictionData);
  const correction = {
    'ton sommeil': ['Dormir 8 h ou plus : ton coucher avance de 15 min par semaine.', 'sommeil'],
    'ton heure de coucher': ['Te coucher plus tôt, petit à petit.', 'sommeil'],
    'ta posture': ['Gainage et dos aligné, quelques minutes par jour.', 'exercices'],
    'tes protéines': ['Une source de protéines à chaque repas.', 'nutrition'],
    'ton sport': ['Bouger plus : ta séance du jour.', 'exercices'],
    'ton téléphone au lit': ['Écrans coupés 45 min avant de dormir.', 'sommeil'],
    'ton calcium': ['Trois produits laitiers par jour.', 'nutrition'],
  };

  const allerA = (onglet, sous) => {
    if (onglet !== activeTab) capture('app_onglet', { etape: onglet });
    setActiveTab(onglet);
    if (sous) setSousOnglet(sous);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const renderTache = (tache) => {
    const fait = completedKeys.has(tache.key);
    const ouvert = openWhy.has(tache.key);
    return (
      <div key={tache.key} className={`todo-item ${fait ? 'fait' : ''}`}>
        <button
          type="button"
          className="todo-checkbox"
          onClick={() => basculerTache(tache.key)}
          aria-pressed={fait}
          aria-label={fait ? 'Marquer comme non fait' : 'Marquer comme fait'}
        >
          {fait ? '✓' : ''}
        </button>
        <div className="todo-body">
          {/* Toute la ligne coche, pas seulement la petite case. */}
          <button type="button" className="todo-label todo-label-bouton" onClick={() => basculerTache(tache.key)}>
            {tache.label}
          </button>
          <button type="button" className="todo-why-toggle" onClick={() => basculerPourquoi(tache.key)} aria-expanded={ouvert}>
            {ouvert ? 'Masquer' : 'Pourquoi ?'}
          </button>
          {ouvert && (
            <div className="todo-why-content">
              <p>{tache.pourquoi}</p>
              <p className="todo-source">{tache.source}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const JOURS_COURTS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
  // L'emoji au bout de chaque ligne de la routine, comme chez Taller.
  const EMOJIS = [
    [/suspension/i, '🧗'], [/étirement doux/i, '🧘'], [/étirement/i, '🙆'], [/petit-déj/i, '🍳'], [/protéine/i, '🍗'],
    [/lait|laitier|calcium/i, '🥛'], [/boire|eau/i, '💧'], [/marcher|lever/i, '🚶'], [/chambre|18-20/i, '🌡️'],
    [/écran/i, '📵'], [/objectif du mois/i, '🎯'], [/coucher|dormir|sommeil|heure/i, '😴'], [/gainage|planche/i, '🧱'],
    [/posture|mur/i, '🧍'], [/soleil|dehors/i, '☀️'],
  ];
  const emojiTache = (label) => (EMOJIS.find(([motif]) => motif.test(label)) || [null, '✅'])[1];
  const ETIQUETTE = { exercices: 'Exercice', nutrition: 'Nutrition', sommeil: 'Sommeil' };

  // La barre du bas de Taller : taille, grandir, routine (et le compte).
  const NAV = [
    { cle: 'taille', libelle: 'Taille', Icone: Ruler },
    { cle: 'grandir', libelle: 'Grandir', Icone: TrendingUp },
    { cle: 'routine', libelle: 'Routine', Icone: CalendarCheck },
    { cle: 'compte', libelle: 'Compte', Icone: User },
  ];

  // Comme l'onglet « grow » de Taller : Train / Physique / Nutrition.
  const PILULES = [
    { cle: 'seances', nom: 'Séances', titre: 'Séances' },
    { cle: 'parcours', nom: 'Parcours', titre: 'Ton plan' },
    { cle: 'nutrition', nom: 'Nutrition', titre: 'Tes repas !' },
  ];

  /* Le bouton ↑ de Taller : une image de ses résultats à partager. Pas pour
     l'offre 1 mois, dont la taille prédite est sous cadenas. */
  const partager = async () => {
    if (partageEnCours) return;
    setPartageEnCours(true);
    try {
      const predite = Number(predictionData.predicted_height_cm);
      const plage = predictionData.confidence_range || {};
      const blob = await genererCarteResultat({
        predicted: Math.round(predite),
        rangeMin: Math.round(Number(plage.min) || predite - 4),
        rangeMax: Math.round(Number(plage.max) || predite + 4),
        margeCm: Math.round(((Number(plage.max) - Number(plage.min)) / 2) || 4),
        croissanceRestante: predite - Number(predictionData.current_height_cm),
      });
      await partagerCarte(blob, 'Ma taille adulte estimée par Grandimi');
      capture('app_onglet', { etape: 'partage' });
    } catch {
      /* partage annulé ou impossible : rien à dire */
    } finally {
      setPartageEnCours(false);
    }
  };

  // Routine : 3 jours avant, aujourd'hui, 3 jours après (comme Taller).
  const semaineRoutine = Array.from({ length: 7 }, (_, i) => dateDuJour(i - 3));
  /* La routine du jour, comme « Routine quotidienne » de Taller : la séance
     (« va faire ta séance »), puis les bons gestes pour grandir. Pas de
     compléments (public mineur). Les gestes qui corrigent un de SES points
     faibles portent « À corriger » : ce sont les « points à corriger » de
     l'onglet Taille. */
  const heuresSommeil = Number(plan.sleep?.hours) || 9;
  /* Comme la routine de Taller : des gestes concrets avec des quantités.
     Leurs compléments (moringa, zinc, oméga 3, glucosamine…) sont remplacés
     par les aliments qui apportent la même chose : pas de compléments pour
     des mineurs sans avis médical. Chaque ligne a son détail (ⓘ). */
  const regime = prefs.regime || 'tout';
  const sansLactose = regime === 'sans-lactose';
  const vegetarien = regime === 'vegetarien';
  const objectifP = Number(plan.nutrition?.protein_g) || 80;
  const coucher = plan.sleep?.bedtime;
  const ROUTINE = [
    {
      key: 'routine-lait', etiquette: 'Nutrition', emoji: '🍯🥛', corrige: 'ton calcium',
      label: sansLactose ? '1 verre de boisson soja enrichie + miel' : '1 verre de lait + miel',
      detail: `Au petit-déjeuner, un grand verre (250 ml)${sansLactose ? ' de boisson soja enrichie en calcium' : ' de lait'}, avec une cuillère de miel si tu veux. C’est environ 300 mg de calcium et 8 g de protéines : le calcium construit tes os, et c’est maintenant que tu en stockes le plus.`,
    },
    {
      key: 'routine-avoine', etiquette: 'Nutrition', emoji: '🌾',
      label: '50 g de flocons d’avoine',
      detail: 'Au petit-déjeuner ou au goûter, dans du lait ou un yaourt, avec une banane. Des glucides lents pour l’énergie de la journée, des fibres, du magnésium et du zinc, qui servent à la croissance.',
    },
    {
      key: 'routine-proteines', etiquette: 'Nutrition', emoji: vegetarien ? '🥚' : '🍗', corrige: 'tes protéines',
      label: `${objectifP} g de protéines sur la journée`,
      detail: vegetarien
        ? `Ton objectif : ${objectifP} g. Repères : 2 œufs = 12 g, 150 g de lentilles cuites = 13 g, 150 g de tofu = 18 g, 1 yaourt grec = 15 g. Mets-en à chaque repas : tes os et tes muscles en ont besoin pour grandir.`
        : `Ton objectif : ${objectifP} g. Repères : 2 œufs = 12 g, 1 blanc de poulet = 30 g, 1 boîte de thon = 25 g, 1 yaourt grec = 15 g. Mets-en à chaque repas : tes os et tes muscles en ont besoin pour grandir.`,
    },
    {
      key: 'routine-laitages', etiquette: 'Nutrition', emoji: '🧀', corrige: 'ton calcium',
      label: sansLactose ? '2 laitages au soja enrichis en plus' : '1 yaourt + 1 part de fromage',
      detail: `Avec le verre du matin, ça fait 3 produits laitiers : environ 1 000 mg de calcium, presque tout ce qu’il te faut par jour (1 300 mg entre 9 et 18 ans).${sansLactose ? ' Prends-les enrichis en calcium, sinon ils n’en apportent presque pas.' : ''}`,
    },
    {
      key: 'routine-omega', etiquette: 'Nutrition', emoji: '🌰',
      label: vegetarien ? 'Une poignée de noix (30 g)' : 'Une poignée de noix, ou du poisson gras',
      detail: 'C’est la version « aliment » de l’huile de poisson de Taller : des oméga 3. Une poignée de noix par jour, et si tu manges du poisson, du saumon, des sardines ou du maquereau 2 fois par semaine (ils apportent aussi de la vitamine D).',
    },
    {
      key: 'routine-soleil', etiquette: 'Vitamine D', emoji: '☀️',
      label: '20 min dehors en journée',
      detail: 'Bras et visage à l’air, entre 11 h et 15 h si possible. Ta peau fabrique de la vitamine D au soleil, et sans elle ton corps n’absorbe pas bien le calcium. En hiver, le soleil ne suffit pas toujours : parles-en à ton médecin.',
    },
    {
      key: 'routine-bouger', etiquette: 'Sport', emoji: '🏃', corrige: 'ton sport',
      label: 'Bouger 1 h dans la journée',
      detail: 'Sport, foot, basket, vélo, marche rapide : 1 h au total, en plus de ta séance. C’est ce que l’OMS conseille entre 5 et 17 ans. Les sports où l’on court et saute rendent les os plus solides.',
    },
    {
      key: 'routine-ecrans', etiquette: 'Sommeil', emoji: '📵', corrige: 'ton téléphone au lit',
      label: 'Écrans coupés 45 min avant de dormir',
      detail: 'La lumière des écrans retarde l’endormissement, et le sommeil profond du début de nuit est celui où l’hormone de croissance est surtout libérée. Laisse le téléphone hors de la chambre, ou en mode avion loin du lit.',
    },
    {
      key: 'routine-dormir', etiquette: 'Sommeil', emoji: '😴', corrige: ['ton sommeil', 'ton heure de coucher'],
      label: `Dormir ${heuresSommeil} heures et plus`,
      detail: `${coucher ? `Au lit à ${coucher}, à la même heure chaque soir (week-end compris, à 30 min près). ` : 'Au lit à la même heure chaque soir, week-end compris. '}Entre 13 et 18 ans, il faut 8 à 10 h. C’est la nuit que tu grandis : c’est le geste le plus important de la liste.`,
    },
  ];
  const nbRoutine = ROUTINE.length + 1;
  const faitesRoutine = ROUTINE.filter((t) => completedKeys.has(t.key)).length + (aujourdhuiFait ? 1 : 0);

  return (
    <div className="night growth-plan-page app-plan">
      <header className="app-haut">
        <span className="app-marque">Grandimi</span>
        <span className="app-haut-boutons">
          {!tailleVerrouillee && (
            <button type="button" className="app-compte" onClick={partager} aria-label="Partager mes résultats" disabled={partageEnCours}>
              <ArrowUp size={20} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="app-compte" onClick={() => setReglagesOuverts(true)} aria-label="Réglages">
            <Settings size={20} aria-hidden="true" />
          </button>
        </span>
      </header>

      <main className="app-contenu">
        {activeTab === 'taille' && (
          <section className="tab-content">
            <TailleAccueil
              predictionData={predictionData}
              verrouille={tailleVerrouillee}
              nbPoints={faibles.length}
              onDebloquer={() => { capture('montee_ouverte', { etape: planKey || '' }); setMonteeOuverte(true); }}
              onVoirCourbe={() => setTailleDetail(true)}
              onVoirPoints={() => setPointsOuverts((o) => !o)}
            />

            {pointsOuverts && faibles.length > 0 && (
              <div className="app-carte app-points">
                <h2 className="app-carte-titre">Tes {faibles.length} {faibles.length > 1 ? 'points' : 'point'} à corriger</h2>
                <ul className="app-freine-liste">
                  {faibles.map((f) => {
                    const [texte, sous] = correction[f] || ['', 'exercices'];
                    return (
                      <li key={f}>
                        <button type="button" onClick={() => (sous === 'nutrition' ? allerA('grandir', 'nutrition') : sous === 'exercices' ? allerA('grandir', 'parcours') : allerA('routine'))}>
                          <span className="app-freine-textes">
                            <span className="app-freine-nom">{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                            <span className="app-freine-fix">{texte}</span>
                          </span>
                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {tailleDetail ? (
              <div className="app-taille-detail">
                <MaTaille predictionData={predictionData} onMiseAJour={onMiseAJourPrediction} verrouille={tailleVerrouillee} onDebloquer={() => { capture('montee_ouverte', { etape: planKey || '' }); setMonteeOuverte(true); }} />
                {!tailleVerrouillee && (
                  <div className="card plan-chart-card">
                    <h3 className="plan-chart-title">Ta trajectoire de croissance</h3>
                    <GrowthProjectionChart
                      ageNow={Number(predictionData.age)}
                      heightNow={Number(predictionData.current_height_cm)}
                      predicted={Number(predictionData.predicted_height_cm)}
                      potentiel={Number(predictionData.potential_height_cm)}
                      velocityCM={predictionData.height_velocity_cm}
                      sex={predictionData.sex}
                    />
                  </div>
                )}
                {!tailleVerrouillee && predictionData.out_of_domain && predictionData.warning && (
                  <div className="alert alert-warning" style={{ marginTop: '16px' }} role="status">
                    <div><span aria-hidden="true">⚕️ </span>{predictionData.warning}</div>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        )}

        {activeTab === 'grandir' && (
          <section className="tab-content">
            {/* Comme Taller : le titre suit l'onglet, dans une seule barre. */}
            <h1 className="app-titre">{PILULES.find((x) => x.cle === sousOnglet)?.titre}</h1>
            <div className="app-pilules app-segments" role="tablist" aria-label="Grandir">
              {PILULES.map(({ cle, nom }) => (
                <button
                  key={cle}
                  type="button"
                  role="tab"
                  aria-selected={sousOnglet === cle}
                  className={`app-pilule ${sousOnglet === cle ? 'active' : ''}`}
                  onClick={() => setSousOnglet(cle)}
                >
                  {nom}
                </button>
              ))}
            </div>

            {sousOnglet === 'parcours' && (
              <Parcours
                joursFaits={joursFaits}
                aujourdhuiFait={aujourdhuiFait}
                onOuvrirJour={ouvrirJour}
                profil={profil}
                prefs={prefs}
                // Tant que le carnet n'est pas lu, on ne sait pas : pas de question.
                prefsConnues={!carnetLu || Boolean(prefs.temps || prefs.douleur || prefs.regime)}
                onPref={changerPref}
              />
            )}

            {sousOnglet === 'seances' && (
              <Seances
                profil={profil}
                libresFaites={completedKeys}
                onOuvrirLibre={ouvrirLibre}
                progression={Math.round((parcours.faits / NB_JOURS_PARCOURS) * 100)}
                aujourdhuiFait={aujourdhuiFait}
                onCommencerProgramme={() => (parcours.ouvert ? ouvrirJour(jourAccueil) : setSousOnglet('parcours'))}
              />
            )}

            {sousOnglet === 'nutrition' && (
              <RepasDuJour plan={plan} prediction={predictionData} regime={prefs.regime || 'tout'} />
            )}
          </section>
        )}

        {activeTab === 'routine' && (
          <section className="tab-content">
            <h1 className="app-titre">Routine quotidienne</h1>

            <div className="routine-dates">
              {semaineRoutine.map((jour, idx) => {
                const d = new Date(`${jour}T12:00:00`);
                const estAujourdhui = idx === 3;
                const fait = estAujourdhui ? completedKeys.size > 0 : joursAvecAuMoinsUneTache.has(jour);
                return (
                  <div key={jour} className={`routine-date ${estAujourdhui ? 'aujourdhui' : ''} ${fait ? 'fait' : ''}`}>
                    <span className="routine-date-num">{d.getDate()}</span>
                    <span className="routine-date-mois">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                  </div>
                );
              })}
            </div>

            <div className="routine-serie">
              <span className="routine-serie-libelle">Série <span aria-hidden="true">🔥</span></span>
              <span className="routine-serie-chiffre">{serieEnCours}</span>
            </div>

            <div className="routine-tete">
              <span>En cours</span>
              <span>{faitesRoutine}/{nbRoutine}</span>
            </div>
            <span className="routine-barre" aria-hidden="true"><span style={{ width: `${(faitesRoutine / nbRoutine) * 100}%` }} /></span>

            <ul className="routine-liste">
              <li>
                <button
                  type="button"
                  className={`routine-item routine-item--seance ${aujourdhuiFait ? 'fait' : ''}`}
                  onClick={() => (parcours.ouvert ? ouvrirJour(jourAccueil) : allerA('grandir', 'parcours'))}
                >
                  <span className="routine-rond" aria-hidden="true">{aujourdhuiFait ? '✓' : ''}</span>
                  <span className="routine-textes">
                    <span className="routine-etiquette">Exercice</span>
                    <span className="routine-libelle">Ta séance du jour <span aria-hidden="true">🏋️</span></span>
                    <span className="routine-detail">
                      Jour {jourDansNiveau(jourAccueil)} · niveau {niveauDuJour(jourAccueil)} · {Math.round(dureeSecondes(seanceDuParcours(jourAccueil, profil).etapes) / 60)} min
                    </span>
                  </span>
                </button>
              </li>
              {ROUTINE.map((tache) => {
                const fait = completedKeys.has(tache.key);
                const aCorriger = [].concat(tache.corrige || []).some((f) => faibles.includes(f));
                const ouvert = openWhy.has(tache.key);
                return (
                  <li key={tache.key} className="routine-ligne">
                    <button type="button" className={`routine-item ${fait ? 'fait' : ''}`} onClick={() => basculerTache(tache.key)} aria-pressed={fait}>
                      <span className="routine-rond" aria-hidden="true">{fait ? '✓' : ''}</span>
                      <span className="routine-textes">
                        <span className="routine-etiquette">
                          {tache.etiquette}
                          {aCorriger && <span className="routine-corrige">À corriger</span>}
                        </span>
                        <span className="routine-libelle">{tache.label} <span aria-hidden="true">{tache.emoji}</span></span>
                        {ouvert && <span className="routine-detail-texte">{tache.detail}</span>}
                      </span>
                    </button>
                    <button type="button" className={`routine-info ${ouvert ? 'ouvert' : ''}`} onClick={() => basculerPourquoi(tache.key)} aria-expanded={ouvert} aria-label={`Détail : ${tache.label}`}>
                      i
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

      </main>

      {seanceOuverte && (
        <SeanceGuidee
          mois={mois}
          onFermer={() => setSeanceOuverte(false)}
          onTerminee={() => {
            capture('seance_terminee', { etape: String(mois) });
            if (!completedKeys.has(CLE_SEANCE)) basculerTache(CLE_SEANCE);
          }}
        />
      )}

      {seanceDeLaFiche && (
        <FicheSeance
          key={seanceDeLaFiche.cle}
          seance={seanceDeLaFiche}
          faite={fiche.libre ? completedKeys.has(cleLibre(fiche.libre)) : joursFaits.has(fiche.n)}
          ouverte={Boolean(fiche.libre) || (parcours.ouvert && fiche.n === parcours.prochain)}
          onFermer={() => setFiche(null)}
          onCommencer={commencer}
        />
      )}

      {seanceParcours && (
        <SeanceGuidee
          etapes={seanceParcours.etapes}
          titre={seanceParcours.titre}
          fin={finDuJour(seanceParcours)}
          onFermer={() => setSeanceParcours(null)}
          onTerminee={() => (seanceParcours.libre ? terminerLibre(seanceParcours.libre) : terminerJour(seanceParcours.n))}
        />
      )}

      {visite && activeTab === 'taille' && !seanceOuverte && !seanceParcours && !fiche && <VisiteGuidee onFin={() => setVisite(false)} />}

      {reglagesOuverts && (
        <Reglages
          onFermer={() => setReglagesOuverts(false)}
          onMesure={() => { setReglagesOuverts(false); allerA('taille'); setTailleDetail(true); }}
          onAbonnement={() => { setReglagesOuverts(false); onGoToAccount?.(); }}
          onDeconnexion={onLogout}
          preferences={<PreferencesParcours prefs={prefs} onPref={changerPref} />}
        />
      )}

      {monteeOuverte && <MonteeEnGamme predictionData={predictionData} onFermer={() => setMonteeOuverte(false)} />}

      {/* Barre du bas, au pouce, comme une appli. */}
      <nav className="app-nav" aria-label="Navigation">
        {NAV.map(({ cle, libelle, Icone }) => (
          <button
            key={cle}
            type="button"
            className={`app-nav-item ${activeTab === cle ? 'active' : ''}`}
            onClick={() => (cle === 'compte' ? onGoToAccount?.() : allerA(cle))}
            aria-current={activeTab === cle ? 'page' : undefined}
          >
            <Icone size={22} aria-hidden="true" />
            <span>{libelle}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default GrowthPlanPage;
