import { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Dumbbell, Home, Moon, Ruler, TrendingUp, User, Utensils } from 'lucide-react';
import Spinner from '../components/Spinner';
/* funnel.css porte les jetons `--funnel-*` sur la classe `.night` : sans lui,
   le skin sombre plus bas dans growth-plan.css n'a aucune valeur à résoudre. */
import '../styles/funnel.css';
import '../styles/growth-plan.css';
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

// Date au format YYYY-MM-DD dans le fuseau local (pas toISOString, qui
// bascule sur UTC et peut donner la veille ou le lendemain selon l'heure).
function dateDuJour(decalageJours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

function GrowthPlanPage({ predictionData, onBackHome, onGoToAccount, onMiseAJourPrediction }) {
  const [plan, setPlan] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('accueil');
  const [sousOnglet, setSousOnglet] = useState('exercices');
  const [exerciceOuvert, setExerciceOuvert] = useState(null);

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
          month: mois,
        });

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
      .getTaskHistory(7)
      .then((res) => setHistory(res.history || []))
      .catch(() => {});
  }, [predictionData]);

  const basculerTache = (cle) => {
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
  for (let i = septDerniersJours.length - 1; i >= 0; i--) {
    if (joursAvecAuMoinsUneTache.has(septDerniersJours[i]) || (i === 6 && nbFaites > 0)) {
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
  const score = (taches) => (taches.length ? Math.round((taches.filter((t) => completedKeys.has(t.key)).length / taches.length) * 100) : 0);

  // Ce qui te freine : les points faibles du questionnaire, et où les corriger.
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
    { cle: 'exercices', nom: 'Exercices' },
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
                  {monthlyPlan ? `Mois ${monthlyPlan.month} · ${monthlyPlan.focus}` : 'Ton plan'}
                </p>
                <h1 className="app-titre">Aujourd’hui</h1>
              </div>
              <span className="app-serie">
                🔥 {serieEnCours > 1 ? `${serieEnCours} jours` : 'Jour 1'}
              </span>
            </div>

            {/* Bande de 7 jours, avec le jour sous chaque pastille. */}
            <div className="app-semaine">
              {septDerniersJours.map((jour, idx) => {
                const estAujourdhui = idx === 6;
                const fait = estAujourdhui ? nbFaites > 0 : joursAvecAuMoinsUneTache.has(jour);
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
                            <span className="app-freine-nom">{f.charAt(0).toUpperCase() + f.slice(1)}</span>
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

            {/* Trois domaines, chacun avec son score du jour (comme GoTall). */}
            <div className="app-domaines">
              {DOMAINES.map(({ cle, nom, Icone }) => {
                const taches = parDomaine(cle);
                const faites = taches.filter((t) => completedKeys.has(t.key)).length;
                const pct = score(taches);
                return (
                  <button key={cle} type="button" className={`app-domaine app-domaine--${cle}`} onClick={() => allerA('grandir', cle)}>
                    <Icone size={20} aria-hidden="true" />
                    <span className="app-domaine-nom">{nom}</span>
                    <span className="app-domaine-pct">{pct} %</span>
                    <span className="app-domaine-barre"><span style={{ width: `${pct}%` }} /></span>
                    <span className="app-domaine-detail">{faites}/{taches.length} faites</span>
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
              <div className="card-grid">
                {plan.posture_exercises.map((exercise, idx) => {
                  const ouvert = exerciceOuvert === idx;
                  return (
                    <div key={idx} className="exercise-card card">
                      <h3>{exercise.name}</h3>
                      <div className="exercise-meta">
                        <span className="badge">{exercise.duration_min} min</span>
                        <span className="badge">{exercise.frequency}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-tertiary"
                        onClick={() => setExerciceOuvert(ouvert ? null : idx)}
                        aria-expanded={ouvert}
                      >
                        {ouvert ? 'Masquer le détail' : 'Comment faire'}
                      </button>
                      {ouvert && (
                        <div className="exercise-detail">
                          <p>{exercise.description}</p>
                          <p className="exercise-detail-line"><strong>Quand :</strong> {exercise.routine}</p>
                          <p className="exercise-detail-line"><strong>Ce que ça change :</strong> {exercise.impact}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {sousOnglet === 'nutrition' && (
              <>
                <div className="nutrition-targets">
                  <div className="target-item"><span className="label">Calories</span><span className="value">{Number(plan.nutrition.daily_calories).toLocaleString('fr-FR')} kcal</span></div>
                  <div className="target-item"><span className="label">Protéines</span><span className="value">{plan.nutrition.protein_g} g</span></div>
                  <div className="target-item"><span className="label">Calcium</span><span className="value">{Number(plan.nutrition.calcium_mg).toLocaleString('fr-FR')} mg</span></div>
                  <div className="target-item"><span className="label">Vitamine D</span><span className="value">{plan.nutrition.vitamin_d_mcg} µg</span></div>
                </div>
                <div className="supplements-grid app-nutriments">
                  {plan.supplements.map((supp, idx) => (
                    <div key={idx} className="supplement-card card">
                      <h3>{supp.name}</h3>
                      <div className="supplement-info">
                        <span className="dosage">{supp.dosage}</span>
                        <span className="frequency">{supp.safety || supp.frequency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sousOnglet === 'sommeil' && (
              <>
                <div className="sleep-schedule">
                  <div className="schedule-item"><span className="time">{plan.sleep.bedtime}</span><span className="label">Coucher</span></div>
                  <div className="schedule-item"><span className="time">{plan.sleep.waketime}</span><span className="label">Réveil</span></div>
                  <div className="schedule-item"><span className="time">{plan.sleep.hours} h</span><span className="label">Sommeil</span></div>
                </div>
                <div className="sleep-tips">
                  <h3>Pour mieux dormir</h3>
                  <ul className="tips-list">
                    <li>Chambre complètement sombre</li>
                    <li>Température fraîche (18–20 °C)</li>
                    <li>Silence (bouchons d’oreilles si besoin)</li>
                    <li>Pas d’écrans 45 min avant le coucher</li>
                    <li>Pas de caféine après 15 h</li>
                  </ul>
                </div>
              </>
            )}

            {sousOnglet === 'mois' && monthlyPlan && (
              <>
                <h2 className="app-carte-titre">Mois {monthlyPlan.month} — {monthlyPlan.focus}</h2>
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
                    <strong>{monthlyPlan.next_month_preview}</strong>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'taille' && (
          <section className="tab-content">
            <h1 className="app-titre">Ma taille</h1>
            <MaTaille predictionData={predictionData} onMiseAJour={onMiseAJourPrediction} />
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
            {predictionData.out_of_domain && predictionData.warning && (
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
