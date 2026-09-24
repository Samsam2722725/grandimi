import { lazy, Suspense, useEffect } from 'react'
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react'

import { AnalyseChart } from '@/components/ui/analyse-chart'
import { Confetti } from '@/components/ui/confetti'

/* Chargé à la demande : 414 lignes de canvas qui n'ont aucune raison de
   peser sur le paquet d'entrée, puisque cet écran arrive après quatorze
   autres. */
const BallonsVolee = lazy(() =>
  import('@/components/ui/balloons-pop-background').then((m) => ({
    default: m.BalloonsPopBackground,
  })),
)

import Spinner from '../components/Spinner'
import { resultatVu } from '../lib/analytics'
import '../styles/funnel.css'
import '../styles/results-page.css'
import '../styles/analyse-page.css'

/* ============================================================
   RÉSULTAT — l'écran des deux références, et rien d'autre
   ============================================================
   L'écran reprend exactement ce que montrent les deux captures de
   référence, Taller (violet) et GoTall (vert), réunies :

     en-tête retour + barre de progression pleine ....... GoTall
     « Analyse prête 👀 » ............................... Taller
     Taille actuelle | Taille potentielle 🔒 ............ les deux
     « Optimise jusqu'à 🔒 cm 📈 » ...................... les deux
     « Ce qui te freine : » + N problème(s) trouvé(s) ... GoTall
     carte graphe « Taille / Âge » ...................... Taller
     bulle « Chance du rêve : 🔒 % » .................... GoTall
     « Plus grand que 🔒 de ton âge 🌍 » ................ les deux
     Taille souhaitée 🔒 | Croissance finie 🔒 .......... Taller
     un seul bouton : « Voir mes résultats » de Taller,
     le chevron de GoTall ............................... les deux

   La pastille « N points à corriger » de la capture Taller a été retirée
   à la demande du client : le même compte est déjà porté par « N problèmes
   trouvés » juste au-dessus, et le répéter à deux blocs d'écart faisait
   lire deux mesures là où il n'y en a qu'une.

   Ce qui n'est sur aucune des deux captures n'est plus sur l'écran :
   la mention « pas un dispositif médical », le dépliant limites et
   sources, le coût des habitudes en clair, la part de croissance
   restante, le percentile en clair, le lien « Plus tard ».
   Décision du client, prise en connaissance du risque juridique —
   produit de santé adressé à des mineurs — qui lui a été exposé.

   Reste l'avertissement « hors des courbes de référence », qui
   n'apparaît que sur les profils où le modèle borne son chiffre : il
   n'est sur aucune capture parce qu'aucune capture n'est ce profil-là.

   Les unités restent métriques : les captures affichent des pieds et
   des pouces parce que ces applis s'adressent au marché américain.

   L'accent reste l'orange Grandimi. Le violet de Taller et le vert de
   GoTall ne se mélangent pas, et la couleur de marque ne se décide pas
   sur une capture de concurrent.
   ============================================================ */

