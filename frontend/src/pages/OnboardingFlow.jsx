import { useEffect, useMemo, useRef, useState } from 'react'
import { User, Users } from 'lucide-react'

import { FunnelShell, FunnelButton } from '@/components/ui/funnel-shell'
import { AnalyseEnCours } from '@/components/ui/analyse-en-cours'
import '../styles/funnel.css'

import apiClient from '../lib/api'
import { mockPredictHeight } from '../lib/mock-api'
import {
  tunnelAbandonne,
  tunnelDemarre,
  tunnelEtapeVue,
  estimationDemandee,
  estimationEchouee,
  estimationObtenue,
  emailSaisi,
} from '../lib/analytics'

import {
  etapesPour,
  CHAPITRES,
  chapitreDe,
  texteEtape,
  OPTIONS_REGLES,
  TYPE_ETAPE,
  OPTIONS_MOTIVATION,
  OPTIONS_SPORTS,
  OPTIONS_EXERCICE_FREQ,
  OPTIONS_PROCHES,
  OPTIONS_PILOSITE_AISSELLES,
  OPTIONS_PILOSITE_VISAGE,
  OPTIONS_EPAULES,
  OPTIONS_ODEUR,
  OPTIONS_ACNE,
  OPTIONS_MUSCLES,
  OPTIONS_VOIX,
  OPTIONS_CROISSANCE_LENTE,
  OPTIONS_VITESSE_CROISSANCE,
  ListeChoixUnique,
  ListeChoixMultiple,
  MoletteTailleCm,
  MoletteTailleAvecInconnu,
  MolettePoidsKg,
  MolettePointure,
  MoletteDateNaissance,
  MoletteSommeil,
  EcranModelePrediction,
  EcranPrecision,
  EcranResultatsLongTerme,
  EcranPotentielGain,
  EcranOptimiserPotentiel,
  EcranGrandimiAide,
  EcranActionsDuJour,
  EcranPlanQuotidien,
  EcranLecons,
  EcranHeightTracker,
  EcranVeriteBrutale,
  EcranEtudesPubliees,
  EcranAvisUtilisateurs,
  EcranPlusQueGenes,
  EcranBonneNouvelle,
  EcranProfilCroissance,
  verdictAge,
  verdictSommeil,
  OPTIONS_COUCHER,
  OPTIONS_TELEPHONE,
  OPTIONS_ASSIS,
  OPTIONS_POSTURE,
  OPTIONS_PROTEINES,
  OPTIONS_LAITAGES,
  OPTIONS_POURQUOI,
} from '../onboarding/content.jsx'
import {
  ageDepuisNaissance,
  construirePayloadPrediction,
  fusionnerResultatPrediction,
  TAILLE_PERE_INCONNUE_CM,
  TAILLE_MERE_INCONNUE_CM,
} from '../onboarding/payload'

const STOCKAGE = 'grandimi:onboarding-v2'

function anneeParDefaut() {
  return new Date().getFullYear() - 18
}

function reponsesInitiales() {
  const naissance = { jour: 1, mois: 1, annee: anneeParDefaut() }
  return {
    profil: 'ado',
    motivation: [],
    coucher: null,
    telephone: null,
    assis: null,
    posture: null,
    proteines: null,
    laitages: null,
    pourquoi: null,
    sexe: null,
    naissance,
    // Calculé dès l'état initial, et pas seulement à la première
    // interaction : tant que l'utilisateur ne touche aucune molette, cette
    // valeur par défaut doit déjà être un âge valide, sinon l'écran reste
    // bloqué sur un continuer désactivé sans qu'aucune action ne l'explique.
    age: ageDepuisNaissance(naissance.annee, naissance.mois, naissance.jour),
    taille: 170,
    poids: 55,
    pointure: null,
    sports: [],
    exerciceFreq: null,
    sommeil: 8,
    pere: null,
    mere: null,
    proches: [],
    pilositeAisselles: null,
    regles: null,
    pilositeVisage: null,
    vitesseCroissance: null,
    epaules: null,
    odeur: null,
    acne: null,
    muscles: null,
    voix: null,
    croissanceLente: null,
    tailleIdeale: 175,
  }
}

