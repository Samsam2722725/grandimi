/* L'estimation telle que les écrans la lisent, reconstruite depuis la
   dernière prédiction enregistrée côté serveur.

   Utilisée à la connexion et à la création du mot de passe, quand
   l'appareil n'a rien en mémoire. Les deux écrans recopiaient cet objet
   à la main, et chacun oubliait les mêmes champs :

   - `current_height_cm` était écrit `current_height` : la page de
     résultats affichait « NaN cm » ;
   - l'âge, le sexe et le poids manquaient : le plan du mois, que les CGV
     promettent, était refusé par le serveur et l'abonné lisait à la place
     un message de validation brut, en anglais.

   Un seul endroit, pour qu'ils ne divergent plus. */
export function predictionDepuisServeur(p, email) {
  return {
    predicted_height_cm: p.predicted_height,
    confidence_range: { min: p.confidence_min, max: p.confidence_max },
    confidence_level: p.confidence_level,
    current_height_cm: p.height_cm,
    age: p.age,
    sex: p.sex,
    weight_kg: p.weight_kg,
    email,
  };
}
