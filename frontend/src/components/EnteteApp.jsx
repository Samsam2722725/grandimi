import { useEffect, useState } from 'react';
import { Settings, User } from 'lucide-react';
import { LogoGrandimi } from './ui/logo-grandimi';

/* En-tête de l'application : compte à gauche, marque au centre, réglages
   à droite.

   Il est COLLANT (`position: sticky`) et non fixe. La différence compte :
   collant, il participe encore au flux, donc le contenu commence dessous
   naturellement et on n'a pas à lui réserver une marge haute qu'on
   oubliera de mettre à jour le jour où l'en-tête grandit. */
/* Les deux boutons mènent à DEUX endroits différents, et c'est le seul
   point à vérifier si l'un d'eux est rebranché un jour. Écrits vers la
   même destination — ce qu'ils étaient au premier jet — ils donnent une
   barre à deux boutons dont un ne sert à rien, et l'utilisateur met
   plusieurs essais à comprendre qu'il n'a pas raté quelque chose. */
function EnteteApp({ onCompte, onReglages }) {
  /* Le filet du bas n'apparaît qu'une fois le contenu passé dessous.
     Affiché en permanence, il trace une ligne en travers d'un écran vide ;
     affiché au défilement, il dit « il y a quelque chose au-dessus ». */
  const [defile, setDefile] = useState(false);

  useEffect(() => {
    const surDefilement = () => setDefile(window.scrollY > 4);
    surDefilement();
    /* `passive` : ce gestionnaire ne fera jamais preventDefault, et le dire
       au navigateur lui évite d'attendre notre réponse avant de peindre le
       défilement. Sur un fil d'actualité long, c'est la différence entre
       un défilement fluide et un défilement qui accroche. */
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);

  return (
    <header className="app-entete" data-defile={defile ? 'oui' : 'non'}>
      <button
        type="button"
        className="app-entete__action"
        onClick={onCompte}
        aria-label="Mon compte"
      >
        <User size={20} aria-hidden="true" />
      </button>

      {/* `aria-hidden` sur le dessin, le nom est déjà écrit à côté : le
          lecteur d'écran annoncerait « Grandimi Grandimi » sinon. */}
      <span className="app-entete__marque">
        Grandimi
        <LogoGrandimi className="app-entete__logo" />
      </span>

      <button
        type="button"
        className="app-entete__action app-entete__action--fin"
        onClick={onReglages}
        aria-label="Réglages"
      >
        <Settings size={20} aria-hidden="true" />
      </button>
    </header>
  );
}

export default EnteteApp;
