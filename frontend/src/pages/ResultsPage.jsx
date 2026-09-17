import { useEffect, useState } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'

import { AnalyseChart } from '@/components/ui/analyse-chart'
import { Confetti } from '@/components/ui/confetti'

import Spinner from '../components/Spinner'
import { resultatVu } from '../lib/analytics'
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

  /* La prediction elle-meme n est plus lue sur cet ecran : la taille adulte
     est desormais sous cadenas. Le composant ne se sert que de ce que
     l utilisateur a saisi lui-meme — sa taille du jour et ses trois leviers —
     plus la garde de chargement ci-dessus.

     Le chiffre reste dans predictionData et part au paiement ; il est affiche
     apres, sur le plan. */

  /* Le repli sur 170 cm fabriquait un chiffre : le champ lu n'existait pas,
     si bien qu'un adolescent de 183 cm se voyait annoncer « +16,2 cm » de
     croissance restante. Sans la taille saisie, on n'affiche rien. */
  const tailleActuelle = predictionData.current_height_cm

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

  /* CE QUE SES HABITUDES LUI COUTENT, EN CLAIR.

     C'est le seul argument de cet écran qui soit à la fois SON chiffre,
     une perte en cours, et réparable par ce qu'on vend. Il était caché
     derrière « Optimise jusqu'à 🔒 cm » : on cachait l'enjeu ET le
     remède, donc il ne restait aucune raison d'ouvrir.

     Le modèle produit deux scénarios — l'estimation avec les habitudes
     déclarées, et le potentiel si elles étaient à la cible. Mesuré en
     production le 17/09/2026, garçon de 14 ans, 165 cm, parents 176/164 :

       habitudes dégradées ... 173,8  potentiel 179,2  ->  5,4 cm
       habitudes moyennes .... 177,0  potentiel 179,2  ->  2,2 cm
       habitudes à la cible .. 179,2  potentiel 179,2  ->  0 cm

     L'écart vaut zéro quand il n'y a rien à gagner, et on le dit alors
     — c'est ce qui sépare ce chiffre d'une urgence fabriquée. Sans
     aucune réponse de mode de vie, il ne veut rien dire : le bloc
     retombe sur le cadenas. */
  const estimeeCm = Number(predictionData.predicted_height_cm)
  const potentielCm = Number(predictionData.potential_height_cm)
  const ecartHabitudes =
    Number.isFinite(estimeeCm) && Number.isFinite(potentielCm) && potentielCm > estimeeCm
      ? Math.round((potentielCm - estimeeCm) * 10) / 10
      : 0

  /* Rang parmi les jeunes du meme age, calcule par le serveur sur les
     tables OMS. Il ne se derive d'aucune valeur verrouillee : on peut
     l'afficher sans ouvrir la porte. */
  const percentileAge = Number(predictionData.percentile_age)
  const percentileAffichable = Number.isFinite(percentileAge) && percentileAge > 0

  /* Part de croissance deja parcourue.

     ARRONDI A 5 % ET PAS AU POINT PRES, VOLONTAIREMENT. La taille du jour
     est affichee juste au-dessus : un pourcentage exact laisserait
     reconstituer la taille adulte, qui est justement sous cadenas —
     165 / 0,89 donne 185,4. Par tranches de cinq, la meme division ouvre
     une fourchette de dix centimetres, trop large pour remplacer ce que
     l'abonnement livre. */
  const partCroissance =
    Number.isFinite(estimeeCm) && estimeeCm > 0 && tailleActuelle > 0
      ? Math.min(95, Math.round((tailleActuelle / estimeeCm) * 20) * 5)
      : 0

  const auMoinsUnLevier = leviers.some((levier) => levier.renseigne)
  const coutAffichable = auMoinsUnLevier && ecartHabitudes > 0
  const dejaAuMaximum = auMoinsUnLevier && ecartHabitudes === 0
  /* Le potentiel optimisé (potential_height_cm) n’est plus affiché en clair
     sur cet écran : il est passé derrière le cadenas « Optimise jusqu’à 🔒 cm »,
     qui est précisément ce que l’abonnement ouvre. Le chiffre existe côté
     serveur, il est donc livrable après paiement — un cadenas ne doit jamais
     promettre une valeur que le produit ne sait pas produire. */

  /* Plus de libellé « Fiabilité : faible / moyenne ». Il inquiétait sans
     informer : « faible » ne dit pas de combien on peut se tromper, alors
     que le « ± X cm » juste à côté le dit exactement, en chiffres. Garder
     les deux revenait à répéter la même idée, la version vague en plus. */

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

        {/* La taille adulte passe derriere le cadenas.

            Decision du client : plus rien de gratuit sur le site. Les neuf
            promesses de gratuite de la page d'accueil ont ete reecrites dans
            le meme commit — verrouiller le resultat en laissant le site
            annoncer qu'il est offert serait une pratique commerciale
            trompeuse, pas un oubli de copie.

            « Taille actuelle » reste EN CLAIR, et ce n'est pas une
            inconsequence : c'est le nombre que l'utilisateur a saisi lui-meme
            six ecrans plus tot. Le masquer ne protegerait rien — il le
            connait — et donnerait un ecran entierement cadenasse, qui ne
            donne envie de rien. Il sert de point d'appui : c'est parce qu'il
            voit d'ou il part qu'il a envie de savoir ou il arrive. */}
        <div className="analyse-duo">
          <div className="analyse-case">
            <span className="analyse-case-label">Taille actuelle</span>
            <span className="analyse-case-valeur">{cm(tailleActuelle)} cm</span>
          </div>
          <div className="analyse-case analyse-case--accent">
            <span className="analyse-case-label">Ta taille adulte</span>
            <span className="analyse-case-valeur">
              <Lock size={22} aria-hidden="true" />
            </span>
          </div>
        </div>

        {coutAffichable && (
          <div className="analyse-ligne analyse-ligne--perte">
            <span className="analyse-perte-label">Tes habitudes te coûtent</span>
            <strong className="analyse-perte-valeur">−{fr(ecartHabitudes)} cm</strong>
          </div>
        )}

        {dejaAuMaximum && (
          <div className="analyse-ligne analyse-ligne--acquis">
            <span className="analyse-perte-label">Tes habitudes ne te coûtent rien</span>
            <strong className="analyse-perte-valeur">0 cm</strong>
          </div>
        )}

        {!coutAffichable && !dejaAuMaximum && (
          <div className="analyse-ligne analyse-ligne--verrou">
            <span>Optimise jusqu’à</span>
            <Lock size={17} aria-hidden="true" />
            <span>cm</span>
            <span aria-hidden="true">📈</span>
          </div>
        )}

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

          {/* Aucune donnée passée, et c'est le sujet : cette courbe est un
              aperçu verrouillé, pas la trajectoire de l'utilisateur. Y
              brancher ses chiffres reviendrait à livrer en image ce que les
              cadenas juste au-dessus disent garder — on lirait la forme, la
              position du point et l'écart restant sans avoir payé. */}
          <AnalyseChart />
        </section>

        {percentileAffichable && (
          <div className="analyse-ligne analyse-ligne--fait">
            <span className="analyse-perte-label">
              Plus grand que {percentileAge} % des jeunes de ton âge
            </span>
            <span aria-hidden="true">🌍</span>
          </div>
        )}

        {partCroissance > 0 && (
          <div className="analyse-ligne analyse-ligne--fait">
            <span className="analyse-perte-label">
              Tu as fait {partCroissance} % de ta croissance
            </span>
            <span aria-hidden="true">📈</span>
          </div>
        )}

        {/* Cette ligne portait « Ton frein principal » parce que le percentile
            de Taller (« Plus grand que X % de ton âge ») demandait des tables
            de référence que le produit n'avait pas — et qu'un cadenas ne doit
            jamais promettre un chiffre qu'on ne saura pas livrer.

            Ces tables existent depuis l'import OMS (who_hfa_table.go) : le
            percentile est desormais calculable et donc livrable. La ligne
            pourra basculer dessus quand l'API le renverra ; en attendant elle
            garde le frein principal, qui est livre par le plan. */}
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
          <div className="analyse-case analyse-case--verrou">
            <span className="analyse-case-label">Fin de ta croissance</span>
            <span className="analyse-case-valeur">
              <Lock size={20} aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* Le partage a disparu de cet écran. Il produisait une image portant
            la taille adulte estimée — c'est-à-dire exactement ce que la carte
            du haut vient de verrouiller. Un bouton qui contourne le paywall
            deux écrans plus bas n'est pas un oubli, c'est une fuite.

            La fonction reste entière dans lib/share-card.js : sa place est
            désormais APRÈS le paiement, sur le plan, où l'utilisateur a le
            droit de partager le chiffre qu'il a acheté. */}

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
