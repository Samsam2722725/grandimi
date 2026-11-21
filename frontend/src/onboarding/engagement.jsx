import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Fingerprint, ChevronRight } from 'lucide-react'
import { dateFinProgramme } from './content'
import { TelephonePlan } from '@/components/ui/ce-que-tu-obtiens'
import '../styles/paywall-night.css'
import { EcranTesResultats } from '../pages/ApercuPage'

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
  // ?eng=1 ou 2 (local seulement) ouvre directement le 2e ou 3e écran, pour les captures.
  const [etape, setEtape] = useState(() => (import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('eng')) || 0 : 0))

  if (etape === 0) {
    return (
      <div className="eng eng--centre">
        <main className="eng-corps">
          <p className="eng-surtitre eng-surtitre--centre">Ton cap</p>
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
    // « Ton plan personnalisé est prêt » (tuile flèche), à la place de
    // l'ancien plan sur mesure, entre « réaliste » et la promesse (21/11/2026).
    return <EcranTesResultats prenom={prenom} onContinue={() => setEtape(2)} />
  }

  if (etape === 99) {
    /* « Plan sur mesure » et « Comment on t'amène » fusionnés (choix B de
       Samuel, 21/11/2026) : son prénom, la date de fin du programme et
       l'image « Ton plan ». Plus de taille prédite ici : elle est sur le
       résultat caché. */
    return (
      <div className="eng">
        <main className="eng-corps eng-corps--plan">
          <span className="pret-badge" aria-hidden="true"><CheckCircle2 size={34} strokeWidth={2.4} /></span>
          <h1 className="eng-titre eng-titre--centre">
            {prenom ? `${prenom}, ton plan sur mesure est prêt.` : 'Ton plan sur mesure est prêt.'}
          </h1>
          <p className="eng-plan-label">Ton programme se termine le :</p>
          <p className="eng-plan-date">{dateFinProgramme()}</p>
          <p className="eng-plan-sous">Ton plan personnalisé pour atteindre ta taille maximale. Chaque jour, il te dit quoi faire.</p>
          <div className="eng-visuel eng-visuel--plan"><TelephonePlan /></div>
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
