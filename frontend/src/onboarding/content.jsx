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
import { SegmentedControl } from '@/components/ui/segmented-control'
import { WheelPicker } from '@/components/ui/wheel-picker'
import { BadgePrecision } from '@/components/ui/badge-precision'
import { ReseauNeurones } from '@/components/ui/reseau-neurones'
import { EtudesPubliees } from '@/components/ui/ecrans-fonctions'
import { Avis } from '@/components/ui/avis'
import { TailleFinaleChart } from '@/components/ui/taille-finale-chart'
import { JaugePotentiel } from '@/components/ui/jauge-potentiel'
import { Lecons, SuiviSemaines, TelephoneRoutine } from '@/components/ui/resultats-visuels'
import { ActionsDuJour } from '@/components/ui/actions-du-jour'
import {
  cmVersPouceTotal,
  euVersUs,
  formatTailleImperiale,
  kgVersLivres,
  livresVersKg,
  pouceTotalVersCm,
  usVersEu,
} from './payload'

/* ============================================================
   ORDRE DES 38 ÉCRANS
   ============================================================ */
export const ORDRE_ETAPES = [
  'profil',
  'sexe',
  'age',
  'taille',
  'poids',
  'pointure',
  // 'motivation' retiré à la demande du client : la réponse ne servait à rien.
  'sports',
  'exercice-freq',
  'sommeil',
  'pere',
  'mere',
  'proches',
  'pilosite-aisselles',
  'regles',
  'pilosite-visage',
  'vitesse-croissance',
  'epaules',
  'odeur',
  'acne',
  'muscles',
  'voix',
  'croissance-lente',
  'modele-prediction',
  'precision',
  'resultats-long-terme',
  'potentiel-gain',
  'optimiser-potentiel',
  'grandimi-aide',
  'height-tracker',
  'exercices-quotidiens',
  'programme-optimal',
  'guide-grandir',
  'verite-brutale',
  'etudes-publiees',
  'avis-utilisateurs',
  'taille-ideale',
  'plus-que-genes',
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
  'plus-que-genes': 'interstitielle',
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
    titre: 'Tu es un garçon ou une fille ?',
    sousTitre: "Le sexe influence ta taille à l’âge adulte",
  },
  age: {
    titre: 'Quand es-tu né(e) ?',
    sousTitre: 'Ton âge nous aide à prédire quand tu vas grandir',
  },
  taille: {
    titre: 'Quelle est ta taille ?',
    sousTitre: 'Fais glisser pour choisir ta taille actuelle',
  },
  poids: {
    titre: 'Quel est ton poids ?',
    sousTitre: 'Fais glisser pour choisir ton poids actuel',
  },
  pointure: {
    titre: 'Quelle est ta pointure ?',
    sousTitre: 'La taille des pieds montre où tu en es dans ta croissance',
  },
  sports: {
    titre: 'Quels sports pratiques-tu ?',
    sousTitre: 'Le sport peut aider ton corps à grandir',
  },
  'exercice-freq': {
    titre: "Combien d'heures d'exercice par semaine ?",
    sousTitre: "L'exercice influence l'hormone de croissance et la récupération",
  },
  sommeil: {
    titre: 'Combien d’heures dors-tu par nuit ?',
    sousTitre: 'Bien dormir aide à grandir et à récupérer',
  },
  pere: {
    titre: 'Combien mesure ton père ?',
    sousTitre: 'La taille des parents influence beaucoup ta taille',
  },
  mere: {
    titre: 'Combien mesure ta mère ?',
    sousTitre: 'La taille des parents influence beaucoup ta taille',
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
    sousTitre: 'Ta croissance l’année dernière montre le rythme de la puberté',
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
    titre: 'Quelle est ta taille idéale ?',
    sousTitre: 'Choisis la taille que tu veux atteindre',
  },
  'resultats-la': {
    titre: 'Il est maintenant temps de découvrir',
    sousTitre: 'Ce que Grandimi dit sur ton potentiel de croissance',
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
export const CHAPITRES = ['Toi', 'Ta famille', 'Ta puberté', 'Ton plan']
const CHAPITRE_DE = {
  profil: 0, sexe: 0, age: 0, taille: 0, poids: 0, pointure: 0,
  motivation: 0, sports: 0, 'exercice-freq': 0, sommeil: 0,
  pere: 1, mere: 1, proches: 1,
  regles: 2, 'pilosite-aisselles': 2, 'pilosite-visage': 2,
  'vitesse-croissance': 2, epaules: 2, odeur: 2, acne: 2, muscles: 2,
  voix: 2, 'croissance-lente': 2,
}

export function chapitreDe(etape) {
  return CHAPITRE_DE[etape] ?? 3
}

export function etapesPour(reponses) {
  const fille = reponses?.sexe === 'F'
  return ORDRE_ETAPES.filter((etape) => {
    if (fille && ETAPES_GARCON.has(etape)) return false
    if (etape === 'regles') return fille && reponses.age >= 15
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
  { valeur: 'ne-sais-pas', label: 'Je ne sais pas' },
]

export const OPTIONS_CROISSANCE_LENTE = [
  { valeur: "pas-grandi", label: "N'ai pas grandi" },
  { valeur: "plus-lentement", label: "Plus lentement" },
  { valeur: "meme-rythme", label: "Même rythme" },
  { valeur: "plus-vite", label: "Plus vite" },
  { valeur: "ne-sais-pas", label: "Je ne sais pas" },
]

export const OPTIONS_VITESSE_CROISSANCE = [
  { valeur: "moins-2cm", label: "< 2 cm" },
  { valeur: "2-5cm", label: "2-5 cm" },
  { valeur: "6-9cm", label: "6-9 cm" },
  { valeur: "plus-10cm", label: "10+ cm" },
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
 * Molette de mesure avec bascule d'unité. La valeur stockée reste
 * toujours métrique (cm ou kg) ; seule la molette affichée change de
 * borne et de format selon l'unité choisie — jamais la donnée persistée.
 */
export function MoletteTailleCm({ valeurCm, onChange, unite, onChangeUnite, min = 120, max = 220 }) {
  return (
    <div className="onb-mesure">
      <SegmentedControl
        label="Unité"
        value={unite}
        onChange={onChangeUnite}
        options={[
          { value: 'cm', label: 'cm' },
          { value: 'ft', label: 'ft/in' },
        ]}
      />
      {unite === 'cm' ? (
        <WheelPicker
          label="Taille en centimètres"
          value={valeurCm}
          onChange={onChange}
          min={min}
          max={max}
          step={0.5}
          // Au demi-centimètre : « 172,30 cm » demandait une précision que
          // personne n'a sous la toise et faisait hésiter.
          format={(v) => `${v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')} cm`}
        />
      ) : (
        <WheelPicker
          label="Taille en pieds et pouces"
          value={cmVersPouceTotal(valeurCm)}
          onChange={(pouceTotal) => onChange(pouceTotalVersCm(pouceTotal))}
          min={Math.round(min / 2.54)}
          max={Math.round(max / 2.54)}
          step={1}
          format={(v) => formatTailleImperiale(v)}
        />
      )}
    </div>
  )
}

export function MoletteTailleAvecInconnu({ valeurCm, onChange, onInconnu, unite, onChangeUnite, min, max, inconnuDefaut }) {
  const [aChoisi, setAChoisi] = useState(false)
  const inconnu = valeurCm == null && aChoisi
  return (
    <div className="onb-mesure">
      <MoletteTailleCm
        valeurCm={valeurCm ?? inconnuDefaut}
        onChange={onChange}
        unite={unite}
        onChangeUnite={onChangeUnite}
        min={min}
        max={max}
      />
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

export function MolettePoidsKg({ valeurKg, onChange, unite, onChangeUnite }) {
  return (
    <div className="onb-mesure">
      <SegmentedControl
        label="Unité"
        value={unite}
        onChange={onChangeUnite}
        options={[
          { value: 'kg', label: 'kg' },
          { value: 'lbs', label: 'lbs' },
        ]}
      />
      {unite === 'kg' ? (
        <WheelPicker
          label="Poids en kilogrammes"
          value={valeurKg}
          onChange={onChange}
          min={30}
          max={150}
          step={0.5}
          format={(v) => `${v.toFixed(1).replace('.', ',')} kg`}
        />
      ) : (
        <WheelPicker
          label="Poids en livres"
          value={kgVersLivres(valeurKg)}
          onChange={(lbs) => onChange(livresVersKg(lbs))}
          min={66}
          max={330}
          step={1}
          format={(v) => `${Math.round(v)} lbs`}
        />
      )}
    </div>
  )
}

export function MolettePointure({ valeurEu, onChange, onInconnu, unite, onChangeUnite }) {
  const [aChoisi, setAChoisi] = useState(false)
  const inconnu = valeurEu == null && aChoisi
  return (
    <div className="onb-mesure">
      <SegmentedControl
        label="Unité"
        value={unite}
        onChange={onChangeUnite}
        options={[
          { value: 'eu', label: 'EU' },
          { value: 'us', label: 'US' },
        ]}
      />
      {unite === 'eu' ? (
        <WheelPicker
          label="Pointure européenne"
          value={valeurEu ?? 40}
          onChange={onChange}
          min={30}
          max={50}
          step={1}
          format={(v) => `Pointure ${v} (EU)`}
        />
      ) : (
        <WheelPicker
          label="Pointure américaine"
          value={euVersUs(valeurEu ?? 40)}
          onChange={(us) => onChange(usVersEu(us))}
          min={0.5}
          max={16}
          step={0.5}
          format={(v) => `Size ${v} (US)`}
        />
      )}
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

export function MoletteSommeil({ valeur, onChange }) {
  return (
    <WheelPicker
      label="Heures de sommeil par nuit"
      value={valeur}
      onChange={onChange}
      min={4}
      max={12}
      step={0.5}
      format={(v) => `${v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')} heures par nuit`}
    />
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
        min={anneeCourante - 25}
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

