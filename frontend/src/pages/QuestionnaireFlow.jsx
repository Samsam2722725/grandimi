import { useEffect, useMemo, useRef, useState } from 'react'

import { ChoiceCard } from '@/components/ui/choice-card'
import { FunnelButton, FunnelShell } from '@/components/ui/funnel-shell'
import { HandwritingText } from '@/components/ui/handwriting-text'
import { Interstitial } from '@/components/ui/interstitial'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { SpecialText } from '@/components/ui/special-text'
import { WheelPicker } from '@/components/ui/wheel-picker'

import Spinner from '../components/Spinner'
import '../styles/funnel.css'
import apiClient from '../lib/api'
import { mockPredictHeight } from '../lib/mock-api'
import {
  emailSaisi,
  estimationDemandee,
  estimationEchouee,
  estimationObtenue,
  tunnelAbandonne,
  tunnelEtapeVue,
} from '../lib/analytics'

/* ============================================================
   TUNNEL DE QUESTIONNAIRE — une décision par écran
   ============================================================
   L'ancienne version posait 5 pages de 2 à 3 champs. Sur mobile, chaque page
   ouvrait le clavier, cachait la moitié de l'écran, et demandait de viser des
   champs numériques les uns après les autres. C'est là que les gens partent.

   Ici : 14 écrans, mais un seul geste par écran, et presque aucune frappe au
   clavier. Le total de gestes baisse, la charge par écran s'effondre, et la
   barre de progression rend l'effort restant lisible en permanence.

   Trois choix méritent d'être justifiés :

   1. Les molettes sont pré-remplies sur une valeur plausible. Un picker vide
      oblige à faire défiler depuis une extrémité ; pré-rempli, l'écart à
      parcourir est de quelques crans. Le risque — valider sans regarder —
      existe, mais il est plus faible que celui d'abandonner.

   2. Sommeil, nutrition et activité sont DEMANDÉS. Ils étaient jusqu'ici
      codés en dur ('good', 8 h, 30 min) et envoyés au modèle, qui s'en sert
      réellement (cf. internal/estimator/v2_enhanced.go). Autrement dit,
      l'estimation intégrait des réponses que personne n'avait données.

   3. Les réponses sont conservées en localStorage à chaque changement. Un
      rechargement au 11e écran ne renvoie plus à la case départ.
   ============================================================ */

const CM_PAR_POUCE = 2.54
const KG_PAR_LIVRE = 0.45359237
const STOCKAGE = 'grandimi:questionnaire'

const ETAPES = [
  'sexe',
  'age',
  'taille',
  'poids',
  'pause-genetique',
  'pere',
  'mere',
  'vitesse',
  'sommeil',
  'nutrition',
  'activite',
  'methode',
  'email',
  'recapitulatif',
]

const REPONSES_INITIALES = {
  email: '',
  age: 14,
  sex: '',
  height_cm: 165,
  weight_kg: 55,
  father_height_cm: 176,
  mother_height_cm: 164,
  // null = « je ne sais pas », distinct de 0 cm pris dans l'année.
  height_velocity_cm: 5,
  sleep_hours_per_night: null,
  nutrition_level: '',
  exercise_min_per_day: null,
}

const OPTIONS_SOMMEIL = [
  { valeur: 6, titre: 'Moins de 7 h', indice: 'Court pour un adolescent', icone: '🌙' },
  { valeur: 7.5, titre: '7 à 8 h', indice: 'Dans la moyenne', icone: '😴' },
  { valeur: 8.5, titre: '8 à 9 h', indice: 'Recommandé à ton âge', icone: '💤' },
  { valeur: 9.5, titre: 'Plus de 9 h', indice: 'Long', icone: '🛌' },
]

