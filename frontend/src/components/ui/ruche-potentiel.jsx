import { Dumbbell, Moon, TrendingUp, Utensils } from 'lucide-react'

/* ============================================================
   ÉCRANS DE PREUVE — les trois leviers, puis ce qu'ils deviennent
   ============================================================
   Deux écrans consécutifs repris de GoTall (« Optimise tout ton
   potentiel de taille », puis « GoTall t'aide pour ça ») et construits
   sur la MÊME figure, volontairement.

     variante « ruche »   : Sport / Manger / Dormir autour d'un centre
                            allumé — le potentiel de croissance.
     variante « convergence » : les trois mêmes tuiles, reliées vers le
                            nom du produit en bas.

   La répétition n'est pas une paresse, c'est le mécanisme. Le premier
   écran pose un problème à trois branches ; le second remet le MÊME
   dessin avec le produit à la place du centre. La conclusion s'impose
   sans qu'aucune phrase n'ait à l'affirmer — et sans qu'on promette
   quoi que ce soit qu'on ne tienne pas.

   Les trois leviers ne sont pas décoratifs : ce sont exactement les
   trois champs que le questionnaire collecte et que calculateHealthFactor
   consomme (sommeil, nutrition, activité). Un quatrième carreau serait
   une promesse sans code derrière.
   ============================================================ */

const LEVIERS = [
  { clef: 'sport', Icone: Dumbbell, nom: 'Sport' },
  { clef: 'manger', Icone: Utensils, nom: 'Manger' },
  { clef: 'dormir', Icone: Moon, nom: 'Dormir' },
]

export function RuchePotentiel({ variante = 'ruche', className }) {
  const convergence = variante === 'convergence'

  return (
    <div className={`ruche ruche--${variante} ${className || ''}`}>
      <div className="ruche-tuiles">
        {LEVIERS.map(({ clef, Icone, nom }) => (
          <div key={clef} className={`ruche-tuile ruche-tuile--${clef}`}>
            <Icone size={26} aria-hidden="true" />
            <span>{nom}</span>
          </div>
        ))}
      </div>

      {convergence ? (
        <>
          {/* Les trois traits qui descendent vers le nom. Tracés en SVG
              et non en bordures CSS : il faut des courbes qui se
              rejoignent, ce qu'un `border-left` ne sait pas faire. */}
          <svg className="ruche-liens" viewBox="0 0 300 90" aria-hidden="true">
            {/* `pathLength="1"` uniformise la longueur pour l'animation de
                tracé en CSS (ruche-lien-trace) : chaque branche se dessine
                à la même vitesse indépendamment de sa longueur réelle. */}
            <path className="ruche-lien" pathLength="1" d="M40 0 V42 Q40 66 90 66 H150" />
            <path className="ruche-lien" pathLength="1" d="M150 0 V66" />
            <path className="ruche-lien" pathLength="1" d="M260 0 V42 Q260 66 210 66 H150" />
          </svg>
          <div className="ruche-marque">
            <span>Grandimi</span>
            <TrendingUp size={20} aria-hidden="true" />
          </div>
        </>
      ) : (
        <div className="ruche-centre">
          <TrendingUp size={30} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

export default RuchePotentiel
