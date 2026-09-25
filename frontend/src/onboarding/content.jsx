import { useEffect, useState } from 'react'
import { Dumbbell, Moon, Ruler, Utensils } from 'lucide-react'

import { ChoiceCard } from '@/components/ui/choice-card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { WheelPicker } from '@/components/ui/wheel-picker'
import { BadgePrecision } from '@/components/ui/badge-precision'
import { ReseauNeurones } from '@/components/ui/reseau-neurones'
import { EtudesPubliees } from '@/components/ui/ecrans-fonctions'
import { Avis } from '@/components/ui/avis'
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
  'motivation',
  'sexe',
  'age',
  'taille',
  'poids',
  'pointure',
  'sports',
  'exercice-freq',
  'sommeil',
  'pere',
  'mere',
  'proches',
  'puberty-pause',
  'pilosite-aisselles',
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
  'etudes-publiees',
  'vision-long-terme',
  'verite-brutale',
  'plus-que-genes',
  'grandimi-aide',
  'taille-ideale',
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
  'puberty-pause': 'interstitielle',
  'pilosite-aisselles': 'question',
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
  'etudes-publiees': 'affichage',
  'vision-long-terme': 'affichage',
  'verite-brutale': 'affichage',
  'plus-que-genes': 'interstitielle',
  'grandimi-aide': 'affichage',
  'taille-ideale': 'question',
  'resultats-la': 'interstitielle',
}

/* ============================================================
   TITRES / SOUS-TITRES — copie exacte du script
   ============================================================ */
