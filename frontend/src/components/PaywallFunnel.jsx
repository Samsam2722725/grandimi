import { useState } from 'react'
import '../styles/paywall-funnel.css'

export function PaywallFunnel({ onComplete }) {
  const [currentPage, setCurrentPage] = useState(1)

  const goNext = () => {
    if (currentPage < 4) {
      setCurrentPage(currentPage + 1)
    } else {
      onComplete()
    }
  }

  const goBack = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="paywall-funnel">
      {currentPage === 1 && <Page1 />}
      {currentPage === 2 && <Page2 />}
      {currentPage === 3 && <Page3 />}
      {currentPage === 4 && <Page4 />}

      <div className="funnel-footer">
        {currentPage > 1 && (
          <button onClick={goBack} className="btn-back">
            ← Retour
          </button>
        )}
        <button onClick={goNext} className="btn-next">
          {currentPage === 4 ? 'Voir la solution' : 'Continuer →'}
        </button>
      </div>

      <div className="funnel-progress">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`progress-dot ${i + 1 <= currentPage ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

function Page1() {
  return (
    <div className="funnel-page">
      <h1>Pourquoi tu es sur Grandimi?</h1>
      <div className="features-grid">
        <div className="feature">
          <h3>📊 Estimation précise</h3>
          <p>Découvre ta taille adulte avec 98.5% de précision</p>
        </div>
        <div className="feature">
          <h3>📈 Suivi mensuel</h3>
          <p>Mesure ta croissance chaque mois et vois ta progression</p>
        </div>
        <div className="feature">
          <h3>🎯 Plan personnalisé</h3>
          <p>Reçois 11 actions quotidiennes pour atteindre ton potentiel</p>
        </div>
        <div className="feature">
          <h3>💪 Optimise ta croissance</h3>
          <p>Sommeil, nutrition, exercices — tout ce qui compte</p>
        </div>
      </div>
    </div>
  )
}

function Page2() {
  return (
    <div className="funnel-page">
      <h1>Ta puberté compte</h1>
      <p className="subtitle">
        C'est maintenant que tu construis ton avenir
      </p>

      <div className="stats-container">
        <div className="stat-bar">
          <div className="stat-label">Pendant la puberté</div>
          <div className="stat-number">75%</div>
          <div className="stat-description">
            C'est le moment où tu grandis le plus
          </div>
        </div>

        <div className="stat-bar secondary">
          <div className="stat-label">Après la puberté</div>
          <div className="stat-number">25%</div>
          <div className="stat-description">
            Les cm qui restent se font plus lentement
          </div>
        </div>
      </div>

      <div className="info-box">
        <p>
          <strong>Ce que ça veut dire:</strong> Les années maintenant sont
          critiques. Optimiser ton sommeil, ta nutrition et tes exercices
          TODAY peut te faire gagner plusieurs centimètres.
        </p>
      </div>
    </div>
  )
}

function Page3() {
  return (
    <div className="funnel-page">
      <h1>Quelle est la précision?</h1>
      <p className="subtitle">
        On combine science et données réelles pour ton estimation
      </p>

      <div className="precision-graphic">
        <svg viewBox="0 0 200 200" className="circular-progress">
          <circle cx="100" cy="100" r="90" className="background" />
          <circle
            cx="100"
            cy="100"
            r="90"
            className="progress"
            style={{
              strokeDasharray: `${90 * 2 * Math.PI * 0.985}, ${90 * 2 * Math.PI}`
            }}
          />
          <text x="100" y="105" textAnchor="middle" className="percentage">
            98.5%
          </text>
          <text x="100" y="125" textAnchor="middle" className="label">
            de précision
          </text>
        </svg>
      </div>

      <div className="methods">
        <h3>Comment on y arrive:</h3>
        <ul>
          <li>📋 Tables de croissance OMS (5-19 ans)</li>
          <li>🔬 Fels Longitudinal Study (50+ ans de données)</li>
          <li>📊 Modèle Khamis-Roche (prédictions d'adultes)</li>
          <li>📈 Suivi du couloir de croissance personnel</li>
        </ul>
      </div>

      <div className="margin">
        ±4 à ±8 cm selon ton âge
      </div>
    </div>
  )
}

function Page4() {
  return (
    <div className="funnel-page">
      <h1>Le coût d'être petit</h1>
      <p className="subtitle">
        Ce que la science dit sur quelques centimètres de différence
      </p>

      <div className="costs-list">
        <div className="cost-item">
          <span className="cost-icon">💔</span>
          <div>
            <strong>40% de matchs en moins</strong> sur les applis de rencontre
          </div>
        </div>

        <div className="cost-item">
          <span className="cost-icon">🚫</span>
          <div>
            <strong>Ignoré dans les moments importants</strong> (réunions,
            présentations)
          </div>
        </div>

        <div className="cost-item">
          <span className="cost-icon">🤐</span>
          <div>
            <strong>Moins pris au sérieux</strong> par les autres, même à
            compétences égales
          </div>
        </div>

        <div className="cost-item">
          <span className="cost-icon">💼</span>
          <div>
            <strong>59% moins de chances d'être CEO</strong> en dessous de 5'9"
          </div>
        </div>

        <div className="cost-item">
          <span className="cost-icon">💰</span>
          <div>
            <strong>Chaque pouce = 600 $/an</strong> en différence de salaire
          </div>
        </div>

        <div className="cost-item">
          <span className="cost-icon">😰</span>
          <div>
            <strong>Plus d'anxiété sociale</strong> et de confiance en soi
          </div>
        </div>
      </div>

      <div className="cta-box">
        <p>
          <strong>Bonne nouvelle:</strong> Tu peux encore agir. Optimise ta
          croissance maintenant et gagne du terrain.
        </p>
      </div>
    </div>
  )
}
