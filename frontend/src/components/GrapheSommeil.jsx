/* Le graphe de sommeil : sept barres, une par nuit.

   UNE SEULE SÉRIE, donc aucune légende : le titre au-dessus la nomme.
   Une boîte de légende pour une série unique occupe de la place pour
   répéter ce qui est déjà écrit.

   LA DÉCISION QUI COMPTE : une nuit NON SAISIE n'est pas une nuit de
   zéro heure. Elle se dessine en creux, pas comme une barre à zéro. Le
   concurrent affiche sept barres à zéro sur un axe gradué jusqu'à 14 h
   pour quelqu'un qui vient d'ouvrir l'application — cela se lit « tu as
   dormi zéro heure toute la semaine », alors que la vérité est « tu n'as
   rien noté ». C'est la même règle que les piliers de l'accueil.

   La ligne de l'objectif est le seul repère tracé. Une grille complète
   à 2, 4, 6, 8, 10, 12 h ajouterait six traits pour une information que
   personne ne lit : ce qui intéresse, c'est au-dessus ou en dessous des
   neuf heures. */

const JOURS_FR = ['DI', 'LU', 'MA', 'ME', 'JE', 'VE', 'SA'];

// Une date ISO lue en heure LOCALE. `new Date('2026-09-20')` s'interprète
// en UTC et rend la veille pour tout fuseau à l'ouest de Greenwich.
function dateLocale(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j);
}

// Le haut de l'axe. 12 h par défaut, relevé si quelqu'un dort plus —
// jamais 14 h fixes, qui écrasent toutes les barres dans le bas du
// cadre pour ménager une plage que personne n'atteint.
function hautDeLAxe(nuits) {
  const max = Math.max(0, ...nuits.filter((n) => n.saisi).map((n) => n.heures));
  return Math.max(12, Math.ceil(max));
}

function GrapheSommeil({ nuits = [], objectif = 9, aujourdhui, onChoisir }) {
  const haut = hautDeLAxe(nuits);
  const ligneObjectif = (1 - objectif / haut) * 100;

  return (
    <figure className="graphe">
      <div className="graphe__cadre">
        {/* La ligne d'objectif est posée en pointillés et en retrait :
            c'est un repère, pas une donnée. */}
        <span
          className="graphe__objectif"
          style={{ top: `${ligneObjectif}%` }}
          aria-hidden="true"
        >
          <span className="graphe__objectif-valeur">{objectif} h</span>
        </span>

        <ol className="graphe__barres">
          {nuits.map((n) => {
            const d = dateLocale(n.jour);
            const estAujourdhui = n.jour === aujourdhui;
            const hauteur = n.saisi ? Math.max(2, (n.heures / haut) * 100) : 0;

            return (
              <li key={n.jour} className="graphe__colonne">
                <button
                  type="button"
                  className={`graphe__cible ${estAujourdhui ? 'graphe__cible--auj' : ''}`}
                  onClick={() => onChoisir?.(n.jour)}
                  aria-label={
                    n.saisi
                      ? `${JOURS_FR[d.getDay()]} ${d.getDate()} : ${String(n.heures).replace('.', ',')} heures`
                      : `${JOURS_FR[d.getDay()]} ${d.getDate()} : rien de noté`
                  }
                >
                  {n.saisi ? (
                    <span
                      className={`graphe__barre ${n.heures >= objectif ? 'graphe__barre--atteint' : ''}`}
                      style={{ height: `${hauteur}%` }}
                    />
                  ) : (
                    /* Le creux : un trait fin au ras de la ligne de
                       base. Il occupe la place de la barre sans en
                       affirmer la valeur. */
                    <span className="graphe__creux" />
                  )}
                </button>

                {/* Étiquette directe sur la seule barre du jour, pas sur
                    les sept : un chiffre sur chaque barre transforme le
                    graphe en tableau mal aligné. */}
                <span className="graphe__valeur">
                  {estAujourdhui && n.saisi ? String(n.heures).replace('.', ',') : ''}
                </span>

                <span className={`graphe__jour ${estAujourdhui ? 'graphe__jour--auj' : ''}`}>
                  {JOURS_FR[d.getDay()]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* La même donnée en texte, pour qui n'accède pas au dessin. */}
      <figcaption className="sr-only">
        Heures de sommeil des sept derniers jours.
        {nuits.map((n) => {
          const d = dateLocale(n.jour);
          return ` ${JOURS_FR[d.getDay()]} ${d.getDate()} : ${
            n.saisi ? `${String(n.heures).replace('.', ',')} h` : 'non noté'
          }.`;
        })}
      </figcaption>
    </figure>
  );
}

export default GrapheSommeil;
