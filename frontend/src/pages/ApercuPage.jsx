import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { capture } from '../lib/analytics'
import { pointsFaibles } from '../lib/offres'
import '../styles/funnel.css'
import '../styles/apercu.css'

/* Le résultat caché, juste avant le prix : copie de l'écran de GoTall
   (capture 40, 20/11/2026), à la demande de Samuel, mot pour mot et même
   mise en page. Seules différences : le nom et le logo Grandimi, l'orange
   à la place de leur vert, les centimètres à la place des pouces (le site
   est en cm), et le nombre de problèmes, qui est le vrai (pointsFaibles).
   Tout le reste est sous cadenas, comme chez eux. */

const CADENAS = '🔒'

// Confettis à l'ouverture, comme GoTall : des bandes de couleur qui tombent.
const COULEURS_CONFETTIS = ['#ff5a1f', '#e5484d', '#8e5cf7', '#3b82f6', '#f5a524', '#4ade80']

function Confettis() {
  const morceaux = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        gauche: (i * 37) % 100,
        couleur: COULEURS_CONFETTIS[i % COULEURS_CONFETTIS.length],
        delai: ((i * 53) % 90) / 100,
        duree: 2.4 + ((i * 29) % 15) / 10,
        large: i % 3 === 0,
        rotation: (i * 47) % 360,
      })),
    [],
  )
  return (
    <div className="gt-confettis" aria-hidden="true">
      {morceaux.map((m, i) => (
        <span
          key={i}
          className={'gt-confetti' + (m.large ? ' is-large' : '')}
          style={{
            left: `${m.gauche}%`,
            background: m.couleur,
            animationDelay: `${m.delai}s`,
            animationDuration: `${m.duree}s`,
            '--r': `${m.rotation}deg`,
          }}
        />
      ))}
    </div>
  )
}

/* « Tes résultats sont là ! » : l'écran 39 de GoTall, juste avant le
   résultat caché, mot pour mot (21/11/2026, demande de Samuel). La tuile
   en relief avec sa flèche est redessinée en orange. */
function TuileFleche() {
  return (
    <svg className="gt-tuile" viewBox="0 0 300 200" aria-hidden="true">
      <polygon points="150,44 292,124 150,204 8,124" className="gt-tuile-ombre" />
      <polygon points="14,96 150,174 286,96 286,116 150,194 14,116" className="gt-tuile-cote" />
      <polygon points="150,18 286,96 150,174 14,96" className="gt-tuile-dessus" />
      <path d="M 212 98 C 180 106, 130 106, 86 92" className="gt-tuile-fleche" />
      <path d="M 106 74 L 82 90 L 96 114" className="gt-tuile-fleche" />
    </svg>
  )
}

/* Depuis le 21/11/2026, « Tes résultats sont là ! » s'affiche juste après
   l'animation de calcul, avant l'e-mail (demande de Samuel) : il est rendu
   par OnboardingFlow avec ce composant, et ApercuPage ouvre directement le
   résultat caché. */
