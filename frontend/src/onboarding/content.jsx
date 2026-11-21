import { useEffect, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Circle,
  CircleDot,
  Dumbbell,
  Footprints,
  Gauge,
  HeartPulse,
  ListChecks,
  Lock,
  Moon,
  PersonStanding,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trophy,
  Smile,
  TrendingUp,
  Utensils,
  Volleyball,
  Waves,
  Zap,
} from 'lucide-react'

import { ChoiceCard } from '@/components/ui/choice-card'
import { WheelPicker } from '@/components/ui/wheel-picker'
import { BadgePrecision } from '@/components/ui/badge-precision'
import { ReseauNeurones } from '@/components/ui/reseau-neurones'
import { EtudesPubliees } from '@/components/ui/ecrans-fonctions'
import { Avis } from '@/components/ui/avis'
import { AVIS } from '@/lib/avis-clients'
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
  // « Qui es-tu ? » (Ado / Parent) de GoTall, remis le 20/11/2026 à la
  // demande de Samuel. Après le sexe et pas avant : le sexe est souvent
  // choisi dès l'accueil, et le parcours reprend juste après lui.
  'profil',
  'age',
  'bonne-nouvelle',
  // « Quelle est ton origine ? » de Taller, ajouté le 20/11/2026 (Samuel).
  'origine',
  'taille-poids',
  // Famille
  'parents',
  // GoTall, remis le 20/11/2026.
  'proches',
  'pointure',
  // Courbe « Votre taille finale », comme Taller après la pointure (31/10/2026).
  'resultats-long-terme',
  // Puberté : l'ordre de Taller (31/10/2026), des questions qui servent à
  // la prédiction. L'acné est demandée comme chez Taller, même si le calcul
  // ne s'en sert pas.
  'vitesse-croissance',
  'regles',
  'voix',
  // « Tu grandis plus lentement ? » (GoTall) : ajouté puis retiré le 21/11/2026,
  // Samuel n'en veut pas. Le code de l'écran reste.
  'pilosite-visage',
  'pilosite-aisselles',
  // Épaules, odeur, muscles : ordre de GoTall (épaules, odeur, acné,
  // muscles), remis le 20/11/2026.
  'epaules',
  'odeur',
  'acne',
  'muscles',
  // Habitudes ; « Quels sports ? » de GoTall remis le 20/11/2026.
  'sports',
  'exercice-freq',
  'sommeil',
  // Objectif, puis les écrans qui préparent le plan. Les questions
  // d'habitudes (coucher, téléphone, sports, assis, posture, protéines,
  // laitages) et « Ton profil de croissance » sont retirées du parcours le
  // 31/10/2026 ; leurs écrans restent dans le code.
  'taille-ideale',
  'pourquoi',
  'precision',
  // Preuves façon GoTall (« Avis d'experts », « Résultats réels »), 20/11/2026.
  'preuve-science',
  'preuve-avis',
  // Slides douleurs → bénéfices → 80/20 (format Menu IQ / Quittr), 21/11/2026.
  // Remplacent « Le coût d'être petit » et « Tu perds peut-être déjà des
  // centimètres » (à la demande de Samuel ; leur code reste).
  'douleurs',
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
  origine: 'question',
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
  'preuve-science': 'affichage',
  'preuve-avis': 'affichage',
  'resultats-long-terme': 'affichage',
  'potentiel-gain': 'affichage',
  'optimiser-potentiel': 'affichage',
  'grandimi-aide': 'affichage',
  'exercices-quotidiens': 'affichage',
  'programme-optimal': 'affichage',
  'guide-grandir': 'affichage',
  'height-tracker': 'affichage',
  'verite-brutale': 'affichage',
  douleurs: 'affichage',
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
  'plus-que-genes': 'affichage',
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
    sousTitre: 'Cela nous aide à adapter ton parcours d’onboarding.',
  },
  // Titre et réponses de Taller. Leur sous-titre (« Ceci sera utilisé pour
  // prédire ton potentiel… ») serait faux chez nous : le calcul ne s'en
  // sert pas. La réponse est enregistrée avec les autres (choix de Samuel,
  // 20/11/2026, prévenu que c'est une donnée sensible).
  origine: {
    titre: 'Quelle est ton origine ?',
    sousTitre: 'Tu peux aussi choisir de ne pas répondre.',
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
    sousTitre: 'Le sport peut aider ton corps à grandir.',
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
    sousTitre: 'La taille de ta famille nous renseigne sur tes gènes.',
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
    sousTitre: 'L’élargissement des épaules peut indiquer la phase milieu de poussée.',
  },
  odeur: {
    titre: 'As-tu remarqué plus d’odeur corporelle ?',
    sousTitre: 'Les changements d’odeur corporelle commencent souvent autour de la poussée de croissance.',
  },
  acne: {
    titre: 'As-tu de l’acné ?',
    sousTitre: 'Les boutons peuvent augmenter quand les hormones de la puberté arrivent',
  },
  muscles: {
    titre: 'Tes muscles sont-ils plus dessinés ?',
    sousTitre: 'Les changements musculaires peuvent indiquer que la poussée commence.',
  },
  voix: {
    titre: 'Ta voix a-t-elle complètement mué ?',
    sousTitre: 'Le changement de voix est un signe tardif que la puberté avance',
  },
  'croissance-lente': {
    titre: 'Tu grandis encore, mais plus lentement que l’an dernier ?',
    sousTitre: 'Une croissance plus lente peut signifier que ta poussée se termine.',
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
  // Comme « Avis d'experts » de GoTall : un titre seul, pas de sous-titre.
  'preuve-science': {
    titre: 'Avis d’experts',
  },
  // Sous-titre retiré à la demande de Samuel (20/11), comme GoTall.
  'preuve-avis': {
    titre: 'Résultats réels',
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
  // Titre de Taller, au même endroit (01/11/2026).
  'plus-que-genes': {
    titre: 'Tu perds peut-être déjà des centimètres',
  },
  // Comme GoTall : le titre seul, sans sous-titre (21/11/2026).
  'verite-brutale': {
    titre: 'Le coût d’être petit',
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
  origine: { titre: 'Quelle est l’origine de votre enfant ?', sousTitre: 'Vous pouvez aussi choisir de ne pas répondre.' },
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

// Les sports de GoTall, dans leur ordre, avec une icône comme chez eux.
export const OPTIONS_SPORTS = [
  { valeur: 'basket', label: 'Basket', icon: <Trophy size={20} aria-hidden="true" /> },
  { valeur: 'muscu', label: 'Musculation', icon: <Dumbbell size={20} aria-hidden="true" /> },
  { valeur: 'course', label: 'Course', icon: <Footprints size={20} aria-hidden="true" /> },
  { valeur: 'natation', label: 'Natation', icon: <Waves size={20} aria-hidden="true" /> },
  { valeur: 'volley', label: 'Volley', icon: <Volleyball size={20} aria-hidden="true" /> },
  { valeur: 'foot', label: 'Football', icon: <Volleyball size={20} aria-hidden="true" /> },
  { valeur: 'autre', label: 'Autre', icon: <PersonStanding size={20} aria-hidden="true" /> },
]

// Réponses de Taller, mot pour mot.
export const OPTIONS_ORIGINE = [
  { valeur: 'blanc', label: 'Blanc / Caucasien' },
  { valeur: 'noir', label: 'Noir / Afro-américain' },
  { valeur: 'hispanique', label: 'Hispanique / Latino' },
  { valeur: 'asiatique', label: 'Asiatique' },
  { valeur: 'moyen-orient', label: 'Moyen-Orient / Indigène' },
  { valeur: 'sans-reponse', label: 'Je ne veux pas répondre' },
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

// Réponses de GoTall, mot pour mot.
export const OPTIONS_PROCHES = [
  { valeur: 'frere', label: 'Mon frère est plus grand que mon père' },
  { valeur: 'cousin', label: 'Mon cousin est plus grand que mon père' },
  { valeur: 'grands-parents', label: 'Mes grands-parents sont plus grands que mon père' },
  { valeur: 'autre', label: 'D’autres proches sont plus grands que mon père' },
  { valeur: 'non', label: 'Aucun' },
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
  sexe: 0, profil: 0, age: 0, 'bonne-nouvelle': 0, origine: 0, 'taille-poids': 0,
  parents: 1, proches: 1, pointure: 1, 'resultats-long-terme': 1, genetique: 1,
  'vitesse-croissance': 2, regles: 2, voix: 2, 'croissance-lente': 2, 'pilosite-visage': 2, 'pilosite-aisselles': 2,
  epaules: 2, odeur: 2, acne: 2, muscles: 2,
  sports: 3, 'exercice-freq': 3, sommeil: 3,
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
  { valeur: 'un-peu', label: 'Oui, un peu' },
  { valeur: 'clairement', label: 'Oui, clairement' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_ODEUR = [
  { valeur: 'non', label: 'Non' },
  { valeur: 'un-peu', label: 'Un peu' },
  { valeur: 'beaucoup', label: 'Beaucoup plus' },
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

// Libellés et pouces de GoTall.
export const OPTIONS_MUSCLES = [
  { valeur: 'non', label: 'Non', icon: <ThumbsDown size={20} aria-hidden="true" /> },
  { valeur: 'un-peu', label: 'Un peu', icon: <ThumbsUp size={20} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }} /> },
  { valeur: 'beaucoup', label: 'Beaucoup plus dessinés', icon: <ThumbsUp size={20} aria-hidden="true" /> },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_VOIX = [
  { valeur: 'non', label: 'Pas de changement' },
  { valeur: 'un-peu', label: 'Un peu plus grave' },
  { valeur: 'complet', label: 'Complètement plus grave' },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas', hint: 'Pas grave, on s’en sert pour affiner' },
]

// Réponses et icônes de GoTall, mot pour mot (21/11/2026).
export const OPTIONS_CROISSANCE_LENTE = [
  { valeur: 'pas-grandi', label: 'Je n’ai pas grandi', icon: <CircleDot size={20} aria-hidden="true" /> },
  { valeur: 'plus-lentement', label: 'Je grandis plus lentement', icon: <Timer size={20} aria-hidden="true" /> },
  { valeur: 'meme-rythme', label: 'Je grandis au même rythme', icon: <Gauge size={20} aria-hidden="true" /> },
  { valeur: 'plus-vite', label: 'Je grandis plus vite', icon: <Footprints size={20} aria-hidden="true" /> },
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
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
          icon={option.icon}
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

/* ---------- Preuves façon GoTall (20/11/2026) ----------
   « Avis d'experts » de GoTall, au plus près (demande de Samuel) : même
   titre, 3 cartes, une vignette blanche « logo » à gauche, la phrase entre
   guillemets, la référence en gris dessous, rien d'autre.
   Même structure que GoTall (données de croissance / sommeil / habitudes)
   mais avec de vraies études : leur citation « Stanford » est introuvable.
   Vignettes : vrais logos comme GoTall (choix de Samuel le 20/11, prévenu que
   l'OMS n'autorise pas son emblème sans accord écrit). Fichiers dans
   public/logos-science, pris sur Wikimedia Commons ; pour Twin Research,
   le blason de Cambridge University Press, qui publie la revue. Grandimi compare bien la
   croissance aux tables OMS (cf. texte de l'écran « modele-prediction »). */
const PREUVES_SCIENCE = [
  {
    sigle: 'OMS',
    logo: '/logos-science/oms.svg',
    affirmation: true, // comme la carte CDC de GoTall : sans guillemets
    couleur: '#0a7fc2',
    texte: 'Ta croissance est comparée aux courbes de croissance de l’OMS.',
    source: 'Organisation mondiale de la Santé. (2007). Courbes de croissance de l’OMS, 5 à 19 ans.',
  },
  {
    sigle: 'JCI',
    logo: '/logos-science/jci.png',
    plein: true,
    couleur: '#8a1c2b',
    texte: 'C’est pendant ton sommeil profond que ton corps libère le plus d’hormone de croissance.',
    source: 'Journal of Clinical Investigation (1968) — “Growth hormone secretion during sleep”, Takahashi et al.',
  },
  {
    sigle: 'TWIN',
    sousSigle: 'RESEARCH',
    logo: '/logos-science/cambridge.jpg',
    couleur: '#1f6b4f',
    texte: 'Ta génétique fixe l’essentiel de ta taille. Le reste dépend de ton mode de vie.',
    source: 'Twin Research (2003) — “Heritability of adult body height”, Silventoinen et al.',
  },
]

export function EcranPreuveScience() {
  return (
    <div className="preuve preuve--experts">
      <ul className="preuve-liste">
        {PREUVES_SCIENCE.map(({ sigle, sousSigle, logo, plein, affirmation, couleur, texte, source }) => (
          <li key={sigle} className="preuve-carte">
            <span className={'preuve-logo' + (plein ? ' preuve-logo--plein' : '')} style={{ '--c': couleur }} aria-hidden="true">
              {logo ? (
                <img src={logo} alt="" width="56" height="56" decoding="async" />
              ) : (
                <>
                  <strong>{sigle}</strong>
                  {sousSigle && <small>{sousSigle}</small>}
                </>
              )}
            </span>
            <div className="preuve-corps">
              <p className="preuve-texte">{affirmation ? texte : `“${texte}”`}</p>
              <p className="preuve-source">{source}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* Laurier gris dessiné à la main (pas d'image), façon GoTall : deux
   branches en arc, des feuilles pointues par paires (une dehors, une
   dedans), ouvert en haut. Calculé une fois au chargement. */
const FEUILLES_LAURIER = (() => {
  const cx = 60, cy = 42, rx = 49, ry = 35
  const out = []
  const pas = 7
  for (let k = 0; k < pas; k++) {
    const a = ((112 + k * 21) * Math.PI) / 180
    const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a)
    let tx = -rx * Math.sin(a), ty = ry * Math.cos(a)
    const lt = Math.hypot(tx, ty); tx /= lt; ty /= lt
    let nx = (x - cx) / rx, ny = (y - cy) / ry
    const ln = Math.hypot(nx, ny); nx /= ln; ny /= ln
    const echelle = 1 - k * 0.045
    const feuille = (m, taille) => {
      const dx = tx + m * nx, dy = ty + m * ny
      return { x, y, rot: (Math.atan2(dx, -dy) * 180) / Math.PI, taille: taille * echelle }
    }
    out.push(feuille(0.95, 1))
    if (k < pas - 1) out.push(feuille(-0.5, 0.72))
  }
  const fin = out[out.length - 1]
  return { feuilles: out, tige: `M ${(cx + rx * Math.cos((104 * Math.PI) / 180)).toFixed(1)} ${(cy + ry * Math.sin((104 * Math.PI) / 180)).toFixed(1)} A ${rx} ${ry} 0 0 1 ${fin.x.toFixed(1)} ${fin.y.toFixed(1)}` }
})()

function Laurier() {
  const branche = (miroir) => (
    <g transform={miroir ? 'translate(120 0) scale(-1 1)' : undefined}>
      <path d={FEUILLES_LAURIER.tige} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {FEUILLES_LAURIER.feuilles.map(({ x, y, rot, taille }, i) => (
        <path
          key={i}
          d="M0 0 C 4.6 -3.5 4.6 -9.5 0 -14 C -4.6 -9.5 -4.6 -3.5 0 0 Z"
          fill="currentColor"
          transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${taille.toFixed(2)})`}
        />
      ))}
    </g>
  )
  return (
    <svg className="preuve-laurier-svg" viewBox="0 0 120 84" aria-hidden="true">
      {branche(false)}
      {branche(true)}
    </svg>
  )
}

export function EcranPreuveAvis() {
  return (
    <div className="preuve preuve--temoignages">
      {/* Carte à 2 colonnes comme GoTall. À gauche, chiffre vrai (11 857
          comptes le 20/11/2026), le même que sur le paywall. À droite, à la
          place de leur laurier « 5 stars » (on n'a aucune note) : « 98 % précision ».
          Sans la marge en cm : demande de Samuel (20/11). */}
      <div className="preuve-stats preuve-stats--2">
        <div className="preuve-stats-col">
          <strong>11 000+</strong>
          <span>jeunes analysés</span>
        </div>
        <span className="preuve-stats-trait" aria-hidden="true" />
        <div className="preuve-laurier">
          <Laurier />
          <div className="preuve-laurier-texte">
            <strong>98 %</strong>
            <small>précision</small>
          </div>
        </div>
      </div>
      <ul className="preuve-liste">
        {AVIS.map(({ prenom, age, cm, texte }) => (
          <li key={prenom} className="preuve-carte preuve-avis">
            <div className="preuve-avis-tete">
              <span className="preuve-avatar" aria-hidden="true">{prenom.charAt(0)}</span>
              <div>
                <strong>{prenom}</strong>
                <span>{age} ans</span>
              </div>
              {cm && <span className="preuve-cm">{cm}</span>}
            </div>
            <p className="preuve-texte preuve-texte--avis">“{texte}”</p>
          </li>
        ))}
      </ul>
    </div>
  )
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
/* 21/11/2026 : Samuel veut les 6 lignes de GoTall mot pour mot, chiffres
   compris (prévenu que ces chiffres ne sont pas vérifiables et que les
   applis de rencontre sont interdites aux mineurs ; il a choisi). Seul
   changement : 5'9" écrit 1m75. */
const VERITE_GARCON = [
  '40 % de matchs en moins sur les applis de rencontre',
  'Ignoré dans les moments importants',
  'Moins pris au sérieux par les autres',
  '59 % moins de chances d’être CEO en dessous de 1m75',
  'Chaque pouce coûte 600 $/an',
  'Plus d’anxiété sociale',
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

/* « Tu perds peut-être déjà des centimètres », copié de l'écran de Taller
   (01/11/2026) : deux colonnes dans une carte, « Mode de vie » 20 % et
   « Impact génétique » 80 % en couleur, une phrase dans la carte, une
   phrase dessous. Leur « Jusqu'à 20 % de ta taille finale est déterminée
   par tes habitudes » est faux (20 % de 175 cm, ce serait 35 cm) : les
   80/20 sont la part des DIFFÉRENCES de taille entre les gens. */
const PARTS_TAILLE = [
  { nom: 'Mode de vie', part: 20 },
  { nom: 'Impact génétique', part: 80, forte: true },
]

export function EcranPlusQueGenes() {
  // Les colonnes partent de 0 et montent une frame après le montage, pour
  // que le navigateur ait quelque chose à animer.
  const [rempli, setRempli] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setRempli(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="ppc">
      <div
        className={`ppc-carte ${rempli ? 'is-rempli' : ''}`}
        role="img"
        aria-label="Environ 20 % des différences de taille viennent du mode de vie, 80 % de la génétique"
      >
        <div className="ppc-colonnes" aria-hidden="true">
          {PARTS_TAILLE.map(({ nom, part, forte }) => (
            <div key={nom} className={`ppc-colonne ${forte ? 'ppc-colonne--forte' : ''}`}>
              <span className="ppc-nom">{nom}</span>
              <span className="ppc-remplissage" style={{ '--part': part / 100 }}>
                <span className="ppc-part">{part}%</span>
              </span>
            </div>
          ))}
        </div>
        <p className="ppc-texte">
          Grandimi t’aide à maximiser ton potentiel de taille en combinant génétique et bonnes habitudes.
        </p>
      </div>
      <p className="ppc-phrase">
        Jusqu’à <em>20 %</em> des différences de taille viennent des habitudes.
      </p>
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

/* ---------- Juste avant le prix, façon Quittr (20/11/2026) ----------
   « Prénom, on t'a fait un plan sur mesure » avec la date de fin du
   programme, puis « Maintenant, il est temps d'investir en toi » avec une
   carte Grandimi à son nom. Le prénom est demandé avec l'e-mail ; s'il est
   vide, les phrases se lisent sans. */

// 16 niveaux × 7 jours : le vrai parcours de l'app.
export const DUREE_PROGRAMME_JOURS = 112

export function nettoyerPrenom(brut) {
  const p = String(brut || '').trim().replace(/\s+/g, ' ').slice(0, 20)
  return p ? p.charAt(0).toLocaleUpperCase('fr-FR') + p.slice(1) : ''
}

export function dateFinProgramme(debut = new Date()) {
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + DUREE_PROGRAMME_JOURS)
  return fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const PASTILLES_BENEFICES = [
  { label: 'Meilleur sommeil', Icone: Moon, couleur: '#6d8dff' },
  { label: 'Meilleure posture', Icone: PersonStanding, couleur: '#ff7a3d' },
  { label: 'Plus d’énergie', Icone: Zap, couleur: '#f5c542' },
  { label: 'Plus de confiance', Icone: Smile, couleur: '#ff6fa8' },
  { label: 'Mieux manger', Icone: Utensils, couleur: '#3fcf8e' },
]

export function EcranPlanSurMesure({ prenom, onContinue }) {
  return (
    <div className="interstitial citation sur-mesure">
      <span className="citation-halo" aria-hidden="true" />
      <div className="sur-mesure-corps">
        <span className="pret-badge" aria-hidden="true"><CheckCircle2 size={34} strokeWidth={2.4} /></span>
        <h1 className="sur-mesure-titre">
          {prenom ? `${prenom}, on t’a fait un plan sur mesure.` : 'On t’a fait un plan sur mesure.'}
        </h1>
        <p className="sur-mesure-label">Ton programme se termine le :</p>
        <p className="sur-mesure-date">{dateFinProgramme()}</p>
        <span className="sur-mesure-trait" aria-hidden="true" />
        <p className="sur-mesure-etoiles" role="img" aria-label="5 étoiles">
          <span aria-hidden="true">★★★★★</span>
        </p>
        <h2 className="sur-mesure-slogan">Deviens la meilleure version de toi avec Grandimi</h2>
        <p className="sur-mesure-sous">Plus droit. Plus en forme. Plus sûr de toi.</p>
        <ul className="sur-mesure-pastilles">
          {PASTILLES_BENEFICES.map(({ label, Icone, couleur }) => (
            <li key={label} style={{ '--c': couleur }}>
              <Icone size={14} strokeWidth={2.4} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <div className="citation-action sur-mesure-action">
        <button type="button" className="funnel-cta" onClick={onContinue}>
          Continuer
        </button>
      </div>
    </div>
  )
}

export function EcranInvestirEnToi({ prenom, onContinue }) {
  const debut = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  return (
    <div className="interstitial citation investir">
      <span className="citation-halo" aria-hidden="true" />
      <MotsAnimes lignes={['Maintenant, il est temps', 'd’investir en toi.']} />
      <div className="carte-membre" aria-label={`Carte Grandimi de ${prenom || 'toi'}, jour 0`}>
        <span className="carte-membre-reflet" aria-hidden="true" />
        <div className="carte-membre-haut">
          <img src="/favicon.svg" alt="" className="carte-membre-logo" />
          <TrendingUp size={22} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div className="carte-membre-jours">
          <small>Ta série</small>
          <strong>0 jour</strong>
        </div>
        <div className="carte-membre-bas">
          <div>
            <small>Nom</small>
            <b>{prenom || 'Toi'}</b>
          </div>
          <div>
            <small>Début</small>
            <b>{debut}</b>
          </div>
        </div>
      </div>
      <div className="citation-action investir-action">
        <button type="button" className="funnel-cta" onClick={onContinue}>
          Voir mon plan
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


/* ---------- Douleurs → bénéfices → 80/20 (21/11/2026) ----------
   Format des slides de Quittr / Menu IQ, à la demande de Samuel : écrans
   rouges « ce qui peut te freiner » (les mots de Taller), puis écrans blancs
   « les avantages d'être grand » en miroir, puis le 80/20. Textes validés
   par Samuel mot pour mot. Remplace dans le parcours « Le coût d'être
   petit » et « Tu perds peut-être déjà des centimètres » (leur code reste). */
const SLIDES_DOULEURS = [
  {
    ton: 'douleur',
    emoji: '💔',
    titre: ['Les femmes te négligent.', '40 % de matchs en moins.'],
    texte: 'Psychologiquement, les femmes préfèrent les hommes plus grands : ils les rassurent, elles se sentent en sécurité.',
  },
  {
    ton: 'douleur',
    emoji: '👻',
    titre: ['Invisible aux moments clés.', 'Plus d’anxiété sociale.'],
    texte: 'En groupe, on parle par-dessus toi. Tu te compares, tu doutes de toi.',
  },
  {
    ton: 'douleur',
    emoji: '💸',
    titre: ['Chaque cm coûte 600 $ par an.'],
    texte: 'Les plus grands inspirent davantage confiance : on les écoute plus, on leur confie plus de responsabilités.',
    bouton: 'Il y a une meilleure façon',
  },
  {
    ton: 'benefice',
    emoji: '💘',
    titre: ['Elles te remarquent.', 'Plus de matchs.'],
    texte: 'Une grande taille rassure : tu dégages de la sécurité et de l’assurance.',
  },
  {
    ton: 'benefice',
    emoji: '😎',
    titre: ['On te voit.', 'Tu es sûr de toi.'],
    texte: 'En groupe, tu prends ta place. Plus besoin de te comparer.',
  },
  {
    ton: 'benefice',
    emoji: '💰',
    titre: ['Plus de respect.', 'Plus d’opportunités.'],
    texte: 'On écoute les grands et on leur fait confiance, à l’école comme au travail.',
  },
  {
    ton: 'action',
    emoji: '🧬',
    titre: ['80 %, c’est tes gènes.', '20 %, c’est toi.'],
    texte: 'Ces 20 %, tu peux encore aller les chercher.',
  },
]

const SURTITRE_SLIDE = {
  douleur: 'Ce qui peut te freiner',
  benefice: 'Les avantages d’être grand',
  action: 'Maintenant, tu peux agir',
}

export function EcranDouleursBenefices({ onContinue, onRetour }) {
  const [i, setI] = useState(0)
  const slide = SLIDES_DOULEURS[i]
  const groupe = SLIDES_DOULEURS.filter((s) => s.ton === slide.ton)
  const rang = groupe.indexOf(slide)

  const suivant = () => {
    if (i < SLIDES_DOULEURS.length - 1) setI(i + 1)
    else onContinue()
  }
  const precedent = () => (i > 0 ? setI(i - 1) : onRetour())

  return (
    <div className={'dbs dbs--' + slide.ton}>
      <header className="dbs-tete">
        <button type="button" className="dbs-retour" onClick={precedent} aria-label="Retour">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="dbs-logo">Grandimi</span>
        <span aria-hidden="true" />
      </header>

      <main className="dbs-corps" key={i}>
        <p className="dbs-surtitre">{SURTITRE_SLIDE[slide.ton]}</p>
        <div className="dbs-visuel" aria-hidden="true">
          <span className="dbs-etincelle dbs-etincelle--1">✦</span>
          <span className="dbs-etincelle dbs-etincelle--2" />
          <span className="dbs-rond"><span className="dbs-emoji">{slide.emoji}</span></span>
        </div>
        <h1 className="dbs-titre">
          {slide.titre.map((ligne) => (
            <span key={ligne}>{ligne}</span>
          ))}
        </h1>
        <p className="dbs-texte">{slide.texte}</p>
        <p className="dbs-petit">Les petits choix deviennent des habitudes.</p>
      </main>

      <footer className="dbs-pied">
        {groupe.length > 1 && (
          <div className="dbs-points" aria-hidden="true">
            {groupe.map((s, k) => (
              <span key={k} className={k === rang ? 'is-actif' : ''} />
            ))}
          </div>
        )}
        <button type="button" className="dbs-bouton" onClick={suivant}>
          {slide.bouton || 'Continuer'}
        </button>
      </footer>
    </div>
  )
}
