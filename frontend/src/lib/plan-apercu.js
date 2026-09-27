/* Aperçu du plan payant, DEV UNIQUEMENT (`?preview=plan`).

   Le vrai plan vient de POST /api/v1/growth-plan, protégé par
   l'abonnement : impossible de le voir en local sans payer. Ces données
   reproduisent ce que le serveur génère pour le profil de preview (garçon,
   14 ans, 165 cm, mois 1) — textes recopiés de internal/planner/
   monthly_plan.go et growth_plan.go, pas inventés. Si le générateur
   change, cet aperçu ne suit pas : il sert à juger l'écran, pas le contenu. */

export const PLAN_APERCU = {
  plan: {
    expected_growth: 1.5,
    motivation:
      "Il te reste environ 13.0 cm de croissance naturelle devant toi. Ce plan ne les crée pas : il sert à ne pas les perdre, et à ne pas finir en dessous de ton potentiel. On commence par ton activité physique, parce que c'est là que tu as le plus à gagner — tu bouges 20 min par jour, c'est le levier où tu as le plus de marge.",
    nutrition: { daily_calories: 2400, protein_g: 83, calcium_mg: 1300, vitamin_d_mcg: 15 },
    sleep: { hours: 9, bedtime: '22h30', waketime: '7h00' },
    posture_exercises: [
      { name: 'Suspension à la barre, le matin', description: 'Suspends-toi à une barre ou étire les bras vers le haut pour décompresser la colonne après la nuit', duration_min: 5, frequency: 'tous les jours', difficulty: 'facile', impact: 'Décompression de la colonne, posture', routine: 'Le matin, juste après le réveil', video: 'spinal-elongation-technique' },
      { name: 'Correction de la posture', description: "Renforcement du dos pour te tenir droit et arrêter de t'affaisser", duration_min: 10, frequency: 'tous les jours', difficulty: 'facile', impact: "Une meilleure posture, c'est 1 à 2 cm visibles en plus", routine: "N'importe quand", video: 'posture-correction-routine' },
      { name: 'Gainage (Pilates)', description: 'Renforce le centre du corps : c’est lui qui tient la posture sans que tu y penses', duration_min: 15, frequency: '3 fois par semaine', difficulty: 'moyen', impact: 'Centre solide, posture, alignement de la colonne', routine: 'Le soir', video: 'pilates-core-routine' },
      { name: 'Natation ou suspension', description: 'Étire la colonne en mouvement, sans impact sur les articulations', duration_min: 30, frequency: '3 à 4 fois par semaine', difficulty: 'moyen', impact: 'Étirement de la colonne, posture, condition physique', routine: 'Après les cours', video: 'swimming-hanging-technique' },
      { name: "Yoga d'étirement", description: "Yoga doux centré sur l'extension de la colonne et la souplesse", duration_min: 20, frequency: '3 fois par semaine', difficulty: 'facile', impact: 'Souplesse, étirement de la colonne, moins de stress', routine: 'Le matin ou le soir', video: 'yoga-height-sequence' },
    ],
    supplements: [
      { name: 'Multivitamines', dosage: '1 comprimé', frequency: 'tous les jours', best_taking_time: 'au petit-déjeuner', purpose: "Comble les manques de l'alimentation", research_support: 'démontré', safety: 'adapté à ton âge' },
      { name: 'Calcium + vitamine D', dosage: '1000 à 1300 mg de calcium, 600 UI de vitamine D', frequency: 'tous les jours', best_taking_time: 'pendant les repas', purpose: "Le calcium construit l'os, la vitamine D permet de l'absorber", research_support: 'démontré', safety: 'adapté à ton âge' },
      { name: 'Zinc', dosage: '8 à 11 mg', frequency: 'tous les jours', best_taking_time: 'au dîner', purpose: "Indispensable à l'hormone de croissance", research_support: 'démontré', safety: 'adapté à ton âge' },
    ],
  },
  monthly_plan: {
    month: 1,
    focus: 'Le sommeil',
    why_this_month:
      "L'hormone de croissance est libérée en pic 1 à 2 h après l'endormissement, pendant le sommeil profond. C'est le levier le plus puissant, et le plus souvent négligé.",
    month_target: 'Se coucher à la même heure (±30 min) 25 nuits sur 30.',
    weekly_goals: [
      'Semaine 1 : Note ton heure de coucher réelle chaque soir, sans rien changer.',
      'Semaine 2 : Avance ton coucher de 15 min par rapport à ta moyenne de la semaine 1.',
      'Semaine 3 : Coupe les écrans 45 min avant le coucher.',
      "Semaine 4 : Tiens l'horaire cible 7 nuits d'affilée.",
    ],
    next_month_preview: 'Mois 2 : La posture',
    daily_routine: [
      {
        moment: 'Matin', heure: 'au lever', duree_min: 10,
        tasks: [
          { key: 'matin-0', label: 'Suspension à la barre : 5 × 15 s', pourquoi: 'Décompresse la colonne tassée par la nuit et par la posture de la veille.', source: 'Littérature sur la décompression spinale par suspension passive' },
          { key: 'matin-1', label: 'Étirement vers le haut, 5 respirations lentes', pourquoi: 'Réactive la posture avant que la journée ne l’affaisse.', source: 'Kinésithérapie posturale' },
          { key: 'matin-2', label: 'Petit-déjeuner avec une source de protéines', pourquoi: "Le corps a besoin d'acides aminés disponibles dès le matin pour construire l'os et le muscle.", source: 'Recommandations nutritionnelles adolescents' },
        ],
      },
      {
        moment: 'Journée', heure: 'entre les cours', duree_min: 5,
        tasks: [
          { key: 'journee-0', label: 'Chambre à 18-20 °C, noir complet.', pourquoi: "L'hormone de croissance est libérée en pic 1 à 2 h après l'endormissement, pendant le sommeil profond. C'est le levier le plus puissant, et le plus souvent négligé.", source: 'Programme mensuel Grandimi — Le sommeil' },
          { key: 'journee-1', label: 'Se lever et marcher 2 min toutes les heures assises', pourquoi: 'Une position assise prolongée tasse la colonne et affaisse la posture.', source: 'Ergonomie posturale' },
          { key: 'journee-2', label: 'Boire régulièrement, viser 2 L sur la journée', pourquoi: "Les disques intervertébraux sont en grande partie composés d'eau ; la déshydratation les tasse.", source: 'Physiologie du disque intervertébral' },
        ],
      },
      {
        moment: 'Soir', heure: 'avant le dîner', duree_min: 20,
        tasks: [
          { key: 'soir-0', label: 'Séance du mois — Le sommeil : Se coucher à la même heure (±30 min) 25 nuits sur 30.', pourquoi: "L'hormone de croissance est libérée en pic 1 à 2 h après l'endormissement, pendant le sommeil profond. C'est le levier le plus puissant, et le plus souvent négligé.", source: 'Programme mensuel Grandimi — Le sommeil' },
          { key: 'soir-1', label: 'Étirement doux du dos et des hanches, 5 min', pourquoi: 'Relâche les tensions accumulées avant le pic hormonal du sommeil.', source: 'Kinésithérapie posturale' },
        ],
      },
      {
        moment: 'Coucher', heure: '22h00', duree_min: 0,
        tasks: [
          { key: 'coucher-0', label: 'Écrans coupés 45 min avant', pourquoi: 'La lumière bleue retarde la sécrétion de mélatonine et l’endormissement.', source: 'Physiologie du sommeil' },
          { key: 'coucher-1', label: 'Chambre sombre et fraîche (18-20 °C)', pourquoi: "Le sommeil profond, où l'hormone de croissance culmine, est plus stable dans le noir et le frais.", source: 'Physiologie du sommeil et de la croissance' },
          { key: 'coucher-2', label: "Même heure qu'hier, à 30 min près", pourquoi: 'Un rythme régulier avance et stabilise le pic de sommeil profond.', source: 'Physiologie du sommeil et de la croissance' },
        ],
      },
    ],
  },
}

export const APERCU_PLAN =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'plan'
