import { useState } from 'react'

import { ChoiceCard } from '@/components/ui/choice-card'
import { FunnelButton, FunnelShell } from '@/components/ui/funnel-shell'
import { WheelPicker } from '@/components/ui/wheel-picker'

import Spinner from '../components/Spinner'
import apiClient from '../lib/api'
import '../styles/funnel.css'

/* ============================================================
   RÉGLAGE DU PLAN — cinq questions, une seule fois, après le paiement
   ============================================================

   POURQUOI APRÈS LE PAIEMENT, ET PAS AVANT
   Le questionnaire gratuit sert à estimer une taille. Y ajouter
   « à quelle heure tu te couches » allongerait un tunnel qui perd déjà
   du monde, pour une information qui ne sert qu'au plan — donc qu'à
   ceux qui ont payé. Ces cinq écrans arrivent une fois l'accès ouvert,
   avant le premier plan.

   POURQUOI CINQ, ET PAS QUINZE
   Chaque réponse doit changer quelque chose de visible dans le plan,
   sinon elle ne mérite pas d'être posée :

     coucher + lever  →  les heures réelles du plan sommeil, et le
                         calcul de ce qui manque. Avant, le plan
                         annonçait « 10:00 PM » à tout le monde, en
                         anglais, sur un site français.
     petit-déjeuner   →  sauter le petit-déjeuner est le levier
                         nutritionnel le plus fréquent à cet âge.
     jours de sport   →  les exercices se posent les AUTRES jours,
                         pour ne pas s'ajouter à un entraînement.
     difficulté       →  ce que le plan met en avant.

   Une question dont la réponse n'aurait rien déplacé aurait juste
   donné l'impression d'un questionnaire — c'est ce qu'on veut éviter.
   ============================================================ */

const ETAPES = ['coucher', 'lever', 'petit-dej', 'sport', 'difficulte']

/* Minutes depuis minuit, comme en base : « 30 minutes plus tôt » est
   alors une soustraction et non une analyse de chaîne. */
function heureFr(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const reste = m % 60
  return reste === 0 ? `${h} h` : `${h} h ${String(reste).padStart(2, '0')}`
}

const JOURS = [
  { valeur: 1, court: 'L', long: 'lundi' },
  { valeur: 2, court: 'M', long: 'mardi' },
  { valeur: 3, court: 'M', long: 'mercredi' },
  { valeur: 4, court: 'J', long: 'jeudi' },
  { valeur: 5, court: 'V', long: 'vendredi' },
  { valeur: 6, court: 'S', long: 'samedi' },
  { valeur: 7, court: 'D', long: 'dimanche' },
]

const OPTIONS_PETIT_DEJ = [
  { valeur: 'toujours', titre: 'Oui, tous les matins', indice: '', icone: '🥣' },
  { valeur: 'parfois', titre: 'Parfois', indice: 'Ça dépend des jours', icone: '🤷' },
  { valeur: 'jamais', titre: 'Presque jamais', indice: 'Pas faim, ou pas le temps', icone: '⏰' },
]

const OPTIONS_DIFFICULTE = [
  { valeur: 'coucher', titre: 'Me coucher tôt', indice: 'Je traîne le soir', icone: '🌙' },
  { valeur: 'manger', titre: 'Manger assez', indice: 'J’oublie ou je saute des repas', icone: '🍽️' },
  { valeur: 'bouger', titre: 'Bouger', indice: 'Je n’ai pas le temps, ou pas l’envie', icone: '🏃' },
  { valeur: 'regularite', titre: 'Tenir dans la durée', indice: 'Je commence puis j’arrête', icone: '🔁' },
]

const TEXTES = {
  coucher: {
    titre: 'Tu te couches vers quelle heure ?',
    sous: 'En semaine. C’est la première heure de sommeil qui porte le pic d’hormone de croissance.',
  },
  lever: {
    titre: 'Et tu te lèves à quelle heure ?',
    sous: 'On en déduit ce que tu dors vraiment — et ce qui te manque, s’il manque quelque chose.',
  },
  'petit-dej': {
    titre: 'Tu prends un petit-déjeuner ?',
    sous: 'C’est le repas le plus souvent sauté, et celui qui coûte le plus à la croissance.',
  },
  sport: {
    titre: 'Quels jours tu fais du sport ?',
    sous: 'Les exercices se poseront les autres jours, pour ne pas s’ajouter à ton entraînement.',
  },
  difficulte: {
    titre: 'Qu’est-ce qui est le plus dur pour toi ?',
    sous: 'Ton plan mettra ça en premier. Tu pourras le changer plus tard.',
  },
}

