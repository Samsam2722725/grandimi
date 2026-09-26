import {
  Apple,
  BedDouble,
  BookOpen,
  ChevronRight,
  Dumbbell,
  Flame,
  Moon,
  Ruler,
  Settings,
  Sun,
  Trophy,
  Utensils,
} from 'lucide-react'

/* Les trois derniers visuels de la page résultats, reconstruits en code
   d'après les images du client : sans fond, animés, nets à toute taille.

   Le visuel « Semaine 1-4 » d'origine affichait « Précision 83 % +2 % » :
   un chiffre que le modèle ne produit pas. La barre est gardée — elle dit
   vrai : chaque mesure hebdomadaire affine l'estimation — mais sans
   pourcentage. */

const SEMAINES = [
  { semaine: 4, icone: Utensils, action: 'Repas équilibrés' },
  { semaine: 3, icone: Ruler, action: 'Mesure ta taille' },
  { semaine: 2, icone: Dumbbell, action: 'Sauts' },
  { semaine: 2, icone: Sun, action: 'Lumière du jour' },
  { semaine: 1, icone: Moon, action: 'Sommeil 8 h' },
]

export function SuiviSemaines() {
  return (
    <figure className="rv-semaines" aria-label="Chaque semaine, tes actions et tes mesures affinent ta prédiction">
      <ul className="rv-semaines-pile" aria-hidden="true">
        {SEMAINES.map(({ semaine, icone: Icone, action }, i) => (
          <li key={action} className="rv-semaine" style={{ '--i': i }}>
            <span className="rv-semaine-icone"><Icone size={20} /></span>
            <span className="rv-semaine-texte">
              <small>Semaine {semaine}</small>
              <strong>{action}</strong>
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="rv-precision">
        <span className="rv-precision-titre">Ta prédiction se met à jour chaque semaine</span>
        <span className="rv-precision-barre" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} style={{ '--i': i }} />
          ))}
        </span>
      </figcaption>
    </figure>
  )
}

const LECONS = [
  { icone: BookOpen, teinte: 'orange', titre: 'Leçon 1', texte: 'Mythes courants sur la croissance' },
  { icone: Apple, teinte: 'violet', titre: 'Leçon 2', texte: 'L’impact de la nutrition sur la croissance' },
  { icone: BedDouble, teinte: 'rose', titre: 'Leçon 3', texte: 'Le rôle du sommeil dans la croissance' },
]

export function Lecons() {
  return (
    <ol className="rv-lecons" aria-label="Leçons incluses">
      {LECONS.map(({ icone: Icone, teinte, titre, texte }, i) => (
        <li key={titre} className="rv-lecon" style={{ '--i': i }}>
          <span className={`rv-lecon-pastille rv-lecon-pastille--${teinte}`} aria-hidden="true">
            <Icone size={22} />
          </span>
          <span className="rv-lecon-texte">
            <strong>{titre}</strong>
            <span>{texte}</span>
          </span>
          <ChevronRight size={18} className="rv-lecon-chevron" aria-hidden="true" />
        </li>
      ))}
    </ol>
  )
}

const JOURS = [1, 2, 3, 4, 5, 6, 7]

export function TelephoneRoutine() {
  return (
    <figure className="rv-tel" aria-label="Aperçu de l'application : ton plan de routine sur 30 jours">
      <span className="rv-tel-etiquette">Routine quotidienne</span>
      <div className="rv-tel-cadre" aria-hidden="true">
        <div className="rv-tel-encoche" />
        <div className="rv-tel-ecran">
          <div className="rv-tel-entete">
            <strong>Ton plan</strong>
            <Settings size={16} />
          </div>
          <div className="rv-tel-onglets">
            <span className="is-actif">Routine</span>
            <span>Nutrition</span>
            <span>Bonus</span>
          </div>
          <div className="rv-tel-banniere">
            <span className="rv-tel-soleil" />
            <span className="rv-tel-duree">30 jours</span>
          </div>
          <div className="rv-tel-niveau">
            <span>Niveau 1 <Flame size={13} /></span>
            <span>1/7</span>
          </div>
          <div className="rv-tel-progression"><span /></div>
          <div className="rv-tel-jours">
            {JOURS.map((j) => (
              <span
                key={j}
                className={j === 1 ? 'is-fait' : j === 2 ? 'is-suivant' : ''}
                style={{ '--i': j }}
              >
                {j === 1 ? <Flame size={14} /> : `J${j}`}
              </span>
            ))}
            <span className="rv-tel-trophee"><Trophy size={14} /></span>
          </div>
        </div>
      </div>
    </figure>
  )
}