/* Arrondi d'affichage. Une estimation donnée à ±8 cm n'a pas de
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

  /* La prédiction elle-même n'est pas lue sur cet écran : la taille adulte,
     le potentiel optimisé, le percentile et le frein principal sont tous
     sous cadenas. Le composant ne se sert que de ce que l'utilisateur a
     saisi lui-même — sa taille du jour, son âge, ses trois leviers.

     Le chiffre reste dans predictionData et part au paiement ; il est
     affiché après, sur le plan. */

  /* Le repli sur 170 cm fabriquait un chiffre : le champ lu n'existait pas,
     si bien qu'un adolescent de 183 cm se voyait annoncer « +16,2 cm » de
     croissance restante. Sans la taille saisie, on n'affiche rien. */
  const tailleActuelle = predictionData.current_height_cm

  /* Âge saisi, posé sous le repère du graphe comme sur la capture GoTall.
     Il est affichable pour la même raison que la taille du jour : c'est SA
     réponse, pas une valeur que le modèle produit. */
  const ageSaisi = Number(predictionData.age)
  const agePastille = Number.isFinite(ageSaisi) && ageSaisi > 0 ? Math.round(ageSaisi) : null

  /* Les trois leviers, d'après SES réponses. Un champ vide ou nul veut
     dire « pas renseigné » et ne compte pas : deux points vrais valent
     mieux que trois dont un inventé.

     Le détail levier par levier n'est pas affiché — les barres de
     « Ce qui te freine » sont floutées, c'est précisément ce que le plan
     ouvre. Il ne reste de ce calcul que le NOMBRE, qui alimente la pastille
     rouge du bloc. */
  const heuresSommeil = Number(predictionData.sleep_hours_per_night)
  const minutesSport = Number(predictionData.exercise_min_per_day)

  const sousCible = [
    Number.isFinite(heuresSommeil) && heuresSommeil > 0 && heuresSommeil < 8,
    ['poor', 'fair'].includes(predictionData.nutrition_level),
    Number.isFinite(minutesSport) && minutesSport > 0 && minutesSport < 30,
  ]
  const pointsACorriger = sousCible.filter(Boolean).length

  return (
    <div className="night results analyse">
      {/* LES BALLONS PASSENT DEVANT, PAS DERRIÈRE.

          Ils étaient posés en fond (z-index 0) sous un voile à 62 % : le
          voile existait parce qu'un ballon vert traversant une carte
          translucide rendait le chiffre illisible. Soigner un décor de
          fond par un calque qui l'éteint revient à payer une boucle de
          rendu pour quelque chose qu'on assombrit ensuite.

          Devant et sans voile, la volée dit ce qu'elle a à dire — quelque
          chose vient d'aboutir — en une seconde et demie, puis le canvas
          est vide et le résultat est lisible en entier. C'est le même
          raisonnement que pour les confettis juste en dessous : ça passe,
          ça ne s'installe pas. */}
      <Suspense fallback={null}>
        <BallonsVolee className="results-ballons" />
      </Suspense>

      <Confetti />

      {/* En-tête de GoTall : la flèche de retour et la barre de progression,
          pleine parce que le questionnaire est fini. Elle ne mesure plus une
          avance, elle la clôt. */}
      <header className="results-top">
        <button
          type="button"
          className="funnel-back"
          onClick={onBackHome}
          aria-label="Revenir à l’accueil"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div
          className="funnel-progress"
          role="progressbar"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Questionnaire terminé"
        >
          <div className="funnel-progress-fill" style={{ width: '100%' }} />
        </div>
        <span className="funnel-header-spacer" aria-hidden="true" />
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
          <div className="analyse-alerte-domaine" role="status">
            <span className="analyse-alerte-icone" aria-hidden="true">⚕️</span>
            <p>{predictionData.warning}</p>
          </div>
        )}

        {/* « Taille actuelle » reste EN CLAIR, et ce n'est pas une
            inconséquence : c'est le nombre que l'utilisateur a saisi lui-même
            six écrans plus tôt. Le masquer ne protégerait rien — il le
            connaît — et donnerait un écran entièrement cadenassé, qui ne
            donne envie de rien. Il sert de point d'appui : c'est parce qu'il
            voit d'où il part qu'il a envie de savoir où il arrive. */}
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

        {/* CE QUI TE FREINE — bloc de GoTall.

            Les barres sont vides et floutées, et le nombre au-dessus est
            vrai : il vient de ses propres réponses. C'est ce couple qui
            fait travailler le bloc — un compte exact, un contenu fermé.
            Une barre floutée dit qu'il y a quelque chose d'illisible, là où
            une barre vide ne dirait rien du tout. */}
        <section className="analyse-freins">
          <div className="analyse-freins-tete">
            <h2 className="analyse-freins-titre">Ce qui te freine :</h2>
            {pointsACorriger > 0 && (
              <span className="analyse-pastille">
                {pointsACorriger} problème{pointsACorriger > 1 ? 's' : ''} trouvé
                {pointsACorriger > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="analyse-freins-liste" aria-hidden="true">
            <span className="analyse-frein-barre" />
            <span className="analyse-frein-barre" />
            <span className="analyse-frein-barre analyse-frein-barre--courte" />
            <span className="analyse-freins-verrou">
              <Lock size={22} />
            </span>
          </div>
        </section>

        <section className="analyse-carte-graphe">
          <div className="analyse-graphe-tete">
            <span className="analyse-graphe-titre">
              <span className="analyse-point" aria-hidden="true" />
              Taille / Âge
            </span>
            <span className="analyse-graphe-verrou" aria-hidden="true">
              <Lock size={14} />
            </span>
          </div>

          {/* La bulle de GoTall, posée au-dessus de la courbe comme une
              infobulle qui n'aurait pas encore le droit de s'ouvrir. */}
          <div className="analyse-graphe-bulle">
            <span>Chance du rêve :</span>
            <Lock size={14} aria-hidden="true" />
            <span>%</span>
          </div>

          {/* Aucune donnée passée hormis l'âge saisi, et c'est le sujet :
              cette courbe est un aperçu verrouillé, pas la trajectoire de
              l'utilisateur. Y brancher ses chiffres reviendrait à livrer en
              image ce que les cadenas juste au-dessus disent garder — on
              lirait la forme, la position du point et l'écart restant sans
              avoir payé. */}
          <AnalyseChart age={agePastille} />
        </section>

        {/* Verrouillé sur les DEUX captures, alors que le serveur sait le
            calculer depuis l'import OMS. Il est donc livrable après
            paiement : un cadenas ne doit jamais promettre une valeur que le
            produit ne sait pas produire. */}
        <div className="analyse-ligne analyse-ligne--verrou">
          <span>Plus grand que</span>
          <Lock size={17} aria-hidden="true" />
          <span>de ton âge</span>
          <span aria-hidden="true">🌍</span>
        </div>

        <div className="analyse-duo">
          <div className="analyse-case analyse-case--verrou">
            <span className="analyse-case-label">Taille souhaitée</span>
            <span className="analyse-case-valeur">
              <Lock size={20} aria-hidden="true" />
            </span>
            <span className="analyse-case-jauge" aria-hidden="true" />
          </div>
          <div className="analyse-case analyse-case--verrou">
            <span className="analyse-case-label">Croissance finie</span>
            <span className="analyse-case-valeur">
              <Lock size={20} aria-hidden="true" />
            </span>
            <span className="analyse-case-jauge" aria-hidden="true" />
          </div>
        </div>
      </main>

      <footer className="funnel-footer">
        <button type="button" className="funnel-cta" onClick={onViewPlan}>
          Voir mes résultats
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </footer>
    </div>
  )
}

export default ResultsPage