function PlanSetupPage({ onTermine }) {
  const [index, setIndex] = useState(0)
  const [coucher, setCoucher] = useState(1350) // 22 h 30
  const [lever, setLever] = useState(420) //  7 h 00
  const [petitDej, setPetitDej] = useState('')
  const [joursSport, setJoursSport] = useState([])
  const [difficulte, setDifficulte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  const etape = ETAPES[index]
  const dernier = index === ETAPES.length - 1

  const reculer = () => setIndex((i) => Math.max(0, i - 1))
  const avancer = () => setIndex((i) => Math.min(ETAPES.length - 1, i + 1))

  const basculerJour = (valeur) =>
    setJoursSport((precedent) =>
      precedent.includes(valeur)
        ? precedent.filter((j) => j !== valeur)
        : [...precedent, valeur],
    )

  const envoyer = async () => {
    setErreur(null)
    setEnvoi(true)
    try {
      await apiClient.savePreferences({
        // Le sélecteur du coucher va au-delà de minuit (jusqu'à 2 h).
        // La base attend une heure du jour : on ramène dans 0-1439.
        coucher_min: ((coucher % 1440) + 1440) % 1440,
        lever_min: lever,
        petit_dej: petitDej,
        jours_sport: joursSport,
        difficulte,
      })
      onTermine()
    } catch (err) {
      /* On ne bloque pas quelqu'un qui vient de payer devant un écran de
         réglage : s'il n'arrive pas à l'enregistrer, il accède quand
         même à son plan, avec les horaires par défaut. */
      setErreur(
        err.message ||
          'Impossible d’enregistrer pour le moment. Tu peux continuer, et régler ça depuis ton compte.',
      )
      setEnvoi(false)
    }
  }

  const peutAvancer = () => {
    if (etape === 'petit-dej') return Boolean(petitDej)
    if (etape === 'difficulte') return Boolean(difficulte)
    return true // les heures ont une valeur par défaut, le sport peut être vide
  }

  const contenu = () => {
    switch (etape) {
      case 'coucher':
        return (
          <WheelPicker
            value={coucher}
            onChange={setCoucher}
            min={1200}
            max={1560}
            step={15}
            format={heureFr}
            label="Heure du coucher"
          />
        )

      case 'lever':
        return (
          <WheelPicker
            value={lever}
            onChange={setLever}
            min={300}
            max={720}
            step={15}
            format={heureFr}
            label="Heure du lever"
          />
        )

      case 'petit-dej':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Petit-déjeuner">
            {OPTIONS_PETIT_DEJ.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                hint={option.indice}
                selected={petitDej === option.valeur}
                onSelect={() => {
                  setPetitDej(option.valeur)
                  avancer()
                }}
              />
            ))}
          </div>
        )

      case 'sport':
        return (
          <div className="setup-jours" role="group" aria-label="Jours de sport">
            {JOURS.map((jour) => (
              <button
                key={jour.valeur}
                type="button"
                aria-pressed={joursSport.includes(jour.valeur)}
                aria-label={jour.long}
                className={`setup-jour ${joursSport.includes(jour.valeur) ? 'actif' : ''}`}
                onClick={() => basculerJour(jour.valeur)}
              >
                {jour.court}
              </button>
            ))}
          </div>
        )

      case 'difficulte':
        return (
          <div className="funnel-choices" role="radiogroup" aria-label="Ta difficulté">
            {OPTIONS_DIFFICULTE.map((option) => (
              <ChoiceCard
                key={option.valeur}
                icon={option.icone}
                title={option.titre}
                hint={option.indice}
                selected={difficulte === option.valeur}
                onSelect={() => setDifficulte(option.valeur)}
              />
            ))}
          </div>
        )

      default:
        return null
    }
  }

  const texte = TEXTES[etape] || {}

  return (
    <FunnelShell
      onBack={index === 0 ? undefined : reculer}
      progress={(index + 1) / ETAPES.length}
      title={texte.titre}
      subtitle={texte.sous}
      footer={
        <>
          {erreur && (
            <p className="funnel-error" role="alert">
              {erreur}
            </p>
          )}
          <FunnelButton
            onClick={dernier ? envoyer : avancer}
            disabled={!peutAvancer() || envoi}
          >
            {envoi ? (
              <>
                <Spinner />
                Enregistrement…
              </>
            ) : dernier ? (
              'Voir mon plan'
            ) : (
              'Suivant'
            )}
          </FunnelButton>

          {etape === 'sport' && joursSport.length === 0 && (
            <p className="setup-note">Aucun jour ? Passe simplement à la suite.</p>
          )}
        </>
      }
    >
      {contenu()}
    </FunnelShell>
  )
}

export default PlanSetupPage
