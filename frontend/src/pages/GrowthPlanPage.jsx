import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
/* funnel.css porte les jetons `--funnel-*` sur la classe `.night` : sans lui,
   le skin sombre plus bas dans growth-plan.css n'a aucune valeur à résoudre. */
import '../styles/funnel.css';
import '../styles/growth-plan.css';
import apiClient from '../lib/api';

function GrowthPlanPage({ predictionData, onBackHome }) {
  const [plan, setPlan] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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
  }, [predictionData]);

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
                      {bloc.actions.map((action, i) => (
                        <li key={i}>{action}</li>
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
