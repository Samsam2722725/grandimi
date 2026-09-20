import { Flame } from 'lucide-react';

/* La série de connexions : la flamme, le nombre, et sept pastilles.

   Les libellés de jours sont écrits ICI, en français, et non déduits
   d'une locale du navigateur. Deux raisons :

   1. Un téléphone réglé en anglais afficherait SU MO TU WE TH FR sur une
      application française — c'est exactement le défaut visible sur les
      captures du concurrent, sur les trois écrans qui portent ce bandeau.
   2. `toLocaleDateString('fr-FR', { weekday: 'short' })` rend « dim. »,
      « lun. » — avec le point — ce qui ne tient pas dans une pastille de
      44 px. Il faudrait le retirer à la main, donc écrire du code pour
      corriger ce qu'on est allé chercher. */
const JOURS_FR = ['DI', 'LU', 'MA', 'ME', 'JE', 'VE', 'SA'];

// Les sept derniers jours, du plus ancien à aujourd'hui, au format ISO
// local. `toISOString()` est volontairement évité : il bascule en UTC et
// rend la veille ou le lendemain selon l'heure.
function septDerniersJours(aujourdhui) {
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(aujourdhui);
    d.setDate(d.getDate() - i);
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    out.push({
      iso: `${d.getFullYear()}-${mois}-${jour}`,
      numero: d.getDate(),
      libelle: JOURS_FR[d.getDay()],
      estAujourdhui: i === 0,
    });
  }
  return out;
}

function SerieConnexions({ serie }) {
  const actifs = new Set(serie?.jours || []);
  const jours = septDerniersJours(new Date());
  const courant = serie?.courant || 0;
  const record = serie?.record || 0;

  return (
    <section className="serie" aria-label="Série de connexions">
      <span className={`serie__flamme ${courant > 0 ? 'serie__flamme--vive' : ''}`}>
        <Flame size={26} aria-hidden="true" />
      </span>

      <p className="serie__titre">
        {courant > 0 ? (
          <>
            <strong>{courant}</strong> jour{courant > 1 ? 's' : ''} d'affilée
          </>
        ) : (
          'Première journée'
        )}
      </p>

      <ol className="serie__jours">
        {jours.map((j) => {
          const fait = actifs.has(j.iso);
          return (
            <li
              key={j.iso}
              className={`serie__jour ${fait ? 'serie__jour--fait' : ''} ${
                j.estAujourdhui ? 'serie__jour--aujourdhui' : ''
              }`}
            >
              <span className="serie__jour-nom">{j.libelle}</span>
              <span className="serie__jour-num">{j.numero}</span>
              {/* Le point coloré double l'information portée par le fond :
                  à cette taille, la seule différence de teinte entre un
                  jour fait et un jour manqué ne se distingue pas pour un
                  daltonien deutan. */}
              <span className="serie__jour-point" aria-hidden="true" />
              <span className="sr-only">{fait ? 'ouvert' : 'manqué'}</span>
            </li>
          );
        })}
      </ol>

      {/* Le record ne s'affiche qu'une fois dépassé le jour 1 : « Meilleur :
          1 jour » le premier jour, ce que montre le concurrent, ne dit
          rien à personne et occupe une ligne. */}
      {record > 1 && <p className="serie__record">Ton record : {record} jours</p>}
    </section>
  );
}

export default SerieConnexions;
