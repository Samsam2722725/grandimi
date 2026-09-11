import { useState } from 'react'
import { ArrowLeft, Share2 } from 'lucide-react'

import { GrowthTrajectoryChart, ageFinCroissance } from '@/components/ui/growth-chart'
import { HandwritingText } from '@/components/ui/handwriting-text'
import { SpecialText } from '@/components/ui/special-text'

import Spinner from '../components/Spinner'
import { genererCarteResultat, partagerCarte } from '../lib/share-card'
import '../styles/funnel.css'
import '../styles/results-page.css'

/* ============================================================
   RÉSULTAT — un seul chiffre, et sa marge à côté
   ============================================================
   L'écran arrive juste après 14 écrans sombres : il reste sombre. Repasser au
   papier crème ici produisait un flash blanc au moment précis où l'utilisateur
   fixe l'écran pour lire son chiffre.

   Le chiffre est mis en scène comme le fait la concurrence — display géant,
   annotation manuscrite — mais l'annotation dit « ± 4 cm », pas « 98,5 % de
   précision ». C'est la même grammaire visuelle au service de l'inverse :
   ces applis cachent l'incertitude, Grandimi la met au même niveau typographique
   que le résultat. Retirer ce contraste reviendrait à retirer l'argument.

   Tout le contenu de fond (limites, sources, avertissement) est conservé tel
   quel : c'est ce qui distingue le produit, pas un remplissage à alléger.
   ============================================================ */

/* Séparateur décimal français. Le backend renvoie des nombres JS — « 176.5 »
   s'affichait avec un point sur toute la page, et la carte partageable, elle,
   écrivait déjà « 176,5 ». Deux typographies pour la même valeur sur le même
   écran, c'est le genre de détail qui fait amateur. */
const fr = (valeur) => String(valeur).replace('.', ',')