function unitesInitiales() {
  return { taille: 'cm', poids: 'kg', pere: 'cm', mere: 'cm', pointure: 'eu', tailleIdeale: 'cm' }
}

function chargerEtat() {
  try {
    const brut = localStorage.getItem(STOCKAGE)
    if (!brut) return null
    const donnees = JSON.parse(brut)
    // Reprise aussi sur l'écran e-mail : l'état de l'envoi n'est pas
    // sauvegardé, donc on y revient simplement devant le champ e-mail vide.
    // L'ancienne version renvoyait à l'écran 1 : un rechargement à cet
    // endroit (vérifier son adresse dans Gmail…) effaçait les 33 réponses.
    return donnees
  } catch {
    return null
  }
}

function basculerDansListe(liste, valeur, exclusif) {
  const ensemble = liste || []
  if (exclusif && valeur === exclusif) {
    return ensemble.includes(exclusif) ? [] : [exclusif]
  }
  const sansExclusif = ensemble.filter((v) => v !== exclusif)
  return sansExclusif.includes(valeur)
    ? sansExclusif.filter((v) => v !== valeur)
    : [...sansExclusif, valeur]
}

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ETAPES_ANALYSE = [
  { label: 'Ta taille adulte estimée', seuil: 20 },
  { label: 'Ton sommeil', seuil: 40 },
  { label: 'Ton sport et ta posture', seuil: 60 },
  { label: 'Ton alimentation', seuil: 80 },
  { label: 'Ton plan personnalisé', seuil: 100 },
]

const DUREE_MONTEE_MS = 11000
const PLAFOND_ATTENTE = 96
const DUREE_FINALE_MS = 550
// Animation complète « on assemble ton plan », jouée avant l'e-mail.
const DUREE_INTRO_MS = 6000

/* L'anneau monte tout seul dès que l'écran s'affiche — pas besoin d'avoir
   soumis l'e-mail pour ça — et plafonne à 96 % tant que le serveur n'a pas
   répondu. `pretALivrer` (resultatApi non nul) relance une seconde montée,
   courte, de la valeur courante jusqu'à 100 % : l'anneau termine toujours
   sa course au lieu d'être coupé net par le changement d'écran. */
function useProgressionAnimee(actif, pretALivrer) {
  const [pourcentage, setPourcentage] = useState(0)
  const [complet, setComplet] = useState(false)
  const pourcentageRef = useRef(0)

  useEffect(() => {
    if (!actif) return undefined

    const reduit =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const cible = pretALivrer ? 100 : PLAFOND_ATTENTE

    if (reduit) {
      pourcentageRef.current = cible
      setPourcentage(cible)
      if (pretALivrer) setComplet(true)
      return undefined
    }

    const depart0 = pourcentageRef.current
    const duree = pretALivrer ? (depart0 > 0 ? DUREE_FINALE_MS : DUREE_INTRO_MS) : DUREE_MONTEE_MS
    const depart = pourcentageRef.current
    let debut
    let frame

    const etape = (t) => {
      if (debut === undefined) debut = t
      const p = Math.min(1, (t - debut) / duree)
      const progression = 1 - (1 - p) ** 2
      const valeur = depart + (cible - depart) * progression
      pourcentageRef.current = valeur
      setPourcentage(valeur)
      if (p < 1) {
        frame = requestAnimationFrame(etape)
      } else if (pretALivrer) {
        setComplet(true)
      }
    }
    frame = requestAnimationFrame(etape)
    return () => cancelAnimationFrame(frame)
  }, [actif, pretALivrer])

  return [pourcentage, complet]
}

