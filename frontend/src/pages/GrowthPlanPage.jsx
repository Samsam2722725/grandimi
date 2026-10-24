import { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Dumbbell, Home, Moon, Ruler, TrendingUp, User, Utensils } from 'lucide-react';
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
import { LeconsPlan } from '../components/ui/lecons-plan';
import { pointsFaibles } from '../lib/offres';
import { capture } from '../lib/analytics';
import {
  CLE_SEANCE,
  ExercicesDuJour,
  NutritionJauges,
  SeanceGuidee,
  SommeilSuivi,
  scoreNutrition,
} from '../components/ui/app-grandir';
import {
  CARNET_PARCOURS,
  FicheSeance,
  JOURS_PAR_NIVEAU,
  NB_JOURS_PARCOURS,
  Parcours,
  cleJourParcours,
  dureeSecondes,
  etatParcours,
  jourDansNiveau,
  niveauDuJour,
  numeroJourParcours,
  piments,
  seanceDuParcours,
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

function GrowthPlanPage({ predictionData, onBackHome, onGoToAccount, onMiseAJourPrediction }) {
  const [plan, setPlan] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('accueil');
  const [sousOnglet, setSousOnglet] = useState('exercices');
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
  const [ficheJour, setFicheJour] = useState(null);
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
        setError(err.message);
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
        setJoursFaits(new Set((res.completed_keys || []).map(numeroJourParcours).filter(Boolean)));
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
      const famille = cle.startsWith('nutri-') ? 'nutrition' : cle.startsWith('sommeil-h-') ? 'sommeil' : cle === 'posture-test-mur' ? 'posture' : cle === 'seance-du-jour' ? 'seance' : cle.startsWith('parcours-') ? 'parcours' : 'tache';
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

  const ouvrirJour = (n) => setFicheJour(n);

  const commencerJour = (n, etapes) => {
    capture('seance_commencee', { etape: `j${n}` });
    setFicheJour(null);
    setSeanceParcours({ n, etapes, nouveau: !joursFaits.has(n) });
  };

  // Le texte de l'écran de fin : trophée au bout des 7 jours.
  const finDuJour = ({ n, nouveau }) => {
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
  const tachesDuJour = monthlyPlan
    ? monthlyPlan.daily_routine.flatMap((bloc) =>
        bloc.tasks.map((tache) => ({ ...tache, moment: bloc.moment, heure: bloc.heure }))
      )
    : [];

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
  const ciblesNutrition = { prot: Number(plan.nutrition.protein_g) || 80, ca: Number(plan.nutrition.calcium_mg) || 1300 };
  const nutrition = scoreNutrition(completedKeys, ciblesNutrition);
  const resumeDomaine = (cle) => {
    if (cle === 'nutrition') {
      return { pct: nutrition.pct, detail: `${nutrition.prot} g protéines` };
    }
    const taches = parDomaine(cle);
    let faites = taches.filter((t) => completedKeys.has(t.key)).length;
    let total = taches.length;
    if (cle === 'exercices') {
      total += 2;
      if (seanceFaite) faites += 1;
      if (completedKeys.has(CLE_TEST_MUR)) faites += 1;
    }
    return { pct: total ? Math.round((faites / total) * 100) : 0, detail: `${faites}/${total} faites` };
  };

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

  const NAV = [
    { cle: 'accueil', libelle: 'Aujourd’hui', Icone: Home },
    { cle: 'grandir', libelle: 'Grandir', Icone: TrendingUp },
    { cle: 'taille', libelle: 'Ma taille', Icone: Ruler },
    { cle: 'guide', libelle: 'Guide', Icone: BookOpen },
  ];

  const DOMAINES = [
    { cle: 'sommeil', nom: 'Sommeil', Icone: Moon },
    { cle: 'nutrition', nom: 'Nutrition', Icone: Utensils },
    { cle: 'exercices', nom: 'Exercices', Icone: Dumbbell },
  ];

  const PILULES = [
    { cle: 'exercices', nom: 'Parcours' },
    { cle: 'nutrition', nom: 'Nutrition' },
    { cle: 'sommeil', nom: 'Sommeil' },
    { cle: 'mois', nom: 'Ce mois-ci' },
  ];

  return (
    <div className="night growth-plan-page app-plan">
      {/* Barre du haut, fine : le nom, et le compte. Plus de grand titre
          répété sur chaque écran. */}
      <header className="app-haut">
        <span className="app-marque">Grandimi</span>
        {onGoToAccount && (
          <button type="button" className="app-compte" onClick={onGoToAccount} aria-label="Mon compte">
            <User size={20} aria-hidden="true" />
          </button>
        )}
      </header>

      <main className="app-contenu">
        {activeTab === 'accueil' && (
          <section className="tab-content">
            <div className="app-titre-ligne">
              <div>
                <p className="app-surtitre">
                  {monthlyPlan ? `Mois ${mois} · ${monthlyPlan.focus}` : 'Ton plan'}
                </p>
                <h1 className="app-titre">Aujourd’hui</h1>
              </div>
              <span className="app-serie">
                {/* Jours d'affilée, pas un numéro de jour : « Jour 3/7 » est celui du parcours. */}
                🔥 {serieEnCours} {serieEnCours > 1 ? 'jours' : 'jour'}
              </span>
            </div>

            {/* Bande de 7 jours, avec le jour sous chaque pastille. */}
            <div className="app-semaine">
              {septDerniersJours.map((jour, idx) => {
                const estAujourdhui = idx === 6;
                const fait = estAujourdhui ? completedKeys.size > 0 : joursAvecAuMoinsUneTache.has(jour);
                const d = new Date(`${jour}T12:00:00`);
                return (
                  <div key={jour} className={`app-jour ${fait ? 'fait' : ''} ${estAujourdhui ? 'aujourdhui' : ''}`}>
                    <span className="app-jour-nom">{JOURS_COURTS[d.getDay()]}</span>
                    <span className="app-jour-num">{d.getDate()}</span>
                    <span className="app-jour-point" aria-hidden="true" />
                  </div>
                );
              })}
            </div>

            {/* Le parcours : le jour à faire aujourd'hui, et où il se trouve. */}
            <div className="app-carte app-parcours-carte">
              <div className="app-parcours-tete">
                <span className="app-parcours-niveau">Niveau {niveauDuJour(jourAccueil)} {piments(niveauDuJour(jourAccueil))}</span>
                <span className="app-parcours-jour">Jour {jourDansNiveau(jourAccueil)}/{JOURS_PAR_NIVEAU}</span>
              </div>
              <div className="app-parcours-points" aria-hidden="true">
                {Array.from({ length: JOURS_PAR_NIVEAU }, (_, j) => premierDuNiveau + j).map((n) => (
                  <span key={n} className={`${joursFaits.has(n) ? 'fait' : ''} ${n === jourAccueil && parcours.ouvert ? 'courant' : ''}`} />
                ))}
              </div>
              <h2 className="app-carte-titre app-parcours-titre">
                {parcours.ouvert
                  ? `Ta séance du jour : ${seanceDuParcours(jourAccueil).theme.toLowerCase()}`
                  : parcours.fini ? 'Parcours terminé 🏆'
                    : jourDansNiveau(jourAccueil) === JOURS_PAR_NIVEAU
                      ? `Niveau ${niveauDuJour(jourAccueil)} terminé 🏆 Le niveau ${niveauDuJour(jourAccueil) + 1} se débloque demain.`
                      : `Jour ${jourDansNiveau(jourAccueil)} fait ✓ Le suivant se débloque demain.`}
              </h2>
              <button
                type="button"
                className={`funnel-cta app-cta ${parcours.ouvert ? '' : 'app-cta--fait'}`}
                onClick={() => (parcours.ouvert ? ouvrirJour(jourAccueil) : allerA('grandir', 'exercices'))}
              >
                {parcours.ouvert
                  ? `Commencer le jour ${jourDansNiveau(jourAccueil)} — ${Math.round(dureeSecondes(seanceDuParcours(jourAccueil).etapes) / 60)} min`
                  : 'Voir mon parcours'}
              </button>
            </div>

            {/* Ce qui te freine : la promesse du paywall, tenue dès l'accueil. */}
            <div className="app-carte app-freine">
              <h2 className="app-carte-titre">Ce qui te freine</h2>
              {faibles.length ? (
                <ul className="app-freine-liste">
                  {faibles.map((f) => {
                    const [texte, sous] = correction[f] || ['', 'exercices'];
                    return (
                      <li key={f}>
                        <button type="button" onClick={() => allerA('grandir', sous)}>
                          <span className="app-freine-textes">
                            <span className="app-freine-nom">
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                              {THEME_DU_POINT_FAIBLE[f] === ordreThemes[(mois - 1) % 12] && (
                                <span className="app-focus-badge">Ton focus ce mois-ci</span>
                              )}
                            </span>
                            <span className="app-freine-fix">{texte}</span>
                          </span>
                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="app-freine-ok">Tu as de bonnes bases. Ton plan va chercher le maximum, jour après jour.</p>
              )}
            </div>

            {/* La posture : le seul résultat visible en quelques semaines.
                On le met en avant, avec un geste simple et vérifiable. */}
            <div className="app-carte app-posture">
              <div className="app-posture-tete">
                <span className="app-posture-emoji" aria-hidden="true">🧍</span>
                <div>
                  <h2 className="app-carte-titre">Paraître plus grand en 3 semaines</h2>
                  <p className="app-posture-texte">Ta posture, c’est ce que tu verras changer en premier dans le miroir.</p>
                </div>
              </div>
              {(predictionData.habitudes?.posture === 'voute' || predictionData.habitudes?.posture === 'un-peu-voute') && (
                <p className="app-posture-toi">Tu nous as dit être {predictionData.habitudes.posture === 'voute' ? 'souvent' : 'un peu'} voûté : c’est ton gain le plus rapide.</p>
              )}
              <button type="button" className="app-posture-lien" onClick={() => setTestMurOuvert((o) => !o)} aria-expanded={testMurOuvert}>
                {testMurOuvert ? 'Masquer' : 'Le test du mur (1 min)'}
              </button>
              {testMurOuvert && (
                <ol className="app-posture-etapes">
                  <li>Dos contre un mur, talons à 5 cm du mur.</li>
                  <li>Fesses, omoplates et arrière de la tête touchent le mur.</li>
                  <li>Ta tête ne touche pas sans lever le menton ? Ta posture te fait perdre de la hauteur.</li>
                  <li>Reste 1 minute comme ça, en te grandissant : c’est l’exercice. Chaque jour.</li>
                  <li>Prends une photo de profil aujourd’hui, et refais-la dans 3 semaines au même endroit.</li>
                </ol>
              )}
              <button
                type="button"
                className={`app-posture-fait ${completedKeys.has(CLE_TEST_MUR) ? 'fait' : ''}`}
                onClick={() => basculerTache(CLE_TEST_MUR)}
                aria-pressed={completedKeys.has(CLE_TEST_MUR)}
              >
                {completedKeys.has(CLE_TEST_MUR) ? '✓ Test du mur fait aujourd’hui' : 'J’ai fait le test du mur aujourd’hui'}
              </button>
            </div>

            {/* Trois domaines, chacun avec son score du jour (comme GoTall). */}
            <div className="app-domaines">
              {DOMAINES.map(({ cle, nom, Icone }) => {
                const { pct, detail } = resumeDomaine(cle);
                return (
                  <button key={cle} type="button" className={`app-domaine app-domaine--${cle}`} onClick={() => allerA('grandir', cle)}>
                    <Icone size={20} aria-hidden="true" />
                    <span className="app-domaine-nom">{nom}</span>
                    <span className="app-domaine-pct">{pct} %</span>
                    <span className="app-domaine-barre"><span style={{ width: `${pct}%` }} /></span>
                    <span className="app-domaine-detail">{detail}</span>
                  </button>
                );
              })}
            </div>

            <div className="app-liste-tete">
              <h2 className="app-carte-titre">Ta liste du jour</h2>
              <span className="app-compteur">{nbFaites}/{tachesDuJour.length}</span>
            </div>

            {['Matin', 'Journée', 'Soir', 'Coucher'].map((moment) => {
              const taches = tachesDuJour.filter((t) => t.moment === moment);
              if (taches.length === 0) return null;
              return (
                <div key={moment} className="todo-group">
                  <div className="todo-group-heading">{moment}</div>
                  {taches.map(renderTache)}
                </div>
              );
            })}
          </section>
        )}

        {activeTab === 'grandir' && (
          <section className="tab-content">
            <h1 className="app-titre">Grandir</h1>
            <div className="app-pilules" role="tablist" aria-label="Domaines">
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

            {sousOnglet === 'exercices' && (
              <ExercicesDuJour
                mois={mois}
                faite={seanceFaite}
                onCommencer={() => { capture('seance_commencee', { etape: String(mois) }); setSeanceOuverte(true); }}
                exercicesDuPlan={plan.posture_exercises}
                parcours={<Parcours joursFaits={joursFaits} aujourdhuiFait={aujourdhuiFait} onOuvrirJour={ouvrirJour} />}
              />
            )}

            {sousOnglet === 'nutrition' && (
              <NutritionJauges completedKeys={completedKeys} basculer={basculerTache} cibles={ciblesNutrition} />
            )}

            {sousOnglet === 'sommeil' && (
              <SommeilSuivi completedKeys={completedKeys} basculer={basculerTache} plan={plan} apercu={APERCU_PLAN} />
            )}

            {sousOnglet === 'mois' && monthlyPlan && (
              <>
                <h2 className="app-carte-titre">Mois {mois} — {monthlyPlan.focus}</h2>
                {themeVientDeSesFaibles && (
                  <p className="app-focus-raison">On commence par là : c’est ce qui te freine le plus d’après tes réponses.</p>
                )}
                <p className="app-texte">{monthlyPlan.why_this_month}</p>
                <div className="alert alert-info" style={{ margin: '16px 0' }}>
                  <div><strong>Ton objectif du mois :</strong> {monthlyPlan.month_target}</div>
                </div>
                <h2 className="app-carte-titre">Semaine par semaine</h2>
                <ul className="action-list">
                  {monthlyPlan.weekly_goals.map((objectif, idx) => <li key={idx}>{objectif}</li>)}
                </ul>
                <div className="alert alert-info" style={{ marginTop: '16px' }}>
                  <div>
                    Mesure-toi à la fin du mois : ton prochain plan en dépend.
                    <br />
                    <strong>{`Mois ${mois + 1} : ${themeSuivant}`}</strong>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'taille' && (
          <section className="tab-content">
            <h1 className="app-titre">Ma taille</h1>
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
          </section>
        )}

        {activeTab === 'guide' && (
          <section className="tab-content">
            <h1 className="app-titre">Ton guide</h1>
            <LeconsPlan />
            <p className="plan-contact">
              Une question, un souci, une idée ? Écris-nous :{' '}
              <a href="mailto:grandimi14@gmail.com?subject=Mon%20plan%20Grandimi">grandimi14@gmail.com</a>
            </p>
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

      {ficheJour && (
        <FicheSeance
          key={ficheJour}
          n={ficheJour}
          faite={joursFaits.has(ficheJour)}
          ouverte={parcours.ouvert && ficheJour === parcours.prochain}
          onFermer={() => setFicheJour(null)}
          onCommencer={(etapes) => commencerJour(ficheJour, etapes)}
        />
      )}

      {seanceParcours && (
        <SeanceGuidee
          etapes={seanceParcours.etapes}
          titre={`Jour ${jourDansNiveau(seanceParcours.n)}`}
          fin={finDuJour(seanceParcours)}
          onFermer={() => setSeanceParcours(null)}
          onTerminee={() => terminerJour(seanceParcours.n)}
        />
      )}

      {visite && activeTab === 'accueil' && !seanceOuverte && !seanceParcours && !ficheJour && <VisiteGuidee onFin={() => setVisite(false)} />}

      {monteeOuverte && <MonteeEnGamme predictionData={predictionData} onFermer={() => setMonteeOuverte(false)} />}

      {/* Barre du bas, au pouce, comme une appli. */}
      <nav className="app-nav" aria-label="Navigation">
        {NAV.map(({ cle, libelle, Icone }) => (
          <button
            key={cle}
            type="button"
            className={`app-nav-item ${activeTab === cle ? 'active' : ''}`}
            onClick={() => allerA(cle)}
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