const OPTIONS_NUTRITION = [
  { valeur: 'poor', titre: 'Irrégulière', indice: 'Repas sautés, beaucoup de snacks', icone: '🍟' },
  { valeur: 'fair', titre: 'Moyenne', indice: 'Ça dépend des jours', icone: '🥪' },
  { valeur: 'good', titre: 'Correcte', indice: '3 repas, protéines et légumes réguliers', icone: '🥗' },
  { valeur: 'excellent', titre: 'Très suivie', indice: 'Repas équilibrés, peu d’écarts', icone: '🥦' },
]

const OPTIONS_ACTIVITE = [
  { valeur: 10, titre: 'Presque jamais', indice: 'Moins de 15 min par jour', icone: '🛋️' },
  { valeur: 30, titre: 'Un peu', indice: 'Environ 30 min par jour', icone: '🚶' },
  { valeur: 60, titre: 'Régulièrement', indice: '1 h par jour, sport ou marche', icone: '🏃' },
  { valeur: 120, titre: 'Beaucoup', indice: '2 h ou plus, entraînement', icone: '🏋️' },
]

/** 172 → 5'8". Le pouce est arrondi, jamais affiché avec des décimales. */
function formatPiedsPouces(pouces) {
  const pieds = Math.floor(pouces / 12)
  const reste = Math.round(pouces - pieds * 12)
  // 11,6 pouces arrondi à 12 doit devenir le pied suivant, pas 5'12".
  return reste === 12 ? `${pieds + 1}′0″` : `${pieds}′${reste}″`
}

const versPouces = (cm) => Math.round(cm / CM_PAR_POUCE)
const versLivres = (kg) => Math.round(kg / KG_PAR_LIVRE)

function chargerReponses() {
  try {
    const brut = localStorage.getItem(STOCKAGE)
    if (!brut) return null
    const enregistre = JSON.parse(brut)
    if (!enregistre || typeof enregistre !== 'object') return null
    return enregistre
  } catch {
    return null
  }
}

