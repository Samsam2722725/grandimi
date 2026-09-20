/* La courbe des mesures.

   UNE SEULE SÉRIE, donc aucune légende : le titre au-dessus la nomme.

   Ce qui n'est PAS dessiné, et c'est délibéré :
     - pas de bande de projection. L'estimation vient de la méthode
       mi-parentale, dont l'écart-type est d'environ 5 cm ; tracée sur le
       même graphe que des mesures au millimètre, elle se lirait comme
       une prédiction de même précision. Elle reste sur l'accueil, en
       chiffres, avec son intervalle écrit.
     - pas de grille horizontale. L'axe couvre quelques centimètres :
       cinq traits pour trois centimètres ajoutent du bruit, pas de la
       lecture.

   L'échelle verticale s'ajuste aux données avec une marge, et ne part
   jamais de zéro. Un axe partant de 0 cm écraserait six mois de
   croissance en une ligne plate — c'est le contraire du but, ici. */

function dateLocale(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j);
}

const MOIS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const L = 320; // largeur du repère interne
const H = 150; // hauteur
const MARGE_G = 34;
const MARGE_B = 20;

function CourbeTaille({ mesures = [] }) {
  if (mesures.length < 2) return null;

  const t = mesures.map((m) => dateLocale(m.date).getTime());
  const y = mesures.map((m) => m.taille_cm);

  const tMin = Math.min(...t);
  const tMax = Math.max(...t);
  const yMin = Math.min(...y);
  const yMax = Math.max(...y);

  /* Une marge d'un centimètre de chaque côté, au minimum. Sans elle, le
     premier et le dernier point se collent aux bords du cadre et la
     courbe semble sortir du graphe. */
  const marge = Math.max(1, (yMax - yMin) * 0.15);
  const bas = yMin - marge;
  const haut = yMax + marge;

  const px = (ms) => MARGE_G + ((ms - tMin) / (tMax - tMin || 1)) * (L - MARGE_G - 6);
  const py = (cm) => (1 - (cm - bas) / (haut - bas)) * (H - MARGE_B);

  const chemin = mesures
    .map((m, i) => `${i === 0 ? 'M' : 'L'} ${px(t[i]).toFixed(1)} ${py(m.taille_cm).toFixed(1)}`)
    .join(' ');

  const dernier = mesures[mesures.length - 1];
  const premier = mesures[0];

  return (
    <figure className="courbe">
      <svg viewBox={`0 0 ${L} ${H}`} className="courbe__svg" aria-hidden="true">
        {/* Deux graduations seulement : le plancher et le plafond de ce
            qui est réellement mesuré. */}
        {[yMin, yMax].map((v) => (
          <g key={v}>
            <line
              className="courbe__reglet"
              x1={MARGE_G} y1={py(v)} x2={L - 6} y2={py(v)}
            />
            <text className="courbe__graduation" x={0} y={py(v) + 4}>
              {Math.round(v)}
            </text>
          </g>
        ))}

        <path className="courbe__trait" d={chemin} fill="none" />

        {/* Un marqueur sur la DERNIÈRE mesure seulement. Un point sur
            chacune des vingt-sept transforme la courbe en collier. */}
        <circle
          className="courbe__point"
          cx={px(t[t.length - 1])}
          cy={py(dernier.taille_cm)}
          r="4.5"
        />
      </svg>

      <div className="courbe__bornes">
        <span>
          {dateLocale(premier.date).getDate()} {MOIS_FR[dateLocale(premier.date).getMonth()]}
        </span>
        <span>
          {dateLocale(dernier.date).getDate()} {MOIS_FR[dateLocale(dernier.date).getMonth()]}
        </span>
      </div>

      <figcaption className="sr-only">
        Courbe de {mesures.length} mesures, de{' '}
        {String(premier.taille_cm).replace('.', ',')} cm le {premier.date} à{' '}
        {String(dernier.taille_cm).replace('.', ',')} cm le {dernier.date}.
      </figcaption>
    </figure>
  );
}

export default CourbeTaille;
