import { useEffect, lazy, Suspense } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'

import { AnalyseChart } from '@/components/ui/analyse-chart'
const BalloonsPopBackground = lazy(() => import('@/components/ui/balloons-pop-background').then(m => ({ default: m.BalloonsPopBackground })))
import { Confetti } from '@/components/ui/confetti'

import Spinner from '../components/Spinner'
import { resultatVu } from '../lib/analytics'
import heroCelebrate from '../assets/images/hero-celebrate.webp'
import semainesSuivi from '../assets/images/semaines-suivi.webp'
import lessonsList from '../assets/images/lessons.webp'
import routinePhone from '../assets/images/routine-phone.webp'
import { ActionsDuJour } from '@/components/ui/actions-du-jour'
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

  const estimeeCm = Number(predictionData.predicted_height_cm)
  const potentielCm = Number(predictionData.potential_height_cm)

  /* Rang parmi les jeunes du meme age, calcule par le serveur sur les
     tables OMS. Il ne se derive d'aucune valeur verrouillee : on peut
     l'afficher sans ouvrir la porte. */
  const percentileAge = Number(predictionData.percentile_age)
  const percentileAffichable = Number.isFinite(percentileAge) && percentileAge > 0

  /* Part de croissance qui reste a faire.

     ARRONDI A 5 % ET PAS AU POINT PRES, VOLONTAIREMENT. La taille du jour
     est affichee juste au-dessus : un pourcentage exact laisserait
     reconstituer la taille adulte, qui est justement sous cadenas —
     165 / 0,89 donne 185,4. Par tranches de cinq, la meme division ouvre
     une fourchette de dix centimetres, trop large pour remplacer ce que
     l'abonnement livre.

     LE DENOMINATEUR EST LE POTENTIEL, PAS L ESTIMATION.

     Rapporte a l'estimation — celle que ses habitudes actuelles
     produisent — le chiffre disait « tu as fait 95 % de ta croissance »
     juste sous « tes habitudes te coutent 5,4 cm ». Les deux lignes se
     contredisaient : s'il ne reste que 5 % a faire, il n'y a pas 5 cm a
     recuperer. Le denominateur qui a du sens est son plafond, celui que
     le plan vise ; la part parcourue tombe alors a 92 %, et les deux
     chiffres racontent la meme histoire. */
  const cibleCroissance =
    Number.isFinite(potentielCm) && potentielCm > 0 ? potentielCm : estimeeCm
  /* CE QUI RESTE, PAS CE QUI EST FAIT.

     « Tu as fait 90 % de ta croissance » est exact et demotivant : le
     lecteur en conclut que c'est joue, et il a raison de le conclure —
     c'est ce que la phrase dit. Le meme nombre, pris par l'autre bout,
     designe ce qui est encore en jeu, c'est-a-dire precisement ce que
     l'abonnement adresse. Aucun des deux n'est plus vrai que l'autre ;
     l'un ferme la porte, l'autre l'ouvre.

     TROIS ETATS, ET PAS DEUX. Le calcul portait un plancher a 5 % : en
     dessous, l'arrondi par tranches de cinq affichait « 0 % ». Ce
     plancher soignait un symptome — le modele rendait une taille adulte
     EGALE a la taille du jour pour un profil sur cinq (voir
     internal/estimator/khamis_roche_table.go), et sans lui ces ecrans
     annoncaient « 0 % » a des adolescents de quinze ans.

     Le modele est repare, mais le plancher ne peut pas simplement
     disparaitre : les tranches de cinq arrondissent a zero quelqu'un a
     qui il reste encore quatre centimetres. Il y a donc trois cas, et
     chacun dit la verite :

       plus rien a prendre ....... la ligne ne s'affiche pas
       moins de 5 % ............... « moins de 5 % » (voir plus bas)
       au-dela .................... le pourcentage, par tranches de cinq

     Le seuil est en CENTIMETRES et non en pourcentage : un centimetre
     restant est un centimetre, quelle que soit la taille sur laquelle on
     le rapporte. */
  const centimetresRestants =
    Number.isFinite(cibleCroissance) && cibleCroissance > 0 && tailleActuelle > 0
      ? cibleCroissance - tailleActuelle
      : 0
  const resteCroissance =
    centimetresRestants >= 1
      ? Math.round((centimetresRestants / cibleCroissance) * 20) * 5
      : 0
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

        <img
          src={heroCelebrate}
          alt="Enfant célébrant sa croissance"
          className="results-image results-image-hero"
        />

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
            <span className="analyse-case-label">Ta taille adulte</span>
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

        <img
          src={semainesSuivi}
          alt="Suivi des semaines : Semaine 1-4 avec progression de ta prédiction"
          className="results-image results-image-semaines"
        />

        {percentileAffichable && (
          <div className="analyse-ligne analyse-ligne--fait">
            <span className="analyse-perte-label">
              Plus grand que {percentileAge} % des jeunes de ton âge
            </span>
            <span aria-hidden="true">🌍</span>
          </div>
        )}

        {centimetresRestants >= 1 && (
          <div className="analyse-ligne analyse-ligne--fait">
            <span className="analyse-perte-label">
              {/* « moins de 5 % » plutot que « 5 % » : arrondir 1,4 % a 5 %
                  serait surestimer ce qui reste, sur l'ecran meme qui sert
                  a decider d'un achat. */}
              Il te reste {resteCroissance > 0 ? `${resteCroissance} %` : 'moins de 5 %'} de
              ta croissance à faire
            </span>
            <span aria-hidden="true">📈</span>
          </div>
        )}

        <div className="analyse-ligne analyse-ligne--verrou">
          <span>Ce qui te bloque vraiment</span>
          <Lock size={17} aria-hidden="true" />
          <span aria-hidden="true">🎯</span>
        </div>

        <img
          src={lessonsList}
          alt="3 leçons : Mythes, Nutrition, Sommeil"
          className="results-image results-image-lessons"
        />

        <img
          src={routinePhone}
          alt="Routine quotidienne : 30 jours Level 1"
          className="results-image results-image-routine"
        />

        <ActionsDuJour />

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
