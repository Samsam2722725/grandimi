import { useEffect, useMemo, useRef, useState } from 'react'

import { ChoiceCard } from '@/components/ui/choice-card'
import { FunnelButton, FunnelShell } from '@/components/ui/funnel-shell'
import { Interstitial } from '@/components/ui/interstitial'
import { LongTermeChart } from '@/components/ui/long-terme-chart'
import { SegmentedControl } from '@/components/ui/segmented-control'
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

/* Séparateur décimal français, comme sur la page de résultat. */
const fr = (valeur) => String(valeur).replace('.', ',')

const ETAPES = [
  'sexe',
  'age',
  'taille',
  'poids',
  'pause-genetique',
  'pere',
  'mere',
  'vitesse',
  'pointure',
  'menarche',
  'sommeil',
  'nutrition',
  'activite',
  'verite',
  'part-habitudes',
  'long-terme',
  'email',
  'recapitulatif',
]

/* Toutes les etapes ne concernent pas tout le monde.

   La date des premieres regles est une donnee de sante. En France le
   consentement d une mineure ne suffit pas avant quinze ans : il faut
   celui du titulaire de l autorite parentale. On ne pose donc la
   question qu a partir de quinze ans, ce qui evite d avoir a construire
   un recueil de consentement parental au milieu du tunnel.

   C est un filtre d ECRAN, pas de modele : internal/estimator/menarche.go
   accepte n importe quel age valide. Si la decision produit change un
   jour, il n y a que cette fonction a toucher. */
