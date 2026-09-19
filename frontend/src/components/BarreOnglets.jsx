import { MessageCircle } from 'lucide-react';
import { ONGLETS } from '../lib/onglets';

/* Barre d'onglets basse.

   Des `<button>` et non des liens : cette application est une seule page
   dont l'adresse ne change jamais (cf. App.jsx). Écrire des `<a href="#">`
   pour faire joli donnerait au lecteur d'écran la promesse d'une
   navigation qui n'arrive pas, et au clic droit un « ouvrir dans un nouvel
   onglet » qui recharge l'accueil marchand. */
function BarreOnglets({ actif, onChange, onAssistance, nonLus = 0 }) {
  return (
    <nav className="app-tabbar" aria-label="Navigation principale">
      {ONGLETS.map(({ id, label, Icone }) => {
        const estActif = id === actif;
        const badge = id === 'communaute' && nonLus > 0;

        return (
          <button
            key={id}
            type="button"
            className="app-tabbar__item"
            /* `aria-current` plutôt qu'une classe `.active` : c'est ce que
               le lecteur d'écran annonce, et le CSS s'accroche dessus. Un
               seul état, pas deux à garder synchronisés. */
            aria-current={estActif ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <Icone className="app-tabbar__icone" aria-hidden="true" />
            <span>{label}</span>

            {/* Au-delà de 9, on écrit « 9+ » : le nombre exact de messages
                non lus n'a jamais fait ouvrir un onglet, et trois chiffres
                déforment la barre. Le compte exact reste lisible pour un
                lecteur d'écran, qui n'a pas ce problème de place. */}
            {badge && (
              <>
                <span className="app-tabbar__pastille" aria-hidden="true">
                  {nonLus > 9 ? '9+' : nonLus}
                </span>
                <span className="sr-only">
                  {nonLus} message{nonLus > 1 ? 's' : ''} non lu
                  {nonLus > 1 ? 's' : ''}
                </span>
              </>
            )}
          </button>
        );
      })}

      <button
        type="button"
        className="app-tabbar__fab"
        onClick={onAssistance}
        aria-label="Poser une question"
      >
        <MessageCircle size={24} aria-hidden="true" />
      </button>
    </nav>
  );
}

export default BarreOnglets;
