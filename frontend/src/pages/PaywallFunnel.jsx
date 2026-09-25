import { useState } from 'react'
import '../styles/funnel.css'

export default function PaywallFunnel({ onComplete }) {
  const [step, setStep] = useState(0)

  const next = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  if (step === 0) {
    return (
      <div className="interstitial">
        <h1 className="interstitial-titre">Pourquoi tu as telecharge Grandimi ?</h1>
        <p className="interstitial-text">Tu peux choisir plusieurs</p>
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {["Predire ma taille finale", "Savoir quoi manger pour grandir", "Corriger ma posture", "Exercices pour grandir"].map((opt) => (
            <div key={opt} style={{ padding: "1rem", border: "2px solid #ff5a1f", borderRadius: "8px", cursor: "pointer", textAlign: "center" }}>
              {opt}
            </div>
          ))}
        </div>
        <div className="interstitial-action is-ready">
          <button type="button" className="funnel-cta" onClick={next}>
            Continuer
          </button>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="interstitial">
        <h1 className="interstitial-titre">Ta puberte compte</h1>
        <p className="interstitial-text">Environ 75 % de ta croissance totale se fait pendant la puberte, et seulement 25 % apres</p>
        <div className="interstitial-action is-ready">
          <button type="button" className="funnel-cta" onClick={next}>
            Continuer
          </button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="interstitial" style={{ textAlign: "center" }}>
        <h1 className="interstitial-titre">Quelle est la precision de notre prediction ?</h1>
        <p className="interstitial-text">On combine donnees cles et environnement pour estimer ton potentiel</p>
        <div style={{ fontSize: "5rem", fontWeight: "700", color: "#ff5a1f", margin: "2rem 0" }}>
          98.5%
        </div>
        <p style={{ color: "#666", marginBottom: "2rem" }}>Accuracy</p>
        <div className="interstitial-action is-ready">
          <button type="button" className="funnel-cta" onClick={next}>
            Continuer
          </button>
        </div>
      </div>
    )
  }

  if (step === 3) {
    const costs = [
      "40 % de matchs en moins sur les applis de rencontre",
      "Ignore dans les moments importants",
      "Moins pris au serieux par les autres",
      "59 % moins de chances d'etre CEO en dessous de 5'9\"",
      "Chaque pouce coute 600 $/an",
      "Plus d'anxiete sociale",
    ]
    return (
      <div className="interstitial">
        <h1 className="interstitial-titre">Le cout d'etre petit</h1>
        <p className="interstitial-text">Pas des statistiques. Juste ce que tu vis deja</p>
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {costs.map((cost, idx) => (
            <div key={idx} style={{ padding: "1rem", background: "rgba(255, 90, 31, 0.1)", border: "1px solid rgba(255, 90, 31, 0.3)", borderRadius: "6px", borderLeft: "3px solid #ff5a1f" }}>
              <strong style={{ color: "#ff5a1f" }}>!</strong> {cost}
            </div>
          ))}
        </div>
        <div className="interstitial-action is-ready">
          <button type="button" className="funnel-cta" onClick={next}>
            Continuer
          </button>
        </div>
      </div>
    )
  }
}