function etapeApplicable(nom, reponses) {
  if (nom !== 'menarche') return true
  return reponses.sex === 'F' && Number(reponses.age) >= 15
}

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
  /* Pointure du jour et d'il y a un an. `null` par défaut, et non une
     valeur plausible : la question est facultative, et pré-remplir deux
     pointures enverrait au serveur un signal que personne n'a donné. */
  shoe_size_eu: null,
  shoe_size_eu_1y: null,

  /* Filles de 15 ans et plus uniquement — voir etapeApplicable.
     null vaut « non repondu » et reste strictement neutre. */
  menarche_survenue: null,
  age_menarche_annees: null,
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
  const [menarcheInconnue, setMenarcheInconnue] = useState(
    () => (reprise?.reponses?.menarche_survenue ?? null) !== true,
  )
  const [vitesseInconnue, setVitesseInconnue] = useState(
    () => reprise?.reponses?.height_velocity_cm === null,
  )
  /* Part à « je ne sais pas », contrairement à la vitesse : tant que
     personne n'a touché une molette, il n'y a pas de réponse à envoyer. */
  const [pointureInconnue, setPointureInconnue] = useState(
    () => (reprise?.reponses?.shoe_size_eu ?? null) === null,
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

  /* Avance ou recule jusqu a la prochaine etape qui concerne ce profil.
     Sans ce saut, une fille de treize ans verrait un ecran vide, et un
     garcon aussi. */
  const suivantApplicable = (depuis, pas) => {
    let j = depuis + pas
    while (j > 0 && j < ETAPES.length - 1 && !etapeApplicable(ETAPES[j], reponses)) {
      j += pas
    }
    return Math.max(0, Math.min(ETAPES.length - 1, j))
  }

  const avancer = () => {
    /* L'adresse est le seul champ qu'on demande sans rien donner en
       échange à cet instant : savoir combien la franchissent dit si
       elle coûte des conversions. La valeur saisie, elle, ne part
       jamais vers PostHog. */
    if (etape === 'email') emailSaisi()
    clearTimeout(minuterie.current)
    setIndex((i) => suivantApplicable(i, 1))
  }

  const reculer = () => {
    clearTimeout(minuterie.current)
    if (index === 0) {
      tunnelAbandonne(etape, index + 1)
      onCancel()
      return
    }
    setIndex((i) => suivantApplicable(i, -1))
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
        /* Même convention : 0 vaut « non renseigné » côté serveur, qui
           traite alors l'absence comme strictement neutre plutôt que
           comme une pénalité (internal/estimator/maturite.go). */
        shoe_size_eu: reponses.shoe_size_eu ?? 0,
        shoe_size_eu_1y: reponses.shoe_size_eu_1y ?? 0,
        /* false et 0 valent « non renseigne » : le serveur n applique
           alors aucune ancre menarche (internal/estimator/menarche.go). */
        menarche_survenue: reponses.menarche_survenue === true,
        age_menarche_annees: reponses.age_menarche_annees ?? 0,
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
        /* La courbe du résultat trace le point de l'an dernier en
           soustrayant cette valeur à la taille du jour. Sans elle, le
           graphique n'a pas de passé à montrer et démarre sec sur
           « aujourd'hui ». `null` (« je ne sais pas ») se propage tel quel :
           le composant ne trace alors rien plutôt que de reculer d'un an
           sur une vitesse moyenne inventée. */
        height_velocity_cm: reponses.height_velocity_cm,
        sleep_hours_per_night: reponses.sleep_hours_per_night,
        nutrition_level: reponses.nutrition_level,
        exercise_min_per_day: reponses.exercise_min_per_day,
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
          /* Jusqu'à 22 ans, et pas 18.

             La croissance masculine ne s'arrête pas net à 18 ans : les
             cartilages de conjugaison se ferment par étapes jusque vers
             21-22 ans, et il reste sur cette période une croissance
             résiduelle — faible, mais réelle. Un garçon de 19 ans qui
             arrivait ici ne pouvait tout simplement pas répondre à la
             question qu'il venait poser.

             Il n'y a aucune raison de l'écarter : le calcul le gère (la
             marge se resserre d'elle-même au-delà de 16 ans) et le
             plancher « jamais sous la taille déjà atteinte » l'empêche de
             recevoir un chiffre flatteur. Il obtient la vérité, qui est
             souvent « tu y es presque » — et c'est à lui de décider si ça
             l'intéresse encore. */
          <WheelPicker
            label="Âge en années"
            min={8}
            max={22}
            step={0.5}
            value={Number(reponses.age)}
            onChange={(v) => definir('age', v)}
            /* La molette avance d'un demi-an : sans cette substitution elle
               affiche « 13.5 ans » au point anglais, sur le deuxième écran
               du tunnel — la première impression de soin qu'on donne. */
            format={(v) => `${String(v).replace('.', ',')} ans`}
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
                label="Centimètres grandis depuis l’an dernier"
                min={0}
                max={20}
                step={0.5}
                value={Number(reponses.height_velocity_cm ?? 5)}
                onChange={(v) => {
                  setVitesseInconnue(false)
                  definir('height_velocity_cm', v)
                }}
                format={(v) => `${fr(v)} cm`}
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

      /* POINTURE — le second signal de maturité, et le seul ajout de ce
         brief au questionnaire.

         C'est la VARIATION qui porte l'information, pas la pointure du
         jour : l'augmentation de pointure s'arrête au moment du pic de
         taille. Un pied qui n'a pas bougé depuis un an dit que le pic est
         passé ; un pied qui grimpe encore dit qu'il est devant. Demander
         seulement la pointure actuelle, comme le fait la concurrence, ne
         capte presque rien.

         FACULTATIVE, ET PAR DÉFAUT NON RENSEIGNÉE. Le serveur traite
         l'absence comme strictement neutre. C'est ce qui permet de poser
         la question sans allonger le tunnel pour ceux qui n'ont pas la
         réponse — et sans jamais leur coûter un centimètre. */
      case 'pointure':
        return (
          <>
            <div
              className="funnel-pointure"
              style={{ opacity: pointureInconnue ? 0.35 : 1 }}
            >
              {/* Les légendes sont VISIBLES et pas seulement accessibles :
                  deux colonnes de chiffres côte à côte, sans rien pour les
                  distinguer, ne se lisent pas. Le titre de l'écran suffit
                  quand il n'y a qu'une molette, jamais quand il y en a deux. */}
              <div className="funnel-pointure-col">
                <span className="funnel-pointure-legende">Aujourd’hui</span>
                <WheelPicker
                  label="Pointure aujourd’hui"
                  min={28}
                  max={50}
                  step={1}
                  value={Number(reponses.shoe_size_eu ?? 39)}
                  onChange={(v) => {
                    setPointureInconnue(false)
                    definir('shoe_size_eu', v)
                    if (reponses.shoe_size_eu_1y === null) definir('shoe_size_eu_1y', v - 1)
                  }}
                  format={(v) => String(v)}
                />
              </div>
              <div className="funnel-pointure-col">
                <span className="funnel-pointure-legende">Il y a un an</span>
                <WheelPicker
                  label="Pointure il y a un an"
                  min={28}
                  max={50}
                  step={1}
                  value={Number(reponses.shoe_size_eu_1y ?? 38)}
                  onChange={(v) => {
                    setPointureInconnue(false)
                    definir('shoe_size_eu_1y', v)
                    if (reponses.shoe_size_eu === null) definir('shoe_size_eu', v + 1)
                  }}
                  format={(v) => String(v)}
                />
              </div>
            </div>
            <ChoiceCard
              role="checkbox"
              title="Je ne sais pas"
              hint="Cette question est facultative"
              selected={pointureInconnue}
              onSelect={() => {
                const inconnu = !pointureInconnue
                setPointureInconnue(inconnu)
                definir('shoe_size_eu', inconnu ? null : 39)
                definir('shoe_size_eu_1y', inconnu ? null : 38)
              }}
            />
          </>
        )

      case 'menarche':
        return (
          <>
            <div style={{ opacity: menarcheInconnue ? 0.35 : 1 }}>
              <WheelPicker
                label="Âge aux premières règles"
                min={9}
                max={18}
                step={0.5}
                value={Number(reponses.age_menarche_annees ?? 12.5)}
                onChange={(v) => {
                  setMenarcheInconnue(false)
                  definir('menarche_survenue', true)
                  definir('age_menarche_annees', v)
                }}
                format={(v) => `${fr(v)} ans`}
              />
            </div>
            {/* Un seul refus, volontairement : « pas encore » et « je préfère
                ne pas répondre » produisent exactement le même calcul — aucune
                ancre ménarche. Deux cartes pour un seul effet donneraient
                l'illusion d'un choix qui n'en est pas un.

                « Pas encore » à quinze ans EST une information — c'est une
                maturation tardive — mais le modèle ne l'exploite pas encore.
                Le jour où il le fera, il faudra séparer les deux cartes. */}
            <ChoiceCard
              role="checkbox"
              title="Pas encore, ou je préfère ne pas répondre"
              hint="Cette question est facultative"
              selected={menarcheInconnue}
              onSelect={() => {
                const inconnu = !menarcheInconnue
                setMenarcheInconnue(inconnu)
                definir('menarche_survenue', inconnu ? null : true)
                definir('age_menarche_annees', inconnu ? null : 12.5)
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
      /* ---------- Écrans de pression ----------

         Copiés dans leur forme sur le tunnel de Taller (captures du
         13/09/2026) : une liste de conséquences à puces alarmées, puis
         un graphique à deux barres génétique / habitudes. Cette forme
         travaille, elle reste.

         Le CONTENU, lui, diffère sur deux points, et pas par pudeur.

         Taller écrit « 40 % de matchs en moins », « les femmes te
         négligent », « chaque cm coûte 600 $ par an » à des garçons de
         13 ans. En France, une pratique commerciale qui exploite la
         vulnérabilité d'un mineur pour vendre est une pratique
         commerciale déloyale (art. L121-1 et suivants du code de la
         consommation). Les mêmes écrans, retournés vers l'échéance
         biologique — qui est le vrai sujet du produit — gardent leur
         force sans reposer sur l'estime de soi d'un adolescent.

         Taller écrit aussi « jusqu'à 20 % de ta taille finale est
         déterminée par tes habitudes ». Sur 170 cm, cela ferait 34 cm,
         ce qui est faux. Le chiffre réel décrit la part de l'ÉCART
         entre deux personnes, pas de leur taille. La note sous le
         graphique le dit, et le ramène à ce qu'il est vraiment : des
         centimètres, pas des dizaines. */
      /* ---------- Ce que la taille change au quotidien ----------

         Forme reprise de l'écran « La vérité brutale » de Taller : une liste
         de conséquences, une par ligne, chacune précédée d'un signe d'alerte.
         Le dispositif marche, il reste.

         LE CONTENU EST ENTIÈREMENT DIFFÉRENT DU LEUR, et c'est le sujet.
         Taller écrit « 40 % de matchs en moins », « les femmes te négligent »,
         « chaque cm coûte 600 $ par an », « plus d'anxiété sociale » — à des
         garçons de treize ans. Aucun de ces quatre chiffres n'est vérifiable,
         et trois d'entre eux visent l'estime de soi plutôt qu'un fait. En
         France, exploiter la vulnérabilité d'un mineur pour vendre est une
         pratique commerciale déloyale (art. L121-1 du code de la
         consommation).

         Ces cinq lignes-ci sont des désagréments matériels et documentés :
         rayonnages hors de portée, ourlets à reprendre, être pris pour plus
         jeune, clichés professionnels, mobilier urbain calé sur d'autres.
         Aucun pourcentage, aucun montant, rien sur la séduction. Elles se
         vérifient en une journée par quiconque les vit, ce qui est exactement
         ce qui manque à la liste d'en face.

         La ligne de pied n'est pas décorative : sans elle, l'écran se lit
         comme un verdict sur la personne. Or une bonne partie des visiteurs
         seront petits quoi qu'ils fassent — leur annoncer une liste de
         malheurs sans dire tout de suite sur quoi ils peuvent agir serait
         gratuit, et se retournerait contre le produit. */
      /* DOULEUR, PUIS BASCULE, PUIS CE QU'ON VEND.

         Les quatre premières lignes décrivent ce que le lecteur ressent
         déjà, à la deuxième personne : on ne lui apprend rien, on nomme ce
         qu'il connaît. Aucune n'est un chiffre à croire sur parole, et
         c'est ce qui les rend défendables là où un « 40 % de matchs en
         moins » ne l'est pas.

         Elles ont aussi l'âge du lecteur : des rayonnages hors de portée et
         des clichés sur l'autorité au travail parlaient à un adulte de
         trente ans, pas à quelqu'un qui en a quatorze.

         La cinquième change de nature — « ne pas savoir si tu as déjà
         atteint ta taille finale ». Les quatre premières décrivent ce
         qu'on subit ; celle-là nomme le doute, et c'est le seul point sur
         lequel le produit peut quelque chose. Elle est la charnière, et le
         texte en dessous ne fait que la prolonger. */
      case 'verite':
        return (
          <div className="funnel-verite">
            <ul className="verite-liste">
              {[
                'On te donne souvent moins que ton âge',
                'Tu te sens moins imposant à côté des autres',
                'Tu regardes la taille des autres presque automatiquement',
                'Voir tes potes grandir pendant que toi tu stagnes',
                'Ne pas savoir si tu as déjà atteint ta taille finale',
              ].map((ligne) => (
                <li className="verite-ligne" key={ligne}>
                  <span className="verite-signe" aria-hidden="true">
                    !
                  </span>
                  {ligne}
                </li>
              ))}
            </ul>

            <p className="verite-pied">
              Le vrai problème, ce n’est pas seulement la taille. C’est de ne pas
              savoir si tu exploites vraiment ton potentiel de croissance.
            </p>
          </div>
        )

      case 'part-habitudes':
        return (
          <div className="funnel-part">
            <div className="funnel-part-barres">
              <div className="funnel-part-colonne">
                <span className="funnel-part-nom">Génétique</span>
                <div className="funnel-part-barre funnel-part-barre--forte">
                  <span>80 %</span>
                </div>
              </div>
              <div className="funnel-part-colonne">
                <span className="funnel-part-nom">Tes habitudes</span>
                <div className="funnel-part-barre funnel-part-barre--faible">
                  <span>20 %</span>
                </div>
              </div>
            </div>
            <p className="funnel-part-note">
              Ces 20 % ne se comptent pas en dizaines de centimètres. Ils se comptent en
              centimètres — et ce sont les seuls sur lesquels tu peux encore agir.
            </p>
          </div>
        )

      /* ---------- Ce que le plan change, sur la durée ----------

         Copie de l'écran « résultats à long terme » du tunnel de Taller :
         deux courbes partant du même point, celle des habitudes subies
         finissant sous celle de la routine optimisée, une légende dessous.

         Posé ICI, avant le calcul, et non sur la page de résultat : à cet
         instant aucun chiffre n'existe encore, donc la figure ne peut pas
         être prise pour un pronostic personnel. Elle dit une chose vraie et
         générale, et la légende sous le dessin le précise. */
      case 'long-terme':
        return <LongTermeChart className="funnel-longterme" />

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
            {/* Disait « Pas de newsletter, pas de revente » juste sous le
                sous-titre qui annonce maintenant un envoi à un mois. Les deux
                phrases se contredisaient à deux centimètres l'une de l'autre,
                sur l'écran même où l'on demande une adresse à un mineur. La
                promesse qui reste est celle qu'on tient vraiment : rien n'est
                revendu, et il n'y a pas de suite d'e-mails. */}
            <p className="funnel-help">
              Jamais revendue, jamais transmise. Désinscription en un clic.
            </p>
          </div>
        )

      case 'recapitulatif': {
        const lignes = [
          { label: 'Sexe', valeur: reponses.sex === 'M' ? 'Garçon' : 'Fille', vers: ETAPES.indexOf('sexe') },
          /* `fr` sur toutes les valeurs numériques : l'âge, le poids et la
             croissance de l'année avancent de demi en demi, et le
             récapitulatif est l'écran où l'on demande justement de RELIRE
             ses réponses. Les y afficher au point anglais, juste avant un
             résultat qui écrit tout à la virgule, était la seule page où
             les deux écritures se croisaient ligne à ligne. */
          { label: 'Âge', valeur: `${fr(reponses.age)} ans`, vers: ETAPES.indexOf('age') },
          { label: 'Ta taille', valeur: `${fr(reponses.height_cm)} cm`, vers: ETAPES.indexOf('taille') },
          { label: 'Ton poids', valeur: `${fr(reponses.weight_kg)} kg`, vers: ETAPES.indexOf('poids') },
          { label: 'Père', valeur: `${fr(reponses.father_height_cm)} cm`, vers: ETAPES.indexOf('pere') },
          { label: 'Mère', valeur: `${fr(reponses.mother_height_cm)} cm`, vers: ETAPES.indexOf('mere') },
          {
            label: 'Grandi cette année',
            valeur:
              reponses.height_velocity_cm === null
                ? 'Je ne sais pas'
                : `${fr(reponses.height_velocity_cm)} cm`,
            vers: ETAPES.indexOf('vitesse'),
          },
          {
            label: 'Pointure',
            valeur:
              reponses.shoe_size_eu === null
                ? 'Non renseignée'
                : `${fr(reponses.shoe_size_eu)} (${fr(reponses.shoe_size_eu_1y)} il y a un an)`,
            vers: ETAPES.indexOf('pointure'),
          },
          /* L'index suit ETAPES, il n'est pas décoratif : un écran ajouté ou
             retiré avant celui-ci décale la cible, et « Modifier » renvoie
             alors sur l'écran d'à côté. */
          ...(etapeApplicable('menarche', reponses)
            ? [
                {
                  label: 'Premières règles',
                  valeur:
                    reponses.menarche_survenue === true
                      ? `${fr(reponses.age_menarche_annees)} ans`
                      : 'Non renseigné',
                  vers: ETAPES.indexOf('menarche'),
                },
              ]
            : []),
          { label: 'E-mail', valeur: reponses.email, vers: ETAPES.indexOf('email') },
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
      titre: 'Tu as grandi de combien depuis l’an dernier ?',
      sous: 'Compare avec une vieille photo, une toise, ou demande à tes parents.',
    },
    pointure: {
      titre: 'Quelle est ta pointure ?',
      sous: 'Le pied arrête de grandir avant la taille : comparer avec l’an dernier dit où tu en es. Facultatif.',
    },
    menarche: {
      titre: 'À quel âge as-tu eu tes premières règles ?',
      sous: 'Elles datent la fin de la croissance mieux que tout le reste. Facultatif.',
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
    verite: {
      titre: 'La vérité brutale sur la petite taille',
      sous: 'Pas des statistiques. Juste ce que tu vis déjà.',
    },
    'part-habitudes': {
      titre: 'Ce que tes habitudes pèsent vraiment',
      sous: 'La génétique fixe ton plafond. Le reste décide si tu l’atteins, ou si tu t’arrêtes en dessous.',
    },
    'long-terme': {
      titre: 'Grandimi joue sur la durée',
      sous: 'Beaucoup n’atteignent pas leur plein potentiel de taille à cause d’habitudes non optimisées.',
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
      /* Deux blocs disaient la même chose à deux centimètres l'un de
         l'autre — le sous-titre, puis l'aide sous le champ — pour un
         total de soixante mots. Plus on se justifie de demander une
         adresse, plus la demande paraît louche, et c'est le 13e écran
         sur 15 : un abandon ici coûte les douze précédents.

         La substance que le RGPD impose y est toujours, dite une fois :
         à quoi elle sert, combien d'envois, comment en sortir, et que
         rien n'est revendu (cette dernière partie sous le champ). */
      titre: 'Ton adresse e-mail',
      sous: 'Ton résultat s’affiche tout de suite. Un seul e-mail ensuite : dans un mois, pour te re-mesurer.',
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
            {etape === 'verite' ? 'Voir ce que je peux encore optimiser' : 'Suivant'}
          </FunnelButton>
        )
      }
    >
      {contenu()}
    </FunnelShell>
  )
}

export default QuestionnaireFlow
