import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Lock, Share2 } from 'lucide-react'

import { ageFinCroissance } from '@/components/ui/growth-chart'
import { GrowthProjectionChart } from '@/components/ui/growth-projection-chart'
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

  /* Les trois leviers, d'apres SES réponses. Un champ vide ou nul veut
     dire « pas renseigné » et ne compte pas : mieux vaut annoncer deux
     points vrais que trois dont un inventé.

     L'écran se contentait d'un compte — « 2 points à corriger » — et
     renvoyait le détail au plan payant. C'était un cadenas de trop : au
     moment de décider s'il paie, le visiteur ne savait même pas de QUOI
     on parlait, donc ce qu'il achetait. Or ces trois valeurs viennent de
     ses propres réponses, il les a saisies quatre écrans plus tôt ; les
     lui cacher ne protège rien et ne vend rien.

     Ce qui reste payant est ce qui l'a toujours été : quoi faire, dans
     quel ordre, à quelle heure. Nommer le problème donne envie de la
     solution — cacher le problème donne seulement envie de partir. */
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

  const aCorriger = leviers.filter((levier) => levier.sousCible)
  const pointsACorriger = aCorriger.length

  /* Ce que les habitudes actuelles coûtent, en centimètres.

     Le serveur renvoie `potential_height_cm` : la même estimation, calculée
     avec les trois leviers à la cible. L'écart entre les deux sort donc du
     modèle, pas d'un argumentaire — c'est la seule façon honnête de répondre
     à « le plan me rapporte quoi ? », question qu'on esquivait jusqu'ici
     derrière un cadenas.

     POURQUOI CE BLOC EXISTE ALORS QUE LA COURBE MONTRE DÉJÀ LES DEUX
     TRAJECTOIRES. Parce qu'une figure ne donne pas un nombre à retenir. La
     courbe dit la FORME — l'écart se creuse avec le temps, il se referme à la
     fin de la croissance — et ce bloc dit le CHIFFRE. Les deux se renforcent
     au lieu de se concurrencer, contrairement à deux figures qui porteraient
     la même fourchette.

     C'est aussi ce qui a condamné la version où l'écart était un simple
     repère de plus sur une jauge verticale : 1 à 5 cm posés sur une échelle
     qui en couvre 17, les étiquettes se chevauchaient et on ne lisait ni le
     nombre ni la forme.

     Formulé en PERTE et non en gain. C'est ce que le modèle calcule
     littéralement (un facteur sous la cible), et c'est aussi ce qui se
     retient — on protège plus volontiers ce qu'on a que ce qu'on pourrait
     avoir.

     L'écart se calcule sur les chiffres AFFICHÉS, pas sur les valeurs brutes
     — même règle que `margeAffichee` plus haut, et pour la même raison. Sur
     177,3 contre 176,5 la soustraction brute donne 0,8 → « −1 cm », pendant
     que la phrase juste dessous écrit « 177 au lieu de 177 ». Le lecteur fait
     la soustraction lui-même : les deux doivent tomber juste. */
  const potentiel = Number(predictionData.potential_height_cm)
  const coutHabitudes = Number.isFinite(potentiel)
    ? Math.max(0, cm(potentiel) - cm(predicted_height_cm))
    : 0

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

        {/* UNE figure, et une seule, sur cet écran.

            Elle a changé deux fois, et les deux fois pour la même raison de
            fond : montrer ce qui se joue plutôt que ce qui est déjà écrit.

            La trajectoire d'origine traçait une courbe unique vers
            l'estimation — elle disait où il va, jamais ce qu'il peut y
            changer. La jauge verticale qui l'a remplacée disait la distance à
            parcourir, mais avait perdu le temps, donc l'échéance.

            Cette version a les deux, et le second chiffre en plus : le passé
            mesuré à gauche, aujourd'hui comme frontière, puis DEUX
            trajectoires — celle des habitudes actuelles, celle des leviers à
            la cible. L'aire entre les deux est littéralement ce que le plan
            vend, et elle n'existait pas tant que l'estimateur ne renvoyait
            qu'un seul nombre.

            Ce qui disparaît avec la jauge : la fourchette dessinée. Elle
            reste écrite en toutes lettres sous le grand chiffre (« entre X et
            Y cm »), ce qui suffit — une troisième bande sur la même figure
            aurait rendu les deux trajectoires illisibles. */}
        {tailleActuelle ? (
          <section className="night-card">
            <h2 className="night-card-title">Ta trajectoire</h2>
            <GrowthProjectionChart
              ageNow={predictionData.age}
              heightNow={tailleActuelle}
              predicted={predicted_height_cm}
              potentiel={potentiel}
              velocityCM={predictionData.height_velocity_cm}
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

        {/* « Pourquoi maintenant » occupait ici une carte entière pour dire
            que la fenêtre se referme. L'information est vraie et elle reste —
            mais elle est déjà sous le grand chiffre, en toutes lettres (« à
            prendre d'ici tes X ans »), à l'endroit où elle est effectivement
            lue. Une carte de plus pour la redire coûtait un écran de
            défilement au visiteur.

            Le partage descend après le bouton, pour la même raison : neuf
            blocs séparaient le résultat du paywall, et un adolescent qui a
            fait quinze écrans puis neuf blocs n'achète pas — il ferme. */}

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

          {/* La ligne « Ce que ton plan peut aller chercher : 🔒 cm » est
              retirée. Elle avait un sens tant que le chiffre n'existait pas —
              elle posait la question pour donner envie de la réponse. Le
              serveur renvoie maintenant cette réponse, et elle s'affiche dix
              pixels plus bas : garder le cadenas revenait à cacher une chose
              qu'on montre dans la même carte. Ce qui reste payant est ce qui
              l'a toujours été — quoi faire, dans quel ordre, à quelle heure. */}

          {/* Le diagnostic nommé, levier par levier.

              Forme reprise de la liste « Leçon 1 / Leçon 2 / Leçon 3 » du
              paywall de Taller : des lignes identiques, un état par ligne,
              une pastille verte sur ce qui est acquis et un cadenas sur ce
              qui ne l'est pas. Voir le vert à côté du cadenas est ce qui
              rend le cadenas désirable — un écran entièrement verrouillé
              ne donne envie de rien.

              Ici le vert n'est pas un cadeau marketing : c'est un levier
              que l'utilisateur tient déjà, et le dire est la moitié de la
              crédibilité du diagnostic. */}
          {leviers.length > 0 && (
            <div className="analyse-leviers">
              {/* Le chiffre d'abord, la cause ensuite, la solution après :
                  c'est l'ordre dans lequel on accepte une dépense. La liste
                  des leviers qui suit n'est plus une liste de reproches, elle
                  explique d'où sort ce nombre-là. */}
              {coutHabitudes > 0 ? (
                <div className="cout-habitudes">
                  <p className="cout-chiffre">
                    <span className="cout-valeur">−{coutHabitudes}</span>
                    <span className="cout-unite">cm</span>
                  </p>
                  <p className="cout-texte">
                    C’est ce que tes habitudes actuelles te coûtent, d’après tes
                    réponses. Avec les trois leviers à la cible, le même calcul
                    donne <strong>{cm(potentiel)} cm</strong> au lieu de{' '}
                    {cm(predicted_height_cm)}.
                  </p>
                </div>
              ) : (
                /* Rien à aller chercher : le dire franchement vaut mieux que
                   fabriquer un manque. Ça ne tue pas la vente — ça la déplace
                   sur le seul argument qui reste vrai pour ce profil, qui est
                   de ne pas perdre ce qu'il tient déjà. */
                <div className="cout-habitudes cout-habitudes--ok">
                  <p className="cout-texte">
                    <strong>Tes habitudes ne te coûtent rien aujourd’hui.</strong> Le
                    plan sert alors à tenir la position jusqu’au bout de ta
                    croissance, pas à rattraper un retard.
                  </p>
                </div>
              )}

              {pointsACorriger > 0 && (
                <span className="analyse-badge">
                  {pointsACorriger} point{pointsACorriger > 1 ? 's' : ''} à corriger
                </span>
              )}

              <ul className="levier-liste">
                {leviers.map((levier) => (
                  <li
                    key={levier.cle}
                    className={`levier ${levier.sousCible ? 'levier--alerte' : 'levier--ok'}`}
                  >
                    <span className="levier-etat" aria-hidden="true">
                      {levier.sousCible ? <Lock size={14} /> : <Check size={14} />}
                    </span>

                    <span className="levier-corps">
                      <span className="levier-nom">
                        {levier.nom}
                        <em className="levier-valeur">{levier.valeur}</em>
                      </span>
                      <span className="levier-detail">
                        {levier.sousCible ? (
                          <>
                            Sous la cible ({levier.cible}). {levier.enjeu}
                          </>
                        ) : (
                          <>Au niveau. Ce levier-là, tu le tiens déjà.</>
                        )}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {pointsACorriger > 0 && (
                <p className="analyse-note">
                  Ton plan attaque {pointsACorriger === 1 ? 'ce point' : 'ces points'} en
                  premier : quoi faire, à quelle heure, et pendant combien de temps.
                </p>
              )}
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

          {/* « Ce que tu débloques » était une carte séparée, juste après
              celle-ci, avec sa propre liste de quatre promesses. Deux cartes
              d'affilée pour décrire le même abonnement : la première le
              montrait, la seconde le racontait. On garde la démonstration et
              on replie la liste dessous — c'est le même bloc, il n'en faut
              qu'un. */}
          <ul className="results-atouts">
            <li>Refait chaque mois selon tes progrès</li>
            <li>Sommeil, nutrition, exercices — détaillés</li>
            <li>Ta re-mesure mensuelle</li>
            <li>Ton frein principal, nommé</li>
          </ul>
          <p className="results-price">À partir de 4,99 €/mois · résiliable à tout moment</p>
        </section>

        {/* Le partage descend ici, APRÈS le bloc produit et juste avant le
            bouton du pied. Il était placé haut, entre la figure et l'analyse,
            où il coupait la lecture par une action secondaire au moment où le
            visiteur venait d'avoir son chiffre. Il reste discret — il ne doit
            pas concurrencer le CTA — mais sur un site à 26 visiteurs, un
            visiteur qui partage vaut plus qu'un visiteur qui hésite à payer. */}
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
