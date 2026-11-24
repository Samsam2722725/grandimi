import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import { OFFRES, euros } from '@/lib/offres'
import { Confettis } from '@/pages/ApercuPage'

/* Offre de sortie, copiée de Taller (captures 23 et 24 du 20/11/2026) : quand
   le visiteur ferme le paiement ou le paywall, un écran « PROMO » s'ouvre une
   seule fois, avec un compte à rebours de 5 minutes, le prix à moitié et le
   bouton « Réclamer l'offre limitée ». Le prix est vrai : c'est un plan Whop
   à part (sem_promo, an_promo), prélevé tel qu'affiché. À zéro, l'écran se
   ferme tout seul. Aux couleurs de Grandimi (noir et orange). */
const DUREE_MS = 5 * 60 * 1000
const deux = (n) => String(n).padStart(2, '0')

export function OffreSortie({ onReclamer, onFermer }) {
  /* Comme Taller : une seule offre, l'année (« Seulement 1,67 € / mois,
     total 20,00 € / an »). Le pourcentage est le vrai : jamais « 50 % » si le
     prix baisse de 33 %. */
  const offre = OFFRES.find((o) => o.duree === 'an')
  const remise = Math.round((1 - offre.promo / offre.reduit) * 100)
  const [fin] = useState(() => Date.now() + DUREE_MS)
  const [reste, setReste] = useState(DUREE_MS)
  useEffect(() => {
    const t = setInterval(() => {
      const r = fin - Date.now()
      setReste(Math.max(0, r))
      if (r <= 0) {
        clearInterval(t)
        onFermer()
      }
    }, 250)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fin])

  return (
    <div className="promo" role="dialog" aria-modal="true" aria-label="Offre exclusive">
      <Confettis />
      <button type="button" className="promo-fermer" onClick={onFermer} aria-label="Fermer">
        <X size={30} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <div className="promo-corps">
        <span className="promo-pastille">Offre exclusive <span aria-hidden="true">🥳</span></span>
        <h1 className="promo-titre">{remise} % PROMO</h1>
        <div className="promo-cadeau" aria-hidden="true">🎁</div>
        <p className="promo-expire">Cette offre expirera dans</p>
        <div className="promo-minuteur" role="timer">
          <div><strong>{deux(Math.floor(reste / 60000))}</strong><span>minutes</span></div>
          <div><strong>{deux(Math.floor((reste % 60000) / 1000))}</strong><span>secondes</span></div>
        </div>
        <p className="promo-prix">
          Seulement <strong>{euros(offre.promo / 12)}</strong> / mois
        </p>
        <p className="promo-avant">Total {euros(offre.promo)} / an, au lieu de {euros(offre.reduit)}</p>
      </div>
      <div className="promo-pied">
        <button type="button" className="funnel-cta" onClick={onReclamer}>Réclamer l’offre limitée</button>
        <p className="promo-mention">Renouvelé chaque année · Résiliable à tout moment</p>
      </div>
    </div>
  )
}

export default OffreSortie
