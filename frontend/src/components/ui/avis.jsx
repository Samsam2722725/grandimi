import { Star } from 'lucide-react'

import { AVIS as AVIS_CLIENTS } from '@/lib/avis-clients'

/* ============================================================
   LES AVIS
   ============================================================
   Forme reprise de l'écran de preuve sociale de Flo (capture du
   19/09/2026) : un titre-chiffre encadré de lauriers, une rangée
   d'étoiles, puis des cartes de témoignage signées.

   CE QU'ON NE REPREND PAS : LE CHIFFRE.

   Flo écrit « Plus de 6,5 millions de notes 5 étoiles ». Grandimi n'a
   pas ce volume, et inventer un nombre de notes est exactement le genre
   d'allégation qui se vérifie en dix secondes sur les deux boutiques —
   et qui, sur un produit de santé vendu à des mineurs, relève de la
   pratique commerciale trompeuse (art. L121-2).

   Tant qu'il n'y a pas de volume à annoncer, l'écran ne s'appuie donc
   que sur ce qu'il montre : trois témoignages signés, chacun avec ce que
   la personne a mesuré. C'est moins spectaculaire qu'un chiffre à sept
   chiffres, et c'est la seule version qui tienne devant quelqu'un qui
   irait vérifier.

   LE JOUR OÙ LES NOTES EXISTENT, il suffit de remplir `NOTE_BOUTIQUES` :
   le grand chiffre et sa légende réapparaissent entre les lauriers, à
   l'endroit exact où Flo les place, et rien d'autre n'est à toucher.
   Tant que l'objet vaut `null`, la ligne n'existe pas plutôt que
   d'annoncer un zéro.
   ============================================================ */

const NOTE_BOUTIQUES = null
// Le jour venu, par exemple :
// const NOTE_BOUTIQUES = {
//   nombre: 'Plus de 1 200',
//   legende: 'notes 5 étoiles',
//   ou: 'sur l’App Store et Google Play',
// }

/* Les avis viennent de lib/avis-clients.js, la seule liste (23/11/2026 :
   Samuel a remplacé tous les avis, Adam, Lucas et Nolan ne sont plus là).
   Textes mot pour mot ; les centimètres sont ceux déclarés par chacun, pas
   un résultat promis. */
const AVIS = AVIS_CLIENTS.map(({ prenom, age, cm, texte }) => ({ prenom, age, suivi: cm, texte }))

/* Les lauriers de Flo, redessinés : une tige courbe et des feuilles
   pleines DE PART ET D'AUTRE de la tige, comme une vraie branche.

   Ils ne sont dessinés QUE s'il y a un chiffre à encadrer. Chez Flo,
   c'est tout leur rôle : « 6,5 millions » tient l'écran, les branches le
   couronnent. Posées autour d'une simple rangée d'étoiles et d'une ligne
   grise, elles encadrent du vide — et une couronne qui n'entoure rien se
   lit comme une erreur de dessin plutôt que comme une distinction.

   Première version : feuilles en `fill` ET `stroke`, rx 9, toutes du même
   côté. Elles se recouvraient et la branche s'affichait comme un pâté,
   puis comme une arête de poisson une fois amincie. Les feuilles
   alternent maintenant, et leur inclinaison suit le côté. */
function Laurier({ cote }) {
  const feuilles = [14, 25, 36, 47, 58, 68]
  return (
    <svg
      className={`avis-laurier avis-laurier--${cote}`}
      viewBox="0 0 44 92"
      aria-hidden="true"
    >
      <path className="avis-tige" d="M34 8 Q16 32 17 56 Q18 74 28 86" />
      {feuilles.flatMap((y, i) => {
        // Position de la tige à cette hauteur, lue sur la même courbe.
        const xTige = 34 - 17 * Math.min(1, y / 56) + Math.max(0, (y - 56) / 30) * 11
        return [1, -1].map((sens) => (
          <ellipse
            key={`${y}-${sens}`}
            className="avis-feuille"
            cx={xTige + sens * 7}
            cy={y - sens * 2}
            rx="8"
            ry="3.4"
            transform={`rotate(${sens * 34 - 14 + i * 3} ${xTige + sens * 7} ${y - sens * 2})`}
          />
        ))
      })}
    </svg>
  )
}

export function Avis({ className, limit }) {
  const avisAffiches = limit ? AVIS.slice(0, limit) : AVIS
  return (
    <div className={`avis ${className || ''}`}>
      <div className={`avis-couronne ${NOTE_BOUTIQUES ? 'a-couronne' : ''}`}>
        {NOTE_BOUTIQUES && <Laurier cote="gauche" />}
        <div className="avis-couronne-texte">
          {/* Le chiffre n'apparaît QUE s'il existe. Chez Flo, c'est lui
              qui porte tout l'écran (« 6,5 millions de notes 5 étoiles »)
              et les lauriers ne sont là que pour l'encadrer. Sans chiffre
              réel, les lauriers encadrent les étoiles, et la ligne dessous
              dit exactement ce qu'on montre : trois avis, rien de plus. */}
          {NOTE_BOUTIQUES && (
            <>
              <span className="avis-chiffre">{NOTE_BOUTIQUES.nombre}</span>
              <span className="avis-legende">{NOTE_BOUTIQUES.legende}</span>
            </>
          )}
          <div className="avis-etoiles" role="img" aria-label="Cinq étoiles sur cinq">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={22} aria-hidden="true" />
            ))}
          </div>
          <span className="avis-boutiques">
            {NOTE_BOUTIQUES ? NOTE_BOUTIQUES.ou : 'Ce qu’en disent nos utilisateurs'}
          </span>
        </div>
        {NOTE_BOUTIQUES && <Laurier cote="droite" />}
      </div>

      <ul className="avis-cartes">
        {avisAffiches.map((avis) => (
          <li className="avis-carte" key={avis.prenom}>
            <div className="avis-entete">
              {/* Une initiale dans une pastille plutôt qu'un portrait
                  dessiné : Flo illustre des visages parce qu'elle en a
                  une banque. Inventer trois visages pour trois personnes
                  réelles, c'est mettre un faux visage sur un vrai nom. */}
              <span className="avis-pastille" aria-hidden="true">
                {avis.prenom[0]}
              </span>
              <span className="avis-identite">
                <strong>
                  {avis.prenom}{avis.age ? ` — ${avis.age} ans` : ''}
                </strong>
                <span className="avis-suivi">{avis.suivi}</span>
              </span>
            </div>
            <p className="avis-texte">«&nbsp;{avis.texte}&nbsp;»</p>
          </li>
        ))}
      </ul>

      <p className="avis-mention">
        Témoignages d’utilisateurs de Grandimi. Les centimètres indiqués sont ceux
        qu’ils ont déclarés, pas un résultat garanti.
      </p>
    </div>
  )
}

export default Avis
