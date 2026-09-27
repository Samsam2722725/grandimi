import { useEffect, useState } from 'react'
import { Ruler, TrendingUp } from 'lucide-react'

import apiClient from '../../lib/api'
import { APERCU_PLAN } from '../../lib/plan-apercu'

/* Onglet « Ma taille » : ce que la landing (« recalculée chaque mois selon
   ton évolution ») et l'onboarding (« saisis ta taille chaque semaine »)
   promettent.

   Une mesure est enregistrée côté serveur (/api/user/mesures), qui rend
   l'historique et, à partir de deux mesures espacées de trois mois, la
   vitesse de croissance RÉELLE. L'estimation est ensuite recalculée avec
   la même requête que le jour de l'analyse, mise à jour : la nouvelle
   taille, l'âge du jour, et la vitesse mesurée quand elle existe. */

const fr = (v) => String(v).replace('.', ',')

function ageAujourdhui(payload, datePrediction) {
  if (!datePrediction) return payload.age
  const ecoule = (Date.now() - new Date(datePrediction).getTime()) / (365.25 * 864e5)
  return Math.round((payload.age + Math.max(0, ecoule)) * 100) / 100
}

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function MaTaille({ predictionData, onMiseAJour }) {
  const [mesures, setMesures] = useState([])
  const [vitesse, setVitesse] = useState(null)
  const [saisie, setSaisie] = useState(String(predictionData.current_height_cm ?? ''))
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [recalcule, setRecalcule] = useState(false)

  useEffect(() => {
    if (APERCU_PLAN) return
    apiClient
      .listerMesures()
      .then((res) => {
        setMesures(res.mesures || [])
        setVitesse(res.vitesse_mesuree_cm_par_an ?? null)
      })
      .catch(() => {})
  }, [])

  const enregistrer = async (e) => {
    e.preventDefault()
    const taille = Number(saisie.replace(',', '.'))
    if (!(taille > 80 && taille < 230)) {
      setErreur('Entre ta taille en centimètres, par exemple 165,5.')
      return
    }
    setErreur(null)
    setRecalcule(false)
    setEnvoi(true)

    try {
      let suivi
      if (APERCU_PLAN) {
        const aujourdHui = new Date().toISOString().slice(0, 10)
        suivi = { mesures: [...mesures.filter((m) => m.mesuree_le !== aujourdHui), { mesuree_le: aujourdHui, taille_cm: taille }] }
      } else {
        suivi = await apiClient.enregistrerMesure(taille)
      }
      setMesures(suivi.mesures || [])
      const vitesseMesuree = suivi.vitesse_mesuree_cm_par_an ?? null
      setVitesse(vitesseMesuree)

      /* Recalcul : seulement si la requête d'origine a été gardée (toutes
         les analyses faites depuis ce changement). Sans elle, la mesure
         est enregistrée mais l'estimation reste celle d'origine. */
      const payload = predictionData.payload_prediction
      if (payload && !APERCU_PLAN) {
        const age = ageAujourdhui(payload, predictionData.date_prediction)
        const nouvelle = await apiClient.predictHeightV2({
          ...payload,
          age,
          height_cm: taille,
          height_velocity_cm: vitesseMesuree ?? payload.height_velocity_cm,
        })
        onMiseAJour?.({
          ...predictionData,
          ...nouvelle,
          age,
          current_height_cm: taille,
          payload_prediction: payload,
          date_prediction: predictionData.date_prediction,
        })
        setRecalcule(true)
      }
    } catch (err) {
      setErreur(err.message || 'Impossible d’enregistrer la mesure. Réessaie dans un instant.')
    } finally {
      setEnvoi(false)
    }
  }

  const estimee = Number(predictionData.predicted_height_cm)
  const marge = predictionData.confidence_range

  return (
    <section className="ma-taille">
      <div className="ma-taille-estimation">
        <span className="ma-taille-label">
          <TrendingUp size={16} aria-hidden="true" /> Ta taille adulte estimée
        </span>
        <strong className="ma-taille-valeur">{Number.isFinite(estimee) ? `${fr(Math.round(estimee))} cm` : '—'}</strong>
        {marge && (
          <span className="ma-taille-marge">
            entre {fr(Math.round(marge.min))} et {fr(Math.round(marge.max))} cm
          </span>
        )}
        {recalcule && <span className="ma-taille-maj">Estimation recalculée avec ta nouvelle mesure</span>}
      </div>

      <form className="ma-taille-form" onSubmit={enregistrer}>
        <label htmlFor="ma-taille-saisie">Ta taille aujourd’hui</label>
        <div className="ma-taille-ligne">
          <input
            id="ma-taille-saisie"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="80"
            max="230"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
          <span className="ma-taille-unite">cm</span>
          <button type="submit" className="funnel-cta ma-taille-bouton" disabled={envoi}>
            {envoi ? 'Calcul…' : 'Enregistrer'}
          </button>
        </div>
        <p className="ma-taille-aide">
          Mesure-toi chaque semaine, le matin, pieds nus, dos au mur. Chaque mesure recalcule ton
          estimation.
        </p>
        {erreur && (
          <p className="funnel-error" role="alert">
            {erreur}
          </p>
        )}
      </form>

      {vitesse != null && (
        <div className="ma-taille-vitesse">
          Tu grandis de <strong>{fr(Math.round(vitesse * 10) / 10)} cm par an</strong>, d’après tes
          mesures.
        </div>
      )}

      <div className="ma-taille-historique">
        <h3>
          <Ruler size={16} aria-hidden="true" /> Tes mesures
        </h3>
        {mesures.length === 0 ? (
          <p className="ma-taille-vide">Pas encore de mesure. Enregistre la première ci-dessus.</p>
        ) : (
          <ul>
            {[...mesures].reverse().map((m) => (
              <li key={m.mesuree_le}>
                <span>{dateLisible(m.mesuree_le)}</span>
                <strong>{fr(m.taille_cm)} cm</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
