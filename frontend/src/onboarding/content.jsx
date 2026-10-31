import { useEffect, useState } from 'react'
import {
  ArrowUp,
  BookOpen,
  Dna,
  CheckCircle2,
  Circle,
  Dumbbell,
  HeartPulse,
  ListChecks,
  Lock,
  Moon,
  TrendingUp,
  Utensils,
} from 'lucide-react'

import { ChoiceCard } from '@/components/ui/choice-card'
import { WheelPicker } from '@/components/ui/wheel-picker'
import { BadgePrecision } from '@/components/ui/badge-precision'
import { ReseauNeurones } from '@/components/ui/reseau-neurones'
import { EtudesPubliees } from '@/components/ui/ecrans-fonctions'
import { Avis } from '@/components/ui/avis'
import { TailleFinaleChart } from '@/components/ui/taille-finale-chart'
import { JaugePotentiel } from '@/components/ui/jauge-potentiel'
import { Lecons, SuiviSemaines, TelephoneRoutine } from '@/components/ui/resultats-visuels'
import { ActionsDuJour } from '@/components/ui/actions-du-jour'
import { TAILLE_MERE_INCONNUE_CM, TAILLE_PERE_INCONNUE_CM } from './payload'

/* ============================================================
   ORDRE DES 38 ÉCRANS
   ============================================================ */
export const ORDRE_ETAPES = [
  // Toi
  'sexe',
  'age',
  'bonne-nouvelle',
  'taille-poids',
  // Famille
  'parents',
  'pointure',
  // Courbe « Votre taille finale », comme Taller après la pointure (31/10/2026).
  'resultats-long-terme',
  // Puberté : l'ordre de Taller (31/10/2026), des questions qui servent à
  // la prédiction. L'acné est demandée comme chez Taller, même si le calcul
  // ne s'en sert pas.
  'vitesse-croissance',
  'regles',
  'voix',
  'pilosite-visage',
  'pilosite-aisselles',
  'acne',
  // Habitudes
  'exercice-freq',
  'sommeil',
  // Objectif, puis les écrans qui préparent le plan. Les questions
  // d'habitudes (coucher, téléphone, sports, assis, posture, protéines,
  // laitages) et « Ton profil de croissance » sont retirées du parcours le
  // 31/10/2026 ; leurs écrans restent dans le code.
  'taille-ideale',
  'pourquoi',
  'precision',
  'verite-brutale',
  'plus-que-genes',
  'citation-genetique',
  'decouvrir-potentiel',
  'resultats-la',
]

export const TYPE_ETAPE = {
  profil: 'question',
  motivation: 'question',
  sexe: 'question',
  age: 'question',
  taille: 'question',
  poids: 'question',
  pointure: 'question',
  sports: 'question',
  'exercice-freq': 'question',
  sommeil: 'question',
  pere: 'question',
  mere: 'question',
  proches: 'question',
  'pilosite-aisselles': 'question',
  regles: 'question',
  'pilosite-visage': 'question',
  'vitesse-croissance': 'question',
  epaules: 'question',
  odeur: 'question',
  acne: 'question',
  muscles: 'question',
  voix: 'question',
  'croissance-lente': 'question',
  'modele-prediction': 'affichage',
  precision: 'affichage',
  'resultats-long-terme': 'affichage',
  'potentiel-gain': 'affichage',
  'optimiser-potentiel': 'affichage',
  'grandimi-aide': 'affichage',
  'exercices-quotidiens': 'affichage',
  'programme-optimal': 'affichage',
  'guide-grandir': 'affichage',
  'height-tracker': 'affichage',
  'verite-brutale': 'affichage',
  'etudes-publiees': 'affichage',
  'avis-utilisateurs': 'affichage',
  'taille-ideale': 'question',
  'taille-poids': 'question',
  parents: 'question',
  'bonne-nouvelle': 'affichage',
  genetique: 'affichage',
  coucher: 'question',
  telephone: 'question',
  assis: 'question',
  posture: 'question',
  proteines: 'question',
  laitages: 'question',
  pourquoi: 'question',
  'profil-croissance': 'affichage',
  'plus-que-genes': 'interstitielle',
  'citation-genetique': 'interstitielle',
  'decouvrir-potentiel': 'interstitielle',
  'resultats-la': 'interstitielle',
}

/* ============================================================
   TITRES / SOUS-TITRES — copie exacte du script
   ============================================================ */
