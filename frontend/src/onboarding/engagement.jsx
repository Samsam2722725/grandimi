import { useEffect, useRef, useState } from 'react'
import { Fingerprint, ChevronRight } from 'lucide-react'
import { VisuelActions, TelephonePlan } from '@/components/ui/ce-que-tu-obtiens'
import '../styles/paywall-night.css'

/* « C'est tout à fait réaliste », « Voilà comment on t'amène à ta taille
   maximale » et la promesse (TrendSaaS 37, 38 et 40), entre le plan sur mesure
   et le résultat caché (21/11/2026, validé par Samuel). « Ce qu'on fait » est
   montré ici avec les images du paywall, comme GoTall le fait avant le prix. */
const DUREE_APPUI_MS = 1600

function BoutonEmpreinte({ onFini }) {
  const [progres, setProgres] = useState(0)
  const debut = useRef(null)
  const cadre = useRef(null)
  const fini = useRef(false)

  const arreter = () => {
    cancelAnimationFrame(cadre.current)
    debut.current = null
    if (!fini.current) setProgres(0)
  }
  const avancer = (t) => {
    if (debut.current == null) debut.current = t
    const p = Math.min(1, (t - debut.current) / DUREE_APPUI_MS)
    setProgres(p)
    if (p >= 1) { fini.current = true; onFini(); return }
    cadre.current = requestAnimationFrame(avancer)
  }
  const commencer = (e) => {
    e.preventDefault()
    if (fini.current) return
    cancelAnimationFrame(cadre.current)
    cadre.current = requestAnimationFrame(avancer)
  }
  useEffect(() => () => cancelAnimationFrame(cadre.current), [])

  const R = 54, C = 2 * Math.PI * R
  return (
    <div className="eng-empreinte">
      <button
        type="button"
        className="eng-empreinte-bouton"
        onPointerDown={commencer}
        onPointerUp={arreter}
        onPointerLeave={arreter}
        onPointerCancel={arreter}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { fini.current = true; onFini() } }}
        aria-label="Reste appuyé pour faire ta promesse"
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={R} className="eng-anneau-fond" />
          <circle cx="60" cy="60" r={R} className="eng-anneau" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progres) }} />
        </svg>
        <Fingerprint size={54} strokeWidth={1.4} aria-hidden="true" />
      </button>
      <p className="eng-empreinte-texte">Reste appuyé pour continuer</p>
    </div>
  )
}

export function EcranEngagement({ prenom, onContinue }) {
  const [etape, setEtape] = useState(0)

  if (etape === 0) {
    return (
      <div className="eng eng--centre">
        <main className="eng-corps">
          <h1 className="eng-realiste">
            {prenom ? `${prenom}, c’est tout à fait réaliste.` : 'C’est tout à fait réaliste.'}
            <span>Et on va le faire avec toi.</span>
          </h1>
        </main>
        <footer className="eng-pied">
          <button type="button" className="funnel-cta" onClick={() => setEtape(1)}>Continuer <ChevronRight size={20} aria-hidden="true" /></button>
        </footer>
      </div>
    )
  }

  if (etape === 1) {
    const ETAPES = [
      { n: '01', titre: 'On prédit ta taille finale', texte: 'Avec ta croissance, ta famille et tes habitudes.', visuel: (
        <div className="eng-prediction" aria-hidden="true">
          <div><span>Aujourd’hui</span><strong>Ta taille</strong></div>
          <div className="eng-prediction-cible"><span>Ta taille finale</span><strong>🔒</strong></div>
        </div>
      ) },
      { n: '02', titre: 'Chaque jour, ton plan te dit quoi faire', texte: 'Des actions simples pour optimiser ta croissance.', visuel: <VisuelActions /> },
      { n: '03', titre: 'Chaque mois, on suit ta taille et on ajuste', texte: 'Ton programme avance par niveaux, jusqu’à ta taille maximale.', visuel: <TelephonePlan /> },
    ]
    return (
      <div className="eng">
        <main className="eng-corps eng-corps--liste">
          <p className="eng-surtitre">Ce qu’on fait maintenant</p>
          <h1 className="eng-titre">Voilà comment on t’amène à ta taille maximale.</h1>
          <ol className="eng-etapes">
            {ETAPES.map((e) => (
              <li key={e.n} className="eng-etape">
                <span className="eng-num">{e.n}</span>
                <div className="eng-etape-texte">
                  <strong>{e.titre}</strong>
                  <span>{e.texte}</span>
                </div>
                <div className="eng-visuel">{e.visuel}</div>
              </li>
            ))}
          </ol>
        </main>
        <footer className="eng-pied">
          <button type="button" className="funnel-cta" onClick={() => setEtape(2)}>Continuer <ChevronRight size={20} aria-hidden="true" /></button>
        </footer>
      </div>
    )
  }

  return (
    <div className="eng eng--centre">
      <main className="eng-corps">
        <p className="eng-surtitre">Ta promesse</p>
        <h1 className="eng-titre eng-titre--centre">Avant d’aller plus loin, fais-toi une promesse.</h1>
        <p className="eng-promesse">« Je me promets de suivre mon plan et de donner le maximum pendant que je grandis. »</p>
        <p className="eng-note">Tu ne t’engages envers personne : c’est une promesse que tu te fais à toi-même.</p>
        <BoutonEmpreinte onFini={onContinue} />
      </main>
    </div>
  )
}
