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
      <div className="interstitial" style={{ background: '#f5f5f5', color: '#000' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Pourquoi tu as telecharge Grandimi ?</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Tu peux choisir plusieurs</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { title: 'Predire ma taille finale', desc: 'Sais exactement quelle sera ta taille adulte' },
            { title: 'Savoir quoi manger pour grandir', desc: 'Les bons aliments pour maximiser ton potentiel' },
            { title: 'Corriger ma posture', desc: 'Parais plus grand et en meilleure sante' },
            { title: 'Exercices pour grandir', desc: 'Routines scientifiques pour stimuler la croissance' }
          ].map((opt) => (
            <div key={opt.title} style={{ padding: '1.5rem', border: '2px solid #ff5a1f', borderRadius: '12px', cursor: 'pointer', background: '#fff', textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.3rem' }}>{opt.title}</div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>✓ {opt.desc}</div>
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
      <div className="interstitial" style={{ background: '#f5f5f5', color: '#000' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 700, color: '#ff5a1f' }}>Ta puberte compte</h1>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center', borderLeft: '4px solid #ff5a1f' }}>
          <p style={{ fontSize: '1.3rem', lineHeight: 1.6, color: '#000' }}>
            Environ <strong>75 %</strong> de ta croissance totale se fait pendant la puberte
          </p>
          <p style={{ fontSize: '1.3rem', lineHeight: 1.6, color: '#000', marginTop: '1rem' }}>
            et seulement <strong>25 %</strong> apres
          </p>
        </div>
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
      <div className="interstitial" style={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Quelle est la precision de notre prediction ?</h1>
        <p style={{ color: '#999', marginBottom: '2rem' }}>On combine donnees cles et environnement pour estimer ton potentiel</p>
        
        <div style={{ position: 'relative', width: '200px', height: '200px', margin: '2rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
            <circle cx="100" cy="100" r="95" fill="none" stroke="#333" strokeWidth="3" />
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="#ff5a1f"
              strokeWidth="3"
              strokeDasharray={`${95 * 2 * Math.PI * 0.985} ${95 * 2 * Math.PI}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', fontWeight: 700, color: '#ff5a1f' }}>98.5%</div>
            <div style={{ fontSize: '0.9rem', color: '#999' }}>Accuracy</div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,90,31,0.1)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', maxWidth: '500px', margin: '2rem auto' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#ccc' }}>
            Notre algorithme combine trois methodes de prediction scientifiques avec ton profil personnel pour estimer ta taille avec precision
          </p>
        </div>

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
      <div className="interstitial" style={{ background: '#f5f5f5', color: '#000' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Le cout d'etre petit</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Pas des statistiques. Juste ce que tu vis deja</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {costs.map((cost, idx) => (
            <div key={idx} style={{ padding: '1rem', background: '#fff', border: '1px solid #ff5a1f', borderLeft: '4px solid #ff5a1f', borderRadius: '6px', display: 'flex', gap: '0.75rem' }}>
              <div style={{ color: '#ff5a1f', fontWeight: 700, fontSize: '1.2rem' }}>!</div>
              <div style={{ textAlign: 'left', fontSize: '0.95rem', color: '#000' }}>{cost}</div>
            </div>
          ))}
        </div>

        <div className="interstitial-action is-ready">
          <button type="button" className="funnel-cta" onClick={next}>
            Voir la solution
          </button>
        </div>
      </div>
    )
  }
}
