import { useEffect, useState } from 'react'
import { ArrowLeft, Lock, Share2 } from 'lucide-react'

import { AnalyseChart } from '@/components/ui/analyse-chart'
import { Confetti } from '@/components/ui/confetti'
import { ageFinCroissance } from '@/components/ui/growth-chart'

import Spinner from '../components/Spinner'
import { genererCarteResultat, partagerCarte } from '../lib/share-card'
import { resultatPartage, resultatVu } from '../lib/analytics'
import '../styles/funnel.css'
import '../styles/results-page.css'
import '../styles/analyse-page.css'

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

  /* Les trois leviers, d'apres SES réponses. Un champ vide ou nul veut
     dire « pas renseigné » et ne compte pas.

     Le détail levier par levier a été retiré de l'écran : il ne reste
     de cette liste que le test « au moins un levier renseigné », qui
     conditionne l'affichage du coût des habitudes. Sans aucune réponse
     de mode de vie, ce coût ne veut rien dire et le bloc disparaît. */
  const heuresSommeil = Number(predictionData.sleep_hours_per_night)
  const minutesSport = Number(predictionData.exercise_min_per_day)

  const NUTRITION_LABEL = {
    poor: 'irrégulière',
    fair: 'moyenne',
    good: 'correcte',
    excellent: 'très suivie',
  }

  const leviers = [
    {
      cle: 'sommeil',
      nom: 'Sommeil',
      renseigne: Number.isFinite(heuresSommeil) && heuresSommeil > 0,
      sousCible: Number.isFinite(heuresSommeil) && heuresSommeil > 0 && heuresSommeil < 8,
      valeur: Number.isFinite(heuresSommeil) ? `${fr(heuresSommeil)} h par nuit` : '',
      cible: '8 à 10 h à ton âge',
      enjeu: 'L’hormone de croissance se libère surtout en sommeil profond.',
    },
    {
      cle: 'nutrition',
      nom: 'Alimentation',
      renseigne: Boolean(NUTRITION_LABEL[predictionData.nutrition_level]),
      sousCible: ['poor', 'fair'].includes(predictionData.nutrition_level),
      valeur: NUTRITION_LABEL[predictionData.nutrition_level] || '',
      cible: 'protéines et calcium à chaque repas',
      enjeu: 'L’os ne s’allonge pas avec ce qu’il n’a pas reçu.',
    },
    {
      cle: 'activite',
      nom: 'Activité',
      renseigne: Number.isFinite(minutesSport) && minutesSport > 0,
      sousCible: Number.isFinite(minutesSport) && minutesSport > 0 && minutesSport < 30,
      valeur: Number.isFinite(minutesSport) ? `${minutesSport} min par jour` : '',
      cible: '30 min minimum',
      enjeu: 'La mise en charge stimule le cartilage tant qu’il est ouvert.',
    },
  ].filter((levier) => levier.renseigne)

  /* Nombre de leviers sous la cible. Sert la pastille rouge du graphe.
     Un champ vide ne compte pas : deux points vrais valent mieux que trois
     dont un inventé. */
  const pointsACorriger = leviers.filter((levier) => levier.sousCible).length

  /* Le potentiel optimisé (potential_height_cm) n''est plus affiché en clair
     sur cet écran : il est passé derrière le cadenas « Optimise jusqu''à 🔒 cm »,
     qui est précisément ce que l''abonnement ouvre. Le chiffre existe côté
     serveur, il est donc livrable après paiement — un cadenas ne doit jamais
     promettre une valeur que le produit ne sait pas produire. */

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
    <div className="night results analyse">
      <Confetti />

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
        <h1 className="analyse-titre">
          Analyse prête <span aria-hidden="true">👀</span>
        </h1>

        {/* Deux cartes, la seconde accentuée.

            Chez Taller, cette seconde carte est verrouillée : la taille adulte
            elle-même est le produit qu'on achète. Ici elle est LISIBLE, et ce
            n'est pas un oubli — la page d'accueil promet quatre fois que
            l'estimation est gratuite et qu'aucun résultat n'est flouté. La
            verrouiller demanderait de réécrire ces quatre promesses le même
            jour.

            Ce qui passe derrière le cadenas est ce qui est réellement payant :
            le potentiel optimisé, juste en dessous. */}
        <div className="analyse-duo">
          <div className="analyse-case">
            <span className="analyse-case-label">Taille actuelle</span>
            <span className="analyse-case-valeur">{cm(tailleActuelle)} cm</span>
          </div>
          <div className="analyse-case analyse-case--accent">
            <span className="analyse-case-label">Taille adulte estimée</span>
            <span className="analyse-case-valeur">{cm(predicted_height_cm)} cm</span>
          </div>
        </div>

        <div className="analyse-ligne analyse-ligne--verrou">
          <span>Optimise jusqu’à</span>
          <Lock size={17} aria-hidden="true" />
          <span>cm</span>
          <span aria-hidden="true">📈</span>
        </div>

        <section className="analyse-carte-graphe">
          <div className="analyse-graphe-tete">
            <span className="analyse-graphe-titre">
              <span className="analyse-point" aria-hidden="true" />
              Taille / Âge
            </span>
            <span className="analyse-graphe-verrou" aria-hidden="true">
              <Lock size={14} />
            </span>
            {pointsACorriger > 0 && (
              <span className="analyse-alerte">
                {pointsACorriger} point{pointsACorriger > 1 ? 's' : ''} à corriger
              </span>
            )}
          </div>

          <AnalyseChart
            ageNow={predictionData.age}
            ageFin={ageFin}
            heightNow={tailleActuelle}
            predicted={predicted_height_cm}
          />
        </section>

        {/* Taller met ici « Plus grand que 🔒 de ton âge ». Le percentile
            demande de vraies tables de référence (OMS, taille-pour-âge), que
            ce produit n'a pas : promettre derrière un cadenas un chiffre qu'on
            ne saura pas livrer après paiement est la seule chose qu'un
            cadenas ne doit jamais faire. La ligne garde sa forme, avec ce que
            le plan produit réellement. */}
        <div className="analyse-ligne analyse-ligne--verrou">
          <span>Ton frein principal</span>
          <Lock size={17} aria-hidden="true" />
          <span aria-hidden="true">🎯</span>
        </div>

        <div className="analyse-duo">
          <div className="analyse-case analyse-case--verrou">
            <span className="analyse-case-label">Tes 11 actions du jour</span>
            <span className="analyse-case-valeur">
              <Lock size={20} aria-hidden="true" />
            </span>
          </div>
          <div className="analyse-case">
            <span className="analyse-case-label">Croissance finie</span>
            <span className="analyse-case-valeur">{fr(ageFin)} ans</span>
          </div>
        </div>

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

        {/* La mention reste. Elle n'est sur aucune des captures de référence,
            mais elle est due : le produit s'adresse à des mineurs et touche à
            la santé. Elle est petite et après la décision, pas avant. */}
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
          Débloquer mon potentiel
        </button>
        <button type="button" className="funnel-link" onClick={onBackHome}>
          Plus tard
        </button>
      </footer>
    </div>
  )
}

export default ResultsPage
