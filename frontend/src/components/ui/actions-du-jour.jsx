import { useState } from 'react'
import { BedDouble, Check, ChevronRight, Milk, PersonStanding, Sun } from 'lucide-react'

import '../../styles/visuels.css'

/* Les 4 actions du jour, reconstruites d'après le visuel du client (qui
   portait un fond noir incrusté). Les cases se cochent au toucher : un
   avant-goût du plan, sans rien enregistrer — la vraie liste est derrière
   le paiement. */
const ACTIONS = [
  { icone: Milk, texte: '1 verre de lait + miel' },
  { icone: BedDouble, texte: 'Se coucher à la même heure chaque soir' },
  { icone: Sun, texte: '10 min de lumière naturelle au réveil' },
  { icone: PersonStanding, texte: '3 × 10 étirements cobra' },
]

export function ActionsDuJour() {
  const [faites, setFaites] = useState(() => new Set())

  const basculer = (i) =>
    setFaites((prec) => {
      const suiv = new Set(prec)
      if (suiv.has(i)) suiv.delete(i)
      else suiv.add(i)
      return suiv
    })

  return (
    <ol className="adj" aria-label="Exemple d'actions du jour">
      {ACTIONS.map(({ icone: Icone, texte }, i) => {
        const fait = faites.has(i)
        return (
          <li key={texte} className="adj-ligne" style={{ '--i': i }}>
            <span className="adj-numero" aria-hidden="true">{i + 1}</span>
            <button
              type="button"
              className={`adj-carte ${fait ? 'is-fait' : ''}`}
              aria-pressed={fait}
              onClick={() => basculer(i)}
            >
              <span className="adj-case" aria-hidden="true">
                {fait && <Check size={16} strokeWidth={3} />}
              </span>
              <span className="adj-texte">{texte}</span>
              <span className="adj-icone" aria-hidden="true">
                <Icone size={26} />
              </span>
              <ChevronRight size={18} className="adj-chevron" aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