// L'anneau et les étapes tournent en continu derrière l'écran ; `children`
// (le formulaire e-mail, puis le bouton d'erreur/retry) s'affiche par-dessus.
function ProgressionAnalyse({ titre, pourcentage, steps, children }) {
  const indexCourant = steps.findIndex((s) => pourcentage < s.seuil)

  return (
    <div className="interstitial plan-creation">
      <h1 className="interstitial-titre">{titre}</h1>

      <div className="plan-progress">
        <div
          className="progress-circle"
          style={{ '--progression': `${pourcentage * 3.6}deg` }}
        >
          <div className="progress-value">{Math.round(pourcentage)}%</div>
        </div>
      </div>

      <div className="plan-steps">
        {steps.map((step, idx) => {
          const fait = pourcentage >= step.seuil
          return (
            <div
              key={step.label}
              className={`plan-step ${fait ? 'done' : ''} ${idx === indexCourant ? 'current' : ''}`}
            >
              <div className="step-check">{fait ? '✓' : ''}</div>
              <span className="step-label">{step.label}</span>
            </div>
          )
        })}
      </div>

      {children}
    </div>
  )
}

/* `?step=resultats-long-terme` saute direct à cet écran de l'onboarding,
   sans repasser par les questions précédentes. DEV UNIQUEMENT (comme le
   `?preview=` de App.jsx) : sert à vérifier un écran précis en un lien,
   pas à exposer un mode démo en production. */
function indexEtapePreview(reponses) {
  if (!import.meta.env.DEV) return null
  const etape = new URLSearchParams(window.location.search).get('step')
  if (!etape) return null
  const i = etapesPour(reponses).indexOf(etape)
  return i >= 0 ? i : null
}

// Écrans où un toucher sur la réponse fait avancer seul (ListeChoixUnique).
const ETAPES_CHOIX_UNIQUE = new Set([
  'profil', 'sexe', 'exercice-freq', 'pilosite-aisselles', 'pilosite-visage',
  'vitesse-croissance', 'epaules', 'odeur', 'acne', 'muscles', 'voix', 'regles',
  'croissance-lente', 'coucher', 'telephone', 'assis', 'posture', 'proteines',
  'laitages', 'pourquoi',
])

