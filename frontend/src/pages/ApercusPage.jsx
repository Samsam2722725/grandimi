import { Sparkles } from 'lucide-react';

/* Onglet Aperçus — étape 6.

   Il contiendra la courbe de taille dans le temps, la vitesse de
   croissance en cm/an et les six piliers classés du plus faible au plus
   fort. Rien de tout cela n'a de sens avant que `height_logs` existe
   (étape 1) et soit alimenté : une courbe à un seul point n'est pas une
   courbe.

   Cet écran dit donc ce qu'il attend, plutôt que d'afficher un graphique
   de démonstration. Une fausse donnée dans une application de santé, même
   présentée comme un exemple, est lue comme vraie par la moitié des
   utilisateurs. */
function ApercusPage() {
  return (
    <div className="app-vide">
      <span className="app-vide__icone">
        <Sparkles size={26} aria-hidden="true" />
      </span>
      <h2 className="app-vide__titre">Tes aperçus arrivent</h2>
      {/* La porte est nommée. Écrit « dès que tu auras deux mesures » sans
          dire où les prendre, cet écran promettait quelque chose sans
          donner le moyen de l'obtenir — l'utilisateur ne peut que
          refermer l'onglet. */}
      <p className="app-vide__texte">
        Prends ta mesure de la semaine depuis l’onglet Accueil. Dès la
        deuxième, ta courbe et ta vitesse de croissance s’affichent ici.
      </p>
    </div>
  );
}

export default ApercusPage;
