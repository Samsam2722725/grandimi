import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/* ============================================================
   FEUILLE D'INFORMATION — le panneau qui monte du bas
   ============================================================
   Reprise de l'écran « How the prediction works » de GoTall : un lien
   discret sous la figure ouvre un panneau qui couvre les deux tiers bas
   de l'écran, avec une liste à puces et un seul bouton pour refermer.

   POURQUOI UN PANNEAU ET PAS UN ÉCRAN DE PLUS. Le tunnel compte déjà
   une trentaine d'écrans. Celui qui veut savoir comment marche le
   calcul est une minorité motivée ; lui imposer un écran que tous les
   autres devront passer allongerait l'entonnoir sans rien convertir.
   Un panneau optionnel sert les deux : rien à faire pour qui n'a pas la
   question, une réponse complète pour qui l'a.

   ACCESSIBILITÉ : le panneau est un `dialog` modal, le focus y entre à
   l'ouverture et Échap le referme. Un panneau qu'on ne peut fermer
   qu'à la souris est un piège au clavier — et ici il recouvre le
   bouton « Continuer », donc le tunnel entier.
   ============================================================ */

export function FeuilleInfo({ titre, intro, points, cta = 'Compris', onFermer }) {
  const panneauRef = useRef(null)
  const boutonRef = useRef(null)

  useEffect(() => {
    boutonRef.current?.focus()

    const auClavier = (evenement) => {
      if (evenement.key === 'Escape') {
        evenement.stopPropagation()
        onFermer()
        return
      }

      /* Piège à focus volontaire : tant que le panneau est ouvert, Tab
         tourne entre ses propres commandes. Sans ça, la tabulation
         descend dans le tunnel resté monté derrière, que le lecteur
         d'écran annonce alors qu'il est visuellement masqué. */
      if (evenement.key !== 'Tab') return

      const focalisables = panneauRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focalisables || focalisables.length === 0) return

      const premier = focalisables[0]
      const dernier = focalisables[focalisables.length - 1]

      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault()
        dernier.focus()
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault()
        premier.focus()
      }
    }

    document.addEventListener('keydown', auClavier)
    return () => document.removeEventListener('keydown', auClavier)
  }, [onFermer])

  return (
    /* `night` porte les jetons de surface sombre. Le panneau est monté en
       FRÈRE du tunnel et non dedans — il doit recouvrir son bouton — donc
       il sort de `.funnel`, où ces jetons sont définis. Sans cette classe
       `--funnel-surface` ne résout pas, `background` devient invalide, et
       la feuille s'affiche entièrement transparente par-dessus l'écran. */
    <div className="night feuille-voile" onClick={onFermer} role="presentation">
      <div
        className="feuille"
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feuille-titre"
        /* Le voile ferme au clic ; le panneau lui-même ne doit pas
           propager ce clic, sinon lire son contenu le referme. */
        onClick={(evenement) => evenement.stopPropagation()}
      >
        <span className="feuille-poignee" aria-hidden="true" />

        <div className="feuille-entete">
          <h2 id="feuille-titre" className="feuille-titre">
            {titre}
          </h2>
          <button
            type="button"
            className="feuille-fermer"
            onClick={onFermer}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="feuille-corps">
          {intro && <p className="feuille-intro">{intro}</p>}
          <ul className="feuille-points">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="feuille-pied">
          <button type="button" className="funnel-cta" ref={boutonRef} onClick={onFermer}>
            {cta}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeuilleInfo
