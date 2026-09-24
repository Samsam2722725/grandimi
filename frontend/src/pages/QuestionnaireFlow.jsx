import { useEffect, useMemo, useRef, useState } from 'react'
import { Info } from 'lucide-react'

import { AnalyseEnCours } from '@/components/ui/analyse-en-cours'
import { Avis } from '@/components/ui/avis'
import { BadgePrecision } from '@/components/ui/badge-precision'
import { ChoiceCard } from '@/components/ui/choice-card'
import { FeuilleInfo } from '@/components/ui/feuille-info'
import { FunnelButton, FunnelShell } from '@/components/ui/funnel-shell'
import { Interstitial } from '@/components/ui/interstitial'
import { LongTermeChart } from '@/components/ui/long-terme-chart'
import { ReseauNeurones } from '@/components/ui/reseau-neurones'
import { RuchePotentiel } from '@/components/ui/ruche-potentiel'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { WheelPicker } from '@/components/ui/wheel-picker'

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

   Ici : un seul geste par écran, et presque aucune frappe au clavier. Le
   total de gestes baisse, la charge par écran s'effondre, et la barre de
   progression rend l'effort restant lisible en permanence.

   ─────────────────────────────────────────────────────────────
   POURQUOI CE TUNNEL EST LONG, ET POURQUOI C'EST VOULU

   Trente écrans, là où la version précédente en comptait dix-sept. Ce
   n'est pas un dérapage : c'est la contrepartie d'un mécanisme que les
   tunnels concurrents (GoTall, Taller) exploitent tous, et qui tient en
   une phrase — LA PRÉCISION PERÇUE D'UNE ESTIMATION EST PROPORTIONNELLE
   À CE QU'ELLE A COÛTÉ À OBTENIR.

   Quelqu'un qui a répondu à trente questions sur son corps ne reçoit pas
   le même chiffre que quelqu'un qui en a rempli six, même si le calcul
   est identique au centimètre près. Il l'a payé, donc il y croit, donc il
   le lit — et le coût déjà engagé le porte jusqu'à la page de paiement au
   lieu de l'en détourner.

   CE QUE ÇA NE DISPENSE PAS DE FAIRE. Un écran long n'est pas un écran
   gratuit : chaque question ajoutée doit soit nourrir le calcul, soit
   nourrir le plan, soit nourrir la conviction — et on doit pouvoir dire
   laquelle. Les questions de maturité (voix, pilosité, épaules, odeur,
   acné) nourrissent la conviction et, pour deux d'entre elles, le champ
   `puberty_signs` déjà prévu par l'API. Elles sont TOUTES munies d'une
   sortie (« je ne sais pas », « je préfère ne pas répondre ») : la
   longueur ne doit jamais devenir un mur.

   ─────────────────────────────────────────────────────────────
   LES QUATRE ÉCRANS DE PREUVE

   « modèle », « précision », « potentiel » et « aide » ne demandent rien.
   Ils sont copiés dans leur FORME sur le tunnel de GoTall (captures du
   19/09/2026), parce que cette forme convertit : on alterne effort et
   récompense, et on répond à l'objection au moment exact où elle se pose
   (« pourquoi je remplis tout ça ? » juste après quatre mesures ;
   « et ça vaut quoi ? » juste après la génétique).

   Leur CONTENU diffère sur les points où celui de GoTall ne passerait pas
   en France, et le détail est dans chaque composant : le superlatif
   invérifiable (badge-precision.jsx), les écussons Harvard/CDC/NIH qui
   suggèrent une caution jamais donnée (idem), le « 98,7 % » qui
   contredirait la marge réelle du moteur.

   ─────────────────────────────────────────────────────────────
   CE QUI A ÉTÉ RETIRÉ

   L'écran « part-habitudes » (deux barres 80 % génétique / 20 %
   habitudes) est supprimé à la demande du client : il ne travaillait pas.
   L'hypothèse la plus probable est qu'il se retourne contre le produit —
   dire à quelqu'un que 80 % du résultat lui échappe, juste avant de lui
   vendre les 20 % restants, désamorce l'achat au lieu de le motiver.
   L'écran « long-terme », qui montre le même écart en trajectoires plutôt
   qu'en pourcentages, dit la même chose sans poser le plafond.
   ============================================================ */

const CM_PAR_POUCE = 2.54
const KG_PAR_LIVRE = 0.45359237
const STOCKAGE = 'grandimi:questionnaire'

/* Séparateur décimal français, comme sur la page de résultat. */
const fr = (valeur) => String(valeur).replace('.', ',')

/* ─────────────────────────────────────────────────────────────
   L'ORIGINE FAMILIALE : UN INTERRUPTEUR, ET POURQUOI IL EXISTE

   GoTall pose cette question, et elle est tentante : elle allonge le
   tunnel et elle a l'air savante. Sur le marché français elle est la
   SEULE question de ce fichier où « ça ne sert à rien » devient un
   problème juridique et pas seulement un écran de trop.

   L'origine ethnique est une donnée de l'article 9 du RGPD (catégorie
   particulière). La collecter chez un mineur exige un consentement
   explicite ET une finalité réelle : l'article 5.1.c interdit de
   recueillir une donnée dont on ne fait rien. Or `ethnic_background`
   existe déjà dans l'API (internal/api/handlers.go, ligne 44) et
   `v2_enhanced.go` ne le lit JAMAIS. En l'état, la question serait de la
   collecte sensible à vide.

   CE QUI LA REND DÉFENDABLE, et c'est la version implémentée ici : elle
   sert à ÉLARGIR LA MARGE, pas à déplacer l'estimation. Les coefficients
   Khamis-Roche sont dérivés de la Fels Longitudinal Study, un échantillon
   blanc nord-américain ; les appliquer à d'autres populations ajoute une
   erreur qu'on ne sait pas chiffrer. Le dire, et élargir en conséquence,
   est à la fois vrai, utile à l'utilisateur, et une finalité que la CNIL
   peut lire.

   Tant que le moteur ne fait pas cet élargissement (le champ part, il
   n'est pas encore consommé — voir docs/TUNNEL-ONBOARDING.md), cet
   écran reste en collecte facultative avec consentement explicite. Si
   tu préfères ne pas le poser du tout, un seul booléen le retire du
   tunnel, sans autre modification nulle part.
   ───────────────────────────────────────────────────────────── */
const COLLECTE_ORIGINE = true

/* Ordre complet des écrans. Certains ne concernent qu'un sexe : la liste
   réellement parcourue est dérivée plus bas, jamais celle-ci. */
const TOUTES_ETAPES = [
  'profil',
  'motivation',
  'sexe',
  'age',
  'taille',
  'poids',
  'modele',
  'pause-genetique',
  'pere',
  'mere',
  'proches',
  'origine',
  'precision',
  'vitesse',
  'pointure',
  'voix',
  'pilosite-visage',
  'pilosite-aisselles',
  'epaules',
  'menarche',
  'odeur',
  'acne',
  'potentiel',
  'sommeil',
  'nutrition',
  'activite',
  'aide',
  'verite',
  'long-terme',
  'taille-reve',
  'avis',
  'email',
  'recapitulatif',
  'analyse',
]

