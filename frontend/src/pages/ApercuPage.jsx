import { useEffect } from 'react'
import { Lock, Sparkles } from 'lucide-react'

import { TailleAccueil } from '@/components/ui/taille-accueil'
import { capture } from '../lib/analytics'
import { pointsFaibles } from '../lib/offres'
import '../styles/funnel.css'
import '../styles/parcours.css'
import '../styles/apercu.css'

/* Ses résultats, entre le questionnaire et le prix.

   Avant (jusqu'au 30/10/2026), l'e-mail menait droit au paywall : il
   payait pour un résultat qu'il n'avait jamais vu. Ici il voit que son
   analyse existe (sa taille, sa courbe, ce qu'il peut optimiser) et ce
   qui est réservé au plan porte un cadenas. Aucun centimètre affiché
   ni promis : ce qu'il peut optimiser reste sous cadenas. */
function ApercuPage({ predictionData: d, onDebloquer }) {
  const faibles = pointsFaibles(d)
  const affichable = [d.current_height_cm, d.predicted_height_cm, d.age].every((v) => Number.isFinite(Number(v)))

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

  const optimiser = (
    <button type="button" className="taille-case apercu-optimiser" onClick={() => debloquer('optimiser')}>
      <span className="apercu-optimiser-ligne">
        <span className="apercu-optimiser-tete">
          <Sparkles size={16} aria-hidden="true" /> Plan personnalisé pour optimiser
        </span>
        <Lock size={20} aria-hidden="true" />
      </span>
    </button>
  )

  return (
    <div className="night apercu">
      <header className="apercu-top">
        <span className="apercu-logo">Grandimi</span>
      </header>

      <main className="apercu-contenu">
        <p className="apercu-pret">Ton analyse est terminée ✓</p>
        <h1 className="apercu-titre">Tes résultats</h1>

        <TailleAccueil
          predictionData={d}
          verrouille
          sansBarres
          futurCache
          apresTailles={optimiser}
          nbPoints={faibles.length}
          onDebloquer={() => debloquer('cadenas')}
          onVoirCourbe={() => debloquer('courbe')}
          onVoirPoints={() => debloquer('points')}
        />
      </main>

      <div className="apercu-pied">
        <button type="button" className="funnel-cta" onClick={() => debloquer('bouton')}>
          Débloquer mes résultats
        </button>
      </div>
    </div>
  )
}

export default ApercuPage
