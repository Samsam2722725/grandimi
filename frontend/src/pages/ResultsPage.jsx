import { useState } from 'react';
import Spinner from '../components/Spinner';
import '../styles/results-page.css';

function ResultsPage({ predictionData, onViewPlan, onBackHome }) {
  const [showLimitations, setShowLimitations] = useState(false);

  if (!predictionData) {
    return <Spinner size="page" label="Chargement de tes résultats..." />;
  }

  const { predicted_height_cm, confidence_range, confidence_level, message } = predictionData;

  /* La marge se lit sur la LARGEUR de l'intervalle, pas sur l'ecart au
     maximum. L'ancien calcul (max - estimation) devenait negatif des que
     l'estimation sortait de sa fourchette, et affichait litteralement
     "±-39.4 cm" a l'utilisateur. */
  const largeur = Math.max(0, confidence_range.max - confidence_range.min);
  const margeCm = Math.round((largeur / 2) * 10) / 10;
  const positionRepere = largeur === 0
    ? 50
    : Math.min(100, Math.max(0,
        ((predicted_height_cm - confidence_range.min) / largeur) * 100));
  /* Le repli sur 170 cm fabriquait un chiffre : le champ lu n'existait pas,
     si bien qu'un adolescent de 183 cm se voyait annoncer "+16,2 cm" de
     croissance restante. Sans la taille saisie, on n'affiche rien. */
  const tailleActuelle = predictionData.current_height_cm;
  const growth_potential = tailleActuelle ? predicted_height_cm - tailleActuelle : 0;

  return (
    <div className="results-page">
      {/* Header */}
      <header className="results-header">
        <button className="btn-tertiary" onClick={onBackHome}>
          ← Retour
        </button>
      </header>

      {/* Main result box */}
      <section className="results-container">
        <div className="result-hero">
          <h1>Ta taille adulte estimée</h1>

          {/* Big number */}
          <div className="predicted-height">
            <div className="height-number">{predicted_height_cm}</div>
            <div className="height-unit">cm</div>
          </div>

          {/* Confidence level */}
          <div className={`confidence-badge confidence-${confidence_level}`}>
            Confiance : {confidence_level === 'high' ? 'Élevée' : confidence_level === 'medium' ? 'Moyenne' : 'Faible'}
          </div>
        </div>

        {/* Confidence range */}
        <section className="confidence-section">
          <h2>Intervalle de confiance</h2>
          <div className="range-display">
            <div className="range-min">
              <span className="label">Min</span>
              <span className="value">{confidence_range.min} cm</span>
            </div>
            <div className="range-visual">
              <div className="range-bar">
                <div
                  className="range-indicator"
                  style={{
                    /* Borne 0-100 : si le point estime sortait de son
                       intervalle, le repere partait hors de la barre. */
                    left: `${positionRepere}%`
                  }}
                />
              </div>
            </div>
            <div className="range-max">
              <span className="label">Max</span>
              <span className="value">{confidence_range.max} cm</span>
            </div>
          </div>
          <p className="range-explanation">
            Cette estimation a une précision de ±{margeCm} cm.
            Plus tu es proche de ta taille adulte, plus c'est précis.
          </p>
        </section>

        {/* Fenêtre de croissance restante */}
        {growth_potential > 0 && (
          <section className="growth-potential-section">
            <div className="growth-card">
              <div className="growth-icon">📈</div>
              <div className="growth-content">
                <h3>Ta fenêtre de croissance</h3>
                <p className="growth-value">
                  <strong>+{Math.round(growth_potential * 10) / 10} cm</strong> estimés avant ta taille adulte
                </p>
                <p className="growth-explanation">
                  C'est la seule urgence honnête : plus tu agis maintenant, plus c'est efficace.
                  Les 12 prochains mois sont critiques.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Placé juste après la fenêtre de croissance : plus bas, il fallait
            dépasser les mentions légales et le bloc dépliant pour le voir. */}
        <section className="cta-section">
          <div className="cta-box">
            <h2>Prêt à maximiser ta croissance ?</h2>
            <p>
              Un plan personnalisé qui te dit quoi faire chaque jour — sommeil, nutrition,
              exercices — et qui change à chaque mois d’abonnement.
            </p>
            <button className="btn-primary btn-large" onClick={onViewPlan}>
              Voir mon plan de croissance →
            </button>
            <p className="cta-price">9,99 €/mois · résiliable à tout moment · 14 jours pour changer d’avis</p>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="disclaimer-section">
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Important :</strong> Une estimation n'est pas une garantie de croissance.
              Elle est basée sur des modèles statistiques et facteurs actuels.
              La croissance dépend aussi de la génétique, la santé, et des facteurs non mesurables.
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="limitations-section">
          <button
            className="btn-secondary"
            onClick={() => setShowLimitations(!showLimitations)}
          >
            {showLimitations ? '▼ Masquer les limites' : '▶ Voir les limites'}
          </button>

          {showLimitations && (
            <div className="limitations-content">
              <h3>Limites de cette estimation</h3>
              <ul className="limitations-list">
                <li>
                  <strong>Imprécision à l'adolescence :</strong>{' '}
                  Avant 16 ans, l'estimation peut varier de ±6cm. Après 16 ans, elle se précise (±3cm).
                </li>
                <li>
                  <strong>Facteurs non mesurés :</strong>{' '}
                  Hormones, nutrition, sommeil, exercice — tous affectent la croissance mais ne sont pas toujours prévisibles.
                </li>
                <li>
                  <strong>Données parentales :</strong>{' '}
                  La taille des parents est déclarative. Si imprécise, l'estimation l'est aussi.
                </li>
                <li>
                  <strong>Maladies chroniques :</strong>{' '}
                  Certaines conditions peuvent affecter la croissance de façon non prédictible par le modèle.
                </li>
                <li>
                  <strong>Variation ethnique :</strong>{' '}
                  Le modèle V2 inclut des ajustements, mais reste basé sur données occidentales.
                </li>
              </ul>

              <h3>Sources & méthodologie</h3>
              <div className="sources">
                <p>
                  <strong>Algorithme :</strong> Khamis-Roche v2 (ML-Enhanced)
                </p>
                <p>
                  <strong>Précision moyenne :</strong> ±3 à ±6 cm selon l'âge
                </p>
                <p>
                  <strong>Modèle :</strong> Basé sur études cliniques internationales
                </p>
                <a href="https://pubmed.ncbi.nlm.nih.gov/?term=khamis+roche+height" target="_blank" rel="noopener noreferrer" className="source-link">
                  📖 Lire l'article scientifique complet
                </a>
              </div>
            </div>
          )}
        </section>

      </section>
    </div>
  );
}

export default ResultsPage;
