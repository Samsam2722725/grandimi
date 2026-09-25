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
  ORDRE_ETAPES,
  TYPE_ETAPE,
  TEXTES_ETAPE,
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
  ListeChoixUnique,
  ListeChoixMultiple,
  MoletteTailleCm,
  MoletteTailleAvecInconnu,
  MolettePoidsKg,
  MolettePointure,
  MoletteDateNaissance,
  MoletteSommeil,
  MoletteVitesseCroissance,
  EcranHabitudes,
  EcranModelePrediction,
  EcranPrecision,
  EcranPotentielGain,
  EcranOptimiserPotentiel,
  EcranGrandimiAide,
  EcranVeriteBrutale,
  EcranEtudesPubliees,
  EcranAvisUtilisateurs,
  EcranPlusQueGenes,
  EcranPuberteIntro,
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
  return new Date().getFullYear() - 14
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
    taille: 160,
    poids: 55,
    pointure: null,
    sports: [],
    exerciceFreq: null,
    sommeil: 8,
    pere: null,
    mere: null,
    proches: [],
    pilositeAisselles: null,
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
    if (ORDRE_ETAPES[donnees.index] === 'resultats-la') return null
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

function OnboardingFlow({ onPredictionComplete, onCancel }) {
  const etatSauvegarde = useMemo(() => chargerEtat(), [])

  const [index, setIndex] = useState(etatSauvegarde?.index ?? 0)
  const [reponses, setReponses] = useState(etatSauvegarde?.reponses ?? reponsesInitiales())
  const [unites, setUnites] = useState(etatSauvegarde?.unites ?? unitesInitiales())

  // Écran final : phase séparée du reste, jamais persistée (cf. chargerEtat).
  const [phaseResultats, setPhaseResultats] = useState('gate') // 'gate' | 'analyse'
  const [email, setEmail] = useState('')
  const [resultatApi, setResultatApi] = useState(null)
  const [erreurApi, setErreurApi] = useState(null)
  // Incrémenté à chaque « Réessayer » : `phaseResultats` ne change pas de
  // valeur entre deux tentatives, donc lui seul ne suffit pas à rejouer
  // l'effet qui appelle l'API.
  const [tentative, setTentative] = useState(0)
  const dejaLivre = useRef(false)

  const etape = ORDRE_ETAPES[index]
  const texte = TEXTES_ETAPE[etape]

  useEffect(() => {
    localStorage.setItem(STOCKAGE, JSON.stringify({ index, reponses, unites }))
  }, [index, reponses, unites])

  useEffect(() => {
    tunnelEtapeVue(etape, index + 1, ORDRE_ETAPES.length)
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

  function avancer() {
    setIndex((precedent) => Math.min(ORDRE_ETAPES.length - 1, precedent + 1))
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
    setPhaseResultats('analyse')
  }

  useEffect(() => {
    if (phaseResultats !== 'analyse') return undefined
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
    // écrans qui les renseignent sont derrière nous. Seuls `phaseResultats`
    // et `tentative` doivent rejouer l'appel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseResultats, tentative])

  function terminerAnalyse() {
    if (dejaLivre.current || !resultatApi) return
    dejaLivre.current = true
    const donnees = fusionnerResultatPrediction(reponses, email, resultatApi)
    localStorage.removeItem(STOCKAGE)
    onPredictionComplete(donnees)
  }

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
            onChoisir={(v) => definir('profil', v)}
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
            onChoisir={(v) => definir('sexe', v)}
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
            onChoisir={(v) => definir('exerciceFreq', v)}
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
      case 'puberty-pause':
        return null // interstitielle, rendue à part
      case 'pilosite-aisselles':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.pilositeAisselles}
            onChoisir={(v) => definir('pilositeAisselles', v)}
            options={OPTIONS_PILOSITE_AISSELLES}
          />
        )
      case 'pilosite-visage':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.pilositeVisage}
            onChoisir={(v) => definir('pilositeVisage', v)}
            options={OPTIONS_PILOSITE_VISAGE}
          />
        )
      case 'vitesse-croissance':
        return (
          <MoletteVitesseCroissance
            valeur={reponses.vitesseCroissance}
            onChange={(v) => definir('vitesseCroissance', v)}
          />
        )
      case 'epaules':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.epaules}
            onChoisir={(v) => definir('epaules', v)}
            options={OPTIONS_EPAULES}
          />
        )
      case 'odeur':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.odeur}
            onChoisir={(v) => definir('odeur', v)}
            options={OPTIONS_ODEUR}
          />
        )
      case 'acne':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.acne}
            onChoisir={(v) => definir('acne', v)}
            options={OPTIONS_ACNE}
          />
        )
      case 'muscles':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.muscles}
            onChoisir={(v) => definir('muscles', v)}
            options={OPTIONS_MUSCLES}
          />
        )
      case 'voix':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.voix}
            onChoisir={(v) => definir('voix', v)}
            options={OPTIONS_VOIX}
          />
        )
      case 'croissance-lente':
        return (
          <ListeChoixUnique
            label={texte.titre}
            valeur={reponses.croissanceLente}
            onChoisir={(v) => definir('croissanceLente', v)}
            options={OPTIONS_CROISSANCE_LENTE}
          />
        )
      case 'habitudes':
        return <EcranHabitudes />
      case 'modele-prediction':
        return <EcranModelePrediction />
      case 'precision':
        return <EcranPrecision />
      case 'potentiel-gain':
        return <EcranPotentielGain />
      case 'optimiser-potentiel':
        return <EcranOptimiserPotentiel />
      case 'grandimi-aide':
        return <EcranGrandimiAide />
      case 'exercices-quotidiens':
        return <div className="onb-content"><p>Fais des exercices quotidiens pour soutenir ta croissance</p></div>
      case 'optimise-routine':
        return <div className="onb-content"><p>Optimise ta routine avec des petits changements</p></div>
      case 'programme-optimal':
        return <div className="onb-content"><p>Ton programme optimal t'attend</p></div>
      case 'guide-grandir':
        return <div className="onb-content"><p>Guide pour grandir : les fondamentaux expliqués</p></div>
      case 'height-tracker':
        return <div className="onb-content"><p>Suis ta taille chaque semaine pour une meilleure prédiction</p></div>
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

  if (etape === 'puberty-pause') {
    return (
      <EcranPuberteIntro
        titre={texte.titre}
        sousTitre={texte.sousTitre}
        message={texte.message}
        onContinue={avancer}
      />
    )
  }

  if (etape === 'plus-que-genes') {
    return <EcranPlusQueGenes onContinue={avancer} />
  }

  if (etape === 'choix-genetique') {
    return <div className="onb-content"><p>Tu n'as pas choisi ta génétique. Mais tu peux choisir ce que tu en fais.</p></div>
  }

  if (etape === 'decouvrir-taller') {
    return (
      <div className="interstitial">
        <h1 className="interstitial-titre">Il est maintenant temps de découvrir</h1>
        <p className="interstitial-text">Ce que Taller dit sur ton potentiel de croissance</p>
        <div className="interstitial-action is-ready">
          <button type="button" className="funnel-cta" onClick={avancer}>
            Analyser mes réponses
          </button>
        </div>
      </div>
    )
  }

  if (etape === 'resultats-la') {
    // Plan creation screen with progression
    const steps = [
      { label: 'Lecture de tes mesures', done: true },
      { label: 'Projection Khamis-Roche', done: true },
      { label: 'Croissement avec les courbes OMS', done: false },
      { label: 'Correction selon ta maturité', done: false },
      { label: 'Pondération de tes habitudes', done: false },
    ]

    const progressPercent = (steps.filter(s => s.done).length / steps.length) * 100

    return (
      <div className="interstitial plan-creation">
        <h1 className="interstitial-titre">{texte.titre}</h1>
        <p className="interstitial-text">{texte.sousTitre}</p>

        <div className="plan-progress">
          <div className="progress-circle">
            <div className="progress-value">{Math.round(progressPercent)}%</div>
          </div>
        </div>

        <div className="plan-steps">
          {steps.map((step, idx) => (
            <div key={idx} className={`plan-step ${step.done ? 'done' : ''}`}>
              <div className="step-check">{step.done ? '✓' : ''}</div>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="interstitial-action is-ready">
          <button type="button" className="funnel-cta" onClick={avancer} disabled>
            En cours...
          </button>
        </div>
      </div>
    )
  }

  const estAffichage = TYPE_ETAPE[etape] === 'affichage'

  return (
    <FunnelShell
      onBack={reculer}
      progress={index / ORDRE_ETAPES.length}
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
