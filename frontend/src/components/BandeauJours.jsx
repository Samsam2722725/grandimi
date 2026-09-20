/* Le bandeau de sept jours.

   Extrait en composant dès sa première utilisation, parce qu'il en aura
   trois : la séance d'exercices (étape 3), le journal de nutrition
   (étape 4) et le suivi de sommeil (étape 5). Recopié trois fois, il
   aurait fini par avoir trois comportements légèrement différents sur
   le même écran — le genre d'incohérence qu'on ne voit qu'en
   production.

   Les libellés de jours sont écrits ici, en français. Déduits de la
   locale du navigateur, un téléphone réglé en anglais afficherait
   SU MO TU WE TH FR sur une application française : c'est exactement ce
   qu'on voit sur les captures du concurrent, sur les trois écrans qui
   portent ce bandeau. */
const JOURS_FR = ['DI', 'LU', 'MA', 'ME', 'JE', 'VE', 'SA'];

// Une date ISO lue en heure LOCALE. `new Date('2026-09-20')` est
// interprété en UTC et rend la veille pour tout fuseau à l'ouest de
// Greenwich — le bandeau décalerait d'un jour.
function dateLocale(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j);
}

/* `jours` : [{ jour: '2026-09-20', faits: 5, total: 6 }, …]
   `actif` : le jour ISO sélectionné
   `aujourdhui` : le jour ISO courant, pour le distinguer du sélectionné */
function BandeauJours({ jours = [], actif, aujourdhui, onChoisir }) {
  return (
    <ol className="bandeau" aria-label="Sept derniers jours">
      {jours.map(({ jour, faits, total }) => {
        const d = dateLocale(jour);
        const complet = total > 0 && faits >= total;
        const entame = faits > 0 && !complet;
        const futur = aujourdhui && jour > aujourdhui;

        return (
          <li key={jour}>
            <button
              type="button"
              className={[
                'bandeau__jour',
                jour === actif ? 'bandeau__jour--actif' : '',
                complet ? 'bandeau__jour--complet' : '',
                entame ? 'bandeau__jour--entame' : '',
                futur ? 'bandeau__jour--futur' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={jour === actif ? 'date' : undefined}
              onClick={() => onChoisir?.(jour)}
            >
              <span className="bandeau__nom">{JOURS_FR[d.getDay()]}</span>
              <span className="bandeau__num">{d.getDate()}</span>
              <span className="bandeau__point" aria-hidden="true" />
              {/* L'état est répété en toutes lettres pour un lecteur
                  d'écran : la pastille ne dit rien à l'oreille, et la
                  couleur seule ne dit rien à un daltonien deutan. */}
              <span className="sr-only">
                {futur
                  ? 'à venir'
                  : complet
                    ? 'terminé'
                    : `${faits} sur ${total} fait${faits > 1 ? 's' : ''}`}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default BandeauJours;
