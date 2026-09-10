import { useEffect, useState } from 'react'

/**
 * Écran de respiration entre deux blocs de questions : une phrase, rien d'autre.
 *
 * Ce n'est pas de la décoration. Huit champs d'affilée transforment le tunnel en
 * corvée administrative ; une pause qui rappelle POURQUOI on répond remet
 * l'utilisateur dans son motif initial avant la série suivante. Le texte apparaît
 * en fondu, puis le bouton — dans cet ordre, pour qu'on lise avant de pouvoir
 * cliquer.
 *
 * L'écran n'avance jamais tout seul : une auto-avance vole la lecture à qui lit
 * lentement, et rend l'écran inutilisable au lecteur d'écran.
 */
export function Interstitial({ text, cta = 'Continuer', onContinue }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 900)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="interstitial">
      <p className="interstitial-text">{text}</p>
      <div className={`interstitial-action ${ready ? 'is-ready' : ''}`}>
        <button type="button" className="funnel-cta" onClick={onContinue}>
          {cta}
        </button>
      </div>
    </div>
  )
}

export default Interstitial
