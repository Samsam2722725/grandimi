import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import '../styles/growth-plan.css';
import apiClient from '../lib/api';
import { mockPredictHeight } from '../lib/mock-api';

function GrowthPlanPage({ formData, predictionData, onBackHome }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch growth plan on mount
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        // For demo: use mock data if no real API
        const mockPlanData = {
          plan: {
            timeline: [
              {
                month: 1,
                expected_growth_mm: 5,
                focus: 'Établir routine d\'exercice',
                actions: ['Commencer hanging routine', 'Optimiser sommeil', 'Augmenter calcium']
              },
              {
                month: 3,
                expected_growth_mm: 8,
                focus: 'Nutrition optimale',
                actions: ['Ajouter protéines', 'Vérifier vitamin D', 'Hydratation 2.5L/jour']
              },
              {
                month: 6,
                expected_growth_mm: 15,
                focus: 'Croissance maximale',
                actions: ['Routine établie', 'Contrôle médical', 'Ajuster selon besoins']
              },
              {
                month: 12,
                expected_growth_mm: 25,
                focus: 'Évaluation finale',
                actions: ['Mesurer progrès', 'Planifier suite', 'Consolider habitudes']
              }
            ],
            expected_growth: 2.5,
            posture_exercises: [
              { name: 'Spinal Elongation', duration: '10 min', frequency: 'Daily' },
              { name: 'Wall Angels', duration: '3 min', frequency: 'Daily' },
              { name: 'Hanging Protocol', duration: '15 min', frequency: '5x/week' }
            ],
            nutrition: {
              daily_calories: 2200,
              protein_g: 100,
              calcium_mg: 1300,
              vitamin_d_mcg: 15
            },
            sleep: {
              hours: 8,
              bedtime: '22:00',
              waketime: '07:00'
            },
            supplements: [
              { name: 'Calcium + Vitamin D', dosage: '1000mg + 800 IU', frequency: 'Daily' },
              { name: 'Zinc', dosage: '11mg', frequency: 'Daily' },
              { name: 'Magnesium', dosage: '200mg', frequency: 'Evening' }
            ],
            motivation: 'Tu as le potentiel de grandir naturellement. Ce plan te montre comment optimiser chaque facteur.'
          }
        };

        setPlan(mockPlanData.plan);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPlan();
  }, []);

  if (loading) {
    return (
      <div className="growth-plan-page">
        <Spinner size="page" label="Création de ton plan personnalisé..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="growth-plan-page">
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
    <div className="growth-plan-page">
      {/* Header */}
      <header className="plan-header">
        <button className="btn-tertiary" onClick={onBackHome}>
          ← Accueil
        </button>
        <h1>Ton plan de croissance personnalisé</h1>
        <p className="subtitle">Ton plan du mois : quoi faire chaque jour pour maximiser ton potentiel</p>
      </header>

      {/* Tabs */}
      <nav className="plan-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Aperçu
        </button>
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
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

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <section className="tab-content">
            <div className="timeline-container">
              {plan.timeline.map((phase, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-marker">
                    <div className="timeline-circle">{phase.month}m</div>
                  </div>
                  <div className="timeline-content">
                    <h3>{phase.focus}</h3>
                    <p className="growth-metric">
                      Croissance attendue : <strong>+{phase.expected_growth_mm}mm</strong>
                    </p>
                    <ul className="action-list">
                      {phase.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
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
                    <span className="badge">{exercise.duration}</span>
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
