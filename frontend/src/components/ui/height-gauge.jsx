/**
 * Jauge verticale : de la taille du jour au haut de la fourchette.
 *
 * Remplace la courbe de trajectoire sur l'écran de résultat. Trois raisons,
 * dans l'ordre d'importance :
 *
 * 1. Une taille est une hauteur. Une barre verticale se lit sans conversion
 *    mentale ; une courbe demande de comprendre que l'axe horizontal est le
 *    temps avant de comprendre quoi que ce soit d'autre.
 *
 * 2. L'écart entre les deux extrémités EST ce qu'on vend. La courbe montrait
 *    une progression ; la jauge montre une distance à parcourir.
 *
 * 3. La courbe et la jauge ne peuvent pas coexister — deux figures portant la
 *    même fourchette se concurrencent et le lecteur n'en lit aucune.
 *
 * CE QUE LA JAUGE N'AFFIRME PAS, ET C'EST DÉLIBÉRÉ
 *
 * Le haut de la barre est la borne haute de l'ESTIMATION, pas une taille
 * atteignable par l'effort. Les ±4 cm mesurent ce que le modèle ignore
 * (hormones, données parentales déclaratives, variation individuelle), pas ce
 * que les habitudes ajoutent. Relier le plan à cette borne par une flèche, une
 * couleur commune ou une phrase serait la même faute que le « 98,5 % » d'en
 * face — en plus contradictoire, puisque le tunnel vient de consacrer un écran
 * entier à expliquer cette marge.
 *
 * D'où le traitement : la fourchette est une zone TERNE derrière la barre, la
 * croissance restante est la barre PLEINE. Deux langages visuels distincts pour
 * deux natures d'information distinctes.
 */

/* Repère du bas. La barre part de la taille actuelle, pas de zéro : une échelle
   commençant à 0 cm écraserait les douze centimètres qui nous intéressent en
   une bande de sept pixels. */
export function HeightGauge({ current, predicted, rangeMin, rangeMax, className }) {
  const bas = Number(current)
  const haut = Number(rangeMax)
  const etendue = haut - bas

  /* Une étendue nulle ou négative veut dire que l'estimation ne dépasse pas la
     taille déjà atteinte — croissance terminée. Il n'y a pas de distance à
     dessiner, et en fabriquer une serait mentir sur le seul écran où l'on
     promet de ne pas le faire. L'appelant affiche autre chose. */
  if (!Number.isFinite(etendue) || etendue <= 0) return null

  const pct = (valeur) => ((Number(valeur) - bas) / etendue) * 100

  const pctEstimation = Math.min(100, Math.max(0, pct(predicted)))
  const pctBasFourchette = Math.min(100, Math.max(0, pct(rangeMin)))

  /* Seuil de place, commun aux deux repères intermédiaires.

     Ni l'estimation ni le bas de fourchette ne s'affichent quand ils sont
     trop près du pied de la jauge : leurs étiquettes se poseraient sur celle
     d'« aujourd'hui ». Ce n'est pas un cas rare. Le serveur ramène la borne
     basse à la taille du jour dès que la marge passerait dessous, et
     l'estimation elle-même ne descend jamais sous cette taille — donc pour
     tout profil en fin de croissance (les 18-22 ans qu'on accepte désormais,
     les filles à partir de 15 ans) les trois valeurs se tassent au même
     endroit.

     Rien n'est perdu : les deux chiffres sont déjà écrits en toutes lettres
     sous le grand nombre, « entre X et Y cm ». */
  const PLACE_MIN = 14
  const estimationLisible = pctEstimation > PLACE_MIN

  const cm = (v) => Math.round(Number(v))

  return (
    <div className={`jauge ${className || ''}`}>
      <div className="jauge-piste">
        {/* Zone terne = l'incertitude. Elle commence au bas de la fourchette
            et monte jusqu'en haut de la barre. */}
        <span
          className="jauge-fourchette"
          style={{ bottom: `${pctBasFourchette}%`, height: `${100 - pctBasFourchette}%` }}
          aria-hidden="true"
        />

        {/* Barre pleine = la croissance restante, de la taille du jour à
            l'estimation centrale. C'est la seule chose que le plan discute. */}
        <span
          className="jauge-remplissage"
          style={{ height: `${pctEstimation}%` }}
          aria-hidden="true"
        />

        {/* Trait de l'estimation : il doit se voir SUR la barre pleine, donc
            une encoche claire qui déborde de part et d'autre. Il disparaît
            avec son étiquette — une encoche sans légende ne désigne rien. */}
        {estimationLisible && (
          <span
            className="jauge-trait"
            style={{ bottom: `${pctEstimation}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="jauge-reperes">
        <div className="jauge-repere jauge-repere--haut">
          <span className="jauge-valeur">{cm(rangeMax)} cm</span>
          <span className="jauge-libelle">haut de ta fourchette</span>
        </div>

        {estimationLisible && (
          <div
            className="jauge-repere jauge-repere--estimation"
            style={{ bottom: `${pctEstimation}%` }}
          >
            <span className="jauge-valeur jauge-valeur--forte">{cm(predicted)} cm</span>
            <span className="jauge-libelle jauge-libelle--accent">ton estimation</span>
          </div>
        )}

        {/* La borne basse n'est affichée que si elle a la place de l'être.

            Le serveur ramène cette borne à la taille du jour dès que la marge
            passerait en dessous (on n'annonce à personne qu'il va rapetisser).
            Pour tout profil proche de sa taille finale — les 18-22 ans qu'on
            accepte désormais, et les filles de 15 ans et plus — la borne basse
            VAUT donc la taille actuelle, et son étiquette se posait exactement
            sur celle d'« aujourd'hui ».

            Le seuil se mesure en pourcentage de la hauteur de la jauge parce
            que c'est une contrainte de place, pas de centimètres : deux
            étiquettes de deux lignes ont besoin d'un écart, quelle que soit
            l'échelle. En dessous, l'information ne disparaît pas — elle est
            déjà sous le grand chiffre, « entre X et Y cm ». */}
        {pctBasFourchette > PLACE_MIN && (
          <div
            className="jauge-repere jauge-repere--bas-fourchette"
            style={{ bottom: `${pctBasFourchette}%` }}
          >
            <span className="jauge-libelle">{cm(rangeMin)} cm · bas de ta fourchette</span>
          </div>
        )}

        <div className="jauge-repere jauge-repere--pied">
          <span className="jauge-valeur">{cm(current)} cm</span>
          <span className="jauge-libelle">aujourd’hui</span>
        </div>
      </div>
    </div>
  )
}

export default HeightGauge
