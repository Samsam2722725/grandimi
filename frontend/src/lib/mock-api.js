/**
 * Mock API pour développement sans serveur Go
 * À remplacer par apiClient.js en production
 */

export const mockPredictHeight = async (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Même méthode que le serveur : taille mi-parentale (Tanner).
      const midParentHeight = (data.father_height_cm + data.mother_height_cm) / 2;
      const adjustment = data.sex === 'M' ? 6.5 : -6.5;
      const estimatedAdultHeight = midParentHeight + adjustment;

      // Intervalle de confiance basé sur l'âge
      const confidenceRange = 4 + (18 - data.age) * 0.3;

      /* Le simulacre doit reproduire le PLANCHER du serveur, sinon il rend
         une taille adulte inférieure à la taille saisie et l'écran de
         résultat se teste sur un cas que la production ne produit jamais. */
      const estimation = Math.max(estimatedAdultHeight, data.height_cm)

      /* Second scénario, comme le serveur : les trois leviers à la cible.
         Le vrai calcul borne le facteur de mode de vie à [0,98 ; 1,01] ;
         on reprend la borne haute pour que l'ordre de grandeur affiché en
         local ressemble à celui de la production. */
      const potentiel = Math.max(estimatedAdultHeight * 1.01, estimation)

      resolve({
        predicted_height_cm: Math.round(estimation * 10) / 10,
        potential_height_cm: Math.round(potentiel * 10) / 10,
        confidence_range: {
          // Même plancher que le serveur : la borne basse ne passe jamais
          // sous la taille déjà atteinte.
          min: Math.round(Math.max(estimation - confidenceRange, data.height_cm) * 10) / 10,
          max: Math.round((estimation + confidenceRange) * 10) / 10,
        },
        confidence_level:
          data.age > 16
            ? 'high'
            : data.age > 14
              ? 'medium'
              : 'low',
        puberty_stage: 'moderate',
        /* Le vrai endpoint renvoie `user_id` (internal/api/handlers.go, l.171)
           et la paywall en dépend : sans lui, le bouton « faire payer par un
           parent » n'apparaît pas. Le simulacre doit le renvoyer aussi, sinon
           ce chemin est intestable en local. */
        user_id: 'mock-user-0001',
        model_used: 'Taille mi-parentale (Tanner) — mock',
        message: 'Prédiction générée en mode développement',
      });
    }, 1500); // Simule un délai réseau
  });
};

export default { mockPredictHeight };
