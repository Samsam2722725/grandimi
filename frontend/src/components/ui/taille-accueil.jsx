import { ChevronRight, Lock } from 'lucide-react';

/* Le haut de l'accueil, copié de l'onglet « taille » de Taller : taille
   actuelle, taille prédite, courbe, « X points à corriger », « plus grand
   que X % de ton âge », taille souhaitée, croissance finie.

   Avant le paiement, l'écran de résultats montre ces cases sous cadenas.
   Après, elles s'ouvrent ici, avec ses chiffres. Offre 1 mois : ce qui
   vient de la taille prédite reste sous cadenas et mène à « Passe à 3 mois »,
   comme l'onglet Ma taille. Rien n'est promis : ce sont des estimations. */

const fr = (x) => String(x).replace('.', ',');

// Loi normale : chances de dépasser `seuil` quand la taille adulte vaut
// `moyenne` à ± 2 écarts-types près (la fourchette du calcul).
function chancesAuDessus(seuil, moyenne, ecart) {
  const z = (seuil - moyenne) / ecart;
  // Approximation d'Abramowitz-Stegun de la fonction de répartition.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? p : 1 - p;
}

/* Part de la taille adulte atteinte selon l'âge (repères moyens de
   croissance, garçons et filles), pour dessiner la partie déjà vécue de la
   courbe. Purement illustratif : seuls son point (aujourd'hui) et la taille
   prédite sont des chiffres à lui. */
const PART_ADULTE = {
  M: [[6, 0.65], [8, 0.71], [10, 0.77], [12, 0.83], [14, 0.91], [16, 0.97], [18, 0.995], [21, 1]],
  F: [[6, 0.7], [8, 0.77], [10, 0.84], [12, 0.92], [14, 0.97], [16, 0.99], [18, 1], [21, 1]],
};
function partAdulte(a, sexe) {
  const t = PART_ADULTE[sexe === 'F' ? 'F' : 'M'];
  if (a <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (a <= t[i][0]) {
      const [a0, p0] = t[i - 1];
      const [a1, p1] = t[i];
      return p0 + ((p1 - p0) * (a - a0)) / (a1 - a0);
    }
  }
  return 1;
}