function QuestionnaireFlow({ onPredictionComplete, onCancel }) {
  const reprise = useMemo(() => chargerReponses(), [])

  const [index, setIndex] = useState(() => {
    const repris = Number(reprise?.index)
    // Jamais reprendre sur le récapitulatif : on y arriverait avec des
    // réponses partiellement effacées si le format a changé entre deux visites.
    return Number.isInteger(repris) && repris > 0 && repris < ETAPES.length - 1 ? repris : 0
  })
  /* L'e-mail n'est PAS repris de localStorage. Il y restait d'une session
     précédente, si bien que l'écran « entre ton e-mail » arrivait déjà
     rempli avec l'adresse de quelqu'un d'autre sur un appareil partagé —
     et la prédiction partait alors sur le mauvais compte. Une reprise de
     questionnaire en cours (`reprise`) le restitue toujours, elle. */
  const [reponses, setReponses] = useState(() => ({
    ...REPONSES_INITIALES,
    ...(reprise?.reponses || {}),
  }))
  const [unite, setUnite] = useState(() => reprise?.unite || 'metric')
  const [vitesseInconnue, setVitesseInconnue] = useState(
    () => reprise?.reponses?.height_velocity_cm === null,
  )
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(null)

  const minuterie = useRef(null)
  const etape = ETAPES[index]

  // Sauvegarde continue : le tunnel survit à un rechargement ou à un appel
  // entrant qui décharge l'onglet.
  useEffect(() => {
    try {
      localStorage.setItem(STOCKAGE, JSON.stringify({ index, reponses, unite }))
    } catch {
      /* quota plein ou navigation privée : le tunnel marche quand même */
    }
  }, [index, reponses, unite])

  /* Une vue par écran. C'est la seule mesure qui dit OÙ on perd les
     gens : quatorze écrans, et jusqu'ici un seul $pageview pour les
     quatorze. Le rang est envoyé avec le nom pour que l'entonnoir
     reste lisible si l'ordre des écrans change un jour. */
  useEffect(() => {
    tunnelEtapeVue(etape, index + 1, ETAPES.length)
  }, [etape, index])

  useEffect(() => () => clearTimeout(minuterie.current), [])

  const definir = (champ, valeur) => setReponses((prec) => ({ ...prec, [champ]: valeur }))

  const avancer = () => {
    /* L'adresse est le seul champ qu'on demande sans rien donner en
       échange à cet instant : savoir combien la franchissent dit si
       elle coûte des conversions. La valeur saisie, elle, ne part
       jamais vers PostHog. */
    if (etape === 'email') emailSaisi()
    clearTimeout(minuterie.current)
    setIndex((i) => Math.min(ETAPES.length - 1, i + 1))
  }

  const reculer = () => {
    clearTimeout(minuterie.current)
    if (index === 0) {
      tunnelAbandonne(etape, index + 1)
      onCancel()
      return
    }
    setIndex((i) => Math.max(0, i - 1))
  }

  /* Sur une question à choix unique, le tap EST la réponse : demander en plus
     « Suivant » double le nombre de gestes sans rien apporter. Le délai laisse
     voir la sélection s'allumer, sinon l'écran change avant tout retour visuel. */
  const repondreEtAvancer = (champ, valeur) => {
    definir(champ, valeur)
    clearTimeout(minuterie.current)
    minuterie.current = setTimeout(avancer, 260)
  }

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reponses.email)

  const peutContinuer = (() => {
    switch (etape) {
      case 'sexe':
        return Boolean(reponses.sex)
      case 'sommeil':
        return reponses.sleep_hours_per_night !== null
      case 'nutrition':
        return Boolean(reponses.nutrition_level)
      case 'activite':
        return reponses.exercise_min_per_day !== null
      case 'email':
        return emailValide
      default:
        return true
    }
  })()

  const envoyer = async () => {
    setChargement(true)
    setErreur(null)
    estimationDemandee()

    try {
      const utiliserAPI = import.meta.env.VITE_USE_REAL_API !== 'false'
      const charge = {
        email: reponses.email,
        age: Number(reponses.age),
        sex: reponses.sex,
        height_cm: Number(reponses.height_cm),
        weight_kg: Number(reponses.weight_kg),
        father_height_cm: Number(reponses.father_height_cm),
        mother_height_cm: Number(reponses.mother_height_cm),
        // Le serveur traite 0 comme « non renseigné » et élargit la fourchette.
        height_velocity_cm: reponses.height_velocity_cm ?? 0,
        nutrition_level: reponses.nutrition_level,
        sleep_hours_per_night: reponses.sleep_hours_per_night,
        exercise_min_per_day: reponses.exercise_min_per_day,
      }

      const resultat = utiliserAPI
        ? await apiClient.predictHeightV2(charge)
        : await mockPredictHeight(charge)

      /* La réponse du serveur ne réémet ni l'e-mail ni les mesures saisies :
         on les rattache ici. Sans l'e-mail, la paywall et l'écran parent
         n'identifient plus le compte ; sans les mesures, le plan de croissance
         n'a rien à personnaliser. */
      estimationObtenue({
        age: Number(reponses.age),
        sexe: reponses.sex,
        confiance: resultat.confidence_level,
      })

      onPredictionComplete({
        ...resultat,
        email: reponses.email,
        age: Number(reponses.age),
        sex: reponses.sex,
        current_height_cm: Number(reponses.height_cm),
        weight_kg: Number(reponses.weight_kg),
      })

      // Le tunnel est terminé : garder le brouillon rouvrirait un questionnaire
      // à moitié rempli au prochain passage.
      try {
        localStorage.removeItem(STOCKAGE)
      } catch {
        /* sans conséquence */
      }
    } catch (err) {
      estimationEchouee(err.message)
      setErreur(err.message)
      setChargement(false)
    }
  }

  // ---------- Écrans pleine page, sans cadre ----------

  if (etape === 'pause-genetique') {
    return (
      <Interstitial
        text="Tu n’as pas choisi ta génétique. Mais tu choisis ce que tu en fais."
        cta="Continuer"
        onContinue={avancer}
      />
    )
  }

  // ---------- Écrans encadrés ----------

  const progression = (index + 1) / ETAPES.length

  const contenu = () => {
    switch (etape) {
      case 'sexe':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Sexe">
            <ChoiceCard
              icon="👦"
              title="Garçon"
              selected={reponses.sex === 'M'}
              onSelect={() => repondreEtAvancer('sex', 'M')}
            />
            <ChoiceCard
              icon="👧"
              title="Fille"
              selected={reponses.sex === 'F'}
              onSelect={() => repondreEtAvancer('sex', 'F')}
            />
          </div>
        )

      case 'age':
        return (
          <WheelPicker
            label="Âge en années"
            min={8}
            max={18}
            step={0.5}
            value={Number(reponses.age)}
            onChange={(v) => definir('age', v)}
            format={(v) => `${v} ans`}
          />
        )

      case 'taille':
      case 'pere':
      case 'mere': {
        const champ = {
          taille: 'height_cm',
          pere: 'father_height_cm',
          mere: 'mother_height_cm',
        }[etape]
        const bornes =
          etape === 'taille' ? { min: 110, max: 210 } : { min: 140, max: 215 }
        const valeur = Number(reponses[champ])

        return (
          <>
            {unite === 'metric' ? (
              <WheelPicker
                label="Taille en centimètres"
                min={bornes.min}
                max={bornes.max}
                step={1}
                value={Math.round(valeur)}
                onChange={(v) => definir(champ, v)}
                format={(v) => `${v} cm`}
              />
            ) : (
              /* En impérial la molette parcourt des POUCES, pas des centimètres
                 reformatés : à 1 cm près, deux crans voisins afficheraient la
                 même valeur en pieds-pouces et la molette semblerait bloquée. */
              <WheelPicker
                label="Taille en pieds et pouces"
                min={versPouces(bornes.min)}
                max={versPouces(bornes.max)}
                step={1}
                value={versPouces(valeur)}
                onChange={(v) => definir(champ, Math.round(v * CM_PAR_POUCE * 10) / 10)}
                format={formatPiedsPouces}
              />
            )}
            <SegmentedControl
              label="Unité de mesure"
              value={unite}
              onChange={setUnite}
              options={[
                { value: 'metric', label: 'Métrique' },
                { value: 'imperial', label: 'Impérial' },
              ]}
            />
          </>
        )
      }

      case 'poids':
        return (
          <>
            {unite === 'metric' ? (
              <WheelPicker
                label="Poids en kilogrammes"
                min={20}
                max={140}
                step={0.5}
                value={Number(reponses.weight_kg)}
                onChange={(v) => definir('weight_kg', v)}
                format={(v) => `${v} kg`}
              />
            ) : (
              <WheelPicker
                label="Poids en livres"
                min={versLivres(20)}
                max={versLivres(140)}
                step={1}
                value={versLivres(Number(reponses.weight_kg))}
                onChange={(v) => definir('weight_kg', Math.round(v * KG_PAR_LIVRE * 10) / 10)}
                format={(v) => `${v} lb`}
              />
            )}
            <SegmentedControl
              label="Unité de mesure"
              value={unite}
              onChange={setUnite}
              options={[
                { value: 'metric', label: 'Métrique' },
                { value: 'imperial', label: 'Impérial' },
              ]}
            />
          </>
        )

      case 'vitesse':
        return (
          <>
            <div style={{ opacity: vitesseInconnue ? 0.35 : 1 }}>
              <WheelPicker
                label="Centimètres pris depuis l’an dernier"
                min={0}
                max={20}
                step={0.5}
                value={Number(reponses.height_velocity_cm ?? 5)}
                onChange={(v) => {
                  setVitesseInconnue(false)
                  definir('height_velocity_cm', v)
                }}
                format={(v) => `${v} cm`}
              />
            </div>
            <ChoiceCard
              role="checkbox"
              title="Je ne sais pas"
              hint="La fourchette sera simplement plus large"
              selected={vitesseInconnue}
              onSelect={() => {
                const inconnu = !vitesseInconnue
                setVitesseInconnue(inconnu)
                definir('height_velocity_cm', inconnu ? null : 5)
              }}
            />
          </>
        )

      case 'sommeil':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Heures de sommeil">
            {OPTIONS_SOMMEIL.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                hint={option.indice}
                selected={reponses.sleep_hours_per_night === option.valeur}
                onSelect={() => repondreEtAvancer('sleep_hours_per_night', option.valeur)}
              />
            ))}
          </div>
        )

      case 'nutrition':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Alimentation">
            {OPTIONS_NUTRITION.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                hint={option.indice}
                selected={reponses.nutrition_level === option.valeur}
                onSelect={() => repondreEtAvancer('nutrition_level', option.valeur)}
              />
            ))}
          </div>
        )

      case 'activite':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Activité physique">
            {OPTIONS_ACTIVITE.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                hint={option.indice}
                selected={reponses.exercise_min_per_day === option.valeur}
                onSelect={() => repondreEtAvancer('exercise_min_per_day', option.valeur)}
              />
            ))}
          </div>
        )

      /* Contrepoint honnête à l'écran « 98,5 % de précision » des applis
         concurrentes : on affiche la marge réelle du modèle, pas un score
         inventé. C'est aussi l'argument de vente de Grandimi — autant le poser
         avant le résultat plutôt que de le cacher dans une note de bas de page. */
      case 'methode':
        return (
          <div className="funnel-figure">
            {/* Pas de `inView` : l'écran vient d'être poussé, l'élément est
                déjà à l'image. Attendre un croisement d'intersection le
                laissait vide sur les appareils où l'observateur se déclenche
                après la première frame. */}
            <SpecialText className="funnel-figure-number">±3 à 6 cm</SpecialText>
            <HandwritingText
              text="la marge, affichée"
              className="funnel-figure-note"
              height="2.1rem"
            />
          </div>
        )

      case 'email':
        return (
          <div className="funnel-field">
            <input
              id="funnel-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck="false"
              placeholder="toi@exemple.com"
              value={reponses.email}
              onChange={(e) => definir('email', e.target.value)}
              aria-label="Adresse e-mail"
            />
            <p className="funnel-help">
              Elle sert à retrouver ton estimation et ton plan. Pas de newsletter,
              pas de revente.
            </p>
          </div>
        )

      case 'recapitulatif': {
        const lignes = [
          { label: 'Sexe', valeur: reponses.sex === 'M' ? 'Garçon' : 'Fille', vers: 0 },
          { label: 'Âge', valeur: `${reponses.age} ans`, vers: 1 },
          { label: 'Ta taille', valeur: `${reponses.height_cm} cm`, vers: 2 },
          { label: 'Ton poids', valeur: `${reponses.weight_kg} kg`, vers: 3 },
          { label: 'Père', valeur: `${reponses.father_height_cm} cm`, vers: 5 },
          { label: 'Mère', valeur: `${reponses.mother_height_cm} cm`, vers: 6 },
          {
            label: 'Pris cette année',
            valeur:
              reponses.height_velocity_cm === null
                ? 'Je ne sais pas'
                : `${reponses.height_velocity_cm} cm`,
            vers: 7,
          },
          { label: 'E-mail', valeur: reponses.email, vers: 12 },
        ]

        return (
          <>
            {erreur && (
              <p className="funnel-error" role="alert">
                {erreur}
              </p>
            )}
            <dl className="funnel-review">
              {lignes.map((ligne) => (
                <div className="funnel-review-row" key={ligne.label}>
                  <dt>{ligne.label}</dt>
                  <dd>{ligne.valeur}</dd>
                  <button
                    type="button"
                    className="funnel-review-edit"
                    onClick={() => setIndex(ligne.vers)}
                  >
                    {/* Le libellé visible reste court ; le nom accessible dit
                        QUOI on modifie, sinon un lecteur d'écran annonce huit
                        boutons « Modifier » indiscernables. */}
                    <span aria-hidden="true">Modifier</span>
                    <span className="sr-only">Modifier : {ligne.label}</span>
                  </button>
                </div>
              ))}
            </dl>
          </>
        )
      }

      default:
        return null
    }
  }

  const TEXTES = {
    sexe: {
      titre: 'Tu es un garçon ou une fille ?',
      sous: 'Les courbes de croissance diffèrent, le calcul aussi.',
    },
    age: {
      titre: 'Quel âge as-tu ?',
      sous: 'Plus tu es proche de la fin de ta croissance, plus l’estimation se resserre.',
    },
    taille: { titre: 'Combien mesures-tu ?', sous: 'Sans chaussures, dos au mur.' },
    poids: { titre: 'Combien pèses-tu ?', sous: 'Une valeur approchée suffit.' },
    pere: {
      titre: 'Combien mesure ton père ?',
      sous: 'La taille des parents pèse le plus lourd dans l’estimation.',
    },
    mere: {
      titre: 'Combien mesure ta mère ?',
      sous: 'Avec celle de ton père, c’est la base du calcul.',
    },
    vitesse: {
      titre: 'Combien as-tu pris depuis l’an dernier ?',
      sous: 'Compare avec une vieille photo, une toise, ou demande à tes parents.',
    },
    sommeil: {
      titre: 'Tu dors combien, en général ?',
      sous: 'L’hormone de croissance se libère surtout pendant le sommeil profond.',
    },
    nutrition: {
      titre: 'Comment tu manges ?',
      sous: 'Sans protéines ni calcium suffisants, le potentiel n’est pas atteint.',
    },
    activite: {
      titre: 'Tu bouges combien par jour ?',
      sous: 'L’activité stimule l’os pendant qu’il peut encore s’allonger.',
    },
    methode: {
      titre: 'Quelle précision peux-tu attendre ?',
      sous: 'Aucune prédiction de taille n’est exacte. On affiche la fourchette au lieu de la cacher.',
    },
    email: {
      /* « Où t'envoyer ton estimation ? » promettait un e-mail que rien
         n'envoyait : le backend n'avait aucune brique d'envoi, et on
         attendait un message qui n'arrivait jamais. Le texte a d'abord
         été corrigé pour ne plus rien promettre.

         Un envoi existe maintenant — un seul, la relance à un mois
         (internal/email/relance_j30.go). Ce texte doit donc l'annoncer
         AVANT que l'adresse soit saisie, et l'annoncer exactement :
         combien d'e-mails, pour quoi, et comment en sortir. Une adresse
         obtenue sans dire ce qu'on en fera, auprès d'un mineur, est
         précisément ce que le RGPD refuse. Si un second type d'envoi
         est ajouté un jour, cette phrase change le même jour. */
      titre: 'Ton adresse e-mail',
      sous: 'Elle sert à retrouver ton compte, et à t’envoyer un seul e-mail : dans un mois, pour te re-mesurer. Désinscription en un clic. Ton résultat, lui, s’affiche tout de suite.',
    },
    recapitulatif: {
      titre: 'On vérifie avant de calculer',
      sous: 'Une mesure fausse fausse tout le reste. Corrige si besoin.',
    },
  }

  const texte = TEXTES[etape] || {}

  return (
    <FunnelShell
      onBack={reculer}
      progress={progression}
      title={texte.titre}
      subtitle={texte.sous}
      footer={
        etape === 'recapitulatif' ? (
          <FunnelButton onClick={envoyer} disabled={chargement}>
            {chargement ? (
              <>
                <Spinner />
                Analyse en cours…
              </>
            ) : (
              'Analyser mes réponses'
            )}
          </FunnelButton>
        ) : (
          <FunnelButton onClick={avancer} disabled={!peutContinuer}>
            Suivant
          </FunnelButton>
        )
      }
    >
      {contenu()}
    </FunnelShell>
  )
}

export default QuestionnaireFlow