export const TEXTES_ETAPE = {
  profil: {
    titre: 'Qui es-tu ?',
    sousTitre: 'Pour te poser les bonnes questions',
  },
  motivation: {
    titre: 'Pourquoi tu es sur Grandimi ?',
    sousTitre: 'Tu peux choisir plusieurs',
  },
  sexe: {
    titre: 'Sélectionne ton sexe',
    sousTitre: 'Ceci sera utilisé pour prédire ton potentiel de taille et créer ton plan personnalisé.',
  },
  age: {
    titre: 'Quand es-tu né(e) ?',
    sousTitre: 'Ceci sera utilisé pour prédire ton potentiel de taille et créer ton plan personnalisé.',
  },
  taille: {
    titre: 'Quelle est ta taille ?',
    sousTitre: 'Ton point de départ',
  },
  poids: {
    titre: 'Quel est ton poids ?',
    sousTitre: 'Pour calculer ce que tu dois manger pour grandir',
  },
  // Taille et poids sur un seul écran, puis les deux parents : comme
  // Taller, deux molettes côte à côte (31/10/2026).
  'taille-poids': {
    titre: 'Taille et poids',
    sousTitre: 'Ceci sera utilisé pour prédire ton potentiel de taille et créer ton plan personnalisé.',
  },
  parents: {
    titre: 'Taille des parents',
    sousTitre: 'Ceci sera utilisé pour prédire ton potentiel de taille et créer ton plan personnalisé.',
  },
  pointure: {
    titre: 'Pointure',
    sousTitre: 'Ceci sera utilisé pour prédire ton potentiel de taille et créer ton plan personnalisé.',
  },
  sports: {
    titre: 'Quels sports pratiques-tu ?',
    sousTitre: 'Pour savoir où tu en es',
  },
  'exercice-freq': {
    titre: "Combien d'heures d'exercice par semaine ?",
    sousTitre: 'Pour savoir où tu en es',
  },
  sommeil: {
    titre: 'Combien d’heures dors-tu par nuit ?',
    sousTitre: 'Ton sommeil compte plus que tu ne crois pour ta taille',
  },
  pere: {
    titre: 'Combien mesure ton père ?',
    sousTitre: 'La taille de tes parents compte beaucoup dans la tienne',
  },
  mere: {
    titre: 'Combien mesure ta mère ?',
    sousTitre: 'La taille de tes parents compte beaucoup dans la tienne',
  },
  proches: {
    titre: 'As-tu des proches plus grands que ton père ?',
    sousTitre: 'La taille de ta famille nous renseigne sur tes gènes',
  },
  regles: {
    titre: 'As-tu déjà eu tes premières règles ?',
    sousTitre: 'C’est le repère le plus fiable pour savoir où tu en es dans ta croissance',
  },
  'pilosite-aisselles': {
    titre: 'As-tu des poils aux aisselles ?',
    sousTitre: 'Les poils aux aisselles sont un signe précoce de la puberté',
  },
  'pilosite-visage': {
    titre: 'As-tu des poils au visage ?',
    sousTitre: 'Les poils du visage nous aident à estimer ton stade de croissance',
  },
  'vitesse-croissance': {
    titre: 'Combien as-tu grandi l’année dernière ?',
    sousTitre: 'Si tu as grandi récemment, ta croissance n’est pas finie',
  },
  epaules: {
    titre: 'Tes épaules se sont-elles élargies ?',
    sousTitre: 'L’élargissement des épaules peut indiquer la phase milieu de puberté',
  },
  odeur: {
    titre: 'As-tu remarqué plus d’odeur corporelle ?',
    sousTitre: 'Les changements d’odeur corporelle commencent souvent autour de la puberté',
  },
  acne: {
    titre: 'As-tu de l’acné ?',
    sousTitre: 'Les boutons peuvent augmenter quand les hormones de la puberté arrivent',
  },
  muscles: {
    titre: 'Tes muscles sont-ils plus dessinés ?',
    sousTitre: 'Les changements musculaires peuvent indiquer que la puberté commence',
  },
  voix: {
    titre: 'Ta voix a-t-elle complètement mué ?',
    sousTitre: 'Le changement de voix est un signe tardif que la puberté avance',
  },
  'croissance-lente': {
    titre: 'Tu grandis encore, mais plus lentement que l’an dernier ?',
    sousTitre: 'Une croissance plus lente peut signifier que ta puberté se termine',
  },
  'modele-prediction': {
    titre: 'Un modèle basé sur la science',
    sousTitre:
      'Construit à partir des tables de croissance OMS et du modèle Khamis-Roche, pas d\'une formule maison.',
  },
  precision: {
    titre: 'Quelle est la précision de notre prédiction ?',
    sousTitre: 'On combine tes mesures et tes habitudes pour estimer ton potentiel.',
  },
  'resultats-long-terme': {
    titre: 'Grandimi crée des résultats à long terme',
    sousTitre: 'Beaucoup n’atteignent pas leur plein potentiel de taille à cause d’habitudes non optimisées.',
  },
  'potentiel-gain': {
    titre: 'Tu peux grandir',
    sousTitre: 'Environ 20 % de ta taille est encore entre tes mains. Les bonnes habitudes font la différence.',
  },
  'optimiser-potentiel': {
    titre: 'Optimise tout ton potentiel de taille',
    sousTitre: 'Pour grandir au maximum, dors bien, mange bien et reste actif',
  },
  'grandimi-aide': {
    titre: "Grandimi t'aide pour ça",
    sousTitre: 'Trois leviers clés',
  },
  'exercices-quotidiens': {
    titre: 'Fais des exercices quotidiens',
    sousTitre: 'Suis des routines simples pour soutenir ta croissance et ta santé',
  },
  'programme-optimal': {
    titre: 'Ton programme optimal',
    sousTitre: 'Chaque routine te rapproche de ton potentiel',
  },
  'guide-grandir': {
    titre: 'Guide pour grandir',
    sousTitre: 'Les fondamentaux expliqués',
  },
  'height-tracker': {
    titre: 'Suis ta taille chaque semaine',
    sousTitre: 'Saisis ta taille chaque semaine. Plus on a de données, plus la prédiction est précise',
  },
  'verite-brutale': {
    titre: 'Le coût d’être petit',
    sousTitre: 'Pas des statistiques. Juste ce que tu vis déjà',
  },
  'etudes-publiees': {
    titre: 'Avis expert',
    sousTitre: 'Sources scientifiques',
  },
  'avis-utilisateurs': {
    titre: 'Résultats réels',
    sousTitre: 'Ce que les utilisateurs obtiennent',
  },
  'taille-ideale': {
    titre: 'Quelle est ta taille de rêve ?',
    sousTitre: 'En fonction de tes données, nous calculerons la probabilité d’atteindre cette taille.',
  },
  'resultats-la': {
    titre: 'Ton plan est prêt ✓',
    sousTitre: 'Entre ton e-mail pour le voir et le retrouver quand tu veux',
  },
  'bonne-nouvelle': {
    titre: 'Bonne nouvelle',
    sousTitre: 'Tu grandis sans doute encore.',
  },
  genetique: {
    titre: 'Ton analyse génétique',
    sousTitre: 'Calculée à partir de la taille de tes parents',
  },
  coucher: {
    titre: 'À quelle heure tu t’endors ?',
    sousTitre: 'Ton heure compte autant que ta durée de sommeil',
  },
  telephone: {
    titre: 'Tu regardes ton téléphone au lit ?',
    sousTitre: 'Une habitude que beaucoup sous-estiment',
  },
  assis: {
    titre: 'Combien d’heures es-tu assis par jour ?',
    sousTitre: 'Ça joue plus sur ta taille que tu ne le penses',
  },
  posture: {
    titre: 'Comment tu te tiens, en général ?',
    sousTitre: 'Ta posture peut te faire paraître plus petit que tu ne l’es',
  },
  proteines: {
    titre: 'Tu manges des protéines à chaque repas ?',
    sousTitre: 'Ce que tu manges peut freiner ta croissance',
  },
  laitages: {
    titre: 'Combien de produits laitiers par jour ?',
    sousTitre: 'Ce que tu manges peut freiner ta croissance',
  },
  pourquoi: {
    titre: 'Pourquoi tu veux grandir ?',
    sousTitre: 'Dernière question, et ton plan est prêt',
  },
  'profil-croissance': {
    titre: 'Ton profil de croissance',
    sousTitre: 'Construit à partir de tes réponses : voilà avec quoi on travaille',
  },
}