export function EcranTesResultats({ onContinue }) {
  return (
    <div className="gt-resultat">
      <header className="gt-tete">
        <span className="gt-barre" aria-hidden="true"><span /></span>
      </header>
      <main className="gt-contenu gt-intro">
        <h1 className="gt-intro-titre">Tes résultats sont là !</h1>
        <p className="gt-intro-sous">Il s’avère que… Tu ne grandis pas à ton potentiel.</p>
        <p className="gt-intro-surligne"><span>Corrigeons ça !</span></p>
        <TuileFleche />
      </main>
      <div className="gt-pied">
        <button type="button" className="gt-cta" onClick={() => { capture('apercu_reveler'); onContinue() }}>
          Révéler mes résultats <ChevronRight size={24} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function ApercuPage({ predictionData: d, onDebloquer }) {
  const [revele, setRevele] = useState(true)
  const faibles = pointsFaibles(d)
  const affichable = [d.current_height_cm, d.age].every((v) => Number.isFinite(Number(v)))
  // Le vrai nombre, jamais gonflé : sans point faible, pas de badge.
  const nbProblemes = faibles.length
  const age = Math.round(Number(d.age))

  useEffect(() => {
    // Estimation encore en attente (serveur lent) : rien à montrer, on
    // passe au prix comme avant.
    if (!affichable) onDebloquer()
    else capture('apercu_vu', { points: faibles.length })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!affichable) return null

  const debloquer = (ou) => {
    capture('apercu_debloquer', { ou })
    onDebloquer()
  }

  if (!revele) {
    return (
      <div className="gt-resultat">
        <header className="gt-tete">
          <span className="gt-barre" aria-hidden="true"><span /></span>
        </header>
        <main className="gt-contenu gt-intro">
          <h1 className="gt-intro-titre">Tes résultats sont là !</h1>
          <p className="gt-intro-sous">Il s’avère que… Tu ne grandis pas à ton potentiel.</p>
          <p className="gt-intro-surligne"><span>Corrigeons ça !</span></p>
          <TuileFleche />
        </main>
        <div className="gt-pied">
          <button type="button" className="gt-cta" onClick={() => { capture('apercu_reveler'); setRevele(true) }}>
            Révéler mes résultats <ChevronRight size={24} aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="gt-resultat">
      <Confettis />

      <header className="gt-tete">
        <span className="gt-barre" aria-hidden="true"><span /></span>
      </header>

      <main className="gt-contenu">
        <p className="gt-logo">
          Grandimi
          <img src="/favicon.svg" alt="" width="34" height="34" />
        </p>
        {/* « Investis en toi » fusionné ici, à la demande de Samuel (21/11/2026). */}
        <h1 className="gt-investir">Maintenant, il est temps d’investir en toi.</h1>

        <div className="gt-tailles">
          <div className="gt-carte gt-taille">
            <span className="gt-taille-libelle">Taille actuelle</span>
            <strong className="gt-taille-valeur">{Math.round(Number(d.current_height_cm))} cm</strong>
          </div>
          <button type="button" className="gt-carte gt-taille gt-taille--predite" onClick={() => debloquer('taille')}>
            <span className="gt-taille-libelle">Taille prédite</span>
            <span className="gt-cadenas gt-cadenas--grand">{CADENAS}</span>
          </button>
        </div>

        <button type="button" className="gt-carte gt-ligne" onClick={() => debloquer('optimiser')}>
          Optimiser jusqu’à <span className="gt-cadenas">{CADENAS}</span> cm
        </button>

        <button type="button" className="gt-carte gt-freine" onClick={() => debloquer('freine')}>
          <span className="gt-freine-tete">
            <strong>Ce qui te freine :</strong>
            {nbProblemes > 0 && (
              <span className="gt-freine-badge">
                {nbProblemes} problème{nbProblemes > 1 ? 's' : ''} trouvé{nbProblemes > 1 ? 's' : ''}
              </span>
            )}
          </span>
          <span className="gt-freine-barres" aria-hidden="true">
            <span /><span /><span />
            <span className="gt-cadenas gt-freine-cadenas">{CADENAS}</span>
          </span>
        </button>

        <div className="gt-graphique" onClick={() => debloquer('courbe')}>
          <div className="gt-graphique-tete">
            <span className="gt-graphique-titre"><i aria-hidden="true" />Graphique de croissance</span>
            <span className="gt-bulle">Chance du rêve: <span className="gt-cadenas">{CADENAS}</span> %</span>
          </div>
          <svg className="gt-courbe" viewBox="0 0 340 190" aria-hidden="true">
            <text x="0" y="12" className="gt-axe">100%</text>
            <text x="0" y="168" className="gt-axe">0%</text>
            <text x="0" y="62" className="gt-axe-cadenas">{CADENAS}</text>
            <text x="22" y="62" className="gt-axe-pourcent">%</text>
            <line x1="56" y1="6" x2="340" y2="6" className="gt-grille" />
            <line x1="56" y1="164" x2="340" y2="164" className="gt-grille" />
            <line x1="56" y1="57" x2="200" y2="57" className="gt-tirets-h" />
            <line x1="200" y1="62" x2="200" y2="160" className="gt-tirets-v" />
            <path d="M 56 164 C 110 132, 160 82, 200 57 S 300 12, 340 6" className="gt-trace" />
            <circle cx="200" cy="57" r="16" className="gt-halo" />
            <circle cx="200" cy="57" r="8" className="gt-point" />
          </svg>
          <div className="gt-abscisses">
            <span className="gt-flou" />
            <span className="gt-age">{age}</span>
            <span className="gt-flou" />
          </div>
        </div>

        <button type="button" className="gt-carte gt-ligne" onClick={() => debloquer('percentile')}>
          Plus grand que <span className="gt-cadenas">{CADENAS}</span> de ton âge
        </button>
      </main>

      <div className="gt-pied">
        <button type="button" className="gt-cta" onClick={() => debloquer('bouton')}>
          Voir mon potentiel <ChevronRight size={24} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default ApercuPage