export const TEXTES_ETAPE = {
  profil: {
    titre: 'Qui es-tu ?',
    sousTitre: "Cela nous aide à adapter ton parcours d'onboarding",
  },
  motivation: {
    titre: 'Pourquoi tu as téléchargé Grandimi ?',
    sousTitre: 'Tu peux choisir plusieurs',
  },
  sexe: {
    titre: 'Garçon ou une fille ?',
    sousTitre: "Le sexe influence ta taille à l'âge adulte",
  },
  age: {
    titre: 'Quand es-tu né ?',
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
    titre: "Combien d'heures dors-tu par nuit ?",
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
  'puberty-pause': {
    titre: 'Ta puberté compte',
    sousTitre: 'On va poser quelques questions pour voir si tu es passé par la puberté',
    message:
      "Environ 75 % de ta croissance totale se fait pendant la puberté, et seulement 25 % après",
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
    titre: "Combien as-tu grandi l'année dernière ?",
    sousTitre: "Ta croissance l'année dernière montre le rythme de la puberté",
  },
  epaules: {
    titre: 'Tes épaules se sont-elles élargies ?',
    sousTitre: "L'élargissement des épaules peut indiquer la phase milieu de puberté",
  },
  odeur: {
    titre: "As-tu remarqué plus d'odeur corporelle ?",
    sousTitre: "Les changements d'odeur corporelle commencent souvent autour de la puberté",
  },
  acne: {
    titre: "As-tu de l'acné ?",
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
    titre: "Tu grandis encore, mais plus lentement que l'an dernier ?",
    sousTitre: 'Une croissance plus lente peut signifier que ta puberté se termine',
  },
  'modele-prediction': {
    titre: 'Basé sur Khamis-Roche, reconnu mondialement',
    sousTitre:
      "L'équipe Grandimi combine la méthode scientifique Khamis-Roche avec le suivi OMS pour prédire ta taille définitive",
  },
  precision: {
    titre: 'Quelle est la précision de notre prédiction de taille ?',
    sousTitre:
      "On combine des mesures clés et des facteurs environnementaux pour estimer ton potentiel",
  },
  'etudes-publiees': {
    titre: 'Disent les études',
    sousTitre: 'Sources scientifiques',
  },
  'vision-long-terme': {
    titre: "Comment on peut t'aider",
    sousTitre: 'Tu verras tes progrès chaque mois',
  },
  'verite-brutale': {
    titre: "Le coût d'être petit",
    sousTitre: 'Pas des statistiques. Juste ce que tu vis déjà',
  },
  'grandimi-aide': {
    titre: "Grandimi t'aide avec trois choses",
    sousTitre: 'Plan quotidien, conseils sur le sommeil, nutrition et exercices, suivi de ta croissance',
  },
  'taille-ideale': {
    titre: 'Quelle est ta taille idéale ?',
    sousTitre: 'Choisis la taille que tu veux atteindre',
  },
  'plus-que-genes': {
    titre: 'Tu es plus que tes gènes',
    sousTitre:
      "Tes gènes posent la base, mais ton mode de vie décide du résultat. On prépare un programme juste pour toi",
  },
  'resultats-la': {
    titre: 'Tes résultats sont là !',
    sousTitre: 'Rentre ton email pour voir tes résultats complets et débloquer ton plan',
  },
}

/* ============================================================
   OPTIONS DES ÉCRANS À CHOIX
   ============================================================ */
export const OPTIONS_MOTIVATION = [
  { valeur: "taille-finale", label: 'Prédire ma taille finale' },
  { valeur: "nutrition", label: 'Nutrition scanner' },
  { valeur: "posture", label: 'Fix ma posture' },
  { valeur: "stretches", label: 'Stretches pour grandir' },
]

export const OPTIONS_SPORTS = [
  { valeur: "basket", label: 'Basket' },
  { valeur: "muscu", label: 'Musculation' },
  { valeur: "course", label: 'Course/Athlétisme' },
  { valeur: "natation", label: 'Natation' },
  { valeur: "foot", label: 'Football/Soccer' },
  { valeur: "autre", label: 'Autre' },
]

export const OPTIONS_EXERCICE_FREQ = [
  { valeur: "0-2", label: '0-2 heures' },
  { valeur: "3-5", label: '3-5 heures' },
  { valeur: "6+", label: '6+ heures' },
]

export const OPTIONS_PROCHES = [
  { valeur: "frere", label: 'Frère' },
  { valeur: "cousin", label: 'Cousin' },
  { valeur: "grand-pere", label: 'Grand-père' },
  { valeur: "grand-mere", label: 'Grand-mère' },
  { valeur: "autre", label: 'Autre' },
  { valeur: "non", label: 'Non' },
]

export const OPTIONS_PILOSITE_AISSELLES = [
  { valeur: "non", label: 'Non' },
  { valeur: "un-peu", label: 'Un peu' },
  { valeur: "oui", label: 'Oui' },
  { valeur: "ne-sais-pas", label: 'Je ne sais pas' },
]

export const OPTIONS_PILOSITE_VISAGE = [
  { valeur: "aucun", label: 'Aucun' },
  { valeur: "leger", label: 'Très léger' },
  { valeur: "rase-parfois", label: 'Je me rase parfois' },
  { valeur: "rase-souvent", label: 'Je me rase régulièrement' },
]

export const OPTIONS_EPAULES = [
  { valeur: "non", label: 'Non' },
  { valeur: "un-peu", label: 'Oui un peu' },
  { valeur: "clairement", label: 'Oui clairement' },
  { valeur: "ne-sais-pas", label: 'Je ne sais pas' },
]

export const OPTIONS_ODEUR = [
  { valeur: "non", label: 'Non' },
  { valeur: "un-peu", label: 'Un peu' },
  { valeur: "beaucoup", label: 'Beaucoup' },
  { valeur: "ne-sais-pas", label: 'Je ne sais pas' },
]

export const OPTIONS_ACNE = [
  { valeur: "aucune", label: 'Aucune' },
  { valeur: "rarement", label: 'Rarement' },
  { valeur: "reguliere", label: 'Régulière' },
  { valeur: "severe", label: 'Fréquente/Sévère' },
  { valeur: "disparu", label: 'Presque disparu' },
  { valeur: "ne-sais-pas", label: 'Je ne sais pas' },
]

export const OPTIONS_MUSCLES = [
  { valeur: "non", label: 'Non' },
  { valeur: "un-peu", label: 'Un peu' },
  { valeur: "beaucoup", label: 'Beaucoup' },
  { valeur: "ne-sais-pas", label: 'Je ne sais pas' },
]

export const OPTIONS_VOIX = [
  { valeur: "non", label: 'Pas de changement' },
  { valeur: "un-peu", label: 'Un peu plus grave' },
  { valeur: "complet", label: 'Complètement plus grave' },
  { valeur: "ne-sais-pas", label: 'Je ne sais pas' },
]

export const OPTIONS_CROISSANCE_LENTE = [
  { valeur: "pas-grandi", label: "N'ai pas grandi" },
  { valeur: "plus-lentement", label: 'Plus lentement' },
  { valeur: "meme-rythme", label: 'Même rythme' },
  { valeur: "plus-vite", label: 'Plus vite' },
  { valeur: "ne-sais-pas", label: 'Je ne sais pas' },
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
          { value: "cm", label: 'cm' },
          { value: "ft", label: 'ft/in' },
        ]}
      />
      {unite === 'cm' ? (
        <WheelPicker
          label="Taille en centimètres"
          value={valeurCm}
          onChange={onChange}
          min={min}
          max={max}
          step={0.1}
          // Format "X,XX cm" du script, deux décimales même quand le pas de
          // 0,1 ne produit qu'un seul chiffre significatif (ex. "172,30").
          format={(v) => `${v.toFixed(2).replace('.', ',')} cm`}
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

export function MoletteTailleAvecInconnu({ valeurCm, onChange, unite, onChangeUnite, min, max, inconnuDefaut }) {
  const inconnu = valeurCm == null
  return (
    <div className="onb-mesure">
      <MoletteTailleCm
        valeurCm={inconnu ? inconnuDefaut : valeurCm}
        onChange={onChange}
        unite={unite}
        onChangeUnite={onChangeUnite}
        min={min}
        max={max}
      />
      <button type="button" className="funnel-link onb-lien-inconnu" onClick={() => onChange(null)}>
        Je ne sais pas
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
          { value: "kg", label: 'kg' },
          { value: "lbs", label: 'lbs' },
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

export function MolettePointure({ valeurEu, onChange, unite, onChangeUnite }) {
  const inconnu = valeurEu == null
  return (
    <div className="onb-mesure">
      <SegmentedControl
        label="Unité"
        value={unite}
        onChange={onChangeUnite}
        options={[
          { value: "eu", label: 'EU' },
          { value: "us", label: 'US' },
        ]}
      />
      {unite === 'eu' ? (
        <WheelPicker
          label="Pointure européenne"
          value={inconnu ? 40 : valeurEu}
          onChange={onChange}
          min={30}
          max={50}
          step={1}
          format={(v) => `Pointure ${v} (EU)`}
        />
      ) : (
        <WheelPicker
          label="Pointure américaine"
          value={inconnu ? euVersUs(40) : euVersUs(valeurEu)}
          onChange={(us) => onChange(usVersEu(us))}
          min={0.5}
          max={16}
          step={0.5}
          format={(v) => `Size ${v} (US)`}
        />
      )}
      <button type="button" className="funnel-link onb-lien-inconnu" onClick={() => onChange(null)}>
        Je ne sais pas
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

export function MoletteVitesseCroissance({ valeur, onChange }) {
  const inconnu = valeur == null
  return (
    <div className="onb-mesure">
      <WheelPicker
        label="Croissance l'année dernière"
        value={inconnu ? 5 : valeur}
        onChange={onChange}
        min={0}
        max={25}
        step={0.5}
        format={(v) => `${v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')} cm l'année dernière`}
      />
      <button type="button" className="funnel-link onb-lien-inconnu" onClick={() => onChange(null)}>
        Je ne sais pas
      </button>
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

export function EcranPrecision() {
  return <BadgePrecision />
}

const AIDES_GRANDIMI = [
  { icone: Ruler, titre: "Estimation de taille", detail: 'Mise à jour chaque mois' },
  { icone: Dumbbell, titre: "Plan quotidien", detail: '11 actions pour grandir' },
  { icone: Moon, titre: "Conseils détaillés", detail: 'Sommeil, nutrition, exercice' },
]

export function EcranGrandimiAide() {
  return (
    <div className="onb-icones onb-icones-3">
      {AIDES_GRANDIMI.map(({ icone: Icone, titre, detail }) => (
        <div className="onb-icone" key={titre}>
          <Icone size={26} aria-hidden="true" />
          <strong>{titre}</strong>
          <span>{detail}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Écran 33. Les sept lignes « garçon » du script demandé comportaient un
 * montant inventé (« ~300$ par an ») et une allusion à la séduction
 * (« les femmes te négligent ») : deux choses que ce même fichier
 * `funnel.css` interdit explicitement à cet écran ailleurs dans le code
 * (« NI pourcentage NI montant NI allusion à la séduction — c'est la
 * différence entre une liste vérifiable et une liste qui vise l'estime
 * de soi d'un mineur »). Les sept idées sont conservées, reformulées sans
 * chiffre fabriqué ni ressort romantique. La liste « fille » n'avait rien
 * à corriger.
 */
const VERITE_GARCON = [
  "Moins de temps de jeu, plus souvent sur le banc",
  "Invisible aux moments clés",
  "Moins pris au sérieux",
  "On te traite encore comme le plus jeune du groupe",
  "Ça pèse sur la confiance, pas seulement sur le miroir",
  "Le premier regard te met déjà à part",
  "Plus d'anxiété sociale",
]

const VERITE_FILLE = [
  "On te donne moins que ton âge",
  "Tu te sens moins imposante",
  "Tu regardes la taille des autres",
  "Voir tes potes grandir",
  "Ne pas savoir si tu as fini",
  "On te prend moins au sérieux",
  "Plus d'anxiété dans les groupes",
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

const VISION_LEVIERS = [
  { icone: Moon, titre: "Mieux suivre", detail: 'Tes progrès, chaque mois' },
  { icone: Utensils, titre: "Mieux comprendre", detail: 'Ce qui influence ta taille' },
  { icone: Dumbbell, titre: "Mieux accompagner", detail: 'Chaque jour, tes prochains pas' },
]

export function EcranVisionLongTerme() {
  return (
    <div className="onb-icones onb-icones-3">
      {VISION_LEVIERS.map(({ icone: Icone, titre, detail }) => (
        <div className="onb-icone" key={titre}>
          <Icone size={26} aria-hidden="true" />
          <strong>{titre}</strong>
          <span>{detail}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Écran 14. Le script porte trois blocs de texte distincts (titre,
 * sous-titre, message) alors que le composant `Interstitial` partagé
 * n'en accepte que deux : on ne peut pas le réutiliser tel quel sans
 * perdre le message sur les 75 %/25 % de croissance pubertaire, qui est
 * le seul chiffre de tout cet écran. D'où ce petit rendu dédié, mêmes
 * classes visuelles que `Interstitial`.
 */
export function EcranPuberteIntro({ titre, sousTitre, message, onContinue }) {
  return (
    <div className="interstitial">
      <h1 className="interstitial-titre">{titre}</h1>
      <p className="interstitial-text">{sousTitre}</p>
      <p className="funnel-help">{message}</p>
      <div className="interstitial-action is-ready">
        <button type="button" className="funnel-cta" onClick={onContinue}>
          Continuer
        </button>
      </div>
    </div>
  )
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
        Tes gènes posent la base, mais ton mode de vie décide du résultat. On prépare un
        programme juste pour toi.
      </p>
      <div className="onb-genes-barres" role="img" aria-label="Génétique 70 %, environnement 30 %">
        <div className="onb-genes-barre">
          <div className="onb-genes-remplissage" style={{ width: rempli ? '70%' : '0%' }} />
          <span>Génétique 70 %</span>
        </div>
        <div className="onb-genes-barre">
          <div
            className="onb-genes-remplissage onb-genes-remplissage--accent"
            style={{ width: rempli ? '30%' : '0%' }}
          />
          <span>Environnement 30 %</span>
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