/* Quand c'est un parent qui remplit (« Je suis un parent »), les
   questions parlent de son enfant et non plus à lui. Seuls les écrans
   de question sont concernés : les écrans d'affichage restent adressés
   à l'ado, que le parent lit par-dessus son épaule ou lui montre. */
const TEXTES_PARENT = {
  motivation: { titre: 'Pourquoi êtes-vous sur Grandimi ?', sousTitre: 'Vous pouvez en choisir plusieurs' },
  sexe: { titre: 'Votre enfant est un garçon ou une fille ?', sousTitre: 'Le sexe influence la taille à l’âge adulte' },
  age: { titre: 'Quand est né(e) votre enfant ?', sousTitre: 'Son âge nous aide à prédire quand il va grandir' },
  taille: { titre: 'Combien mesure votre enfant ?', sousTitre: 'Faites glisser pour choisir sa taille actuelle' },
  poids: { titre: 'Quel est son poids ?', sousTitre: 'Faites glisser pour choisir son poids actuel' },
  pointure: { titre: 'Quelle est sa pointure ?', sousTitre: 'La taille des pieds montre où il en est dans sa croissance' },
  sports: { titre: 'Quels sports pratique-t-il ?', sousTitre: 'Le sport peut aider le corps à grandir' },
  'exercice-freq': { titre: 'Combien d’heures d’exercice par semaine ?', sousTitre: 'L’exercice influence l’hormone de croissance et la récupération' },
  sommeil: { titre: 'Combien d’heures dort-il par nuit ?', sousTitre: 'Bien dormir aide à grandir et à récupérer' },
  pere: { titre: 'Combien mesure le père ?', sousTitre: 'La taille des parents influence beaucoup la sienne' },
  mere: { titre: 'Combien mesure la mère ?', sousTitre: 'La taille des parents influence beaucoup la sienne' },
  proches: { titre: 'A-t-il des proches plus grands que son père ?', sousTitre: 'La taille de la famille nous renseigne sur ses gènes' },
  regles: { titre: 'A-t-elle déjà eu ses premières règles ?', sousTitre: 'C’est le repère le plus fiable pour savoir où elle en est' },
  'pilosite-aisselles': { titre: 'A-t-il des poils aux aisselles ?', sousTitre: 'C’est un signe précoce de la puberté' },
  'pilosite-visage': { titre: 'A-t-il des poils au visage ?', sousTitre: 'Ils nous aident à estimer son stade de croissance' },
  'vitesse-croissance': { titre: 'Combien a-t-il grandi l’année dernière ?', sousTitre: 'Sa croissance récente montre le rythme de sa puberté' },
  epaules: { titre: 'Ses épaules se sont-elles élargies ?', sousTitre: 'Cela peut indiquer le milieu de la puberté' },
  odeur: { titre: 'A-t-il plus d’odeur corporelle ?', sousTitre: 'Ce changement commence souvent autour de la puberté' },
  acne: { titre: 'A-t-il de l’acné ?', sousTitre: 'Les boutons peuvent augmenter avec les hormones de la puberté' },
  muscles: { titre: 'Ses muscles sont-ils plus dessinés ?', sousTitre: 'Cela peut indiquer que la puberté commence' },
  voix: { titre: 'Sa voix a-t-elle complètement mué ?', sousTitre: 'C’est un signe tardif que la puberté avance' },
  'croissance-lente': { titre: 'Grandit-il plus lentement que l’an dernier ?', sousTitre: 'Cela peut signifier que sa puberté se termine' },
  'taille-ideale': { titre: 'Quelle taille aimerait-il atteindre ?', sousTitre: 'Choisissez la taille qu’il vise' },
}

const auFeminin = (texte) => texte.replace(/-il\b/g, '-elle').replace(/\bil\b/g, 'elle')

export function texteEtape(etape, profil, sexe) {
  const parent = profil === 'parent' && TEXTES_PARENT[etape]
  if (!parent) return TEXTES_ETAPE[etape]
  if (sexe !== 'F') return parent
  return { titre: auFeminin(parent.titre), sousTitre: auFeminin(parent.sousTitre) }
}

/* ============================================================
   OPTIONS DES ÉCRANS À CHOIX
   ============================================================ */
export const OPTIONS_MOTIVATION = [
  { valeur: 'taille-finale', label: 'Prédire ma taille finale' },
  { valeur: 'nutrition', label: 'Savoir quoi manger pour grandir' },
  { valeur: 'posture', label: 'Corriger ma posture' },
  { valeur: 'exercices', label: 'Exercices pour grandir' },
]

export const OPTIONS_SPORTS = [
  { valeur: 'basket', label: 'Basket' },
  { valeur: 'muscu', label: 'Musculation' },
  { valeur: 'course', label: 'Course/Athlétisme' },
  { valeur: 'natation', label: 'Natation' },
  { valeur: 'foot', label: 'Football/Soccer' },
  { valeur: 'autre', label: 'Autre' },
]

export const OPTIONS_EXERCICE_FREQ = [
  { valeur: '0-2', label: '0-2 heures' },
  { valeur: '3-5', label: '3-5 heures' },
  { valeur: '6+', label: '6+ heures' },
]

export const OPTIONS_COUCHER = [
  { valeur: 'avant-22h', label: 'Avant 22 h' },
  { valeur: '22h-23h', label: 'Entre 22 h et 23 h' },
  { valeur: '23h-minuit', label: 'Entre 23 h et minuit' },
  { valeur: 'apres-minuit', label: 'Après minuit' },
]

export const OPTIONS_TELEPHONE = [
  { valeur: 'jamais', label: 'Jamais' },
  { valeur: 'parfois', label: 'Parfois' },
  { valeur: 'tous-les-soirs', label: 'Tous les soirs' },
]

