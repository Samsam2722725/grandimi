import { useState } from 'react';
import Spinner from '../components/Spinner';
import '../styles/questionnaire.css';
import apiClient from '../lib/api';
import { mockPredictHeight } from '../lib/mock-api';

function QuestionnaireFlow({ onPredictionComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    sex: '',
    height_cm: '',
    weight_kg: '',
    father_height_cm: '',
    mother_height_cm: '',
    puberty_signs: {
      pubic_hair: '',
      breast_develop: '',
      genitalia: '',
      axillary_hair: '',
      menarche: false,
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePubertyChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      puberty_signs: {
        ...prev.puberty_signs,
        [field]: value,
      },
    }));
  };

  const handleNextStep = () => {
    setStep((prev) => prev + 1);
  };

  const handlePreviousStep = () => {
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use mock API in development if backend is unavailable
      const useRealAPI = import.meta.env.VITE_USE_REAL_API !== 'false';

      let result;
      if (useRealAPI) {
        result = await apiClient.predictHeightV2({
          age: parseFloat(formData.age),
          sex: formData.sex,
          height_cm: parseFloat(formData.height_cm),
          weight_kg: parseFloat(formData.weight_kg),
          father_height_cm: parseFloat(formData.father_height_cm),
          mother_height_cm: parseFloat(formData.mother_height_cm),
          puberty_signs: formData.puberty_signs,
          nutrition_level: 'good',
          sleep_hours_per_night: 8,
          exercise_min_per_day: 30,
        });
      } else {
        result = await mockPredictHeight({
          age: parseFloat(formData.age),
          sex: formData.sex,
          height_cm: parseFloat(formData.height_cm),
          weight_kg: parseFloat(formData.weight_kg),
          father_height_cm: parseFloat(formData.father_height_cm),
          mother_height_cm: parseFloat(formData.mother_height_cm),
        });
      }

      onPredictionComplete(result);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const stepTitles = [
    'Âge et sexe',
    'Mesures actuelles',
    'Taille des parents',
    'Signaux de puberté',
    'Vérification',
  ];

  return (
    <div className="questionnaire">
      <div className="questionnaire-header">
        <button className="btn-tertiary" onClick={onCancel}>
          ← Retour
        </button>
        <div className="progress">
          <span className="progress-text">
            Étape {step + 1} sur {stepTitles.length}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((step + 1) / stepTitles.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="questionnaire-content">
        <h2>{stepTitles[step]}</h2>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">✕</span>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 0: Age and Sex */}
          {step === 0 && (
            <div className="form-step">
              <div className="form-group">
                <label htmlFor="age">Quel est ton âge ? (années)</label>
                <input
                  id="age"
                  type="number"
                  step="0.5"
                  min="8"
                  max="18"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="ex: 14.5"
                  required
                />
              </div>

              <div className="form-group">
                <label>Quel est ton sexe ?</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="sex"
                      value="M"
                      checked={formData.sex === 'M'}
                      onChange={(e) => handleInputChange('sex', e.target.value)}
                      required
                    />
                    Masculin
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="sex"
                      value="F"
                      checked={formData.sex === 'F'}
                      onChange={(e) => handleInputChange('sex', e.target.value)}
                      required
                    />
                    Féminin
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Current measurements */}
          {step === 1 && (
            <div className="form-step">
              <div className="form-group">
                <label htmlFor="height">Quelle est ta taille actuelle ? (cm)</label>
                <input
                  id="height"
                  type="number"
                  step="0.1"
                  min="100"
                  max="210"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  placeholder="ex: 165.5"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="weight">Quel est ton poids ? (kg)</label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="15"
                  max="150"
                  value={formData.weight_kg}
                  onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                  placeholder="ex: 52.5"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2: Parents height */}
          {step === 2 && (
            <div className="form-step">
              <div className="form-group">
                <label htmlFor="father">Quelle est la taille de ton père ? (cm)</label>
                <input
                  id="father"
                  type="number"
                  step="0.1"
                  min="140"
                  max="220"
                  value={formData.father_height_cm}
                  onChange={(e) => handleInputChange('father_height_cm', e.target.value)}
                  placeholder="ex: 178"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="mother">Quelle est la taille de ta mère ? (cm)</label>
                <input
                  id="mother"
                  type="number"
                  step="0.1"
                  min="140"
                  max="210"
                  value={formData.mother_height_cm}
                  onChange={(e) => handleInputChange('mother_height_cm', e.target.value)}
                  placeholder="ex: 164"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 3: Puberty signs */}
          {step === 3 && (
            <div className="form-step">
              <p className="form-hint">
                Indique ton stade de puberté (1 = début, 5 = complètement développé)
              </p>

              <div className="form-group">
                <label htmlFor="pubic_hair">Poils pubiens</label>
                <select
                  id="pubic_hair"
                  value={formData.puberty_signs.pubic_hair}
                  onChange={(e) => handlePubertyChange('pubic_hair', e.target.value)}
                >
                  <option value="">Sélectionne...</option>
                  <option value="1">1 - Aucun</option>
                  <option value="2">2 - Fin, léger</option>
                  <option value="3">3 - Modéré, frisé</option>
                  <option value="4">4 - Épais, bouclé</option>
                  <option value="5">5 - Adulte complet</option>
                </select>
              </div>

              {formData.sex === 'F' && (
                <div className="form-group">
                  <label htmlFor="breast">Développement des seins</label>
                  <select
                    id="breast"
                    value={formData.puberty_signs.breast_develop}
                    onChange={(e) => handlePubertyChange('breast_develop', e.target.value)}
                  >
                    <option value="">Sélectionne...</option>
                    <option value="1">1 - Pas développé</option>
                    <option value="2">2 - Début du développement</option>
                    <option value="3">3 - Développement modéré</option>
                    <option value="4">4 - Presque adulte</option>
                    <option value="5">5 - Adulte complet</option>
                  </select>
                </div>
              )}

              {formData.sex === 'M' && (
                <div className="form-group">
                  <label htmlFor="genitalia">Développement génital</label>
                  <select
                    id="genitalia"
                    value={formData.puberty_signs.genitalia}
                    onChange={(e) => handlePubertyChange('genitalia', e.target.value)}
                  >
                    <option value="">Sélectionne...</option>
                    <option value="1">1 - Enfant</option>
                    <option value="2">2 - Début du développement</option>
                    <option value="3">3 - Développement modéré</option>
                    <option value="4">4 - Presque adulte</option>
                    <option value="5">5 - Adulte complet</option>
                  </select>
                </div>
              )}

              {formData.sex === 'F' && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.puberty_signs.menarche}
                      onChange={(e) => handlePubertyChange('menarche', e.target.checked)}
                    />
                    J'ai eu mes premières règles
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="form-step">
              <div className="review-box">
                <h3>Vérifie tes réponses</h3>
                <div className="review-items">
                  <div className="review-item">
                    <span>Âge</span>
                    <strong>{formData.age} ans</strong>
                  </div>
                  <div className="review-item">
                    <span>Sexe</span>
                    <strong>{formData.sex === 'M' ? 'Masculin' : 'Féminin'}</strong>
                  </div>
                  <div className="review-item">
                    <span>Taille</span>
                    <strong>{formData.height_cm} cm</strong>
                  </div>
                  <div className="review-item">
                    <span>Poids</span>
                    <strong>{formData.weight_kg} kg</strong>
                  </div>
                  <div className="review-item">
                    <span>Père</span>
                    <strong>{formData.father_height_cm} cm</strong>
                  </div>
                  <div className="review-item">
                    <span>Mère</span>
                    <strong>{formData.mother_height_cm} cm</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="form-navigation">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePreviousStep}
              disabled={step === 0}
            >
              ← Précédent
            </button>

            {step < stepTitles.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={handleNextStep}
                disabled={
                  (step === 0 && (!formData.age || !formData.sex)) ||
                  (step === 1 && (!formData.height_cm || !formData.weight_kg)) ||
                  (step === 2 && (!formData.father_height_cm || !formData.mother_height_cm))
                }
              >
                Suivant →
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? <><Spinner />Calcul en cours...</> : 'Obtenir ma prédiction'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuestionnaireFlow;
