import { Ruler, TrendingUp } from 'lucide-react';

/* Onglet Accueil — version squelette.

   L'anneau segmenté, le compte à rebours hebdomadaire et la série de
   connexions sont l'étape 2. Ce qui est ici n'est pas un décor en
   attendant : c'est la seule donnée que l'application possède déjà
   (l'estimation issue du questionnaire), affichée telle quelle.

   On affiche TOUJOURS l'intervalle, jamais le point seul. Ce n'est pas de
   la prudence rédactionnelle, c'est la seule forme honnête : la méthode
   mi-parentale a un écart-type d'environ 5 cm, et annoncer « 181 cm » tout
   court promet une précision que le calcul n'a pas. Un intervalle a en
   plus l'avantage de se vérifier : le jour où l'adolescent tombe dedans,
   on avait raison. */
function AccueilPage({ predictionData, onAllerAuPlan }) {
  const estimation = predictionData?.predicted_height_cm;
  const intervalle = predictionData?.confidence_range;

  if (!estimation) {
    return (
      <div className="app-vide">
        <span className="app-vide__icone">
          <Ruler size={26} aria-hidden="true" />
        </span>
        <h2 className="app-vide__titre">Pas encore d'estimation</h2>
        <p className="app-vide__texte">
          Le questionnaire prend deux minutes et donne une fourchette de
          taille adulte.
        </p>
      </div>
    );
  }

  return (
    <section className="app-accueil">
      <div className="app-accueil__carte">
        <p className="app-accueil__label">Taille projetée</p>
        <p className="app-accueil__chiffre">
          {Math.round(estimation)}
          <span className="app-accueil__unite">cm</span>
        </p>
        {intervalle?.min != null && intervalle?.max != null && (
          <p className="app-accueil__intervalle">
            entre {Math.round(intervalle.min)} et {Math.round(intervalle.max)} cm
          </p>
        )}
      </div>

      <button
        type="button"
        className="app-accueil__cta"
        onClick={onAllerAuPlan}
      >
        <TrendingUp size={18} aria-hidden="true" />
        Voir mon plan du jour
      </button>
    </section>
  );
}

export default AccueilPage;