export const OPTIONS_ASSIS = [
  { valeur: 'moins-4h', label: 'Moins de 4 heures' },
  { valeur: '4h-8h', label: 'Entre 4 et 8 heures' },
  { valeur: 'plus-8h', label: 'Plus de 8 heures' },
]

export const OPTIONS_POSTURE = [
  { valeur: 'droit', label: 'Bien droit' },
  { valeur: 'un-peu-voute', label: 'Un peu voûté' },
  { valeur: 'voute', label: 'Souvent voûté' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas', hint: 'On le vérifie dans ton analyse' },
]

export const OPTIONS_PROTEINES = [
  { valeur: 'chaque-repas', label: 'Oui, à chaque repas' },
  { valeur: 'un-repas', label: 'À un repas par jour' },
  { valeur: 'rarement', label: 'Rarement' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas', hint: 'On le vérifie dans ton analyse' },
]

export const OPTIONS_LAITAGES = [
  { valeur: '3-plus', label: '3 ou plus' },
  { valeur: '1-2', label: '1 ou 2' },
  { valeur: 'aucun', label: 'Aucun' },
]

export const OPTIONS_POURQUOI = [
  { valeur: 'confiance', label: 'Avoir plus confiance en moi', hint: 'Tu te tiendras autrement' },
  { valeur: 'plaire', label: 'Plaire, faire bonne impression', hint: 'La taille se remarque en quelques secondes' },
  { valeur: 'sport', label: 'Être meilleur en sport', hint: 'Plus d’allonge, plus de présence' },
  { valeur: 'regard', label: 'Qu’on me regarde autrement', hint: 'On ne regarde pas pareil quelqu’un de grand' },
  { valeur: 'max', label: 'Atteindre mon maximum', hint: 'Ne laisser aucun centimètre de côté' },
]

export const OPTIONS_PROCHES = [
  { valeur: 'frere', label: 'Frère' },
  { valeur: 'cousin', label: 'Cousin' },
  { valeur: 'grand-pere', label: 'Grand-père' },
  { valeur: 'grand-mere', label: 'Grand-mère' },
  { valeur: 'autre', label: 'Autre' },
  { valeur: 'non', label: 'Non' },
]

/* Premières règles : seulement à partir de 15 ans (voir etapesPour).
   La réponse donne le délai écoulé, que le moteur convertit en âge aux
   premières règles (internal/estimator/menarche.go). */
export const OPTIONS_REGLES = [
  { valeur: 'non', label: 'Pas encore' },
  { valeur: 'moins-1-an', label: 'Oui, il y a moins d’un an' },
  { valeur: '1-2-ans', label: 'Oui, il y a 1 à 2 ans' },
  { valeur: 'plus-2-ans', label: 'Oui, il y a plus de 2 ans' },
  { valeur: 'sans-reponse', label: 'Je préfère ne pas répondre' },
]

/* Les écrans montrés dépendent du sexe et de l'âge.
   - Pour une fille : pas de questions sur les poils du visage, la voix,
     les épaules ou les muscles, qui décrivent une puberté de garçon.
   - Les premières règles ne sont demandées qu'à une fille de 15 ans et
     plus : c'est une donnée de santé, et avant 15 ans il faudrait le
     consentement d'un parent (cf. menarche.go). */
const ETAPES_GARCON = new Set(['pilosite-visage', 'voix', 'epaules', 'muscles'])

/* Les quatre chapitres du parcours, affichés en tête d'écran (segments +
   libellé). Tout ce qui n'est ni « toi », ni « famille », ni « puberté »
   appartient au dernier chapitre, celui qui présente le plan. */
export const CHAPITRES = ['Toi', 'Famille', 'Puberté', 'Habitudes', 'Objectif']
const CHAPITRE_DE = {
  sexe: 0, age: 0, 'bonne-nouvelle': 0, 'taille-poids': 0,
  parents: 1, pointure: 1, 'resultats-long-terme': 1, genetique: 1,
  'vitesse-croissance': 2, regles: 2, voix: 2, 'pilosite-visage': 2, 'pilosite-aisselles': 2, acne: 2,
  'exercice-freq': 3, sommeil: 3,
}

export function chapitreDe(etape) {
  return CHAPITRE_DE[etape] ?? 4
}

export function etapesPour(reponses) {
  const fille = reponses?.sexe === 'F'
  return ORDRE_ETAPES.filter((etape) => {
    if (ETAPES_GARCON.has(etape)) return !fille
    if (etape === 'regles') return fille && reponses.age >= 15
    if (etape === 'bonne-nouvelle') return !fille && reponses.age >= 16
    return true
  })
}

export const OPTIONS_PILOSITE_AISSELLES = [
  { valeur: 'non', label: 'Non' },
  { valeur: 'un-peu', label: 'Un peu' },
  { valeur: 'oui', label: 'Oui' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_PILOSITE_VISAGE = [
  { valeur: 'aucun', label: 'Aucun' },
  { valeur: 'leger', label: 'Très léger' },
  { valeur: 'rase-parfois', label: 'Je me rase parfois' },
  { valeur: 'rase-souvent', label: 'Je me rase régulièrement' },
]

export const OPTIONS_EPAULES = [
  { valeur: 'non', label: 'Non' },
  { valeur: 'un-peu', label: 'Oui un peu' },
  { valeur: 'clairement', label: 'Oui clairement' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_ODEUR = [
  { valeur: 'non', label: 'Non' },
  { valeur: 'un-peu', label: 'Un peu' },
  { valeur: 'beaucoup', label: 'Beaucoup' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_ACNE = [
  { valeur: 'aucune', label: 'Aucune' },
  { valeur: 'rarement', label: 'Rarement' },
  { valeur: 'reguliere', label: 'Régulière' },
  { valeur: 'severe', label: 'Fréquente/Sévère' },
  { valeur: 'disparu', label: 'Presque disparu' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_MUSCLES = [
  { valeur: 'non', label: 'Non' },
  { valeur: 'un-peu', label: 'Un peu' },
  { valeur: 'beaucoup', label: 'Beaucoup' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_VOIX = [
  { valeur: 'non', label: 'Pas de changement' },
  { valeur: 'un-peu', label: 'Un peu plus grave' },
  { valeur: 'complet', label: 'Complètement plus grave' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas', hint: 'Pas grave, on s’en sert pour affiner' },
]

export const OPTIONS_CROISSANCE_LENTE = [
  { valeur: "pas-grandi", label: "N'ai pas grandi" },
  { valeur: "plus-lentement", label: "Plus lentement" },
  { valeur: "meme-rythme", label: "Même rythme" },
  { valeur: "plus-vite", label: "Plus vite" },
  { valeur: "ne-sais-pas", label: "Je ne sais pas" },
]

export const OPTIONS_VITESSE_CROISSANCE = [
  { valeur: "moins-2cm", label: "Moins de 2 cm" },
  { valeur: "2-5cm", label: "2 à 5 cm" },
  { valeur: "6-9cm", label: "6 à 9 cm" },
  { valeur: "plus-10cm", label: "10 cm ou plus" },
  { valeur: "ne-sais-pas", label: "Je ne sais pas" },
]

/* ============================================================
   PETITS COMPOSANTS PARTAGÉS
   ============================================================ */

export function ListeChoixUnique({ options, valeur, onChoisir, label }) {
  return (
    <div className="funnel-choices" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <ChoiceCard
          key={option.valeur}
          role="radio"
          selected={valeur === option.valeur}
          onSelect={() => onChoisir(option.valeur)}
          title={option.label}
          hint={option.hint}
          icon={option.icon}
        />
      ))}
    </div>
  )
}

/**
 * Choix multiple générique. `exclusif` désigne une valeur (« non ») qui,
 * sélectionnée, efface toutes les autres — et qui est elle-même effacée
 * dès qu'une autre option est cochée. Écran 13 seul en a besoin ; les
 * autres passent `exclusif` à `undefined` et se comportent en simple
 * ensemble de cases à cocher.
 */
export function ListeChoixMultiple({ options, valeurs, onBasculer, label, exclusif }) {
  const ensemble = valeurs || []
  return (
    <div className="funnel-choices" role="group" aria-label={label}>
      {options.map((option) => (
        <ChoiceCard
          key={option.valeur}
          role="checkbox"
          selected={ensemble.includes(option.valeur)}
          onSelect={() => onBasculer(option.valeur, exclusif)}
          title={option.label}
        />
      ))}
    </div>
  )
}

/**
 * Molettes de mesure, en unités françaises seulement : cm, kg, pointure
 * EU. Les bascules ft/in, lbs et US sont retirées le 31/10/2026 (« on
 * n'est qu'en France »). Les props `unite` / `onChangeUnite` restent
 * acceptées et ignorées, pour ne pas toucher aux appels.
 */
const formatCm = (v) => `${v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')} cm`
const formatKg = (v) => `${v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')} kg`

export function MoletteTailleCm({ valeurCm, onChange, min = 120, max = 220 }) {
  return (
    <div className="onb-mesure">
      <WheelPicker
        label="Taille en centimètres"
        value={valeurCm}
        onChange={onChange}
        min={min}
        max={max}
        step={0.5}
        // Au demi-centimètre : « 172,30 cm » demandait une précision que
        // personne n'a sous la toise et faisait hésiter.
        format={formatCm}
      />
    </div>
  )
}

export function MoletteTailleAvecInconnu({ valeurCm, onChange, onInconnu, min, max, inconnuDefaut }) {
  const [aChoisi, setAChoisi] = useState(false)
  const inconnu = valeurCm == null && aChoisi
  return (
    <div className="onb-mesure">
      <MoletteTailleCm valeurCm={valeurCm ?? inconnuDefaut} onChange={onChange} min={min} max={max} />
      {/* Sans ce texte, choisir « Je ne sais pas » ne change rien à l'écran :
          la molette retombe sur une valeur moyenne qui a l'air d'un choix
          comme un autre, et le clic semble n'avoir rien fait. */}
      {inconnu && <p className="onb-inconnu-note">Valeur moyenne utilisée — fais glisser pour corriger.</p>}
      <button
        type="button"
        className="onb-bouton-inconnu"
        aria-pressed={inconnu}
        onClick={() => {
          setAChoisi(true)
          // Répondre « je ne sais pas » passe à la question suivante.
          if (onInconnu) onInconnu()
          else onChange(null)
        }}
      >
        {inconnu ? '✓ Je ne sais pas' : 'Je ne sais pas'}
      </button>
    </div>
  )
}

export function MolettePoidsKg({ valeurKg, onChange }) {
  return (
    <div className="onb-mesure">
      <WheelPicker label="Poids en kilogrammes" value={valeurKg} onChange={onChange} min={30} max={150} step={0.5} format={formatKg} />
    </div>
  )
}

/* Deux mesures sur un écran, comme Taller : un titre au-dessus de chaque
   molette (31/10/2026). */
function ColonneMolette({ titre, children }) {
  return (
    <div className="onb-colonne">
      <span className="onb-colonne-titre">{titre}</span>
      {children}
    </div>
  )
}

export function MoletteTaillePoids({ tailleCm, poidsKg, onTaille, onPoids }) {
  return (
    <div className="onb-mesure">
      <div className="onb-wheel-row">
        <ColonneMolette titre="Taille">
          <WheelPicker label="Ta taille en centimètres" value={tailleCm} onChange={onTaille} min={120} max={209} step={0.5} format={formatCm} />
        </ColonneMolette>
        <ColonneMolette titre="Poids">
          <WheelPicker label="Ton poids en kilogrammes" value={poidsKg} onChange={onPoids} min={30} max={150} step={0.5} format={formatKg} />
        </ColonneMolette>
      </div>
    </div>
  )
}

/* « Je ne sais pas » sous chaque parent : la taille moyenne est alors
   utilisée, et toucher la molette annule ce choix. Plus d'avance
   automatique, puisqu'il reste l'autre parent sur le même écran. */
function ParentInconnu({ inconnu, onInconnu }) {
  return (
    <button
      type="button"
      className="onb-bouton-inconnu onb-bouton-inconnu--petit"
      aria-pressed={inconnu}
      onClick={onInconnu}
    >
      {inconnu ? '✓ Je ne sais pas' : 'Je ne sais pas'}
    </button>
  )
}

export function MoletteParents({ pere, mere, pereInconnu, mereInconnu, onPere, onMere, onPereInconnu, onMereInconnu }) {
  return (
    <div className="onb-mesure">
      <div className="onb-wheel-row">
        <ColonneMolette titre="Père">
          <WheelPicker label="Taille de ton père en centimètres" value={pere ?? TAILLE_PERE_INCONNUE_CM} onChange={onPere} min={141} max={219} step={0.5} format={formatCm} />
          <ParentInconnu inconnu={pereInconnu} onInconnu={onPereInconnu} />
        </ColonneMolette>
        <ColonneMolette titre="Mère">
          <WheelPicker label="Taille de ta mère en centimètres" value={mere ?? TAILLE_MERE_INCONNUE_CM} onChange={onMere} min={141} max={209} step={0.5} format={formatCm} />
          <ParentInconnu inconnu={mereInconnu} onInconnu={onMereInconnu} />
        </ColonneMolette>
      </div>
    </div>
  )
}

/* Pointure, comme Taller : « Sélectionne ta pointure » au-dessus d'une
   seule molette, pointures françaises. Pas de « Je ne sais pas » : tout le
   monde connaît sa pointure (31/10/2026). */
export function pointureParDefaut(sexe) {
  return sexe === 'F' ? 38 : 42
}

export function MolettePointure({ valeurEu, onChange, sexe }) {
  return (
    <div className="onb-mesure">
      <ColonneMolette titre="Sélectionne ta pointure">
        <WheelPicker
          label="Pointure"
          value={valeurEu ?? pointureParDefaut(sexe)}
          onChange={onChange}
          min={30}
          max={50}
          step={0.5}
          format={(v) => (v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ','))}
        />
      </ColonneMolette>
    </div>
  )
}

/* Taille de rêve, comme Taller : « Taille de rêve » au-dessus d'une seule
   molette. Elle part de la taille actuelle + 5 cm (31/10/2026). */
export function tailleReveParDefaut(tailleCm) {
  return Math.round(Number(tailleCm) || 170) + 5
}

export function MoletteTailleReve({ valeurCm, onChange }) {
  return (
    <div className="onb-mesure">
      <ColonneMolette titre="Taille de rêve">
        <WheelPicker label="Taille de rêve en centimètres" value={valeurCm} onChange={onChange} min={140} max={220} step={0.5} format={formatCm} />
      </ColonneMolette>
    </div>
  )
}

/* Sommeil, comme Taller (31/10/2026) : un cadran de traits qui se remplit
   dans le sens des aiguilles d'une montre, la durée au centre (« 7h30 »),
   et un curseur dessous. Le cadran va de 0 à 12 h ; le curseur de 4 à
   12 h, par demi-heure, comme l'ancienne molette. */
const SOMMEIL_MIN = 4
const SOMMEIL_MAX = 12
const TRAITS_CADRAN = 40

const formatDuree = (h) => `${Math.floor(h)}h${h % 1 === 0 ? '' : '30'}`

// Orange Grandimi vers ambre clair, le long des traits allumés.
function couleurTrait(t) {
  const de = [255, 90, 31]
  const a = [255, 196, 107]
  const c = de.map((v, i) => Math.round(v + (a[i] - v) * t))
  return `rgb(${c.join(',')})`
}

export function MoletteSommeil({ valeur, onChange }) {
  const heures = valeur ?? 8
  const allumes = Math.round((heures / SOMMEIL_MAX) * TRAITS_CADRAN)
  const pourcent = ((heures - SOMMEIL_MIN) / (SOMMEIL_MAX - SOMMEIL_MIN)) * 100
  return (
    <div className="onb-sommeil">
      <div className="onb-sommeil-cadran">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          {Array.from({ length: TRAITS_CADRAN }, (_, i) => {
            const angle = (i / TRAITS_CADRAN) * 2 * Math.PI - Math.PI / 2
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)
            const allume = i < allumes
            return (
              <line
                key={i}
                x1={110 + cos * 78}
                y1={110 + sin * 78}
                x2={110 + cos * 100}
                y2={110 + sin * 100}
                stroke={allume ? couleurTrait(allumes > 1 ? i / (allumes - 1) : 0) : 'rgba(244, 239, 233, 0.12)'}
                strokeWidth="7"
                strokeLinecap="round"
              />
            )
          })}
        </svg>
        <span className="onb-sommeil-duree">{formatDuree(heures)}</span>
      </div>
      <input
        type="range"
        className="onb-sommeil-curseur"
        min={SOMMEIL_MIN}
        max={SOMMEIL_MAX}
        step={0.5}
        value={heures}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Heures de sommeil par nuit"
        aria-valuetext={`${formatDuree(heures)} par nuit`}
        style={{ '--pourcent': `${pourcent}%` }}
      />
    </div>
  )
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function MoletteDateNaissance({ jour, mois, annee, onChange }) {
  const anneeCourante = new Date().getFullYear()
  return (
    <div className="onb-wheel-row">
      <WheelPicker
        label="Jour"
        value={jour}
        onChange={(v) => onChange({ jour: v, mois, annee })}
        min={1}
        max={31}
        step={1}
        format={(v) => String(v)}
      />
      <WheelPicker
        label="Mois"
        value={mois}
        onChange={(v) => onChange({ jour, mois: v, annee })}
        min={1}
        max={12}
        step={1}
        format={(v) => MOIS[v - 1]}
      />
      <WheelPicker
        label="Année"
        value={annee}
        onChange={(v) => onChange({ jour, mois, annee: v })}
        min={anneeCourante - 21}
        max={anneeCourante - 8}
        step={1}
        format={(v) => String(v)}
      />
    </div>
  )
}

/* ============================================================
   ÉCRANS D'AFFICHAGE (24-35)
   ============================================================ */

export function EcranModelePrediction() {
  return (
    <div className="onb-preuve">
      <ReseauNeurones className="funnel-reseau" />
      <a className="funnel-lien-info" href="/methode/" target="_blank" rel="noopener">
        Comment ça marche ?
      </a>
    </div>
  )
}

export function EcranResultatsLongTerme() {
  return (
    <div className="onb-preuve">
      <TailleFinaleChart />
    </div>
  )
}

export function EcranPotentielGain() {
  return (
    <div className="onb-preuve">
      <JaugePotentiel />
    </div>
  )
}

export function EcranPrecision() {
  return <BadgePrecision />
}

const LEVIERS_OPTIMISATION = [
  { icone: Moon, titre: 'Sommeil' },
  { icone: Utensils, titre: 'Nutrition' },
  { icone: Dumbbell, titre: 'Activité' },
]

export function EcranOptimiserPotentiel() {
  return (
    <div className="onb-preuve">
      <div className="onb-icones onb-icones-3">
        {LEVIERS_OPTIMISATION.map(({ icone: Icone, titre }) => (
          <div className="onb-icone" key={titre}>
            <Icone size={26} aria-hidden="true" />
            <strong>{titre}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// Les trois fonctions de la landing (FONCTIONS dans HomePage.jsx), rien d'autre.
const AIDES_GRANDIMI = [
  { icone: TrendingUp, titre: 'Prédiction' },
  { icone: ListChecks, titre: 'Plan quotidien' },
  { icone: HeartPulse, titre: 'Conseils' },
]

export function EcranGrandimiAide() {
  return (
    <div className="onb-icones onb-icones-3">
      {AIDES_GRANDIMI.map(({ icone: Icone, titre }) => (
        <div className="onb-icone" key={titre}>
          <Icone size={24} aria-hidden="true" />
          <strong>{titre}</strong>
        </div>
      ))}
    </div>
  )
}

/* Écrans d'affichage illustrés par les visuels du client, reconstruits
   en code (components/ui/resultats-visuels.jsx, actions-du-jour.jsx) :
   chaque visuel est posé sur l'écran dont le titre porte son sujet. */
export function EcranHeightTracker() {
  return <SuiviSemaines />
}

export function EcranActionsDuJour() {
  return <ActionsDuJour />
}

export function EcranLecons() {
  return <Lecons />
}

export function EcranPlanQuotidien() {
  return <TelephoneRoutine />
}

/**
 * Écran 33. Plusieurs versions du script « garçon » comportaient un
 * montant inventé (« ~300$ par an » puis « 600$ par pouce »), un
 * pourcentage de carrière fabriqué (« 59 % de chances en moins d'être
 * CEO ») et une allusion à la séduction (« moins de matchs en rencontre » /
 * « les femmes te négligent ») : ce que ce même fichier `funnel.css`
 * interdit explicitement à cet écran ailleurs dans le code (« NI
 * pourcentage NI montant NI allusion à la séduction — c'est la différence
 * entre une liste vérifiable et une liste qui vise l'estime de soi d'un
 * mineur »). Les idées sont conservées quand elles sont vérifiables,
 * reformulées sans chiffre fabriqué ni ressort romantique. La liste
 * « fille » n'avait rien à corriger.
 */
const VERITE_GARCON = [
  'Ignoré dans les moments importants',
  'Moins pris au sérieux par les autres',
  'Sous 1m75, on te voit moins comme un leader',
  'Chaque centimètre peut influencer le salaire et la confiance qu’on te donne',
  'Ça peut créer plus d’anxiété sociale',
]

const VERITE_FILLE = [
  'On te donne moins que ton âge',
  'Tu te sens moins imposante',
  'Tu regardes la taille des autres',
  'Voir tes potes grandir',
  'Ne pas savoir si tu as fini',
  'On te prend moins au sérieux',
  'Plus d’anxiété dans les groupes',
]

export function EcranVeriteBrutale({ sexe }) {
  const lignes = sexe === 'F' ? VERITE_FILLE : VERITE_GARCON
  return (
    <div className="funnel-verite">
      <ul className="verite-liste">
        {lignes.map((ligne) => (
          <li key={ligne} className="verite-ligne">
            <span className="verite-signe" aria-hidden="true">
              !
            </span>
            {ligne}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Écran 34. Le script attribuait à Takahashi (1968), Silventoinen (2003)
 * et Khamis & Roche (1994) des chiffres qu'aucun des trois n'a publiés
 * (« 75 % de la croissance en puberté » n'est pas l'objet de l'étude de
 * Takahashi sur le sommeil ; « jusqu'à 5 cm de gains mesurables » n'est
 * pas une conclusion de Silventoinen ; « NIH Journal » n'existe pas comme
 * revue). Attribuer une affirmation à un chercheur qui ne l'a pas
 * formulée est une fausse citation, pas une reformulation. Le composant
 * `EtudesPubliees` du dépôt cite déjà ces trois mêmes sources pour ce
 * qu'elles ont réellement établi : on le reprend tel quel plutôt que de
 * republier les citations inventées.
 */
export function EcranEtudesPubliees() {
  return <EtudesPubliees />
}

/**
 * Écran 35. Mêmes trois prénoms (Adam, Lucas, Nolan) que dans le script,
 * mais avec les centimètres réellement fournis par le client et déjà
 * publiés dans `avis.jsx` — le script en proposait d'autres (+2.3 cm,
 * +2.1 cm, +1.9 cm) qu'aucun client n'a mesurés. Un témoignage avec un
 * chiffre inventé n'est plus un témoignage.
 */
export function EcranAvisUtilisateurs() {
  return <Avis />
}

export function EcranPlusQueGenes({ onContinue }) {
  // Démarre à 0 et se remplit après le montage : le script demande une
  // « Animation "génétique vs environnement" », pas une figure figée. La
  // transition CSS est sur `width` (cf. .onb-genes-remplissage) ; ce
  // composant ne fait que retarder le passage de 0 % à la valeur finale
  // d'une frame, pour que le navigateur ait quelque chose à animer.
  const [rempli, setRempli] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setRempli(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="interstitial">
      <h1 className="interstitial-titre">Tu es plus que tes gènes</h1>
      <p className="interstitial-text">
        Tu n’as pas choisi ta génétique, mais tu peux choisir ce que tu fais.
      </p>
      {/* Une seule colonne de 100 % : les gènes en fond sombre, les
          habitudes en haut, en orange — la part sur laquelle on agit.
          Inspiré de la colonne « poussée de croissance » que le client a
          montrée, remise aux couleurs de Grandimi. */}
      <div
        className={`genes ${rempli ? 'is-rempli' : ''}`}
        role="img"
        aria-label="Environ 80 % de ta taille vient de ta génétique, 20 % de tes habitudes"
      >
        <div className="genes-axe" aria-hidden="true">
          <span className="genes-axe-100">100 %</span>
          <span className="genes-axe-80">80 %</span>
          <span className="genes-axe-0">0 %</span>
        </div>
        <div className="genes-colonne" aria-hidden="true">
          <div className="genes-bloc genes-bloc--habitudes">
            <ArrowUp size={18} />
            <ArrowUp size={22} />
            <ArrowUp size={18} />
          </div>
          <div className="genes-bloc genes-bloc--genetique">
            <Dna size={30} />
          </div>
        </div>
        <div className="genes-legendes" aria-hidden="true">
          <span className="genes-legende genes-legende--habitudes">
            <strong>20 %</strong> Tes habitudes
          </span>
          <span className="genes-legende genes-legende--genetique">
            <strong>80 %</strong> Ta génétique
          </span>
        </div>
      </div>
      <div className="interstitial-action is-ready">
        <button type="button" className="funnel-cta" onClick={onContinue}>
          Continuer
        </button>
      </div>
    </div>
  )
}



/* Deux écrans de Taller avant l'analyse (31/10/2026).

   La phrase seule, au centre, qui passe d'elle-même après quelques
   secondes (un toucher la fait passer tout de suite). */
const DUREE_CITATION_MS = 4200
const PAS_MOT_S = 0.09

/* Les mots arrivent un par un, flous puis nets, comme chez Taller. Rend
   aussi le délai total, pour caler ce qui vient après (le bouton). */
function MotsAnimes({ lignes }) {
  let i = 0
  return (
    <p className="citation-texte" aria-label={lignes.join(' ')}>
      {lignes.map((ligne) => (
        <span key={ligne} className="citation-ligne" aria-hidden="true">
          {ligne.split(' ').map((mot, j) => {
            const delai = 0.2 + (i++) * PAS_MOT_S
            return (
              <span key={j} className="citation-mot" style={{ animationDelay: `${delai}s` }}>
                {mot}{' '}
              </span>
            )
          })}
        </span>
      ))}
    </p>
  )
}

export function EcranCitationGenetique({ onContinue }) {
  useEffect(() => {
    const id = setTimeout(onContinue, DUREE_CITATION_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <button type="button" className="interstitial citation" onClick={onContinue}>
      <span className="citation-halo" aria-hidden="true" />
      <MotsAnimes lignes={['Tu n’as pas choisi ta génétique.', 'Mais tu peux choisir ce que tu en fais.']} />
    </button>
  )
}

export function EcranDecouvrirPotentiel({ onContinue }) {
  return (
    <div className="interstitial citation">
      <span className="citation-halo" aria-hidden="true" />
      <MotsAnimes lignes={['Il est maintenant temps de découvrir ce que Grandimi dit sur ton potentiel de croissance.']} />
      <div className="interstitial-action is-ready citation-action">
        <button type="button" className="funnel-cta" onClick={onContinue}>
          Analyser mes réponses
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   ÉCRANS AJOUTÉS (questionnaire « comment grandir »)
   ============================================================ */




export function EcranBonneNouvelle({ age }) {
  const debut = 12
  const fin = 21
  const toi = Math.min(fin, Math.max(debut, Math.floor(age)))
  const pos = (an) => ((an - debut) / (fin - debut)) * 100
  const reste = Math.max(0, fin - toi)
  return (
    <div className="frise-age" aria-label={`Tu as ${toi} ans : jusqu'à ${reste} ans de croissance encore`}>
      <p className="frise-age-chiffre">jusqu’à {reste} ans</p>
      <p className="frise-age-label">de croissance encore</p>
      <div className="frise-age-piste" aria-hidden="true">
        <span className="frise-age-passe" style={{ width: pos(toi) + '%' }} />
        <span className="frise-age-reste" style={{ left: pos(toi) + '%', width: pos(fin) - pos(toi) + '%' }} />
        <span className="frise-age-toi" style={{ left: pos(toi) + '%' }}>
          <span className="frise-age-toi-label">Toi · {toi} ans</span>
        </span>
        {[12, 15, 18, 21].map((an) => (
          <span key={an} className="frise-age-graduation" style={{ left: pos(an) + '%' }}>{an}</span>
        ))}
      </div>
    </div>
  )
}

const LIBELLES_COUCHER = { 'avant-22h': 'Avant 22 h', '22h-23h': '22 h - 23 h', '23h-minuit': '23 h - minuit', 'apres-minuit': 'Après minuit' }

export function EcranProfilCroissance({ reponses }) {
  const lignes = [
    ['Âge', `${Math.floor(reponses.age)} ans`],
    ['Taille actuelle', `${reponses.taille} cm`],
    ...(reponses.tailleIdeale != null ? [['Objectif', `${reponses.tailleIdeale} cm`]] : []),
    ['Sommeil', `${reponses.sommeil} h par nuit${reponses.coucher ? ' · ' + LIBELLES_COUCHER[reponses.coucher] : ''}`],
    ['Sport', reponses.exerciceFreq ? `${reponses.exerciceFreq} h par semaine` : '—'],
  ]
  return (
    <ul className="ecran-profil">
      {lignes.map(([label, valeur]) => (
        <li key={label} className="ecran-profil-ligne">
          <span className="ecran-profil-label">{label}</span>
          <span className="ecran-profil-valeur">{valeur}</span>
        </li>
      ))}
    </ul>
  )
}

/** Ligne de verdict sous la date de naissance, comme heightfuel. */
export function verdictAge(age, sexe) {
  if (age == null) return null
  if (age < 16) return 'Ta croissance bat son plein : ton potentiel est au maximum'
  if (age < 19) return sexe === 'F'
    ? 'La dernière ligne droite : chaque centimètre compte'
    : 'Beaucoup pensent avoir fini, mais c’est souvent la dernière ligne droite'
  return sexe === 'F'
    ? 'Ta posture peut encore te faire paraître plus grande'
    : 'Chez les garçons, ça peut encore bouger. Et ta posture se travaille'
}

