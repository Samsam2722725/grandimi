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
    email: '',
    age: '',
    sex: '',
    height_cm: '',
    weight_kg: '',
    father_height_cm: '',
    mother_height_cm: '',
    /* Les stades de Tanner (pilosite pubienne, developpement genital)
       ont ete retires : ce sont des donnees de sante sensibles au sens
       du RGPD, collectees sur des mineurs, en auto-evaluation et sans
       consentement parental. La vitesse de croissance sur 12 mois est
       un proxy non intrusif, egalement utilise dans la litterature. */
    height_velocity_cm: '',
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
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
          // Obligatoire côté serveur (binding "required,email") : c'est
          // la clé qui rattache la prédiction à un compte. Sans lui,
          // /api/v2/predict-height répond 400 et le questionnaire ne
          // peut pas aboutir.
          email: formData.email,
          age: parseFloat(formData.age),
          sex: formData.sex,
          height_cm: parseFloat(formData.height_cm),
          weight_kg: parseFloat(formData.weight_kg),
          father_height_cm: parseFloat(formData.father_height_cm),
          mother_height_cm: parseFloat(formData.mother_height_cm),
          height_velocity_cm: formData.height_velocity_cm
            ? parseFloat(formData.height_velocity_cm)
            : 0,
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

      /* La réponse du serveur ne réémet pas l'email : on le rattache ici,
         sinon la paywall et l'écran parent n'ont plus de quoi identifier
         le compte. */
      onPredictionComplete({ ...result, email: formData.email });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const stepTitles = [
    'Email et infos de base',
    'Mesures actuelles',
    'Taille des parents',
    'Ta croissance récente',
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
          {/* Step 0: Email, Age and Sex */}
          {step === 0 && (
            <div className="form-step">
              <div className="form-group">
                <label htmlFor="email">Ton email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="toi@example.com"
                  required
                />
                <p className="form-helper">Tu en auras besoin pour accéder à ton plan personnalisé</p>
              </div>

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

          {/* Step 3 : croissance recente.
              Remplace les stades de Tanner (pilosite pubienne,
              developpement genital), qui faisaient auto-evaluer a des
              mineurs des donnees de sante sensibles, sans consentement
              parental et avant meme d'avoir vu un resultat. La vitesse
              de croissance donne une information comparable sur la
              croissance restante, sans rien demander d'intime. */}
          {step === 3 && (
            <div className="form-step">
              <p className="form-hint">
                Cette question affine la précision de l’estimation. Si tu ne sais pas,
                laisse vide : on élargira simplement la fourchette.
              </p>

              <div className="form-group">
                <label htmlFor="height_velocity_cm">
                  Combien de centimètres as-tu pris depuis l’an dernier ?
                </label>
                <input
                  id="height_velocity_cm"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="25"
                  step="0.5"
                  placeholder="ex : 6"
                  value={formData.height_velocity_cm}
                  onChange={(e) => handleInputChange('height_velocity_cm', e.target.value)}
                />
                <p className="form-helper">
                  Une estimation suffit. Compare avec une vieille photo, une toise, ou
                  demande à tes parents.
                </p>
              </div>
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
                  (step === 0 && (!formData.email || !formData.age || !formData.sex)) ||
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