function ResultsPage({ predictionData, onViewPlan, onBackHome }) {
  const [limitesVisibles, setLimitesVisibles] = useState(false)
  const [etatPartage, setEtatPartage] = useState('pret')

  if (!predictionData) {
    return <Spinner size="page" label="Chargement de tes résultats..." />
  }

  const { predicted_height_cm, confidence_range, confidence_level } = predictionData

  /* La marge se lit sur la LARGEUR de l'intervalle, pas sur l'écart au
     maximum. L'ancien calcul (max - estimation) devenait négatif dès que
     l'estimation sortait de sa fourchette, et affichait littéralement
     « ±-39.4 cm » à l'utilisateur. */
  const largeur = Math.max(0, confidence_range.max - confidence_range.min)
  const margeCm = Math.round((largeur / 2) * 10) / 10
  const positionRepere =
    largeur === 0
      ? 50
      : Math.min(
          100,
          Math.max(0, ((predicted_height_cm - confidence_range.min) / largeur) * 100),
        )

  /* Le repli sur 170 cm fabriquait un chiffre : le champ lu n'existait pas,
     si bien qu'un adolescent de 183 cm se voyait annoncer « +16,2 cm » de
     croissance restante. Sans la taille saisie, on n'affiche rien. */
  const tailleActuelle = predictionData.current_height_cm
  const margeRestante = tailleActuelle ? predicted_height_cm - tailleActuelle : 0

  const libelleConfiance =
    { high: 'Élevée', medium: 'Moyenne' }[confidence_level] || 'Faible'

  const ageFin = ageFinCroissance(predictionData.age, predictionData.sex)

  const partager = async () => {
    setEtatPartage('generation')
    try {
      const image = await genererCarteResultat({
        predicted: predicted_height_cm,
        rangeMin: confidence_range.min,
        rangeMax: confidence_range.max,
        margeCm,
        croissanceRestante: margeRestante,
        ageFin,
      })
      const issue = await partagerCarte(
        image,
        `Ma taille adulte estimée : ${fr(predicted_height_cm)} cm (± ${fr(margeCm)} cm).`,
      )
      setEtatPartage(issue === 'telechargement' ? 'telecharge' : 'pret')
    } catch {
      // Canvas indisponible, mémoire, navigateur exotique : on le dit, on ne
      // laisse pas un bouton qui ne répond à rien.
      setEtatPartage('erreur')
    }
  }

  return (
    <div className="night results">
      <header className="results-top">
        <button
          type="button"
          className="funnel-back"
          onClick={onBackHome}
          aria-label="Revenir à l’accueil"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="results-scroll">
        {/* Ce qui occupe la plus grande typographie de l'écran, c'est ce dont
            on se souvient. La taille adulte est un état de fait sur lequel on
            ne peut rien ; les centimètres restants sont la seule quantité que
            l'utilisateur peut encore influencer, et la seule qui diminue avec
            le temps. C'est donc elle qui prend la place, quand elle existe.

            Formulée « attendus » et non « possibles » : c'est l'estimation
            centrale du modèle, pas une borne haute. */}
        {margeRestante > 0 ? (
          <section className="results-hero">
            <p className="results-eyebrow">Il te reste encore</p>

            <p className="results-number results-number--accent">
              <SpecialText className="results-number-value">
                {`+${fr(Math.round(margeRestante * 10) / 10)}`}
              </SpecialText>
              <span className="results-number-unit">cm</span>
            </p>

            <p className="results-hero-sub">
              attendus d’ici tes {fr(ageFin)} ans, si tout se passe normalement.
            </p>

            <p className="results-hero-line">
              Taille adulte estimée : <strong>{fr(predicted_height_cm)} cm</strong>
              <span className="results-margin-inline">
                <HandwritingText text={`± ${fr(margeCm)} cm`} height="1.6rem" />
              </span>
            </p>

            <p className="results-confidence">
              Fiabilité de l’estimation : <strong>{libelleConfiance.toLowerCase()}</strong>
            </p>
          </section>
        ) : (
          /* Croissance terminée, ou estimation sous la taille saisie : il n'y a
             pas de marge à mettre en avant, et en inventer une serait mentir.
             On revient au résultat brut. */
          <section className="results-hero">
            <p className="results-eyebrow">Ta taille adulte estimée</p>

            <p className="results-number">
              <SpecialText className="results-number-value">
                {fr(predicted_height_cm)}
              </SpecialText>
              <span className="results-number-unit">cm</span>
            </p>

            <span className="results-margin">
              <HandwritingText text={`± ${fr(margeCm)} cm`} height="2rem" />
            </span>

            <p className="results-confidence">
              Fiabilité de l’estimation : <strong>{libelleConfiance.toLowerCase()}</strong>
            </p>
          </section>
        )}

        {/* La courbe remplace l'ancienne barre horizontale : elle porte la même
            fourchette PLUS la dimension temps, qui est justement l'argument du
            plan (« la fenêtre se referme »). Deux figures disant la même chose
            se seraient concurrencées. */}
        {tailleActuelle ? (
          <section className="night-card">
            <h2 className="night-card-title">Ta trajectoire</h2>
            <GrowthTrajectoryChart
              ageNow={predictionData.age}
              heightNow={tailleActuelle}
              predicted={predicted_height_cm}
              rangeMin={confidence_range.min}
              rangeMax={confidence_range.max}
              sex={predictionData.sex}
            />
          </section>
        ) : (
          <section className="night-card">
            <h2 className="night-card-title">Ta fourchette</h2>
            <div className="results-range">
              <div className="results-range-bar">
                <span className="results-range-marker" style={{ left: `${positionRepere}%` }} />
              </div>
              <div className="results-range-legend">
                <span>{fr(confidence_range.min)} cm</span>
                <span>{fr(confidence_range.max)} cm</span>
              </div>
            </div>
            <p className="night-card-text">
              Ta taille adulte a de fortes chances de tomber dans cette fourchette.
            </p>
          </section>
        )}

        {/* Placé juste après la courbe : c'est l'écran que l'utilisateur
            vient de regarder, et c'est de celui-là qu'il prend une capture
            s'il n'a pas de bouton. Volontairement en action secondaire — il ne
            doit pas concurrencer le CTA du bas. */}
        <section className="results-share">
          <button
            type="button"
            className="results-share-button"
            onClick={partager}
            disabled={etatPartage === 'generation'}
          >
            <Share2 size={18} aria-hidden="true" />
            {etatPartage === 'generation' ? 'Préparation…' : 'Partager mon résultat'}
          </button>
          <p className="results-share-note" role="status">
            {etatPartage === 'telecharge'
              ? 'Image enregistrée dans tes téléchargements.'
              : etatPartage === 'erreur'
                ? 'L’image n’a pas pu être créée sur cet appareil.'
                : 'Une image prête pour tes stories. La marge d’erreur part avec.'}
          </p>
        </section>

        {margeRestante > 0 && (
          <section className="night-card">
            <h2 className="night-card-title">Ta fenêtre de croissance</h2>
            <p className="results-growth">
              +{Math.round(margeRestante * 10) / 10} cm
              <span> encore possibles</span>
            </p>
            <p className="night-card-text">
              C’est la seule urgence honnête : plus tu agis tôt dans cette fenêtre,
              plus l’effet est réel. Une fois les cartilages fermés, plus rien ne
              rattrape ce qui n’a pas été fait.
            </p>
          </section>
        )}

        <section className="night-card results-offer">
          <h2 className="night-card-title">Et maintenant ?</h2>
          <p className="night-card-text">
            Le plan de croissance te dit quoi faire chaque jour — sommeil, nutrition,
            exercices — et change à chaque mois d’abonnement.
          </p>
          <p className="results-price">À partir de 4,99 €/mois · résiliable à tout moment</p>
        </section>

        <section className="night-card night-card--quiet">
          <p className="night-card-text">
            <strong>Une estimation n’est pas une garantie.</strong> Elle repose sur des
            modèles statistiques et sur les données que tu as saisies. La croissance
            dépend aussi de la génétique, de la santé et de facteurs non mesurables.
          </p>
        </section>

        <section className="results-limits">
          <button
            type="button"
            className="results-limits-toggle"
            onClick={() => setLimitesVisibles((visible) => !visible)}
            aria-expanded={limitesVisibles}
          >
            {limitesVisibles ? 'Masquer les limites' : 'Voir les limites de ce calcul'}
          </button>

          {limitesVisibles && (
            <div className="results-limits-body">
              <h3>Limites de cette estimation</h3>
              <ul>
                <li>
                  <strong>Imprécision à l’adolescence :</strong> avant 16 ans,
                  l’estimation peut varier de ±6 cm. Après 16 ans, elle se précise (±3 cm).
                </li>
                <li>
                  <strong>Facteurs non mesurés :</strong> hormones, maladies, traitements —
                  tous affectent la croissance sans être prévisibles ici.
                </li>
                <li>
                  <strong>Données parentales :</strong> la taille des parents est
                  déclarative. Si elle est imprécise, l’estimation l’est aussi.
                </li>
                <li>
                  <strong>Variation ethnique :</strong> le modèle inclut des ajustements,
                  mais reste construit sur des données majoritairement occidentales.
                </li>
              </ul>

              <h3>Sources &amp; méthodologie</h3>
              <p>
                <strong>Méthode :</strong> taille mi-parentale (Tanner) — la moyenne des
                tailles de tes deux parents, +6,5 cm pour un garçon, −6,5 cm pour une
                fille — ajustée par tes réponses sur le sommeil, l’alimentation et
                l’activité, et jamais inférieure à la taille que tu fais déjà.
                <br />
                <strong>Précision moyenne :</strong> ±3 à ±6 cm selon l’âge
              </p>
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/?term=mid-parental+height+target"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lire les publications scientifiques
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="funnel-footer">
        <button type="button" className="funnel-cta" onClick={onViewPlan}>
          Voir mon plan de croissance
        </button>
        <button type="button" className="funnel-link" onClick={onBackHome}>
          Plus tard
        </button>
      </footer>
    </div>
  )
}

export default ResultsPage
