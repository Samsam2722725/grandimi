import { useState } from 'react'
import { Apple, BedDouble, BookOpen, ChevronDown } from 'lucide-react'

/* Les trois leçons annoncées dans l'onboarding (écran « Guide pour
   grandir »). Contenu volontairement sobre : des faits établis, sans
   chiffre inventé ni promesse de centimètres, dans la ligne de la FAQ de
   la landing (« personne ne peut te faire dépasser ton potentiel »). */
const LECONS = [
  {
    icone: BookOpen,
    teinte: 'orange',
    titre: 'Leçon 1',
    sujet: 'Mythes courants sur la croissance',
    points: [
      ['« Les étirements font grandir. »', 'Faux. Ils améliorent la posture et la souplesse, ce qui peut te faire paraître plus grand, mais ils n’allongent pas les os.'],
      ['« Des compléments peuvent faire dépasser ton potentiel. »', 'Faux. Ils ne corrigent qu’un manque réel, et seulement sur avis médical. Au-delà, ils n’ajoutent rien.'],
      ['« La musculation empêche de grandir. »', 'Faux, quand elle est encadrée et adaptée à ton âge. Le vrai risque, c’est la charge mal maîtrisée et la blessure.'],
      ['« On peut encore grandir beaucoup après la puberté. »', 'Non. Une fois les plaques de croissance fermées, la taille des os ne bouge plus. D’où l’intérêt d’agir pendant qu’elles sont ouvertes.'],
      ['« Tout est génétique, on n’y peut rien. »', 'Pas tout à fait. Les gènes fixent le plafond ; le sommeil, l’alimentation et l’activité décident si tu l’atteins.'],
    ],
  },
  {
    icone: Apple,
    teinte: 'violet',
    titre: 'Leçon 2',
    sujet: 'L’impact de la nutrition sur la croissance',
    points: [
      ['Protéines à chaque repas', 'Œufs, poisson, viande, laitages, légumineuses : l’os et le muscle se construisent avec.'],
      ['Calcium', 'Laitages, amandes, légumes verts. C’est la matière de l’os.'],
      ['Vitamine D', 'Poissons gras et lumière du jour. Sans elle, le calcium est mal absorbé.'],
      ['Zinc', 'Viande, graines, céréales complètes. Il participe à la croissance.'],
      ['Manger assez', 'Sauter des repas ou manger trop peu freine la croissance, même avec une alimentation « saine ».'],
    ],
  },
  {
    icone: BedDouble,
    teinte: 'rose',
    titre: 'Leçon 3',
    sujet: 'Le rôle du sommeil dans la croissance',
    points: [
      ['Le pic se joue la nuit', 'L’hormone de croissance est surtout libérée pendant le sommeil profond, en début de nuit.'],
      ['8 à 10 heures', 'C’est ce qui est recommandé entre 13 et 18 ans.'],
      ['Même heure chaque soir', 'Un horaire régulier stabilise le sommeil profond. Le week-end compte aussi.'],
      ['Écrans coupés 45 min avant', 'La lumière des écrans retarde l’endormissement.'],
      ['Chambre sombre et fraîche', 'Autour de 18-20 °C, dans le noir : le sommeil profond y est plus stable.'],
    ],
  },
]

export function LeconsPlan() {
  const [ouverte, setOuverte] = useState(0)

  return (
    <ol className="lecons-plan">
      {LECONS.map(({ icone: Icone, teinte, titre, sujet, points }, i) => {
        const estOuverte = ouverte === i
        return (
          <li key={titre} className={`lecon-plan ${estOuverte ? 'is-ouverte' : ''}`}>
            <button
              type="button"
              className="lecon-plan-tete"
              aria-expanded={estOuverte}
              onClick={() => setOuverte(estOuverte ? -1 : i)}
            >
              <span className={`lecon-plan-pastille lecon-plan-pastille--${teinte}`} aria-hidden="true">
                <Icone size={20} />
              </span>
              <span className="lecon-plan-titres">
                <strong>{titre}</strong>
                <span>{sujet}</span>
              </span>
              <ChevronDown size={18} className="lecon-plan-chevron" aria-hidden="true" />
            </button>
            {estOuverte && (
              <ul className="lecon-plan-points">
                {points.map(([titrePoint, texte]) => (
                  <li key={titrePoint}>
                    <strong>{titrePoint}</strong>
                    <span>{texte}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}
