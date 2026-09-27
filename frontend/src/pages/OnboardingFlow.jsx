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
    profil: null,
    motivation: [],
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
    // Ne jamais reprendre en plein milieu de l'écran final : la saisie
    // d'e-mail et l'appel serveur repartent proprement du début de cet
    // écran plutôt que de rejouer un état d'analyse à moitié fait.
    if (etapesPour(donnees.reponses)[donnees.index] === 'resultats-la') return null
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
  { label: 'Analyse des facteurs', seuil: 20 },
  { label: 'Projection génétique', seuil: 40 },
  { label: 'Fenêtre de croissance', seuil: 60 },
  { label: 'Construction du plan', seuil: 80 },
  { label: 'Création de routine', seuil: 100 },
]

const DUREE_MONTEE_MS = 11000
const PLAFOND_ATTENTE = 96
const DUREE_FINALE_MS = 550

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

    const duree = pretALivrer ? DUREE_FINALE_MS : DUREE_MONTEE_MS
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

function OnboardingFlow({ onPredictionComplete, onCancel }) {
  const etatSauvegarde = useMemo(() => chargerEtat(), [])

  const [reponses, setReponses] = useState(etatSauvegarde?.reponses ?? reponsesInitiales())
  const [index, setIndex] = useState(
    () => indexEtapePreview(reponses) ?? etatSauvegarde?.index ?? 0,
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

  const [pourcentageAnalyse, animationTerminee] = useProgressionAnimee(
    etape === 'resultats-la',
    !!resultatApi,
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
    setIndex((precedent) => Math.min(etapes.length - 1, precedent + 1))
  }

  function reculer() {
    if (index === 0) {
      tunnelAbandonne(etape, index + 1)
      onCancel()
      return
    }
    setIndex((precedent) => Math.max(0, precedent - 1))
  }

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
    const utiliserApiReelle = import.meta.env.VITE_USE_REAL_API === 'true'
    const appel = utiliserApiReelle ? apiClient.predictHeightV2(payload) : mockPredictHeight(payload)

    appel
      .then((reponseApi) => {
        if (annule) return
        estimationObtenue({ age: reponses.age, sexe: reponses.sexe, confiance: reponseApi.confidence_level })
        setResultatApi(reponseApi)
      })
      .catch((err) => {
        if (annule) return
        estimationEchouee(err.message)
        setErreurApi(
          err.message || "L'estimation a échoué. Vérifie ta connexion et réessaie.",
        )
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
    if (animationTerminee) terminerAnalyse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationTerminee])

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
        return reponses.age != null && reponses.age >= 8 && reponses.age <= 25
      case 'taille':
        return reponses.taille > 0
      case 'poids':
        return reponses.poids > 0
      case 'exercice-freq':
        return reponses.exerciceFreq != null
      case 'sommeil':
        return reponses.sommeil >= 5
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
              { valeur: 'M', label: 'Garçon' },
              { valeur: 'F', label: 'Fille' },
            ]}
          />
        )
      case 'age':
        return (
          <MoletteDateNaissance
            jour={reponses.naissance.jour}
            mois={reponses.naissance.mois}
            annee={reponses.naissance.annee}
            onChange={definirNaissance}
          />
        )
      case 'taille':
        return (
          <MoletteTailleCm
            valeurCm={reponses.taille}
            onChange={(v) => definir('taille', v)}
            unite={unites.taille}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, taille: u }))}
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
            options={OPTIONS_EXERCICE_FREQ.map((o) => ({ valeur: o.valeur, label: o.label }))}
          />
        )
      case 'sommeil':
        return <MoletteSommeil valeur={reponses.sommeil} onChange={(v) => definir('sommeil', v)} />

      case 'pere':
        return (
          <MoletteTailleAvecInconnu
            valeurCm={reponses.pere}
            onChange={(v) => definir('pere', v)}
            unite={unites.pere}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, pere: u }))}
            min={130}
            max={210}
            inconnuDefaut={TAILLE_PERE_INCONNUE_CM}
          />
        )
      case 'mere':
        return (
          <MoletteTailleAvecInconnu
            valeurCm={reponses.mere}
            onChange={(v) => definir('mere', v)}
            unite={unites.mere}
            onChangeUnite={(u) => setUnites((p) => ({ ...p, mere: u }))}
            min={120}
            max={200}
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
      <ProgressionAnalyse titre="On analyse tes réponses" pourcentage={pourcentageAnalyse} steps={ETAPES_ANALYSE}>
        {!emailEnvoye ? (
          <div className="resultats-overlay">
            <div className="resultats-overlay-carte">
              <h2 className="resultats-overlay-titre">{texte.titre}</h2>
              <p className="resultats-overlay-text">{texte.sousTitre}</p>

              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                className="resultats-gate-input"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="funnel-help">C'est ce qui te permet de retrouver ton compte et ton plan.</p>

              <FunnelButton
                disabled={!emailPlausible}
                onClick={() => {
                  localStorage.setItem('userEmail', email.trim())
                  lancerAnalyse()
                }}
              >
                Révéler mes résultats
              </FunnelButton>
            </div>
          </div>
        ) : (
          <div className="interstitial-action is-ready">
            {erreurApi ? (
              <>
                <p className="funnel-help">{erreurApi}</p>
                <FunnelButton onClick={() => setTentative((t) => t + 1)}>Réessayer</FunnelButton>
              </>
            ) : (
              <button type="button" className="funnel-cta" disabled>
                En cours...
              </button>
            )}
          </div>
        )}
      </ProgressionAnalyse>
    )
  }

  const estAffichage = TYPE_ETAPE[etape] === 'affichage'

  return (
    <FunnelShell
      onBack={reculer}
      progress={index / etapes.length}
      chapitres={chapitres}
      title={texte.titre}
      subtitle={texte.sousTitre}
      footer={
        <FunnelButton disabled={!estAffichage && !peutContinuer} onClick={avancer}>
          Continuer
        </FunnelButton>
      }
    >
      {contenu()}
    </FunnelShell>
  )
}

export default OnboardingFlow