const ETAPES_GARCON = new Set(['voix', 'pilosite-visage', 'epaules'])

/* Toutes les etapes ne concernent pas tout le monde, et pour deux raisons
   differentes qu'il vaut mieux ne pas melanger.

   LE SEXE. Mue, pilosite du visage et elargissement des epaules ne se
   posent qu'aux garcons. Rien de juridique la-dedans : une question sans
   objet est juste un ecran de plus a passer.

   L'AGE, ET LA C'EST AUTRE CHOSE. La date des premieres regles est une
   donnee de sante. En France le consentement d'une mineure ne suffit pas
   avant quinze ans : il faut celui du titulaire de l'autorite parentale.
   On ne pose donc la question qu'a partir de quinze ans, ce qui evite
   d'avoir a construire un recueil de consentement parental au milieu du
   tunnel. C'est un filtre d'ECRAN, pas de modele :
   internal/estimator/menarche.go accepte n'importe quel age valide.

   Tous les ecrans conditionnes se trouvent APRES « sexe » et « age » : le
   prefixe de la liste est donc identique pour tous les profils, et
   l'index courant ne se decale jamais sous les pieds de quelqu'un qui
   revient changer une de ces deux reponses. */
function etapeApplicable(nom, reponses) {
  if (nom === 'origine') return COLLECTE_ORIGINE
  if (ETAPES_GARCON.has(nom)) return reponses.sex === 'M'
  if (nom === 'menarche') return reponses.sex === 'F' && Number(reponses.age) >= 15
  return true
}