function OnboardingFlow({ onPredictionComplete, onCancel, sexeDepart = null }) {
  // Sexe choisi sur l'accueil : on repart d'un questionnaire neuf, profil
  // « ado » et sexe remplis, directement à la question suivante.
  const etatSauvegarde = useMemo(() => (sexeDepart ? null : chargerEtat()), [sexeDepart])

  const [reponses, setReponses] = useState(() =>
    etatSauvegarde?.reponses ??
    (sexeDepart ? { ...reponsesInitiales(), profil: 'ado', sexe: sexeDepart } : reponsesInitiales()),
  )
  const [index, setIndex] = useState(
    () =>
      indexEtapePreview(reponses) ??
      etatSauvegarde?.index ??
      (sexeDepart ? etapesPour(reponses).indexOf('sexe') + 1 : 0),
  )
  const [unites, setUnites] = useState(etatSauvegarde?.unites ?? unitesInitiales())

  // Écran final : état séparé du reste, jamais persisté (cf. chargerEtat).
  // L'anneau de progression tourne dès l'affichage de l'écran, avec le
  // formulaire e-mail par-dessus ; `emailEnvoye` bascule une fois soumis,
  // ce qui déclenche le vrai appel API pendant que l'anneau continue.
  const [emailEnvoye, setEmailEnvoye] = useState(false)
  const [email, setEmail] = useState('')
  const [resultatApi, setResultatApi] = useState(null)
  const [erreurApi, setErreurApi] = useState(null)
  // Incrémenté à chaque « Réessayer » : `emailEnvoye` ne change pas de
  // valeur entre deux tentatives, donc lui seul ne suffit pas à rejouer
  // l'effet qui appelle l'API.
  const [tentative, setTentative] = useState(0)
  const [attenteLongue, setAttenteLongue] = useState(false)
  const dejaLivre = useRef(false)

  // Liste des écrans propre à ce profil (fille / garçon, âge) : l'index
  // porte sur CETTE liste, pas sur ORDRE_ETAPES.
  const etapes = useMemo(() => etapesPour(reponses), [reponses])
  const etape = etapes[Math.min(index, etapes.length - 1)]
  const texte = texteEtape(etape, reponses.profil, reponses.sexe)

  const chapitreActif = chapitreDe(etape)
  const dansChapitre = etapes.filter((e) => chapitreDe(e) === chapitreActif && e !== 'resultats-la')
  const chapitres = {
    noms: CHAPITRES,
    actif: chapitreActif,
    avancement: (dansChapitre.indexOf(etape) + 1) / dansChapitre.length,
  }

  /* L'animation « on assemble ton plan » se joue EN ENTIER d'abord ;
     l'e-mail n'est demandé qu'ensuite, sur « Ton plan est prêt ».
     Avant, le formulaire la recouvrait dès la première seconde. */
  const [pourcentageAnalyse, animationTerminee] = useProgressionAnimee(
    etape === 'resultats-la',
    true,
  )

  useEffect(() => {
    localStorage.setItem(STOCKAGE, JSON.stringify({ index, reponses, unites }))
  }, [index, reponses, unites])

  useEffect(() => {
    tunnelEtapeVue(etape, index + 1, etapes.length)
  }, [etape, index])

  useEffect(() => {
    if (index === 0) tunnelDemarre('onboarding_v2')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function definir(champ, valeur) {
    setReponses((precedent) => ({ ...precedent, [champ]: valeur }))
  }

  function basculer(champ, valeur, exclusif) {
    setReponses((precedent) => ({
      ...precedent,
      [champ]: basculerDansListe(precedent[champ], valeur, exclusif),
    }))
  }

  /* Choix unique : un toucher suffit. La réponse s'affiche sélectionnée
     un court instant (le temps de voir la case s'allumer), puis l'écran
     suivant arrive, sans passer par « Continuer ». */
  const minuterieAvance = useRef(null)
  useEffect(() => () => clearTimeout(minuterieAvance.current), [])

  function choisirEtAvancer(champ, valeur) {
    definir(champ, valeur)
    clearTimeout(minuterieAvance.current)
    minuterieAvance.current = setTimeout(avancer, 280)
  }

  function avancer() {
    // Annule l'avance automatique en attente : sans ça, toucher une réponse
    // puis « Continuer » avançait deux fois et sautait la question suivante
    // (sexe, date de naissance — âge par défaut de 18 ans, prédiction fausse).
    clearTimeout(minuterieAvance.current)
    /* La molette affiche une taille par défaut : la garder et toucher
       « Continuer », c'est la choisir. Seul « Je ne sais pas » laisse la
       taille du parent inconnue. */
    // Mise à jour fonctionnelle : avancer() peut être appelé par une
    // minuterie créée avant le dernier rendu, donc sur un état périmé.
    setReponses((p) => {
      if (etape === 'pere' && p.pere == null && !p.pereInconnu) return { ...p, pere: TAILLE_PERE_INCONNUE_CM }
      if (etape === 'mere' && p.mere == null && !p.mereInconnu) return { ...p, mere: TAILLE_MERE_INCONNUE_CM }
      return p
    })
    setIndex((precedent) => Math.min(etapes.length - 1, precedent + 1))
  }

  function reculer() {
    clearTimeout(minuterieAvance.current)
    if (index === 0) {
      tunnelAbandonne(etape, index + 1)
      onCancel()
      return
    }
    setIndex((precedent) => Math.max(0, precedent - 1))
  }

  useEffect(() => {
    const surRetour = () => reculer()
    window.addEventListener('grandimi:retour', surRetour)
    return () => window.removeEventListener('grandimi:retour', surRetour)
  })

  function definirNaissance(prochaine) {
    setReponses((precedent) => ({
      ...precedent,
      naissance: prochaine,
      age: ageDepuisNaissance(prochaine.annee, prochaine.mois, prochaine.jour),
    }))
  }

  // ---------- Écran final : appel serveur ----------

  function lancerAnalyse() {
    emailSaisi()
    setErreurApi(null)
    setEmailEnvoye(true)
  }

  useEffect(() => {
    if (!emailEnvoye) return undefined
    let annule = false
    setResultatApi(null)
    setErreurApi(null)
    estimationDemandee()

    const payload = construirePayloadPrediction(reponses, email)
    // Réel par défaut : `=== 'true'` faisait tourner le simulateur en
    // production, où la variable n'est pas définie. Seul .env.development
    // l'éteint.
    const utiliserApiReelle = import.meta.env.VITE_USE_REAL_API !== 'false'
    /* Le serveur gratuit dort parfois et met jusqu'à une minute à
       répondre ; un réseau mobile peut aussi laisser une requête pendue.
       Sans limite, l'anneau restait bloqué à 96 % pour toujours. On
       retente une fois tout seul, puis on affiche « Réessayer ». */
    const unAppel = () => {
      const requete = utiliserApiReelle ? apiClient.predictHeightV2(payload) : mockPredictHeight(payload)
      const delai = new Promise((_, rejeter) =>
        setTimeout(() => rejeter(new Error('delai')), 12000),
      )
      return Promise.race([requete, delai])
    }
    const minuterieLente = setTimeout(() => {
      if (!annule) setAttenteLongue(true)
    }, 6000)
    setAttenteLongue(false)

    // Un seul essai à l'écran, 12 s maximum : si ça échoue, on passe
    // aux résultats et App.jsx relance le calcul en arrière-plan.
    const appel = unAppel()

    appel
      .finally(() => clearTimeout(minuterieLente))
      .then((reponseApi) => {
        if (annule) return
        estimationObtenue({ age: reponses.age, sexe: reponses.sexe, confiance: reponseApi.confidence_level })
        setResultatApi(reponseApi)
      })
      .catch((err) => {
        if (annule) return
        estimationEchouee(err && err.message)
        /* Personne ne doit rester bloqué ici. Serveur en panne, limite
           atteinte ou réponse refusée : on passe quand même aux résultats
           (dont les chiffres sont sous cadenas) et au paywall. App.jsx
           relance le calcul en arrière-plan jusqu'à ce qu'il réussisse,
           bien avant que le plan payant en ait besoin. */
        setResultatApi({ prediction_en_attente: true })
      })

    return () => {
      annule = true
    }
    // `reponses` et `email` sont figés une fois cette phase atteinte : les
    // écrans qui les renseignent sont derrière nous. Seuls `emailEnvoye`
    // et `tentative` doivent rejouer l'appel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailEnvoye, tentative])

  function terminerAnalyse() {
    if (dejaLivre.current || !resultatApi) return
    dejaLivre.current = true
    const donnees = fusionnerResultatPrediction(reponses, email, resultatApi)
    localStorage.removeItem(STOCKAGE)
    onPredictionComplete(donnees)
  }

  // L'anneau termine sa propre montée (0 → 100 %) une fois l'API répondue
  // avant qu'on quitte l'écran : `animationTerminee` porte ce délai, pas
  // `resultatApi` directement, pour ne jamais couper l'animation en plein
  // mouvement.
  useEffect(() => {
    if (emailEnvoye && resultatApi) terminerAnalyse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailEnvoye, resultatApi])

  // ---------- Validation par écran ----------

  const peutContinuer = (() => {
    switch (etape) {
      case 'profil':
        return reponses.profil != null
      case 'motivation':
        return reponses.motivation.length >= 1
      case 'sexe':
        return reponses.sexe != null
      case 'age':
        return reponses.age != null && reponses.age >= 8 && reponses.age <= 22
      case 'taille':
        return reponses.taille > 0
      case 'poids':
        return reponses.poids > 0
      case 'exercice-freq':
        return reponses.exerciceFreq != null
      case 'sommeil':
        return reponses.sommeil >= 4
      case 'pilosite-aisselles':
        return true
      case 'pilosite-visage':
        return true
      case 'epaules':
        return true
      case 'odeur':
        return true
      case 'acne':
        return true
      case 'muscles':
        return true
      case 'voix':
        return true
      case 'croissance-lente':
        return true
      case 'regles':
        return true
      case 'taille-ideale':
        return reponses.tailleIdeale > 0
      case 'coucher':
      case 'telephone':
      case 'assis':
      case 'posture':
      case 'proteines':
      case 'laitages':
      case 'pourquoi':
        return reponses[etape] != null
      default:
        return true
    }
  })()

  // ---------- Rendu du contenu de l'écran courant ----------

  function contenu() {
    switch (etape) {
      case 'profil':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.profil}
            onChoisir={(v) => choisirEtAvancer('profil', v)}
            options={[
              { valeur: 'ado', label: 'Je suis un ado', icon: <User size={22} aria-hidden="true" /> },
              { valeur: 'parent', label: 'Je suis un parent', icon: <Users size={22} aria-hidden="true" /> },
            ]}
          />
        )
      case 'motivation':
        return (
          <ListeChoixMultiple
            label={texte.titre}
            valeurs={reponses.motivation}
            onBasculer={(v) => basculer('motivation', v)}
            options={OPTIONS_MOTIVATION.map((o) => ({ valeur: o.valeur, label: o.label }))}
          />
        )
      case 'sexe':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.sexe}
            onChoisir={(v) => choisirEtAvancer('sexe', v)}
            options={[
              { valeur: 'M', label: 'Garçon', hint: 'Croissance souvent jusqu’à 18-21 ans' },
              { valeur: 'F', label: 'Fille', hint: 'Croissance souvent jusqu’à 15-17 ans' },
            ]}
          />
        )
      case 'age':
        return (
          <>
            <MoletteDateNaissance
              jour={reponses.naissance.jour}
              mois={reponses.naissance.mois}
              annee={reponses.naissance.annee}
              onChange={definirNaissance}
            />
            <p className="verdict-age">{verdictAge(reponses.age, reponses.sexe)}</p>
          </>
        )
      case 'taille':
        return (
          <MoletteTailleCm
            valeurCm={reponses.taille}
            onChange={(v) => definir('taille', v)}
            unite={unites.taille}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, taille: u }))}
            min={120}
            max={209}
          />
        )
      case 'poids':
        return (
          <MolettePoidsKg
            valeurKg={reponses.poids}
            onChange={(v) => definir('poids', v)}
            unite={unites.poids}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, poids: u }))}
          />
        )
      case 'pointure':
        return (
          <MolettePointure
            valeurEu={reponses.pointure}
            onChange={(v) => definir('pointure', v)}
            onInconnu={() => choisirEtAvancer('pointure', null)}
            unite={unites.pointure}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, pointure: u }))}
          />
        )
      case 'sports':
        return (
          <ListeChoixMultiple
            label={texte.titre}
            valeurs={reponses.sports}
            onBasculer={(v) => basculer('sports', v)}
            options={OPTIONS_SPORTS}
          />
        )
      case 'exercice-freq':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.exerciceFreq}
            onChoisir={(v) => choisirEtAvancer('exerciceFreq', v)}
            options={OPTIONS_EXERCICE_FREQ}
          />
        )
      case 'sommeil':
        return (
          <>
            <MoletteSommeil valeur={reponses.sommeil} onChange={(v) => definir('sommeil', v)} />
            <p className="verdict-age">{verdictSommeil(reponses.sommeil)}</p>
          </>
        )

      case 'pere':
        return (
          <MoletteTailleAvecInconnu
            valeurCm={reponses.pere}
            onChange={(v) => { definir('pereInconnu', false); definir('pere', v) }}
            onInconnu={() => { definir('pereInconnu', true); choisirEtAvancer('pere', null) }}
            unite={unites.pere}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, pere: u }))}
            min={141}
            max={219}
            inconnuDefaut={TAILLE_PERE_INCONNUE_CM}
          />
        )
      case 'mere':
        return (
          <MoletteTailleAvecInconnu
            valeurCm={reponses.mere}
            onChange={(v) => { definir('mereInconnu', false); definir('mere', v) }}
            onInconnu={() => { definir('mereInconnu', true); choisirEtAvancer('mere', null) }}
            unite={unites.mere}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, mere: u }))}
            min={141}
            max={209}
            inconnuDefaut={TAILLE_MERE_INCONNUE_CM}
          />
        )
      case 'proches':
        return (
          <ListeChoixMultiple
            label={texte.titre}
            valeurs={reponses.proches}
            onBasculer={(v) => basculer('proches', v, 'non')}
            options={OPTIONS_PROCHES}
            exclusif="non"
          />
        )
      case 'pilosite-aisselles':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.pilositeAisselles}
            onChoisir={(v) => choisirEtAvancer('pilositeAisselles', v)}
            options={OPTIONS_PILOSITE_AISSELLES}
          />
        )
      case 'pilosite-visage':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.pilositeVisage}
            onChoisir={(v) => choisirEtAvancer('pilositeVisage', v)}
            options={OPTIONS_PILOSITE_VISAGE}
          />
        )
      case 'vitesse-croissance':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.vitesseCroissance}
            onChoisir={(v) => choisirEtAvancer('vitesseCroissance', v)}
            options={OPTIONS_VITESSE_CROISSANCE}
          />
        )
      case 'epaules':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.epaules}
            onChoisir={(v) => choisirEtAvancer('epaules', v)}
            options={OPTIONS_EPAULES}
          />
        )
      case 'odeur':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.odeur}
            onChoisir={(v) => choisirEtAvancer('odeur', v)}
            options={OPTIONS_ODEUR}
          />
        )
      case 'acne':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.acne}
            onChoisir={(v) => choisirEtAvancer('acne', v)}
            options={OPTIONS_ACNE}
          />
        )
      case 'muscles':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.muscles}
            onChoisir={(v) => choisirEtAvancer('muscles', v)}
            options={OPTIONS_MUSCLES}
          />
        )
      case 'voix':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.voix}
            onChoisir={(v) => choisirEtAvancer('voix', v)}
            options={OPTIONS_VOIX}
          />
        )
      case 'regles':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.regles}
            onChoisir={(v) => choisirEtAvancer('regles', v)}
            options={OPTIONS_REGLES}
          />
        )
      case 'croissance-lente':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.croissanceLente}
            onChoisir={(v) => choisirEtAvancer('croissanceLente', v)}
            options={OPTIONS_CROISSANCE_LENTE}
          />
        )
      case 'coucher':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.coucher}
            onChoisir={(v) => choisirEtAvancer('coucher', v)}
            options={OPTIONS_COUCHER}
          />
        )
      case 'telephone':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.telephone}
            onChoisir={(v) => choisirEtAvancer('telephone', v)}
            options={OPTIONS_TELEPHONE}
          />
        )
      case 'assis':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.assis}
            onChoisir={(v) => choisirEtAvancer('assis', v)}
            options={OPTIONS_ASSIS}
          />
        )
      case 'posture':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.posture}
            onChoisir={(v) => choisirEtAvancer('posture', v)}
            options={OPTIONS_POSTURE}
          />
        )
      case 'proteines':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.proteines}
            onChoisir={(v) => choisirEtAvancer('proteines', v)}
            options={OPTIONS_PROTEINES}
          />
        )
      case 'laitages':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.laitages}
            onChoisir={(v) => choisirEtAvancer('laitages', v)}
            options={OPTIONS_LAITAGES}
          />
        )
      case 'pourquoi':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.pourquoi}
            onChoisir={(v) => choisirEtAvancer('pourquoi', v)}
            options={OPTIONS_POURQUOI}
          />
        )
      case 'bonne-nouvelle':
        return <EcranBonneNouvelle age={reponses.age} />
      case 'profil-croissance':
        return <EcranProfilCroissance reponses={reponses} />
      case 'modele-prediction':
        return <EcranModelePrediction />
      case 'precision':
        return <EcranPrecision />
      case 'resultats-long-terme':
        return <EcranResultatsLongTerme />
      case 'potentiel-gain':
        return <EcranPotentielGain />
      case 'optimiser-potentiel':
        return <EcranOptimiserPotentiel />
      case 'grandimi-aide':
        return <EcranGrandimiAide />
      case 'exercices-quotidiens':
        return <EcranActionsDuJour />
      case 'programme-optimal':
        return <EcranPlanQuotidien />
      case 'guide-grandir':
        return <EcranLecons />
      case 'height-tracker':
        return <EcranHeightTracker />
      case 'verite-brutale':
        return <EcranVeriteBrutale sexe={reponses.sexe} />
      case 'etudes-publiees':
        return <EcranEtudesPubliees />
      case 'avis-utilisateurs':
        return <EcranAvisUtilisateurs />
      case 'taille-ideale':
        return (
          <MoletteTailleCm
            valeurCm={reponses.tailleIdeale}
            onChange={(v) => definir('tailleIdeale', v)}
            unite={unites.tailleIdeale}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, tailleIdeale: u }))}
            min={150}
            max={220}
          />
        )
      default:
        return null
    }
  }

  // ---------- Rendu global ----------

  if (etape === 'plus-que-genes') {
    return <EcranPlusQueGenes onContinue={avancer} />
  }

  if (etape === 'resultats-la') {
    // L'anneau tourne dès l'affichage de l'écran (cf. useProgressionAnimee
    // plus haut) ; le formulaire e-mail s'affiche par-dessus, en overlay,
    // pas comme un écran séparé. Une fois soumis, l'overlay disparaît et
    // l'anneau continue seul jusqu'à ce que le vrai appel API réponde —
    // pas pour « envoyer le résultat par mail » : c'est ce qui permet de
    // retrouver le compte ensuite (même adresse que le checkout Whop, cf.
    // PaywallPage.jsx qui relit `localStorage.userEmail`).
    const emailPlausible = EMAIL_VALIDE.test(email.trim())
    return (
      <ProgressionAnalyse titre={`On assemble ton plan à partir de tes ${etapes.filter((e) => TYPE_ETAPE[e] === 'question').length} réponses`} pourcentage={pourcentageAnalyse} steps={ETAPES_ANALYSE}>
        {!animationTerminee ? null : !emailEnvoye ? (
          <div className="resultats-overlay">
            {/* Un vrai formulaire : la touche « OK » du clavier du téléphone
                valide, sans aller chercher le bouton sous le clavier. */}
            <form
              className="resultats-overlay-carte"
              onSubmit={(e) => {
                e.preventDefault()
                if (!emailPlausible) return
                localStorage.setItem('userEmail', email.trim())
                lancerAnalyse()
              }}
            >
              <h2 className="resultats-overlay-titre">{texte.titre}</h2>
              <p className="resultats-overlay-text">{texte.sousTitre}</p>

              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                className="resultats-gate-input"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="funnel-help">C'est ce qui te permet de retrouver ton compte et ton plan.</p>
              {/* Les réponses sur la puberté sont des données de santé de
                  mineurs : on informe au moment où l'adresse est donnée. */}
              <p className="funnel-help funnel-help--discret">
                En continuant, tu acceptes notre{' '}
                <a href="/privacy.html" target="_blank" rel="noopener">politique de confidentialité</a>.
                Tes réponses servent uniquement à construire ton plan.
              </p>

              <FunnelButton type="submit" disabled={!emailPlausible}>
                Voir mon plan
              </FunnelButton>
            </form>
          </div>
        ) : (
          <div className="interstitial-action is-ready analyse-action">
            {erreurApi ? (
              <>
                <p className="funnel-help">{erreurApi}</p>
                <FunnelButton onClick={() => setTentative((t) => t + 1)}>Réessayer</FunnelButton>
              </>
            ) : (
              <>
                {attenteLongue && (
                  <p className="funnel-help">On réveille le serveur, encore quelques secondes…</p>
                )}
                <button type="button" className="funnel-cta" disabled>
                  En cours...
                </button>
              </>
            )}
          </div>
        )}
      </ProgressionAnalyse>
    )
  }

  const estAffichage = TYPE_ETAPE[etape] === 'affichage'
  /* Choix unique : toucher une réponse fait déjà avancer (choisirEtAvancer).
     Un bouton « Continuer » en plus laissait croire qu'il fallait encore
     valider. Pour revenir sur un choix, on touche à nouveau la réponse. */
  const estChoixUnique = ETAPES_CHOIX_UNIQUE.has(etape)

  return (
    <FunnelShell
      onBack={reculer}
      progress={index / etapes.length}
      chapitres={chapitres}
      title={texte.titre}
      subtitle={texte.sousTitre}
      footer={
        estChoixUnique ? null : (
          <FunnelButton disabled={!estAffichage && !peutContinuer} onClick={avancer}>
            Continuer
          </FunnelButton>
        )
      }
    >
      {contenu()}
    </FunnelShell>
  )
}

export default OnboardingFlow
