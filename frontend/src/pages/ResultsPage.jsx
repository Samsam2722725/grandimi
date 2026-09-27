import { useEffect, lazy, Suspense } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'

import { AnalyseChart } from '@/components/ui/analyse-chart'
const BalloonsPopBackground = lazy(() => import('@/components/ui/balloons-pop-background').then(m => ({ default: m.BalloonsPopBackground })))
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
      {/* Le fond de ballons est posé EN PREMIER et en `position: absolute`
          dans `.results`, qui est déjà la surface plein écran de cet
          écran. Le composant d'origine s'habillait d'un `fixed inset-0
          bg-zinc-950` : un second calque opaque par-dessus aurait
          simplement recouvert le résultat.

          Il ne remplace pas les confettis, qui font autre chose : une
          salve unique au montage, puis plus rien. Les ballons, eux,
          restent — c'est un décor de fond, pas une célébration. */}
      <Suspense fallback={null}>
        <BalloonsPopBackground className="results-ballons" />
      </Suspense>

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

        {/* HORS DES COURBES DE RÉFÉRENCE.

            Le serveur signale les profils dont la taille s'écarte de plus de
            trois écarts-types de la médiane de leur âge. Sur ceux-là le
            modèle ne sait rien : il borne son chiffre et le dit.

            Relevé en production le 18/09/2026, avant le correctif : un
            garçon de 11 ans à 180 cm recevait « 201,1 cm » présenté
            exactement comme n'importe quel autre résultat, à côté d'un
            bouton d'abonnement. C'est le seul endroit du produit où il faut
            renvoyer ailleurs plutôt que vendre. */}
        {predictionData.out_of_domain && predictionData.warning && (
          <div className="analyse-alerte" role="status">
            <span className="analyse-alerte-icone" aria-hidden="true">⚕️</span>
            <p>{predictionData.warning}</p>
          </div>
        )}

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
            <span className="analyse-case-label">Taille potentielle</span>
            <span className="analyse-case-valeur">
              <Lock size={22} aria-hidden="true" />
            </span>
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

          {/* Aucune donnée passée, et c'est le sujet : cette courbe est un
              aperçu verrouillé, pas la trajectoire de l'utilisateur. Y
              brancher ses chiffres reviendrait à livrer en image ce que les
              cadenas juste au-dessus disent garder — on lirait la forme, la
              position du point et l'écart restant sans avoir payé. */}
          <AnalyseChart />
        </section>

        {/* Plus rien d'affiché en clair sous le graphique : décision du
            client, « rien de gratuit ». Le percentile et la part de
            croissance restante étaient lisibles ici ; ils passent derrière
            le cadenas comme le reste. */}
        <div className="analyse-ligne analyse-ligne--verrou">
          <span>Plus grand que</span>
          <Lock size={17} aria-hidden="true" />
          <span>de ton âge</span>
          <span aria-hidden="true">🌍</span>
        </div>

        <div className="analyse-duo">
          <div className="analyse-case analyse-case--verrou">
            <span className="analyse-case-label">Taille souhaitée</span>
            <Lock size={22} aria-hidden="true" />
            <span className="analyse-barre-floue" aria-hidden="true" />
          </div>
          <div className="analyse-case analyse-case--verrou">
            <span className="analyse-case-label">Croissance finie</span>
            <Lock size={22} aria-hidden="true" />
            <span className="analyse-barre-floue" aria-hidden="true" />
          </div>
        </div>

        {/* Le partage a disparu de cet écran. Il produisait une image portant
            la taille adulte estimée — c'est-à-dire exactement ce que la carte
            du haut vient de verrouiller. Un bouton qui contourne le paywall
            deux écrans plus bas n'est pas un oubli, c'est une fuite.

            La fonction reste entière dans lib/share-card.js : sa place est
            désormais APRÈS le paiement, sur le plan, où l'utilisateur a le
            droit de partager le chiffre qu'il a acheté. */}

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
