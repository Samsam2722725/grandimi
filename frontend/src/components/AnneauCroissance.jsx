/* L'anneau des six piliers.

   Six arcs sur un cercle, chacun rempli par un pilier. Dessiné en SVG
   plutôt qu'avec des `conic-gradient` : il faut des extrémités arrondies,
   un écart régulier entre les parts et une part à moitié remplie, ce que
   le dégradé conique ne sait pas faire sans empiler trois éléments par
   segment.

   LA DÉCISION QUI COMPTE, et elle est dans les données, pas dans le
   dessin : un pilier `suivi: false` n'est pas un pilier à 0 %. Il se
   dessine en pointillés, à part, parce que rien ne permet encore de le
   remplir. Afficher une nutrition à zéro quand aucun écran ne permet de
   noter un repas, c'est annoncer un échec à quelqu'un qui n'avait aucun
   moyen de réussir — et c'est exactement ce que fait le concurrent sur
   son premier écran. */

const RAYON = 88;
const EPAISSEUR = 14;
const TAILLE = (RAYON + EPAISSEUR) * 2;
const CENTRE = TAILLE / 2;

// Écart entre deux parts, en degrés. Sans lui les six arcs forment un
// cercle continu et on ne lit plus six piliers, on lit une jauge.
const ECART_DEG = 5;

const CIRCONFERENCE = 2 * Math.PI * RAYON;

/* Le motif pointillé d'un pilier pas encore suivi.

   Il est calculé ICI et pas écrit en CSS, et c'est la correction d'un
   vrai défaut : une règle `stroke-dasharray: 2 6` en CSS ÉCRASE le
   dasharray qui découpe l'arc, parce qu'un attribut de présentation SVG
   perd contre n'importe quelle règle CSS. Les trois rails « à venir »
   redevenaient des cercles entiers pointillés, superposés par-dessus les
   arcs pleins : l'anneau entier ressortait strié.

   Le motif est donc construit pour que son CYCLE fasse exactement une
   circonférence — une succession de tirets sur la longueur de l'arc,
   puis un seul vide qui couvre tout le reste. Sans cela le motif se
   répète et refait le tour. */
function motifPointille(longueurArc) {
  const TIRET = 2;
  const TROU = 4;
  const nb = Math.max(1, Math.round(longueurArc / (TIRET + TROU)));

  const morceaux = [];
  for (let i = 0; i < nb; i += 1) {
    morceaux.push(TIRET, TROU);
  }
  // Le dernier vide absorbe tout le reste du cercle, cycle = circonférence.
  morceaux[morceaux.length - 1] = TROU + (CIRCONFERENCE - nb * (TIRET + TROU));
  return morceaux.join(' ');
}

function arc(indexSegment, nbSegments, fraction) {
  const pas = 360 / nbSegments;
  const debut = indexSegment * pas + ECART_DEG / 2;
  const longueurMax = pas - ECART_DEG;
  const longueur = longueurMax * Math.max(0, Math.min(1, fraction));
  const longueurPx = (longueur / 360) * CIRCONFERENCE;

  return {
    /* `stroke-dasharray` : un trait visible de la longueur voulue, puis
       un vide qui couvre tout le reste du cercle. Le trait est ensuite
       glissé à sa place par `stroke-dashoffset`. C'est la façon de
       dessiner un arc sans calculer de chemin en coordonnées. */
    dasharray: `${longueurPx} ${CIRCONFERENCE}`,
    pointille: motifPointille(longueurPx),
    dashoffset: -((debut / 360) * CIRCONFERENCE),
    vide: longueur === 0,
  };
}

/* Six rails gris, sans aucun remplissage. Servent quand les segments
   n'ont pas pu être lus (panne réseau).

   Sans ce repli, `segments.map` sur un tableau vide ne dessinait AUCUN
   cercle : l'anneau disparaissait et le chiffre de l'estimation flottait
   au milieu d'un carré vide de 232 px. Un anneau neutre dit « je n'ai pas
   tes scores » ; un trou dit « c'est cassé ». */
const RAILS_VIDES = Array.from({ length: 6 }, (_, i) => ({
  cle: `vide-${i}`,
  pct: 0,
  suivi: true,
}));

function AnneauCroissance({ segments = [], enfants }) {
  const parts = segments.length ? segments : RAILS_VIDES;
  const nb = parts.length;

  return (
    <div className="anneau">
      <svg
        className="anneau__svg"
        viewBox={`0 0 ${TAILLE} ${TAILLE}`}
        /* Le dessin ne dit rien qu'on ne répète en texte juste en
           dessous (la liste des piliers et leur pourcentage). Le
           masquer évite de faire lire deux fois la même chose. */
        aria-hidden="true"
      >
        {/* Rotation d'un quart de tour : sans elle, le premier segment
            démarre à 3 heures. Une jauge se lit à partir du haut. */}
        <g transform={`rotate(-90 ${CENTRE} ${CENTRE})`}>
          {parts.map((s, i) => {
            const rail = arc(i, nb, 1);
            const rempli = arc(i, nb, (s.pct || 0) / 100);

            return (
              <g key={s.cle}>
                {/* Le rail : la part vide. En pointillés quand le pilier
                    n'est pas encore suivi. */}
                <circle
                  className={`anneau__rail ${s.suivi ? '' : 'anneau__rail--futur'}`}
                  cx={CENTRE}
                  cy={CENTRE}
                  r={RAYON}
                  fill="none"
                  strokeWidth={EPAISSEUR}
                  strokeDasharray={s.suivi ? rail.dasharray : rail.pointille}
                  strokeDashoffset={rail.dashoffset}
                  strokeLinecap={s.suivi ? 'round' : 'butt'}
                />
                {!rempli.vide && (
                  <circle
                    className="anneau__part"
                    cx={CENTRE}
                    cy={CENTRE}
                    r={RAYON}
                    fill="none"
                    strokeWidth={EPAISSEUR}
                    strokeDasharray={rempli.dasharray}
                    strokeDashoffset={rempli.dashoffset}
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="anneau__centre">{enfants}</div>
    </div>
  );
}

export default AnneauCroissance;
