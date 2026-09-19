import { Users } from 'lucide-react';

/* Onglet Communauté — étape 8, et volontairement pas avant.

   Il n'est pas atteignable aujourd'hui : `COMMUNAUTE_ACTIVE` vaut `false`
   dans BarreOnglets.jsx, donc l'onglet n'est pas dans la barre. Ce fichier
   existe pour que l'activer plus tard soit une seule ligne à changer, pas
   un écran à écrire dans l'urgence.

   Rappel de ce qui bloque, pour la personne qui basculera l'interrupteur :
   un fil ouvert entre mineurs impose une modération, un signalement et une
   politique de rétention. Le fil en lecture seule décrit à l'étape 8
   évite les trois. */
function CommunautePage() {
  return (
    <div className="app-vide">
      <span className="app-vide__icone">
        <Users size={26} aria-hidden="true" />
      </span>
      <h2 className="app-vide__titre">Communauté</h2>
      <p className="app-vide__texte">
        Bientôt : les questions les plus fréquentes et les réponses de
        l'équipe, au même endroit.
      </p>
    </div>
  );
}

export default CommunautePage;
