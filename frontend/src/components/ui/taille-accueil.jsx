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

function Courbe({ age, actuelle, predite, verrouille }) {
  const debut = Math.floor(age);
  const fin = Math.max(debut + 3, 20);
  const L = 300;
  const H = 110;
  const x = (a) => 12 + ((a - debut) / (fin - debut)) * (L - 24);
  const bas = actuelle - 6;
  const haut = Math.max(predite, actuelle + 1) + 3;
  const y = (h) => H - 12 - ((h - bas) / (haut - bas)) * (H - 24);
  const points = Array.from({ length: 25 }, (_, i) => {
    const a = age + ((fin - age) * i) / 24;
    const t = (a - age) / (fin - age);
    return [x(a), y(actuelle + (predite - actuelle) * (1 - (1 - t) ** 2.4))];
  });
  const trace = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const graduations = [debut, Math.round((debut + fin) / 2), fin];
  return (
    <svg className="taille-courbe" viewBox={`0 0 ${L} ${H + 16}`} role="img" aria-label={verrouille ? 'Ta courbe de croissance' : `Ta courbe : de ${actuelle} cm aujourd’hui vers ${Math.round(predite)} cm`}>
      <defs>
        <linearGradient id="taille-degrade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff6a2b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${trace} L${points[24][0].toFixed(1)},${H - 12} L${points[0][0].toFixed(1)},${H - 12} Z`} fill="url(#taille-degrade)" />
      <path d={trace} fill="none" stroke="#ff6a2b" strokeWidth="3" strokeLinecap="round" />
      <circle cx={points[0][0]} cy={points[0][1]} r="6" fill="#0b0b0c" stroke="#f4efe9" strokeWidth="3" />
      {!verrouille && <circle cx={points[24][0]} cy={points[24][1]} r="5" fill="#ff6a2b" />}
      {graduations.map((a) => (
        <text key={a} x={x(a)} y={H + 12} textAnchor={a === debut ? 'start' : a === fin ? 'end' : 'middle'} className="taille-courbe-age">{a} ans</text>
      ))}
    </svg>
  );
}

export function TailleAccueil({ predictionData: d, verrouille, nbPoints, onDebloquer, onVoirCourbe, onVoirPoints }) {
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
        <Courbe age={age} actuelle={actuelle} predite={predite} verrouille={verrouille} />
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
            <span className={`taille-barre ${verrouille ? 'floue' : ''}`} aria-hidden="true"><span style={{ width: `${verrouille ? 60 : chances}%` }} /></span>
          </div>
        )}
        <div className="taille-case">
          <span className="taille-libelle">Croissance finie</span>
          {verrouille ? <Cadenas libelle="Croissance finie" /> : <strong className="taille-valeur taille-valeur--petite">{fr(finie)} %</strong>}
          <span className={`taille-barre ${verrouille ? 'floue' : ''}`} aria-hidden="true"><span style={{ width: `${verrouille ? 80 : finie}%` }} /></span>
        </div>
      </div>
    </section>
  );
}