// Comme chez Taller : la courbe commence avant son âge, son point est au
// milieu, avec un trait pointillé et une bulle au-dessus.
function Courbe({ age, actuelle, predite, sexe, verrouille }) {
  const fin = 21;
  const debut = Math.max(6, Math.round(2 * age - fin));
  const L = 300;
  const H = 130;
  const x = (a) => 10 + ((a - debut) / (fin - debut)) * (L - 20);
  // Avant aujourd'hui : la forme moyenne, recalée pour passer par sa taille.
  // Après : de sa taille vers la taille prédite.
  const ecartAujourdhui = actuelle - partAdulte(age, sexe) * predite;
  const taille = (a) => {
    const base = partAdulte(a, sexe) * predite;
    if (a <= age) return base + ecartAujourdhui;
    const t = (a - age) / (fin - age);
    return base + ecartAujourdhui * (1 - t) ** 2;
  };
  // Quelques âges seulement, reliés par une courbe lisse (Catmull-Rom).
  const ages = [...new Set([debut, ...PART_ADULTE[sexe === 'F' ? 'F' : 'M'].map(([a]) => a).filter((a) => a > debut && a < fin), age, fin])].sort((a, b) => a - b);
  const points = ages;
  const hauteurs = points.map(taille);
  const bas = Math.min(...hauteurs) - 4;
  const haut = Math.max(...hauteurs) + 4;
  const y = (h) => H - 10 - ((h - bas) / (haut - bas)) * (H - 46);
  const P = points.map((a, i) => [x(a), y(hauteurs[i])]);
  const trace = P.map(([px, py], i) => {
    if (i === 0) return `M${px.toFixed(1)},${py.toFixed(1)}`;
    const p0 = P[Math.max(0, i - 2)];
    const p1 = P[i - 1];
    const p3 = P[Math.min(P.length - 1, i + 1)];
    const c1 = [p1[0] + (px - p0[0]) / 6, p1[1] + (py - p0[1]) / 6];
    const c2 = [px - (p3[0] - p1[0]) / 6, py - (p3[1] - p1[1]) / 6];
    return `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(' ');
  const xToi = x(age);
  const yToi = y(actuelle);
  // 7 âges régulièrement espacés, comme l'axe de Taller.
  const graduations = Array.from({ length: 7 }, (_, i) => debut + ((fin - debut) * i) / 6);
  return (
    <svg className="taille-courbe" viewBox={`0 0 ${L} ${H + 18}`} role="img" aria-label={verrouille ? `Ta courbe : ${actuelle} cm aujourd’hui` : `Ta courbe : ${actuelle} cm aujourd’hui, vers ${Math.round(predite)} cm`}>
      <defs>
        <linearGradient id="taille-degrade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ff6a2b" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((k) => (
        <line key={k} x1="10" x2={L - 10} y1={36 + (H - 46) * k} y2={36 + (H - 46) * k} className="taille-courbe-grille" />
      ))}
      <path d={`${trace} L${x(fin).toFixed(1)},${H - 10} L${x(debut).toFixed(1)},${H - 10} Z`} fill="url(#taille-degrade)" />
      <path d={trace} fill="none" stroke="#ff6a2b" strokeWidth="3" strokeLinecap="round" />
      <line x1={xToi} x2={xToi} y1="24" y2={H - 10} className="taille-courbe-pointilles" />
      <rect x={xToi - 30} y="2" width="60" height="22" rx="7" fill="#ff6a2b" />
      <text x={xToi} y="17" textAnchor="middle" className="taille-courbe-bulle">{`${Math.round(actuelle)} cm`}</text>
      <circle cx={xToi} cy={yToi} r="9" fill="#ff6a2b" opacity="0.3" />
      <circle cx={xToi} cy={yToi} r="6" fill="#0b0b0c" stroke="#f4efe9" strokeWidth="3" />
      {graduations.map((a, i) => (
        <text key={a} x={x(a)} y={H + 14} textAnchor={i === 0 ? 'start' : i === 6 ? 'end' : 'middle'} className={`taille-courbe-age ${verrouille && a > age ? 'floue' : ''}`}>{Math.round(a)}</text>
      ))}
    </svg>
  );
}

/* `apresTailles` : un bloc glissé sous les deux tailles (écran des résultats
   avant paiement). `sansBarres` : retire les barres sous les chiffres. */
export function TailleAccueil({ predictionData: d, verrouille, nbPoints, onDebloquer, onVoirCourbe, onVoirPoints, apresTailles = null, sansBarres = false }) {
  const actuelle = Number(d.current_height_cm);
  const predite = Number(d.predicted_height_cm);
  const age = Number(d.age);
  if (!Number.isFinite(actuelle) || !Number.isFinite(predite) || !Number.isFinite(age)) return null;

  const percentile = Number(d.percentile_age);
  const reve = Number(d.taille_reve);
  const fourchette = d.confidence_range && Number(d.confidence_range.max) - Number(d.confidence_range.min);
  const ecart = fourchette > 0 ? fourchette / 4 : 3.5;
  const chances = Number.isFinite(reve) && reve > 0
    ? (reve <= actuelle ? 100 : Math.min(99, Math.max(1, Math.round(chancesAuDessus(reve, predite, ecart) * 100))))
    : null;
  const finie = Math.min(100, Math.round((actuelle / predite) * 1000) / 10);
  const groupe = d.sex === 'F' ? 'des filles' : 'des garçons';

  const Cadenas = ({ libelle }) => (
    <button type="button" className="taille-cadenas" onClick={onDebloquer} aria-label={`${libelle} : inclus dans les offres 3 mois et À vie`}>
      <Lock size={22} aria-hidden="true" />
    </button>
  );

  return (
    <section className="taille-accueil" aria-label="Ma taille">
      <div className="taille-duo">
        <div className="taille-case">
          <span className="taille-libelle">Taille actuelle</span>
          <strong className="taille-valeur">{fr(Math.round(actuelle))} cm</strong>
        </div>
        <div className="taille-case taille-case--accent">
          <span className="taille-libelle">Taille prédite</span>
          {verrouille ? <Cadenas libelle="Taille prédite" /> : <strong className="taille-valeur">{fr(Math.round(predite))} cm</strong>}
        </div>
      </div>

      {apresTailles}

      <div className="taille-case taille-case--courbe">
        <div className="taille-courbe-tete">
          <button type="button" className="taille-courbe-titre" onClick={onVoirCourbe}>
            Taille / âge <ChevronRight size={16} aria-hidden="true" />
          </button>
          {nbPoints > 0 && (
            <button type="button" className="taille-points" onClick={onVoirPoints}>
              {nbPoints} {nbPoints > 1 ? 'points' : 'point'} à corriger
            </button>
          )}
        </div>
        <Courbe age={age} actuelle={actuelle} predite={predite} sexe={d.sex} verrouille={verrouille} />
      </div>

      {Number.isFinite(percentile) && percentile > 0 && (
        <p className="taille-case taille-percentile">
          Plus grand que <strong>{Math.round(percentile)} %</strong> {groupe} de ton âge <span aria-hidden="true">🌍</span>
        </p>
      )}

      <div className="taille-duo">
        {chances !== null && (
          <div className="taille-case">
            <span className="taille-libelle">Chances d’atteindre {fr(Math.round(reve))} cm</span>
            {verrouille ? <Cadenas libelle="Chances d’atteindre ta taille souhaitée" /> : <strong className="taille-valeur taille-valeur--petite">{chances} %</strong>}
            {!sansBarres && <span className={`taille-barre ${verrouille ? 'floue' : ''}`} aria-hidden="true"><span style={{ width: `${verrouille ? 60 : chances}%` }} /></span>}
          </div>
        )}
        <div className="taille-case">
          <span className="taille-libelle">Croissance finie</span>
          {verrouille ? <Cadenas libelle="Croissance finie" /> : <strong className="taille-valeur taille-valeur--petite">{fr(finie)} %</strong>}
          {!sansBarres && <span className={`taille-barre ${verrouille ? 'floue' : ''}`} aria-hidden="true"><span style={{ width: `${verrouille ? 80 : finie}%` }} /></span>}
        </div>
      </div>
    </section>
  );
}
