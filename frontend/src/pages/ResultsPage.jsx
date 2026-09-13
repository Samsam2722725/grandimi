import { useEffect, useState } from 'react'
import { ArrowLeft, Share2 } from 'lucide-react'

import { Lock } from 'lucide-react'

import { GrowthTrajectoryChart, ageFinCroissance } from '@/components/ui/growth-chart'
import { HandwritingText } from '@/components/ui/handwriting-text'
import { SpecialText } from '@/components/ui/special-text'

import Spinner from '../components/Spinner'
import { genererCarteResultat, partagerCarte } from '../lib/share-card'
import { resultatPartage, resultatVu } from '../lib/analytics'
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

/* Arrondi d’affichage. Une estimation donnée à ±8 cm n’a pas de
   dixième de centimètre à revendiquer ; l'écrire quand même se lit
   comme une fausse précision. */
const cm = (valeur) => Math.round(Number(valeur))

function ResultsPage({ predictionData, onViewPlan, onBackHome }) {
  const [limitesVisibles, setLimitesVisibles] = useState(false)
  const [etatPartage, setEtatPartage] = useState('pret')

  /* Le résultat est le pivot du tunnel : c'est ici que se décide la
     suite (payer, partager, partir). Il doit être compté séparément
     de l'estimation obtenue — l'appel peut réussir sans que l'écran
     soit jamais vu. */
  useEffect(() => {
    if (!predictionData) return
    resultatVu({
      age: predictionData.age,
      sexe: predictionData.sex,
      confiance: predictionData.confidence_level,
    })
  }, [predictionData])

  if (!predictionData) {
    return <Spinner size="page" label="Chargement de tes résultats..." />
  }

  const { predicted_height_cm, confidence_range } = predictionData

  /* La marge se lit sur la LARGEUR de l'intervalle, pas sur l'écart au
     maximum. L'ancien calcul (max - estimation) devenait négatif dès que
     l'estimation sortait de sa fourchette, et affichait littéralement
     « ±-39.4 cm » à l'utilisateur. */
  const largeur = Math.max(0, confidence_range.max - confidence_range.min)
  const margeCm = Math.round(largeur / 2)
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

  /* On décide sur le chiffre AFFICHÉ, pas sur la valeur brute.

     La condition testait `margeRestante > 0` pendant que l'affichage
     arrondissait au centimètre : un écart de 0,1 cm passait donc le test
     et s'écrivait « +0 cm ». Vérifié en production le 13/09/2026 — fille
     de 15 ans, 165 cm, parents de 176 et 164 : estimation 165,1 cm,
     écart 0,1 cm, écran « Il te reste encore +0 cm ».

     Ça tombe surtout sur les filles : elles finissent de grandir vers
     16 ans, donc leur estimation est souvent à quelques millimètres de
     leur taille du jour. Le défaut n'est pas dans le calcul, il est
     dans le seuil.

     Le même nombre part vers l'image de partage, qui arrondissait au
     dixième et annonçait « +0,1 cm » : deux écritures différentes du
     même non-sens. Une seule décision, ici, pour les deux. */
  const margeAffichee = cm(margeRestante)

  /* Combien de leviers sont en dessous de la cible, d'apres SES
     réponses. Un champ vide ou nul veut dire « pas renseigné » et
     ne compte pas : mieux vaut annoncer deux points vrais que trois
     dont un inventé. */
  const heuresSommeil = Number(predictionData.sleep_hours_per_night)
  const minutesSport = Number(predictionData.exercise_min_per_day)
  const pointsACorriger = [
    Number.isFinite(heuresSommeil) && heuresSommeil > 0 && heuresSommeil < 8,
    ['poor', 'fair'].includes(predictionData.nutrition_level),
    Number.isFinite(minutesSport) && minutesSport > 0 && minutesSport < 30,
  ].filter(Boolean).length

  /* Plus de libellé « Fiabilité : faible / moyenne ». Il inquiétait sans
     informer : « faible » ne dit pas de combien on peut se tromper, alors
     que le « ± X cm » juste à côté le dit exactement, en chiffres. Garder
     les deux revenait à répéter la même idée, la version vague en plus. */

  const ageFin = ageFinCroissance(predictionData.age, predictionData.sex)

  const partager = async () => {
    setEtatPartage('generation')
    try {
      const image = await genererCarteResultat({
        predicted: predicted_height_cm,
        rangeMin: confidence_range.min,
        rangeMax: confidence_range.max,
        margeCm,
        croissanceRestante: margeAffichee,
        ageFin,
      })
      const issue = await partagerCarte(
        image,
        `Ma taille adulte estimée : ${fr(predicted_height_cm)} cm (± ${fr(margeCm)} cm).`,
      )
      // Partage natif ou téléchargement : deux gestes différents, le
      // second n'atteint personne tant que le fichier n'est pas envoyé.
      resultatPartage(issue)
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
        {margeAffichee > 0 ? (
          <section className="results-hero">
            <p className="results-eyebrow">Il te reste encore</p>

            <p className="results-number results-number--accent">
              <SpecialText className="results-number-value">
                {`+${cm(margeRestante)}`}
              </SpecialText>
              <span className="results-number-unit">cm</span>
            </p>

            <p className="results-hero-sub">
              à prendre d’ici tes {fr(ageFin)} ans.
            </p>

            <p className="results-hero-line">
              Tu devrais atteindre <strong>{cm(predicted_height_cm)} cm</strong>
              {/* Les deux bornes en toutes lettres plutôt que « ± 8 cm » :
                  la même information, mais sans demander au lecteur de
                  faire deux soustractions de tête pour savoir ce qu’on lui
                  annonce. */}
              <span className="results-margin-inline">
                <HandwritingText
                  text={`entre ${cm(confidence_range.min)} et ${cm(confidence_range.max)} cm`}
                  height="1.6rem"
                />
              </span>
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
                {cm(predicted_height_cm)}
              </SpecialText>
              <span className="results-number-unit">cm</span>
            </p>

            <span className="results-margin">
              <HandwritingText text={`± ${fr(margeCm)} cm`} height="2rem" />
            </span>
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
                <span>{cm(confidence_range.min)} cm</span>
                <span>{cm(confidence_range.max)} cm</span>
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

        {/* Le « +X cm » n'est plus répété ici : il est déjà le plus gros
            chiffre de l'écran, deux sections plus haut. L'afficher une
            seconde fois en grand donnait l'impression de radoter, et
            noyait la seule information que ce bloc apporte vraiment —
            que cette fenêtre se referme. */}
        {margeAffichee > 0 && (
          <section className="night-card">
            <h2 className="night-card-title">Pourquoi maintenant</h2>
            <p className="night-card-text">
              Ces centimètres ne resteront pas disponibles indéfiniment. Plus tu agis
              tôt, plus l’effet est réel : une fois les cartilages de croissance
              fermés, plus rien ne rattrape ce qui n’a pas été fait.
            </p>
          </section>
        )}

        {/* ---------- Analyse, façon tableau de bord ----------

            Reprise de l'écran « Analyse prête » de GoTall : une grille de
            cartes, des valeurs sous cadenas, un compte de points à
            corriger. Le dispositif crée l'envie mieux qu'un paragraphe.

            UNE DIFFÉRENCE, ET ELLE N'EST PAS NÉGOCIABLE : chez eux, la
            taille adulte elle-même est floutée. L'accueil de Grandimi
            promet l'inverse, écrit noir sur blanc — « Tu vois ton
            estimation complète, gratuitement. Aucun résultat flouté,
            aucune surprise. » Les cadenas ne portent donc que sur ce qui
            est réellement payant : ce que le plan va chercher, et où.

            Le nombre de points, lui, est vrai — il vient de ses réponses
            sur le sommeil, l'alimentation et l'activité. Annoncer « 3
            points » à tout le monde aurait été le même mensonge que le
            « 98,5 % » d'en face. */}
        <section className="night-card results-analyse">
          <h2 className="night-card-title">Ton analyse</h2>

          <div className="analyse-grille">
            <div className="analyse-carte">
              <span className="analyse-etiquette">Taille actuelle</span>
              <span className="analyse-valeur">{cm(tailleActuelle)} cm</span>
            </div>
            <div className="analyse-carte analyse-carte--accent">
              <span className="analyse-etiquette">Taille adulte estimée</span>
              <span className="analyse-valeur">{cm(predicted_height_cm)} cm</span>
            </div>
          </div>

          <div className="analyse-verrou">
            <span className="analyse-etiquette">Ce que ton plan peut aller chercher</span>
            <span className="analyse-valeur analyse-valeur--verrouille">
              <Lock size={18} aria-hidden="true" />
              cm
            </span>
          </div>

          {pointsACorriger > 0 && (
            <div className="analyse-verrou analyse-verrou--alerte">
              <span className="analyse-badge">
                {pointsACorriger} point{pointsACorriger > 1 ? 's' : ''} à corriger
              </span>
              <p className="analyse-note">
                Sommeil, alimentation, activité : tes réponses en ont signalé{' '}
                {pointsACorriger === 1 ? 'un' : pointsACorriger}. Le détail — lequel, et
                quoi faire — est dans ton plan.
              </p>
            </div>
          )}

          <div className="analyse-grille">
            <div className="analyse-carte analyse-carte--verrouille">
              <span className="analyse-etiquette">Ton frein principal</span>
              <span className="analyse-valeur analyse-valeur--verrouille">
                <Lock size={18} aria-hidden="true" />
              </span>
            </div>
            <div className="analyse-carte analyse-carte--verrouille">
              <span className="analyse-etiquette">Tes 11 actions du jour</span>
              <span className="analyse-valeur analyse-valeur--verrouille">
                <Lock size={18} aria-hidden="true" />
              </span>
            </div>
          </div>
        </section>

        {/* ---------- Ce qu'il achète, montré plutôt que décrit ----------

            « Et maintenant ? » tenait en deux phrases plates juste avant
            le bouton : à l'endroit exact où il faut donner envie, la page
            expliquait. Elle montre désormais une journée — deux actions
            en clair, le reste sous cadenas. Voir deux vraies consignes
            dit la qualité du produit ; le compte de celles qui manquent
            dit ce qu'on achète.

            Les horaires portent la mention « exemple » : ceux du vrai
            plan sont calés sur les heures de coucher et de lever
            demandées après le paiement (PlanSetupPage). Les afficher ici
            comme si c'étaient les siens serait une promesse qu'on ne
            tient pas encore. */}
        <section className="night-card results-journee">
          <h2 className="night-card-title">Ta journée, à partir de demain</h2>
          <p className="journee-exemple">Exemple — tes horaires seront calés sur les tiens</p>

          <ul className="journee-liste">
            <li className="journee-ligne">
              <span className="journee-moment">Au réveil</span>
              <span className="journee-action">3 étirements au mur, 4 minutes</span>
            </li>
            <li className="journee-ligne">
              <span className="journee-moment">Petit-déjeuner</span>
              <span className="journee-action">25 g de protéines avant de partir</span>
            </li>
            <li className="journee-ligne journee-ligne--verrouille">
              <span className="journee-moment">Après-midi</span>
              <span className="journee-action">
                <Lock size={15} aria-hidden="true" />
              </span>
            </li>
            <li className="journee-ligne journee-ligne--verrouille">
              <span className="journee-moment">Le soir</span>
              <span className="journee-action">
                <Lock size={15} aria-hidden="true" />
              </span>
            </li>
            <li className="journee-ligne journee-ligne--verrouille">
              <span className="journee-moment">Au coucher</span>
              <span className="journee-action">
                <Lock size={15} aria-hidden="true" />
              </span>
            </li>
          </ul>

          <p className="journee-total">
            <strong>11 actions par jour.</strong> Chacune dit pourquoi elle est là.
          </p>
        </section>

        <section className="night-card results-offer">
          <h2 className="night-card-title">Ce que tu débloques</h2>
          <ul className="results-atouts">
            <li>Ton plan du jour, refait chaque mois selon tes progrès</li>
            <li>Les 5 guides : sommeil, nutrition, exercices</li>
            <li>Ta re-mesure mensuelle, pour voir la courbe bouger</li>
            <li>Ton frein principal, nommé — et quoi faire à la place</li>
          </ul>
          <p className="results-price">À partir de 4,99 €/mois · résiliable à tout moment</p>
        </section>

        {/* La mention occupait une carte entière juste avant le bouton :
            le dernier mot avant l'achat était un avertissement. Elle reste
            — elle est due, le produit s'adresse à des mineurs et touche à
            la santé — mais à sa place, après la décision, avec le lien
            vers les limites détaillées. */}
        <p className="results-mention">
          Une estimation n’est pas une garantie : elle repose sur des modèles
          statistiques et sur les données que tu as saisies. Grandimi n’est pas un
          dispositif médical et ne remplace pas l’avis d’un professionnel de santé.
        </p>

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
                  <strong>Imprécision à l’adolescence :</strong> en plein pic de
                  croissance, l’estimation peut varier de ±8 cm. Passé 16 ans, quand
                  la croissance ralentit, elle se resserre autour de ±4 cm.
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
                <strong>Précision moyenne :</strong> ±4 à ±8 cm selon l’âge et la croissance récente
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