function etapesPour(reponses) {
  return TOUTES_ETAPES.filter((etape) => etapeApplicable(etape, reponses))
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

  /* ---------- Ajouts de cette révision ----------
     Aucun de ces champs n'entre aujourd'hui dans le calcul de la taille.
     Deux partent vers l'API (`origine` et les deux signaux que
     `puberty_signs` accepte déjà) ; les autres restent en local et
     serviront à personnaliser le plan. C'est dit ici plutôt que découvert
     six mois plus tard en cherchant où ils sont consommés. */
  profil: '',
  motivations: [],
  proches_plus_grands: '',
  origine: '',
  voix: '',
  pilosite_visage: '',
  pilosite_aisselles: '',
  epaules: '',
  odeur: '',
  acne: '',
  taille_reve: 180,
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

/* Les motivations ne changent aucun calcul. Elles font deux choses, et
   elles les font bien : elles obligent le visiteur à FORMULER ce qu'il
   vient chercher dès le deuxième écran — ce qui est le meilleur
   prédicteur d'achèvement d'un tunnel — et elles donnent au plan de quoi
   s'ouvrir sur la raison exacte pour laquelle il a été demandé. */
const OPTIONS_MOTIVATION = [
  { valeur: 'taille_finale', titre: 'Savoir quelle taille je ferai' },
  { valeur: 'derniers_cm', titre: 'Gagner les derniers centimètres possibles' },
  { valeur: 'fini', titre: 'Savoir si j’ai fini de grandir' },
  { valeur: 'confiance', titre: 'Arrêter de me comparer aux autres' },
  { valeur: 'suivi', titre: 'Suivre ma croissance mois après mois' },
]

/* Les libellés sont ceux d'un adolescent qui se regarde, pas ceux d'un
   carnet de santé. « Stade 2 de Tanner » ne veut rien dire pour lui, et
   la question posée dans ces termes ferait fermer l'application.

   ─────────────────────────────────────────────────────────────
   PAS D'EMOJI SUR CES LISTES-CI, ET C'EST UNE RÈGLE, PAS UN OUBLI.

   Un emoji gagne sa place quand il ENCODE la réponse : on distingue
   🍟 de 🥦 sans lire, 🛋️ de 🏋️ non plus, et l'œil descend la liste deux
   fois plus vite. Les listes de sommeil, de nutrition, d'activité et de
   sexe les gardent pour cette raison.

   Sur une échelle abstraite — aucune / un peu / bien présente — il n'y a
   rien à encoder. Le ✅ et le 🚫 qui s'y trouvaient ne disaient pas la
   réponse, ils disaient « bon » et « mauvais » : exactement le jugement
   qu'on ne veut pas poser sur le corps d'un adolescent de quatorze ans
   qui déclare n'avoir aucune pilosité.

   C'est aussi ce que fait Flo, dont les listes de choix sont du texte
   noir sur une carte grise, sans un seul pictogramme. */
const OPTIONS_PILOSITE = [
  { valeur: 'none', titre: 'Aucune' },
  { valeur: 'light', titre: 'Un peu, fine' },
  { valeur: 'developed', titre: 'Bien présente' },
  { valeur: 'prefer_not', titre: 'Je préfère ne pas répondre' },
]

const OPTIONS_ECHELLE_3 = (libelles) => [
  { valeur: 'no', titre: libelles[0] },
  { valeur: 'starting', titre: libelles[1] },
  { valeur: 'yes', titre: libelles[2] },
  { valeur: 'unknown', titre: 'Je ne sais pas' },
]

const OPTIONS_ACNE = [
  { valeur: 'none', titre: 'Aucune' },
  { valeur: 'light', titre: 'Quelques boutons' },
  { valeur: 'moderate', titre: 'Régulièrement' },
  { valeur: 'important', titre: 'Beaucoup' },
]

/* ORIGINE FAMILIALE — libellés et correspondance avec l'API.

   Les intitulés parlent de l'origine de la FAMILLE et non de la
   « race » : c'est la formulation que retient la statistique publique
   française quand elle est autorisée à poser la question, et c'est aussi
   la seule qui soit à peu près répondable par quelqu'un de quatorze ans.

   Les valeurs envoyées, elles, sont celles que l'API attend déjà
   (handlers.go ligne 44 : caucasian, asian, african, hispanic, mixed). */
const OPTIONS_ORIGINE = [
  { valeur: 'caucasian', titre: 'Europe' },
  { valeur: 'african', titre: 'Afrique, Antilles' },
  { valeur: 'asian', titre: 'Asie' },
  { valeur: 'hispanic', titre: 'Amérique latine' },
  { valeur: 'mixed', titre: 'Plusieurs origines' },
  { valeur: 'prefer_not', titre: 'Je préfère ne pas répondre' },
]

/** 172 → 5'8". Le pouce est arrondi, jamais affiché avec des décimales. */
function formatPiedsPouces(pouces) {
  const pieds = Math.floor(pouces / 12)
  const reste = Math.round(pouces - pieds * 12)
  // 11,6 pouces arrondi à 12 doit devenir le pied suivant, pas 5'12".
  return reste === 12 ? `${pieds + 1}′0″` : `${pieds}′${reste}″`
}

/* Un segment du titre passe en orange.

   C'est la signature visuelle de Flo, et elle fait un vrai travail :
   sur un titre de deux lignes, l'oeil attrape d'abord les trois mots
   colores, qui sont ceux qui portent la question. Le reste se lit
   ensuite. Un titre entierement noir se lit dans l'ordre, c'est-a-dire
   plus lentement.

   Le segment est donne en clair dans TEXTES plutot qu'en balisage : un
   titre reste une chaine, il peut etre lu par un lecteur d'ecran, copie,
   traduit, sans qu'on ait a demonter du JSX. S'il ne s'y trouve pas —
   une faute de frappe apres une reecriture — le titre s'affiche
   entierement en noir plutot que de casser la page. */
function titreAvecAccent(titre, accent) {
  if (!accent) return titre
  const debut = titre.indexOf(accent)
  if (debut < 0) return titre
  return (
    <>
      {titre.slice(0, debut)}
      <span className="funnel-title-accent">{accent}</span>
      {titre.slice(debut + accent.length)}
    </>
  )
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

  /* L'e-mail n'est PAS repris de localStorage. Il y restait d'une session
     précédente, si bien que l'écran « entre ton e-mail » arrivait déjà
     rempli avec l'adresse de quelqu'un d'autre sur un appareil partagé —
     et la prédiction partait alors sur le mauvais compte. Une reprise de
     questionnaire en cours (`reprise`) le restitue toujours, elle. */
  const [reponses, setReponses] = useState(() => ({
    ...REPONSES_INITIALES,
    ...(reprise?.reponses || {}),
  }))

  /* Les dependances sont le SEXE ET L AGE, parce que `etapeApplicable`
     lit les deux. Passer `reponses` entier recalculerait la liste a
     chaque frappe ; ne dependre que du sexe, comme avant la fusion,
     laissait l ecran menarche hors du tunnel pour une fille de seize ans
     — il restait pourtant liste au recapitulatif, qui appelle
     `etapeApplicable` directement. Deux endroits qui repondaient
     differemment a la meme question. */
  const etapes = useMemo(
    () => etapesPour({ sex: reponses.sex, age: reponses.age }),
    [reponses.sex, reponses.age],
  )

  const [index, setIndex] = useState(() => {
    const repris = Number(reprise?.index)
    /* Jamais reprendre sur le récapitulatif ni sur l'écran d'analyse : on
       y arriverait avec des réponses partiellement effacées si le format a
       changé entre deux visites, et l'analyse relancerait un appel réseau
       avant même que l'utilisateur ait vu l'application. */
    const dernierRepricable =
      etapesPour({
        sex: reprise?.reponses?.sex || '',
        age: reprise?.reponses?.age,
      }).length - 2
    return Number.isInteger(repris) && repris > 0 && repris < dernierRepricable ? repris : 0
  })

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
  const [erreur, setErreur] = useState(null)
  /* Le panneau « comment ça marche » de l'écran « modèle ». */
  const [feuilleOuverte, setFeuilleOuverte] = useState(false)
  /* La réponse du serveur, mise de côté le temps que l'écran d'analyse
     finisse de se dérouler. `null` tant qu'elle n'est pas arrivée. */
  const [resultat, setResultat] = useState(null)

  const minuterie = useRef(null)
  /* Un verrou, et pas un état : `onPredictionComplete` crée le compte et
     écrit `predictionData`. L'appeler deux fois ouvrirait deux comptes
     pour la même prédiction. L'écran d'analyse appelle `onFini` depuis un
     effet — une seule fois dans les faits, mais c'est le genre de
     garantie qu'on ne veut pas devoir redémontrer à chaque révision de
     React. */
  const dejaLivre = useRef(false)
  const etape = etapes[index] || etapes[0]

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
     gens. Le rang est envoyé avec le nom pour que l'entonnoir reste
     lisible si l'ordre des écrans change un jour — ce qui vient
     justement d'arriver. */
  useEffect(() => {
    tunnelEtapeVue(etape, index + 1, etapes.length)
  }, [etape, index, etapes.length])

  useEffect(() => () => clearTimeout(minuterie.current), [])

  const definir = (champ, valeur) => setReponses((prec) => ({ ...prec, [champ]: valeur }))

  const basculer = (champ, valeur) =>
    setReponses((prec) => {
      const courant = Array.isArray(prec[champ]) ? prec[champ] : []
      return {
        ...prec,
        [champ]: courant.includes(valeur)
          ? courant.filter((v) => v !== valeur)
          : [...courant, valeur],
      }
    })

  /* `suivantApplicable`, venu de main, n'est PAS repris — et son absence
     est le seul point de cette fusion qui merite d'etre explique.

     Main gardait une liste d'etapes fixe et sautait, a la navigation,
     celles qui ne concernaient pas le profil. Cette branche filtre la
     liste elle-meme (`etapesPour`). Les deux mecanismes resolvent le meme
     probleme ; les empiler ferait sauter DEUX ecrans la ou il n'y en a
     qu'un a passer.

     Le filtrage en amont a un second effet, qui a pese dans le choix : la
     barre de progression compte les ecrans reellement parcourus. Avec une
     liste fixe et un saut, une fille de treize ans verrait la barre
     avancer de deux crans d'un coup, et un total qui ne correspond a rien
     de ce qu'elle a vu. */

  const avancer = () => {
    /* L'adresse est le seul champ qu'on demande sans rien donner en
       échange à cet instant : savoir combien la franchissent dit si
       elle coûte des conversions. La valeur saisie, elle, ne part
       jamais vers PostHog. */
    if (etape === 'email') emailSaisi()
    clearTimeout(minuterie.current)
    setIndex((i) => Math.min(etapes.length - 1, i + 1))
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
      case 'profil':
        return Boolean(reponses.profil)
      /* Au moins une motivation. La question sert à faire formuler une
         intention : la passer à vide la viderait de son seul effet. */
      case 'motivation':
        return reponses.motivations.length > 0
      case 'sexe':
        return Boolean(reponses.sex)
      case 'proches':
        return Boolean(reponses.proches_plus_grands)
      /* L'origine est la SEULE question sans réponse obligatoire, y
         compris sans « je préfère ne pas répondre » coché : un
         consentement qu'on ne peut pas refuser sans se déclarer n'en est
         pas un. Passer l'écran sans rien toucher vaut refus. */
      case 'origine':
        return true
      case 'voix':
        return Boolean(reponses.voix)
      case 'pilosite-visage':
        return Boolean(reponses.pilosite_visage)
      case 'pilosite-aisselles':
        return Boolean(reponses.pilosite_aisselles)
      case 'epaules':
        return Boolean(reponses.epaules)
      case 'odeur':
        return Boolean(reponses.odeur)
      case 'acne':
        return Boolean(reponses.acne)
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

  /* L'appel part dès l'ENTRÉE sur l'écran d'analyse, en parallèle de
     l'animation, et non à sa fin. C'est tout l'intérêt de cet écran :
     les quatre secondes et demie de déroulé couvrent la latence réseau
     au lieu de s'y ajouter. Sur une API chaude l'utilisateur ne voit que
     l'animation ; sur une API endormie (offre gratuite Render, jusqu'à
     une minute) il voit l'animation PUIS le message d'attente, et non un
     bouton grisé pendant une minute. */
  useEffect(() => {
    if (etape !== 'analyse' || resultat || erreur) return undefined

    let annule = false
    estimationDemandee()

    const partir = async () => {
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

          /* L'origine part vide quand elle est refusée ou non posée. Le
             serveur retombe alors sur `caucasian` (handlers.go l. 123),
             ce qui est aujourd'hui sans effet — aucun coefficient n'en
             dépend. Le champ voyage pour que l'élargissement de marge
             décrit dans docs/TUNNEL-ONBOARDING.md n'ait qu'un seul
             endroit à modifier, côté moteur. */
          ethnic_background:
            reponses.origine && reponses.origine !== 'prefer_not' ? reponses.origine : '',

          /* Le SEUL signal de puberté que l'API accepte encore par ce
             champ. Les autres — voix, visage, épaules, odeur, acné — n'ont
             pas de slot et restent en local ; les inventer ici les ferait
             silencieusement jeter par le décodeur JSON.

             La ménarche N'Y EST PLUS. Elle voyage désormais par
             `menarche_survenue` / `age_menarche_annees`, parce qu'elle
             n'est plus un signal de maturité parmi d'autres mais une
             TROISIÈME ANCRE, au même rang que Khamis-Roche et le suivi de
             percentile (internal/estimator/menarche.go). L'envoyer aux
             deux endroits la compterait deux fois.

             La pilosité, elle, ne déplace toujours rien :
             getPubertyAdjustment n'est appelé que par le chemin v1, et son
             multiplicateur y est jeté (khamis_roche.go l. 90). */
          puberty_signs: {
            axillary_hair:
              reponses.pilosite_aisselles === 'prefer_not'
                ? ''
                : reponses.pilosite_aisselles,
          },
        }

        const reponse = utiliserAPI
          ? await apiClient.predictHeightV2(charge)
          : await mockPredictHeight(charge)

        if (annule) return

        estimationObtenue({
          age: Number(reponses.age),
          sexe: reponses.sex,
          confiance: reponse.confidence_level,
        })
        setResultat(reponse)
      } catch (err) {
        if (annule) return
        estimationEchouee(err.message)
        setErreur(err.message)
      }
    }

    partir()
    return () => {
      annule = true
    }
  }, [etape, resultat, erreur, reponses])

  /* Appelé par l'écran d'analyse quand SES deux conditions sont réunies :
     le déroulé est allé au bout et la réponse est arrivée. */
  const livrerResultat = () => {
    if (!resultat || dejaLivre.current) return
    dejaLivre.current = true

    /* La réponse du serveur ne réémet ni l'e-mail ni les mesures saisies :
       on les rattache ici. Sans l'e-mail, la paywall et l'écran parent
       n'identifient plus le compte ; sans les mesures, le plan de croissance
       n'a rien à personnaliser. */
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

      /* Transmis au reste de l'application parce que la page de résultat
         et la paywall en ont besoin :
           - `profil` décide à qui la paywall s'adresse (un parent a une
             carte, un adolescent n'en a pas — cf. le bouton « faire payer
             par un parent ») ;
           - `motivations` donne au plan la raison exacte pour laquelle il
             a été demandé ;
           - `taille_reve` est l'écart que la page de résultat compare à
             l'estimation, et c'est le seul chiffre de tout le tunnel que
             l'utilisateur a choisi lui-même. */
      profil: reponses.profil,
      motivations: reponses.motivations,
      taille_reve: Number(reponses.taille_reve),
    })

    // Le tunnel est terminé : garder le brouillon rouvrirait un questionnaire
    // à moitié rempli au prochain passage.
    try {
      localStorage.removeItem(STOCKAGE)
    } catch {
      /* sans conséquence */
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

  if (etape === 'analyse') {
    return (
      <AnalyseEnCours
        pret={Boolean(resultat)}
        erreur={erreur}
        onFini={livrerResultat}
        /* Effacer l'erreur suffit à relancer : l'effet qui appelle l'API
           se redéclenche dès que `erreur` retombe à null, et l'animation
           repart du même écran. Rien à remonter, rien à ressaisir. */
        onReessayer={() => setErreur(null)}
      />
    )
  }

  // ---------- Écrans encadrés ----------

  const progression = (index + 1) / etapes.length

  const contenu = () => {
    switch (etape) {
      /* QUI RÉPOND. Posée en premier parce qu'elle change la suite du
         parcours sans changer une seule question : c'est elle qui décide
         à qui la page de paiement s'adresse. Un adolescent de quatorze
         ans n'a pas de carte bancaire — lui présenter le même écran qu'à
         un parent, c'est lui demander de renoncer. */
      case 'profil':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Qui répond">
            <ChoiceCard
              icon="🧑"
              title="C’est pour moi"
              hint="J’ai entre 8 et 22 ans"
              selected={reponses.profil === 'ado'}
              onSelect={() => repondreEtAvancer('profil', 'ado')}
            />
            {/* 👪 et non 👨‍👩‍👦 : le second est une séquence ZWJ de trois
                emojis assemblés, que les polices incomplètes rendent en
                trois pictogrammes accolés — ou en carré vide. Le premier
                est un point de code unique, présent partout. */}
            <ChoiceCard
              icon="👪"
              title="C’est pour mon enfant"
              hint="Les questions parleront de lui ou d’elle"
              selected={reponses.profil === 'parent'}
              onSelect={() => repondreEtAvancer('profil', 'parent')}
            />
          </div>
        )

      case 'motivation':
        return (
          <div className="funnel-choices" role="group" aria-label="Tes raisons">
            {OPTIONS_MOTIVATION.map((option) => (
              <ChoiceCard
                key={option.valeur}
                role="checkbox"
                icon={option.icone}
                title={option.titre}
                selected={reponses.motivations.includes(option.valeur)}
                onSelect={() => basculer('motivations', option.valeur)}
              />
            ))}
          </div>
        )

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

      /* ÉCRAN DE PREUVE 1 — le modèle.

         Placé juste après les quatre mesures de base, c'est-à-dire au
         premier moment où le visiteur a donné quelque chose sans encore
         rien recevoir. La question qu'il se pose à cet instant est
         « pourquoi je remplis tout ça ? », et cet écran y répond avant
         qu'elle ne devienne « je ferme ». */
      case 'modele':
        return (
          <div className="funnel-preuve">
            <ReseauNeurones className="funnel-reseau" />
            <button
              type="button"
              className="funnel-lien-info"
              onClick={() => setFeuilleOuverte(true)}
            >
              <Info size={17} aria-hidden="true" />
              Comment ça marche ?
            </button>
          </div>
        )

      /* LES PROCHES PLUS GRANDS QUE LES PARENTS.

         Elle a l'air anodine et elle est la plus habile du tunnel : elle
         rouvre le plafond que la question précédente vient de poser. Un
         adolescent qui vient de saisir 176 et 164 a déjà fait le calcul
         dans sa tête et s'est résigné ; lui rappeler qu'un grand-père
         d'1,90 m existe dans la famille lui rend la raison de continuer.

         Elle est vraie, aussi : la taille adulte n'est pas la moyenne des
         parents, elle est tirée d'un patrimoine plus large, et c'est
         exactement pourquoi Khamis-Roche regarde l'adolescent lui-même
         plutôt que ses seuls parents. Elle n'entre dans aucun calcul —
         et ne DOIT pas y entrer tant qu'aucun coefficient ne la pèse. */
      case 'proches':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Proches plus grands">
            <ChoiceCard
              title="Oui, nettement"
              hint="Un grand-parent, un oncle, un frère ou une sœur"
              selected={reponses.proches_plus_grands === 'yes'}
              onSelect={() => repondreEtAvancer('proches_plus_grands', 'yes')}
            />
            <ChoiceCard
              title="Un peu plus grands"
              selected={reponses.proches_plus_grands === 'slightly'}
              onSelect={() => repondreEtAvancer('proches_plus_grands', 'slightly')}
            />
            <ChoiceCard
              title="Non, tout le monde est dans la même fourchette"
              selected={reponses.proches_plus_grands === 'no'}
              onSelect={() => repondreEtAvancer('proches_plus_grands', 'no')}
            />
            <ChoiceCard
              title="Je ne sais pas"
              selected={reponses.proches_plus_grands === 'unknown'}
              onSelect={() => repondreEtAvancer('proches_plus_grands', 'unknown')}
            />
          </div>
        )

      /* ORIGINE FAMILIALE — voir le long commentaire en tête de fichier.
         Facultative, refusable sans se déclarer, et accompagnée de la
         raison exacte pour laquelle on la pose. Ces trois propriétés ne
         sont pas du confort : ce sont les conditions de l'article 9 du
         RGPD, et la question ne peut pas rester dans le tunnel sans
         elles. */
      case 'origine':
        return (
          <>
            <div className="funnel-choices" role="radiogroup" aria-label="Origine familiale">
              {OPTIONS_ORIGINE.map((option) => (
                <ChoiceCard
                  key={option.valeur}
                  icon={option.icone}
                  title={option.titre}
                  selected={reponses.origine === option.valeur}
                  onSelect={() => repondreEtAvancer('origine', option.valeur)}
                />
              ))}
            </div>
            <p className="funnel-help">
              Facultatif. Ça améliore la précision. Tu peux passer.
            </p>
          </>
        )

      /* ÉCRAN DE PREUVE 2 — ce que vaut l'estimation.

         Posé juste après le bloc génétique, au moment où le visiteur
         vient de comprendre que le calcul repose surtout sur ses
         parents. L'objection qui monte est « donc c'est juste une
         moyenne ? » — et la réponse est un chiffre de marge, pas un
         adjectif. */
      case 'precision':
        return <BadgePrecision />

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

      /* POINTURE — le second signal de maturité qui entre VRAIMENT dans
         le calcul (maturite.go), et le seul de tout le bloc suivant.

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
                    definir(‘shoe_size_eu’, v)
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

      /* ---------- LE BLOC MATURITÉ ----------

         Six à huit écrans selon le sexe, et la partie la plus délicate de
         cette révision. Ce qu'ils font, dans l'ordre d'importance :

         1. ILS CONVAINQUENT. C'est leur rôle principal et il est assumé.
            Une application qui demande si ta voix a mué ne ressemble plus
            à un calculateur en ligne ; elle ressemble à un examen. C'est
            le mécanisme décrit en tête de fichier, et c'est ce que font
            tous les tunnels de ce marché.

         2. ILS PRÉPARENT LE PLAN. Un adolescent en début de puberté et un
            adolescent qui l'a terminée n'ont pas le même plan à suivre,
            et ces réponses sont ce qui permettra de les distinguer.

         3. ILS NE DÉPLACENT PAS L'ESTIMATION. Aujourd'hui, aucun. Deux
            partent vers `puberty_signs`, que le chemin v2 n'exploite pas.
            Tant que ce sera le cas, AUCUN texte de ces écrans ne doit
            laisser entendre le contraire : le sous-titre parle de
            « comprendre où tu en es », jamais de « affiner ton chiffre ».
            C'est la limite entre un tunnel long et un tunnel menteur.

         CE QU'ON NE DEMANDE PAS, et qui manque délibérément à cette
         liste : la pilosité pubienne et le développement génital, que
         l'échelle de Tanner utilise et que l'API accepte encore
         (`pubic_hair`, `genitalia`). Le moteur a explicitement renoncé à
         les collecter — « sans demander à un mineur d'auto-évaluer sa
         pilosité pubienne ou son développement génital (donnée de santé
         sensible au RGPD) », v2_enhanced.go l. 551. Allonger le tunnel
         ne rouvre pas cette porte-là. */
      case 'voix':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Mue de la voix">
            {OPTIONS_ECHELLE_3([
              'Pas encore',
              'Elle commence à changer',
              'Oui, elle a mué',
            ]).map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                selected={reponses.voix === option.valeur}
                onSelect={() => repondreEtAvancer('voix', option.valeur)}
              />
            ))}
          </div>
        )

      case 'pilosite-visage':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Pilosité du visage">
            {OPTIONS_PILOSITE.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                selected={reponses.pilosite_visage === option.valeur}
                onSelect={() => repondreEtAvancer('pilosite_visage', option.valeur)}
              />
            ))}
          </div>
        )

      case 'pilosite-aisselles':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Pilosité sous les bras">
            {OPTIONS_PILOSITE.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                selected={reponses.pilosite_aisselles === option.valeur}
                onSelect={() => repondreEtAvancer('pilosite_aisselles', option.valeur)}
              />
            ))}
          </div>
        )

      case 'epaules':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Élargissement des épaules">
            {OPTIONS_ECHELLE_3([
              'Pas vraiment',
              'Un peu, depuis quelques mois',
              'Oui, nettement',
            ]).map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                selected={reponses.epaules === option.valeur}
                onSelect={() => repondreEtAvancer('epaules', option.valeur)}
              />
            ))}
          </div>
        )

      /* LES PREMIÈRES RÈGLES — écran repris de `main`, pas le mien.

         J'avais posé un oui/non à toutes les filles. Trois raisons de lui
         préférer celui-ci, et la première suffirait :

         1. L'ÂGE, PAS LE FAIT. Depuis `main`, la ménarche n'est plus un
            signal de maturité parmi d'autres : c'est une TROISIÈME ANCRE
            du calcul, au même rang que Khamis-Roche et le suivi de
            percentile (internal/estimator/menarche.go). Or l'ancre a
            besoin de la DATE — elle s'éteint 2,5 ans après. Un oui/non ne
            l'alimente pas.

         2. QUINZE ANS ET PLUS. La date des premières règles est une donnée
            de santé, et en France le consentement d'une mineure ne suffit
            pas avant quinze ans. Mon écran la demandait à toutes, y
            compris à une fille de onze ans. Le filtre est dans
            `etapeApplicable`.

         3. UN SEUL REFUS. « Pas encore » et « je préfère ne pas répondre »
            produisent le même calcul — aucune ancre. Deux cartes pour un
            seul effet donneraient l'illusion d'un choix. */
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

      case 'odeur':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Odeur corporelle">
            {OPTIONS_ECHELLE_3([
              'Non, pas vraiment',
              'Depuis peu',
              'Oui, j’utilise un déodorant',
            ]).map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                selected={reponses.odeur === option.valeur}
                onSelect={() => repondreEtAvancer('odeur', option.valeur)}
              />
            ))}
          </div>
        )

      case 'acne':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Acné">
            {OPTIONS_ACNE.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                selected={reponses.acne === option.valeur}
                onSelect={() => repondreEtAvancer('acne', option.valeur)}
              />
            ))}
          </div>
        )

      /* ÉCRANS DE PREUVE 3 ET 4 — le problème, puis le produit.

         Deux écrans construits sur la même figure, et c'est le
         mécanisme : le premier montre trois leviers autour d'un centre
         vide, le second remet le même dessin avec Grandimi à la place du
         centre. Voir ruche-potentiel.jsx.

         Ils encadrent les trois questions d'habitudes (sommeil,
         nutrition, activité) plutôt que de les suivre : on annonce ce
         qu'on va demander, on le demande, puis on dit ce qu'on en fera.
         Posés tous les deux après, ils se liraient comme deux écrans de
         publicité de suite. */
      case 'potentiel':
        return <RuchePotentiel variante="ruche" className="funnel-ruche" />

      case 'aide':
        return <RuchePotentiel variante="convergence" className="funnel-ruche" />

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

         DOULEUR, PUIS BASCULE, PUIS CE QU'ON VEND.

         Les quatre premières lignes décrivent ce que le lecteur ressent
         déjà, à la deuxième personne : on ne lui apprend rien, on nomme ce
         qu'il connaît. Aucune n'est un chiffre à croire sur parole, et
         c'est ce qui les rend défendables là où un « 40 % de matchs en
         moins » ne l'est pas.

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

      /* ---------- Ce que le plan change, sur la durée ----------

         Copie de l'écran « résultats à long terme » du tunnel de Taller :
         deux courbes partant du même point, celle des habitudes subies
         finissant sous celle de la routine optimisée, une légende dessous.

         Posé ICI, avant le calcul, et non sur la page de résultat : à cet
         instant aucun chiffre n'existe encore, donc la figure ne peut pas
         être prise pour un pronostic personnel. Elle dit une chose vraie et
         générale, et la légende sous le dessin le précise.

         C'est aussi lui qui porte, désormais seul, ce que disait l'écran
         « part-habitudes » retiré de ce tunnel — l'écart entre subir ses
         habitudes et les tenir — mais en trajectoires plutôt qu'en un
         « 20 % » qui posait surtout un plafond de 80 % juste avant de
         demander de payer. */
      case 'long-terme':
        return <LongTermeChart className="funnel-longterme" />

      /* LA TAILLE DE RÊVE.

         Le seul chiffre de tout le tunnel que l'utilisateur CHOISIT au
         lieu de le constater. C'est ce qui en fait le plus utile des
         écrans de conviction : il ne lui dit rien, il lui fait dire.

         Posé juste avant l'e-mail, c'est-à-dire au dernier moment où on
         demande quelque chose de gratuit — et l'écart entre ce nombre et
         l'estimation qui arrive trois écrans plus loin est exactement ce
         que la page de résultat, puis la paywall, ont à travailler.

         Il n'entre dans aucun calcul, et le sous-titre le dit. Un objectif
         qui déplacerait l'estimation ne serait plus une estimation. */
      case 'taille-reve':
        return (
          <>
            {unite === 'metric' ? (
              <WheelPicker
                label="Taille rêvée en centimètres"
                min={140}
                max={215}
                step={1}
                value={Math.round(Number(reponses.taille_reve))}
                onChange={(v) => definir('taille_reve', v)}
                format={(v) => `${v} cm`}
              />
            ) : (
              <WheelPicker
                label="Taille rêvée en pieds et pouces"
                min={versPouces(140)}
                max={versPouces(215)}
                step={1}
                value={versPouces(Number(reponses.taille_reve))}
                onChange={(v) => definir('taille_reve', Math.round(v * CM_PAR_POUCE * 10) / 10)}
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

      /* LES AVIS — posés juste avant l'adresse e-mail, et pas ailleurs.

         C'est le seul écran du tunnel où la parole n'est pas celle de la
         marque, et il doit donc tomber au moment où la marque est le
         moins crédible : celui où elle demande quelque chose sans rien
         donner en échange. L'adresse est ce moment.

         Posé plus tôt, il se lit comme de la publicité au milieu d'un
         questionnaire ; posé après, il arrive une fois la décision
         prise. Voir avis.jsx pour ce qui est repris de Flo et ce qui ne
         l'est pas — le nombre de notes, notamment. */
      case 'avis':
        return <Avis />

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
        /* Les cibles de « Modifier » sont RÉSOLUES PAR NOM, plus par un
           index écrit à la main.

           L'ancienne version portait des nombres (« vers: 15 ») avec un
           commentaire avertissant qu'un écran ajouté les décalerait tous.
           Ce tunnel vient de passer de dix-sept à trente et un écrans, et
           le nombre d'écrans dépend maintenant du SEXE déclaré : ces
           nombres ne pouvaient pas survivre, et un « Modifier » qui ouvre
           l'écran d'à côté est le genre de défaut qu'on ne voit qu'en
           production. */
        const vers = (nom) => etapes.indexOf(nom)

        const lignes = [
          { label: 'Sexe', valeur: reponses.sex === 'M' ? 'Garçon' : 'Fille', vers: vers('sexe') },
          /* `fr` sur toutes les valeurs numériques : l'âge, le poids et la
             croissance de l'année avancent de demi en demi, et le
             récapitulatif est l'écran où l'on demande justement de RELIRE
             ses réponses. Les y afficher au point anglais, juste avant un
             résultat qui écrit tout à la virgule, était la seule page où
             les deux écritures se croisaient ligne à ligne. */
          { label: 'Âge', valeur: `${fr(reponses.age)} ans`, vers: vers('age') },
          { label: 'Ta taille', valeur: `${fr(reponses.height_cm)} cm`, vers: vers('taille') },
          { label: 'Ton poids', valeur: `${fr(reponses.weight_kg)} kg`, vers: vers('poids') },
          { label: 'Père', valeur: `${fr(reponses.father_height_cm)} cm`, vers: vers('pere') },
          { label: 'Mère', valeur: `${fr(reponses.mother_height_cm)} cm`, vers: vers('mere') },
          {
            label: 'Grandi cette année',
            valeur:
              reponses.height_velocity_cm === null
                ? 'Je ne sais pas'
                : `${fr(reponses.height_velocity_cm)} cm`,
            vers: vers('vitesse'),
          },
          {
            label: 'Pointure',
            valeur:
              reponses.shoe_size_eu === null
                ? 'Non renseignée'
                : `${fr(reponses.shoe_size_eu)} (${fr(reponses.shoe_size_eu_1y)} il y a un an)`,
            vers: vers('pointure'),
          },
          /* Ligne conditionnelle : l'écran ménarche n'existe pas pour tout
             le monde, et `vers()` rendrait -1 pour un profil qui ne l'a pas
             vu — « Modifier » renverrait alors en fin de liste. */
          ...(etapeApplicable('menarche', reponses)
            ? [
                {
                  label: 'Premières règles',
                  valeur:
                    reponses.menarche_survenue === true
                      ? `${fr(reponses.age_menarche_annees)} ans`
                      : 'Non renseigné',
                  vers: vers('menarche'),
                },
              ]
            : []),
          {
            label: 'Taille rêvée',
            valeur: `${fr(reponses.taille_reve)} cm`,
            vers: vers('taille-reve'),
          },
          { label: 'E-mail', valeur: reponses.email, vers: vers('email') },
        ]

        /* Le bloc maturité n'est pas déplié ligne à ligne : six à huit
           réponses de plus feraient de cet écran un mur à faire défiler,
           juste avant le bouton qui compte. Une ligne qui dit combien de
           signaux ont été donnés suffit à rassurer, et « Modifier » ouvre
           le début du bloc pour qui veut y revenir. */
        const signauxMaturite = [
          reponses.voix,
          reponses.pilosite_visage,
          reponses.pilosite_aisselles,
          reponses.epaules,
          /* La menarche ne compte PLUS parmi les signaux de maturite :
             elle a sa propre ligne au recapitulatif, et surtout elle est
             devenue une ancre du calcul. La compter ici la ferait
             apparaitre deux fois sur le meme ecran. */
          reponses.odeur,
          reponses.acne,
        ].filter((valeur) => valeur && valeur !== 'prefer_not' && valeur !== 'unknown').length

        if (signauxMaturite > 0) {
          lignes.splice(8, 0, {
            label: 'Développement',
            valeur: `${signauxMaturite} signal${signauxMaturite > 1 ? 'ux' : ''} renseigné${
              signauxMaturite > 1 ? 's' : ''
            }`,
            vers: vers(reponses.sex === 'M' ? 'voix' : 'pilosite-aisselles'),
          })
        }

        return (
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
                      QUOI on modifie, sinon un lecteur d'écran annonce dix
                      boutons « Modifier » indiscernables. */}
                  <span aria-hidden="true">Modifier</span>
                  <span className="sr-only">Modifier : {ligne.label}</span>
                </button>
              </div>
            ))}
          </dl>
        )
      }

      default:
        return null
    }
  }

  /* ============================================================
     LES TEXTES
     ============================================================
     Titre et sous-titre de chaque écran. Trois d'entre eux sont repris
     quasi mot pour mot du tunnel français de GoTall (« Quelle est la
     précision de notre prédiction de taille ? », « Optimise tout ton
     potentiel de taille », « GoTall t'aide pour ça ») : ce sont des
     formulations d'interface courtes et factuelles, elles marchent, et
     les reprendre ne coûte rien.

     LES DEUX ÉCRANS ANGLAIS, EUX, NE SONT PAS TRADUITS TELS QUELS, et
     il faut dire pourquoi plutôt que de le laisser deviner.

     GoTall titre « The World's Best Height Prediction Model ». Un
     superlatif publicitaire doit pouvoir être étayé pour être diffusé en
     France (art. L121-2 du code de la consommation) : « le meilleur au
     monde » ne s'étaye pas, et sur un produit de santé vendu à des
     mineurs c'est le premier grief qu'on récolte. La version retenue
     garde l'argument qui porte réellement — des mois de travail, un vrai
     modèle, pas une moyenne de parents — et laisse tomber le superlatif,
     qui n'a jamais été ce qui convainc.

     De même « over 22 million kids » : Grandimi n'a pas vingt-deux
     millions de dossiers. Ce qu'il a est vérifiable et se dit mieux —
     deux modèles indépendants, des tables de référence publiées, une
     marge affichée. L'argument est plus fort parce qu'un lecteur peut
     aller le vérifier.

     SI TU VEUX QUAND MÊME LA VERSION MOT POUR MOT, elle est ici, en
     commentaire, et ne demande qu'un copier-coller :

         modele: {
           titre: 'Le meilleur modèle de prédiction de taille au monde',
           sous: "Une équipe d'ingénieurs Grandimi a passé des mois à " +
                 "construire le meilleur moteur de prédiction de taille " +
                 'au monde.',
         }

     Le risque décrit plus haut est à toi, pas au code. Il est écrit ici
     pour qu'il soit pris en connaissance de cause.
     ============================================================ */
  const TEXTES = {
    profil: {
      titre: 'Tu réponds pour toi, ou pour ton enfant ?',
      accent: 'pour ton enfant',
      sous: 'Les questions sont les mêmes. Ça change juste à qui on s’adresse à la fin.',
    },
    motivation: {
      titre: 'Pourquoi tu veux utiliser Grandimi ?',
      accent: 'Grandimi',
      sous: 'Plusieurs réponses possibles. On s’en sert pour ouvrir ton plan sur ce qui t’amène.',
    },
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
    modele: {
      titre: 'Le modèle de prédiction Grandimi',
      accent: 'Grandimi',
      sous: 'Des mois de travail pour un seul chiffre — et pour la marge qui va avec.',
    },
    pere: {
      titre: 'Combien mesure ton père ?',
      sous: 'La taille des parents pèse le plus lourd dans l’estimation.',
    },
    mere: {
      titre: 'Combien mesure ta mère ?',
      sous: 'Avec celle de ton père, c’est la base du calcul.',
    },
    proches: {
      titre: 'As-tu des proches plus grands que tes parents ?',
      accent: 'plus grands',
      sous: 'Ta taille ne vient pas que de ton père et de ta mère. Un grand-parent compte aussi.',
    },
    origine: {
      titre: 'D’où vient ta famille ?',
      sous: 'Question facultative, et tu peux la passer sans répondre.',
    },
    precision: {
      titre: 'Quelle est la précision de notre prédiction de taille ?',
      accent: 'précision',
      sous: 'On combine des mesures clés et des facteurs environnementaux pour estimer ton potentiel.',
    },
    vitesse: {
      titre: 'Tu as grandi de combien depuis l’an dernier ?',
      sous: 'Compare avec une vieille photo, une toise, ou demande à tes parents.',
    },
    pointure: {
      titre: ‘Quelle est ta pointure ?’,
      sous: ‘Ça améliore la précision. Facultatif.’,
    },
    /* Les sous-titres du bloc maturité disent tous la même chose sous
       une forme différente : « ça situe où tu en es ». Aucun ne promet
       que la réponse affine le chiffre, parce qu'aucune ne le fait
       aujourd'hui. Le jour où l'une d'elles entrera dans le calcul, son
       sous-titre changera le même jour. */
    voix: {
      titre: 'Est-ce que ta voix a mué ?',
      accent: 'a mué',
      sous: 'La mue arrive tard dans la puberté. Elle situe où tu en es sur ta courbe.',
    },
    'pilosite-visage': {
      titre: 'As-tu de la pilosité sur le visage ?',
      sous: 'Un repère de plus pour situer ton avancement.',
    },
    'pilosite-aisselles': {
      titre: 'As-tu de la pilosité sous les bras ?',
      sous: 'Elle apparaît à peu près au moment du pic de croissance.',
    },
    epaules: {
      titre: 'Tes épaules se sont-elles élargies ?',
      sous: 'L’élargissement des épaules accompagne la dernière phase de croissance.',
    },
    menarche: {
      titre: 'À quel âge as-tu eu tes premières règles ?',
      accent: 'premières règles',
      sous: 'Ça améliore la précision. Facultatif.',
    },
    odeur: {
      titre: 'As-tu remarqué une odeur corporelle nouvelle ?',
      sous: 'Elle apparaît tôt, souvent avant tout le reste.',
    },
    acne: {
      titre: 'Comment est ta peau en ce moment ?',
      sous: 'L’acné suit les mêmes hormones que la poussée de croissance.',
    },
    potentiel: {
      titre: 'Optimise tout ton potentiel de taille',
      accent: 'potentiel de taille',
      sous: 'Pour grandir au maximum, dors bien, mange bien et reste actif.',
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
    aide: {
      titre: 'Grandimi t’aide pour ça',
      accent: 'Grandimi',
      sous: 'On te guide vers ton plein potentiel avec des étapes simples et efficaces.',
    },
    verite: {
      titre: 'La vérité brutale sur la petite taille',
      accent: 'vérité brutale',
      sous: 'Pas des statistiques. Juste ce que tu vis déjà.',
    },
    'long-terme': {
      titre: 'Grandimi joue sur la durée',
      accent: 'sur la durée',
      sous: 'Beaucoup n’atteignent pas leur plein potentiel de taille à cause d’habitudes non optimisées.',
    },
    'taille-reve': {
      titre: 'Quelle taille tu rêves de faire ?',
      accent: 'tu rêves',
      sous: 'Ça ne change pas le calcul. Ça dit juste où tu voudrais arriver.',
    },
    avis: {
      titre: 'Ils sont passés par là avant toi',
      accent: 'passés par là',
      sous: 'Trois utilisateurs de Grandimi, et ce qu’ils ont mesuré depuis.',
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
      sous: 'Ton résultat s’affiche tout de suite. Un seul e-mail ensuite : dans un mois, pour te re-mesurer.',
    },
    recapitulatif: {
      titre: 'On vérifie avant de calculer',
      sous: 'Une mesure fausse fausse tout le reste. Corrige si besoin.',
    },
  }

  const texte = TEXTES[etape] || {}

  /* « Ignorer » n'apparait QUE sur les ecrans qu'on peut reellement
     passer sans rien repondre. En mettre partout le viderait de son
     sens ; n'en mettre nulle part transforme un tunnel de trente-deux
     ecrans en interrogatoire.

     `origine` y figure pour une raison qui n'est pas ergonomique : un
     consentement qu'on ne peut pas refuser sans se declarer n'en est
     pas un (RGPD, art. 9). Les autres y figurent parce que le moteur
     traite deja leur absence comme strictement neutre. */
  const ECRANS_FACULTATIFS = new Set([
    'origine',
    'vitesse',
    'pointure',
    'voix',
    'pilosite-visage',
    'pilosite-aisselles',
    'epaules',
    'menarche',
    'odeur',
    'acne',
    'taille-reve',
  ])

  /* Le libellé du bouton dépend de l'écran. Sur les écrans de preuve,
     « Suivant » sonne comme un formulaire alors qu'on vient de donner
     quelque chose à lire — le verbe reprend ce que l'écran vient de
     dire, ce qui est la seule différence entre un bouton qu'on presse et
     un bouton qu'on subit. */
  const libelleBouton = (() => {
    switch (etape) {
      case 'modele':
        return 'Continuer'
      case 'precision':
        return 'Continuer'
      case 'verite':
        return 'Voir ce que je peux encore optimiser'
      case 'aide':
        return 'On y va'
      case 'recapitulatif':
        return 'Analyser mes réponses'
      default:
        return 'Suivant'
    }
  })()

  return (
    <>
      <FunnelShell
        onBack={reculer}
        progress={progression}
        title={titreAvecAccent(texte.titre, texte.accent)}
        subtitle={texte.sous}
        onSkip={ECRANS_FACULTATIFS.has(etape) ? avancer : undefined}
        footer={
          <FunnelButton onClick={avancer} disabled={!peutContinuer}>
            {libelleBouton}
          </FunnelButton>
        }
      >
        {contenu()}
      </FunnelShell>

      {/* Le panneau « comment ça marche » de l'écran « modèle ».

          Monté au-dessus du tunnel et non dedans : il doit couvrir le
          bouton « Continuer », sans quoi on peut avancer d'un écran
          pendant qu'il est ouvert.

          Les quatre points reprennent la STRUCTURE d'argumentation de
          GoTall — ce n'est pas une devinette / voici sur quoi c'est
          construit / les méthodes courantes n'utilisent que deux ou
          trois chiffres et rendent une grande fourchette / nous
          combinons tout et resserrons — avec les chiffres de Grandimi,
          qui ont l'avantage d'être exacts et vérifiables dans le dépôt :
          ±8,5 cm pour la seule mi-parentale et ±4 cm au mieux pour le
          modèle complet sont écrits dans v2_enhanced.go. */}
      {feuilleOuverte && (
        <FeuilleInfo
          titre="Comment marche la prédiction"
          intro="Ce n’est pas une estimation au doigt mouillé. Grandimi fait tourner un vrai modèle de croissance, construit sur des données de référence publiées."
          points={[
            'Chaque estimation croise deux modèles indépendants : Khamis–Roche, qui regarde ta taille, ton poids et tes parents, et le suivi de ton couloir de croissance sur les courbes OMS.',
            'Ces courbes de référence sont établies sur des dizaines de milliers d’enfants mesurés pendant des années.',
            'La méthode que tout le monde utilise — la moyenne de la taille des parents — ne prend que deux chiffres et rend une fourchette d’environ ± 8,5 cm.',
            'Grandimi y ajoute ta taille, ton poids, ta vitesse de croissance et ta maturité, et resserre la fourchette jusqu’à ± 4 cm. Cette marge est affichée sur ton résultat, pas cachée en bas de page.',
          ]}
          cta="Compris"
          onFermer={() => setFeuilleOuverte(false)}
        />
      )}
    </>
  )
}

export default QuestionnaireFlow
