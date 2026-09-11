import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
/* funnel.css porte les jetons `--funnel-*` sur la classe `.night` : sans lui,
   le skin sombre plus bas dans growth-plan.css n'a aucune valeur à résoudre. */
import '../styles/funnel.css';
import '../styles/growth-plan.css';
import apiClient from '../lib/api';

// Date au format YYYY-MM-DD dans le fuseau local (pas toISOString, qui
// bascule sur UTC et peut donner la veille ou le lendemain selon l'heure).
function dateDuJour(decalageJours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

function GrowthPlanPage({ predictionData, onBackHome }) {
  const [plan, setPlan] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('today');

  // Todo-liste quotidienne : quelles tâches sont cochées aujourd'hui, et
  // quel "pourquoi" est actuellement déplié.
  const [completedKeys, setCompletedKeys] = useState(new Set());
  const [openWhy, setOpenWhy] = useState(new Set());
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchPlan = async () => {
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

    // La todo du jour et l'historique sont indépendants du plan : une
    // panne ici ne doit pas empêcher d'afficher le plan lui-même, donc on
    // avale l'erreur plutôt que de la remonter à setError.
    apiClient
      .getTodayTasks()
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

    apiClient.toggleTask(cle).catch(() => {
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

  return (
    <div className="night growth-plan-page">
      {/* Header */}
      <header className="plan-header">
        <button className="btn-tertiary" onClick={onBackHome}>
          ← Accueil
        </button>
        <h1>Ton plan de croissance personnalisé</h1>
        <p className="subtitle">
          {monthlyPlan
            ? `Mois ${monthlyPlan.month} · ${monthlyPlan.focus} — quoi faire chaque jour`
            : 'Quoi faire chaque jour pour maximiser ton potentiel'}
        </p>
      </header>

      {/* Tabs */}
      <nav className="plan-tabs" aria-label="Sections du plan">
        <button
          className={`tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Aujourd'hui
        </button>
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Aperçu
        </button>
        <button
          className={`tab ${activeTab === 'mois' ? 'active' : ''}`}
          onClick={() => setActiveTab('mois')}
        >
          Ce mois-ci
        </button>
        <button
          className={`tab ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
        >
          Exercices
        </button>
        <button
          className={`tab ${activeTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveTab('nutrition')}
        >
          Nutrition
        </button>
        <button
          className={`tab ${activeTab === 'sleep' ? 'active' : ''}`}
          onClick={() => setActiveTab('sleep')}
        >
          Sommeil
        </button>
      </nav>

      <div className="plan-content">
        {/* Today Tab — la todo-liste du jour */}
        {activeTab === 'today' && (
          <section className="tab-content">
            <div className="streak-card">
              <div className="streak-row">
                {septDerniersJours.map((jour, idx) => {
                  const estAujourdhui = idx === 6;
                  const fait = estAujourdhui
                    ? nbFaites > 0
                    : joursAvecAuMoinsUneTache.has(jour);
                  return (
                    <div
                      key={jour}
                      className={`streak-dot ${fait ? 'fait' : ''} ${estAujourdhui ? 'aujourdhui' : ''}`}
                      title={jour}
                    />
                  );
                })}
              </div>
              <p className="streak-label">
                {serieEnCours > 1
                  ? `${serieEnCours} jours de suite`
                  : nbFaites > 0
                    ? 'Bien commencé, continue'
                    : 'Coche ta première tâche du jour'}
              </p>
            </div>

            <div className="section-title">
              {nbFaites} / {tachesDuJour.length} tâches faites aujourd'hui
            </div>

            {['Matin', 'Journée', 'Soir', 'Coucher'].map((moment) => {
              const taches = tachesDuJour.filter((t) => t.moment === moment);
              if (taches.length === 0) return null;
              return (
                <div key={moment} className="todo-group">
                  <div className="todo-group-heading">{moment}</div>
                  {taches.map((tache) => {
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
                          <p className="todo-label">{tache.label}</p>
                          <button
                            type="button"
                            className="todo-why-toggle"
                            onClick={() => basculerPourquoi(tache.key)}
                          >
                            {ouvert ? '▼ Pourquoi ?' : '▶ Pourquoi ?'}
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
                  })}
                </div>
              );
            })}

            <div className="alert alert-info" style={{ marginTop: '24px' }}>
              <div>
                <strong>Ta taille estimée :</strong> {predictionData.predicted_height_cm} cm.
                Remesure-toi chaque mois : c'est la régularité mesurée dans le temps qui affine
                cette estimation, pas les cases cochées aujourd'hui.
              </div>
            </div>
          </section>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <section className="tab-content">
            <div className="motivation-box">
              <p className="motivation-text">{plan.motivation}</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Croissance attendue</h3>
                <div className="stat-value">{plan.expected_growth} cm</div>
                <p className="stat-note">sur 12 mois</p>
              </div>
              <div className="stat-card">
                <h3>Exercices quotidiens</h3>
                <div className="stat-value">{plan.posture_exercises.length}</div>
                <p className="stat-note">routines clés</p>
              </div>
              <div className="stat-card">
                <h3>Suppléments</h3>
                <div className="stat-value">{plan.supplements.length}</div>
                <p className="stat-note">recommandés</p>
              </div>
              <div className="stat-card">
                <h3>Sommeil quotidien</h3>
                <div className="stat-value">{plan.sleep.hours}h</div>
                <p className="stat-note">heures</p>
              </div>
            </div>

            <div className="alert alert-info">
              <span className="alert-icon">ℹ️</span>
              <div>
                <strong>Note importante :</strong> Ce plan est basé sur des facteurs scientifiques,
                mais la croissance dépend aussi de facteurs imprévisibles.
                L'engagement et la consistance sont clés.
              </div>
            </div>
          </section>
        )}

        {activeTab === 'mois' && monthlyPlan && (
          <section className="tab-content">
            <div className="section-title">
              Mois {monthlyPlan.month} — {monthlyPlan.focus}
            </div>
            <p className="motivation-text">{monthlyPlan.why_this_month}</p>

            <div className="alert alert-info" style={{ margin: '20px 0' }}>
              <div>
                <strong>Ton objectif du mois :</strong> {monthlyPlan.month_target}
              </div>
            </div>

            <div className="section-title">Ta journée type</div>
            <div className="timeline-container">
              {monthlyPlan.daily_routine.map((bloc, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-marker">
                    <div className="timeline-circle">{bloc.moment}</div>
                  </div>
                  <div className="timeline-content">
                    <h3>{bloc.heure}</h3>
                    {bloc.duree_min > 0 && (
                      <p className="growth-metric">
                        <strong>{bloc.duree_min} min</strong>
                      </p>
                    )}
                    <ul className="action-list">
                      {bloc.tasks.map((tache) => (
                        <li key={tache.key}>{tache.label}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-title">Semaine par semaine</div>
            <ul className="action-list">
              {monthlyPlan.weekly_goals.map((objectif, idx) => (
                <li key={idx}>{objectif}</li>
              ))}
            </ul>

            <div className="alert alert-info" style={{ marginTop: '24px' }}>
              <div>
                Mesure-toi à la fin du mois : ton prochain plan en dépend.
                <br />
                <strong>{monthlyPlan.next_month_preview}</strong>
              </div>
            </div>
          </section>
        )}

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
          <section className="tab-content">
            <div className="section-title">Exercices clés pour la croissance</div>
            <div className="card-grid">
              {plan.posture_exercises.map((exercise, idx) => (
                <div key={idx} className="exercise-card card">
                  <h3>{exercise.name}</h3>
                  <div className="exercise-meta">
                    <span className="badge">{exercise.duration_min} min</span>
                    <span className="badge">{exercise.frequency}</span>
                  </div>
                  <button className="btn-tertiary">
                    Voir le guide complet →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nutrition Tab */}
        {activeTab === 'nutrition' && (
          <section className="tab-content">
            <div className="section-title">Plan nutritionnel quotidien</div>
            <div className="nutrition-targets">
              <div className="target-item">
                <span className="label">Calories quotidiennes</span>
                <span className="value">{plan.nutrition.daily_calories} kcal</span>
              </div>
              <div className="target-item">
                <span className="label">Protéines</span>
                <span className="value">{plan.nutrition.protein_g}g</span>
              </div>
              <div className="target-item">
                <span className="label">Calcium</span>
                <span className="value">{plan.nutrition.calcium_mg}mg</span>
              </div>
              <div className="target-item">
                <span className="label">Vitamin D</span>
                <span className="value">{plan.nutrition.vitamin_d_mcg}mcg</span>
              </div>
            </div>
          </section>
        )}

        {/* Sleep Tab */}
        {activeTab === 'sleep' && (
          <section className="tab-content">
            <div className="section-title">Optimisation du sommeil</div>
            <div className="sleep-schedule">
              <div className="schedule-item">
                <span className="time">{plan.sleep.bedtime}</span>
                <span className="label">Heure du coucher</span>
              </div>
              <div className="schedule-item">
                <span className="time">{plan.sleep.waketime}</span>
                <span className="label">Heure du réveil</span>
              </div>
              <div className="schedule-item">
                <span className="time">{plan.sleep.hours}h</span>
                <span className="label">Sommeil quotidien</span>
              </div>
            </div>

            <div className="sleep-tips">
              <h3>Conseils pour meilleur sommeil</h3>
              <ul className="tips-list">
                <li>Chambre complètement sombre (rideau occultant)</li>
                <li>Température fraîche (18–20°C)</li>
                <li>Silence total (bouchons d'oreilles si nécessaire)</li>
                <li>Pas d'écrans 30 min avant le coucher</li>
                <li>Éviter caféine après 15h</li>
              </ul>
            </div>
          </section>
        )}
      </div>

      {/* Supplements section (always visible) */}
      <section className="supplements-section">
        <h2>Suppléments recommandés</h2>
        <div className="supplements-grid">
          {plan.supplements.map((supp, idx) => (
            <div key={idx} className="supplement-card card">
              <h3>{supp.name}</h3>
              <div className="supplement-info">
                <span className="dosage">Dosage : {supp.dosage}</span>
                <span className="frequency">Fréquence : {supp.frequency}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="final-cta">
        <div className="cta-box">
          <h2>Prêt à commencer ?</h2>
          <p>
            Ce plan couvre le mois qui vient. La régularité fait tout le résultat.
            Mesure-toi à la fin du mois : ton prochain plan sera adapté à tes progrès.
          </p>
          <button className="btn-primary btn-large" onClick={onBackHome}>
            ✓ Commencer mon parcours
          </button>
        </div>
      </section>
    </div>
  );
}

export default GrowthPlanPage;
