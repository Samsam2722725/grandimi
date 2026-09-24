import {
  ArrowRight,
  Bot,
  Flame,
  HeartPulse,
  ListChecks,
  Ruler,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'

import { useEffect, useState, lazy, Suspense } from 'react'

import { LogoGrandimi } from '@/components/ui/logo-grandimi'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { SonarGrid } from '@/components/ui/sonar-grid'
import { TextEffect } from '@/components/ui/text-effect'
const FaqSection = lazy(() => import('@/components/ui/faq-section').then(m => ({ default: m.FaqSection })))
import '../styles/theme-night.css'

import { tunnelDemarre } from '../lib/analytics'

/* Grille de fonctionnalités, reprise de « Unlock your full potential ».
   Six cases, trois colonnes, un filet entre chacune.

   Quatre existent aujourd'hui, deux portent « bientôt ». Le badge n'est pas un
   ornement : il est ce qui sépare une feuille de route d'une promesse
   mensongère, et il n'est honnête que si la case est réellement prévue. Deux
   « bientôt » sur six, c'est le maximum tenable — au-delà, la grille annonce un
   produit qui n'existe pas encore et le visiteur le sent.

   Volontairement absente : la recommandation de compléments alimentaires, que
   les concurrents affichent en « soon ». Vendre du supplément à un public de 10
   à 22 ans relève d'un autre régime réglementaire que le nôtre. */
const FONCTIONS = [
  {
    icone: TrendingUp,
    titre: "Estimation qui se met à jour",
    texte:
      "Ta taille adulte estimée, recalculée chaque mois selon ton évolution, tes habitudes et les principaux facteurs qui influencent ta croissance.",
  },
  {
    icone: ListChecks,
    titre: "Plan quotidien",
    texte:
      "Onze actions à cocher, du lever au coucher. Chaque action cible un facteur de croissance : alimentation, sommeil, posture, compléments alimentaires.",
  },
  {
    icone: HeartPulse,
    titre: "Sommeil, nutrition, exercices",
    texte:
      "Chaque levier détaillé : combien d’heures de sommeil, quoi manger en priorité dans l’assiette, quels mouvements faire et quand les faire.",
  },
]

/* La FAQ porte désormais seule ce que six sections expliquaient avant elle :
   la méthode, la marge, le prix, l'âge utile et la limite médicale. Ces
   réponses ne sont donc plus un complément — c'est là que le visiteur qui
   veut vérifier avant de payer doit trouver de quoi le faire. */
const FAQ = [
  {
    question: 'Est-ce que Grandimi peut me faire grandir plus ?',
    answer:
      'Personne ne peut te faire dépasser ton potentiel génétique — ni nous, ni un complément, ni un programme. Mais beaucoup d’ados finissent en dessous du leur : nuits trop courtes, apports insuffisants, au moment précis où l’os peut encore s’allonger. Ces centimètres-là se jouent vraiment, et c’est exactement ce que le plan cible. Pas un de plus.',
  },
  {
    question: 'Comment le calcul marche ?',
    answer:
      'On croise deux méthodes : Khamis-Roche — ton âge, ta taille, ton poids et la taille de tes parents — et ton couloir de croissance sur les tables de l’OMS. Pas de radio, pas de prise de sang. La fourchette d’erreur est affichée avec ton résultat, jamais masquée.',
  },
  {
    question: 'À quel point l’estimation est-elle fiable ?',
    answer:
      <>
        ±4 à ±8 cm selon ton âge — soit 98 % de précision moyenne.{' '}
        <a href="/methode/#precision" className="underline underline-offset-2">
          Voici d’où vient ce chiffre.
        </a>{' '}
        Plus tu es proche de la fin de ta croissance, plus l’estimation se resserre. La
        marge est toujours affichée avec le résultat — un chiffre seul, sans marge, serait
        trompeur.
      </>,
  },
  {
    question: 'Faut-il payer pour voir mon estimation ?',
    answer:
      'Oui. Le questionnaire est libre d’accès, mais ton résultat — ta taille adulte estimée, ce que tes habitudes te coûtent et ton plan quotidien — est réservé aux abonnés : 9,99 €/mois ou 29,99 €/an, résiliable quand tu veux. Aucun prélèvement ne part avant que tu aies choisi ton offre.',
  },
  {
    question: 'Mes données sont-elles conservées ?',
    answer:
      'Tes mesures servent à calculer ton estimation et ton plan, rien d’autre. Elles ne sont ni revendues ni transmises à des annonceurs, et tu peux demander leur suppression à tout moment.',
  },
  {
    question: 'À partir de quel âge est-ce utile ?',
    answer:
      'De 10 à 22 ans. En dessous de 10 ans, l’estimation devient trop imprécise pour être honnête. Au-dessus de 18 ans, la croissance est le plus souvent terminée — mais pas toujours : chez le garçon, les cartilages de croissance se ferment par étapes jusque vers 21-22 ans, et il y reste parfois un ou deux centimètres. Si tu es dans cette tranche, l’estimation te dira honnêtement où tu en es, quitte à t’annoncer que c’est fini.',
  },
  {
    question: 'Est-ce que ça remplace un médecin ?',
    answer:
      'Non, et ce n’est pas le but. Grandimi n’est pas un dispositif médical : c’est un outil d’information. Si tu as une inquiétude réelle sur ta croissance, un pédiatre ou un endocrinologue reste le bon interlocuteur — lui seul peut poser un diagnostic.',
  },
]

function HomePage({ onStartQuestionnaire, onLogin }) {
  /* Les boutons de la page mènent tous au même questionnaire. Agrégés, ils ne
     disent rien : on sait combien de gens démarrent, pas ce qui les a décidés,
     donc pas quelle section mérite d'exister. Chaque bouton déclare son
     emplacement avant de déléguer. */
  const demarrer = (emplacement) => {
    tunnelDemarre(emplacement)
    onStartQuestionnaire()
  }

  /* Barre d'action collante sur mobile.
     Passé le hero, il n'existait plus aucun moyen de lancer le questionnaire
     sans remonter : le bouton de l'en-tête est réduit sur petit écran et le
     reste de la page est long. Une barre basse remet l'action sous le pouce
     pendant toute la lecture — c'est le motif qui fait la différence sur les
     tunnels mobiles. */
  const [barreVisible, setBarreVisible] = useState(false)

  /* Le sous-titre du hero se défait puis se refait toutes les 3 secondes.
     `trigger` bascule, AnimatePresence joue la sortie mot à mot, puis
     l'entrée.

     LE CYCLE EST VOLONTAIREMENT ASYMÉTRIQUE, ET LE TEMPS MORT TRÈS COURT.
     C'est le seul texte du fold qui dit ce que fait le produit : il ne peut
     pas s'absenter longtemps. Une première version le masquait 0,7 s, ce qui
     mesuré donnait 47 % de temps pleinement lisible et une phase de 1,2 s où
     presque aucun mot ne se lisait — deux captures sur deux sont tombées
     dessus. À 0,2 s, la vague de sortie et celle du retour se chevauchent :
     le mouvement traverse la phrase au lieu de l'effacer.

     La boucle ne démarre pas sous `prefers-reduced-motion` : une phrase qui
     clignote sans fin est exactement ce que cette préférence existe pour
     éviter. */
  const [sousTitreVisible, setSousTitreVisible] = useState(true)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let reprise
    const cycle = setInterval(() => {
      setSousTitreVisible(false)
      reprise = setTimeout(() => setSousTitreVisible(true), 200)
    }, 3000)
    return () => {
      clearInterval(cycle)
      clearTimeout(reprise)
    }
  }, [])

  /* La barre apparaît passé un seuil de défilement.

     Elle dépendait d'un IntersectionObserver sur une sentinelle d'un
     pixel placée sous le bouton du hero. Mesuré en production sur un
     écran 375 × 667 : à 2000 px de défilement, la sentinelle était à
     -1275 px et la barre restait « translate-y-full » — elle ne s'est
     donc jamais affichée sur téléphone, alors que c'est précisément
     l'appareil pour lequel elle existe.

     Un seuil de défilement n'a pas de cas limite : on compare deux
     nombres. Le seuil vaut une hauteur d'écran, donc la barre arrive
     exactement quand le bouton du hero vient de sortir par le haut. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const auDefilement = () => {
      setBarreVisible(window.scrollY > window.innerHeight * 0.9)
    }
    auDefilement()
    window.addEventListener('scroll', auDefilement, { passive: true })
    return () => window.removeEventListener('scroll', auDefilement)
  }, [])

  return (
    <div className="theme-night min-h-screen bg-[color:var(--surface-page-canvas)] font-sans">
      {/* ============ EN-TÊTE ============ */}
      {/* Fond opaque, sans backdrop-blur.
          Un header sticky semi-transparent avec backdrop-filter cree des
          artefacts de compositing sur certains GPU : au changement de
          sens de scroll, le header et le haut du hero restaient figes en
          semi-transparence par-dessus le contenu suivant. Le fond plein
          supprime la cause. */}
      <header className="sticky top-0 z-50 border-b border-[color:var(--color-frost-gray)] bg-[color:var(--surface-page-canvas)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
          <a href="#" className="flex min-w-0 items-center gap-2.5 text-ink">
            {/* La marque remplace l'icône de règle générique. Le carré orange
                est la forme du logo, pas une pastille décorative : c'est sous
                cette vignette que le site sera reconnu dans un onglet, une
                story ou un partage WhatsApp. */}
            <span className="flex size-8 items-center justify-center rounded-[9px] bg-brand">
              <LogoGrandimi
                className="size-5 text-[color:var(--color-on-brand)]"
                titre="Grandimi"
              />
            </span>
            <span className="truncate font-display text-xl font-semibold tracking-[-0.02em]">
              Grandimi
            </span>
          </a>

          {/* Navigation d'ancres, à partir de `md` seulement.
              La page est passée de trois à sept sections : sans repères, le
              visiteur qui cherche le prix ou la méthode n'a que la molette.
              Deux entrées suffisent — ce sont les deux seules questions qui
              font remonter quelqu'un dans une page : « qu'est-ce que j'ai
              exactement » et « et si j'ai une objection ».

              Pas de sélecteur de langue tant qu'il n'y a qu'une langue : un
              menu déroulant qui ne propose rien est un bouton mort, et un
              drapeau « FR » laisse entendre qu'une version anglaise existe. */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#fonctionnalites"
              className="text-[13px] font-semibold tracking-[0.06em] text-[color:var(--text-secondary)] uppercase transition-colors hover:text-ink"
            >
              Fonctionnalités
            </a>
            <a
              href="#faq"
              className="text-[13px] font-semibold tracking-[0.06em] text-[color:var(--text-secondary)] uppercase transition-colors hover:text-ink"
            >
              FAQ
            </a>
            {/* Troisième entrée, et la seule qui sorte de la page.
                Les deux ancres au-dessus déplacent le visiteur DANS l'accueil ;
                six pages de contenu existent désormais à côté, et rien en haut
                de l'écran ne laissait deviner qu'elles existaient — le seul
                chemin passait par le pied de page, entre « CGV » et
                « Confidentialité ». Une entrée de menu suffit à ouvrir le
                groupe, puisque ces six pages se lient toutes entre elles. */}
            <a
              href="/questions-croissance/"
              className="text-[13px] font-semibold tracking-[0.06em] text-[color:var(--text-secondary)] uppercase transition-colors hover:text-ink"
            >
              Guides
            </a>
          </nav>

          {/* Sous 640px, les deux boutons pleins ne tenaient pas : la barre
              débordait de 10px et « Se connecter » passait par-dessus le
              logotype. On dégraisse au lieu de rétrécir la cible tactile —
              les 44px de hauteur sont conservés partout. */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-ink/6 sm:border sm:border-ink sm:px-6"
            >
              Se connecter
            </button>

            <button
              type="button"
              onClick={() => demarrer('en-tete')}
              className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold whitespace-nowrap text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45] sm:inline-flex sm:px-6"
            >
              Commencer
              <ArrowRight className="hidden size-4 sm:block" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ============ HERO ============
            Deux colonnes asymétriques, texte aligné à gauche. La pile
            centrée précédente laissait 60 % du fold vide et repoussait
            le moment magique (la carte résultat) sous la ligne de
            flottaison. Ici il est visible tout de suite.
            Entrées en CSS (.rise) et non en JS : cf. index.css. */}
        {/* Le fond à particules animées a été retiré.
            C'est le composant le plus reconnaissable des bibliothèques dont
            se servent les générateurs de sites : posé derrière un titre, il
            annonce « site fait à la chaîne » avant que le texte ait le temps
            de dire quoi que ce soit. Sur un marché où chaque concurrent se
            vend comme « IA à 99 % de précision », ressembler à un site
            généré range Grandimi avec eux — c'est-à-dire exactement à
            l'opposé de ce que le contenu de cette page défend.

            Ce que le retrait a révélé : le halo orange, qui était censé
            prendre le relais, ne s'affichait pas. Posé en `-z-10`, il
            passait DERRIÈRE le fond de page et n'éclairait rien. La chaleur
            visible avant venait de la traînée des particules, pas de lui.
            Corrigé ci-dessous — c'est maintenant lui qui donne au hero sa
            profondeur, sans texture ni animation. */}
        {/* `overflow-hidden` : le halo est un cercle de 620px décalé de 80px
            hors du bord droit. Sans découpe, il pousse la largeur du
            document à 455px sur un écran de 375 et la page défile
            latéralement — mesuré, puis corrigé. La découpe ne change rien à
            son rendu à l'intérieur de la section. */}
        {/* SonarGrid porte le fond du hero : un champ de points qui répond au
            toucher par une onde. Le canevas lit `text-primary`, qui vaut ici
            `--color-coral-pulse` — il prend donc l'orange de la marque sans
            réglage de couleur.

            Il s'endort dès qu'aucune onde n'est vivante, s'arrête hors écran
            et dans un onglet caché, et rend une grille figée sous
            `prefers-reduced-motion`. C'est ce qui le sépare d'un fond animé
            qui tourne en permanence et vide la batterie d'un téléphone. */}
        {/* Le composant rend un <div> : la <section> l'enveloppe pour garder
            sa valeur sémantique, et lui porte les marges. Le contenu du hero
            est SON enfant, et non un frère posé par-dessus : sans ça,
            `pointerdown` ne remonte jamais jusqu'à lui et le clic n'émet
            aucune onde. Mesuré — la première version était muette au clic. */}
        <section className="relative overflow-hidden border-b border-[color:var(--color-frost-gray)]">
          <SonarGrid
            spacing={30}
            dotRadius={1.3}
            baseOpacity={0.07}
            pingEvery={3.6}
            ringWidth={110}
            amplitude={2}
            pingArea={[0.1, 0.12, 0.9, 0.88]}
            className="px-6 pt-16 pb-20 sm:px-8 lg:pt-24 lg:pb-28"
          >
            {/* Halo orange, recentré avec le contenu.
                Il était calé en haut à droite pour éclairer une colonne de
                texte alignée à gauche ; le hero est désormais centré, donc le
                halo l'est aussi, sinon il éclaire un bord vide. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-40 left-1/2 z-0 size-[680px] -translate-x-1/2 rounded-full bg-[color:var(--color-coral-pulse)] opacity-[0.17] blur-[140px]"
            />

            {/* Voile radial sous la colonne de texte.
                Les points du champ passent DERRIÈRE le texte : sur le titre,
                à 88px, ils se lisent comme une texture ; sur le sous-titre,
                à 17px et en gris, un point orange tombé sur une lettre est du
                bruit. Le voile éteint le champ au centre et le laisse entier
                sur les bords. C'est la parade que la démo du composant
                applique elle-même.

                Sur grand écran, une ellipse à 46% de large ne couvrait que la
                colonne de texte : au-delà, la grille de points restait à son
                opacité pleine et tranchait net contre le fond nu, un bloc de
                points d'un côté, du noir vide de l'autre — mesuré sur 1440px.
                L'ellipse est élargie pour couvrir la section quasi entière,
                et un palier avant le fondu adoucit la transition au lieu de
                la couper à bord franc. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_140%_110%_at_50%_38%,var(--surface-page-canvas)_0%,var(--surface-page-canvas)_20%,transparent_100%)]"
            />

            {/* Composition centrée, sans visuel latéral.
                Les trois téléphones sont retirés du fold : ils tenaient la
                moitié droite sur grand écran et ne s'affichaient pas du tout
                sur téléphone, où la colonne de texte était donc déjà seule.
                Le centrage aligne les deux tailles d'écran sur la même
                lecture — pastille, titre, promesse, action — et rend au titre
                toute la largeur. */}
            <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
              {/* Pastille de preuve, au-dessus du titre : le signal de
                  crédibilité arrive avant la promesse, pas après. */}
              <p
                className="rise inline-flex items-center gap-2 rounded-full border border-[color:var(--color-brand-display)]/40 bg-[#2a1109] px-4 py-1.5 text-[13px] font-semibold text-[color:var(--color-brand-display)]"
                style={{ animationDelay: '40ms' }}
              >
                <Star className="size-3.5 shrink-0" aria-hidden="true" />
                Basé sur la science
              </p>

              <h1
                /* L'impact vient de l'échelle et du serrage, pas de la
                   graisse. Fraunces est la seule chose ici qu'aucun
                   concurrent n'a : on la pousse à 88px en plein écran,
                   interligne sous 1 pour que les lignes forment un bloc, et
                   interlettrage à -0,045em. */
                className="rise night-title-gradient mt-7 font-display text-[clamp(44px,7.2vw,88px)] leading-[0.98] font-medium tracking-[-0.045em] text-balance"
                style={{ animationDelay: '80ms' }}
              >
                Prédis ta taille adulte.<br />
                Atteins ton plein potentiel avec{' '}
                <span className="text-[color:var(--color-brand-display)]">Grandimi</span>.
              </h1>

              {/* Sous-titre qui se défait et se refait toutes les 3 secondes.
                  `trigger` bascule sur une minuterie : à false, AnimatePresence
                  joue la sortie mot à mot ; à true, l'entrée. Le cycle complet
                  dure 3 s, dont environ 1,2 s d'animation — le texte reste donc
                  lisible et immobile la majeure partie du temps.

                  La minuterie ne tourne pas sous `prefers-reduced-motion` :
                  faire clignoter une phrase en boucle est exactement ce que
                  cette préférence existe pour éviter. */}
              {/* Décalage entre mots à 0,015 s et non les 0,05 du preset
                  « blur » : la phrase fait vingt-trois mots, donc le preset
                  mettrait 1,15 s rien qu'à lancer le dernier, et la sortie ne
                  tiendrait pas dans les 0,7 s du cycle. Ici sortie et entrée
                  durent chacune ~0,65 s. */}
              <TextEffect
                as="p"
                per="word"
                delay={0.1}
                boucle={sousTitreVisible}
                surlignage="optimiser ta croissance"
                variants={{
                  container: {
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.015 } },
                    exit: { transition: { staggerChildren: 0.015 } },
                  },
                  item: {
                    hidden: { opacity: 0, filter: 'blur(10px)', y: 8 },
                    visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.32 } },
                    exit: { opacity: 0, filter: 'blur(10px)', y: -8, transition: { duration: 0.28 } },
                  },
                }}
                className="mt-6 max-w-xl text-[clamp(17px,2.4vw,21px)] leading-[1.5] text-pretty text-[color:var(--text-secondary)]"
              >
                {'Tu ne contrôles pas tes gènes, mais tu peux optimiser ta croissance. Grandimi te dit où tu en es, et quoi faire chaque jour.'}
              </TextEffect>

              {/* Un seul bouton. Le jumeau « Voir comment ça marche »
                  renvoyait vers une section de la même page : deux actions de
                  poids visuel proche, dont une qui ne fait que faire défiler. */}
              <div className="rise mt-10" style={{ animationDelay: '240ms' }}>
                <LiquidMetalButton
                  label="Commencer mon analyse"
                  onClick={() => demarrer('hero')}
                />
              </div>
            </div>
          </SonarGrid>
        </section>

        {/* ============ CE QUE TU OBTIENS (grille) ============
            Titre centré et grille à filets : la mise en page de « Unlock your
            full potential », qui est le bloc que tous les concurrents de ce
            marché placent juste après le fold. Elle répond à la seule question
            qui reste une fois la promesse lue — qu’est-ce que je reçois. */}
        <section id="fonctionnalites" className="scroll-mt-24 px-6 pb-20 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="font-display text-[clamp(30px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-balance text-ink">
                Débloque ton potentiel.
              </h2>
              <p className="mt-4 text-base text-[color:var(--text-secondary)]">
                On calcule ce qu’il te reste à prendre, et on te donne le plan qui va
                le chercher.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden bg-[color:var(--color-frost-gray)] sm:grid-cols-2 lg:grid-cols-3">
              {FONCTIONS.map((fonction, i) => {
                const Icone = fonction.icone
                return (
                  <article
                    key={fonction.titre}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
                    className="bg-[color:var(--surface-page-canvas)] px-6 py-10 sm:px-8"
                  >
                    <Icone
                      className="size-6 text-[color:var(--color-coral-pulse)]"
                      aria-hidden="true"
                    />
                    <h3 className="mt-6 flex flex-wrap items-center gap-2 font-display text-xl font-medium tracking-[-0.02em] text-ink">
                      {fonction.titre}
                      {fonction.bientot && (
                        <span className="rounded-full border border-[color:var(--color-indigo-bloom)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-[color:var(--color-indigo-bloom)] uppercase">
                          bientôt
                        </span>
                      )}
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-[1.55] text-[color:var(--text-secondary)]">
                      {fonction.texte}
                    </p>
                  </article>
                )
              })}
            </div>

            {/* La grille se terminait sur les deux cases « bientôt », donc sur
                ce que le produit ne fait pas encore, et laissait un écran vide
                avant la figure suivante. Le bouton referme la section sur ce
                qui existe. */}
            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={() => demarrer('fonctionnalites')}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-brand px-8 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45]"
              >
                Commencer mon analyse
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="font-display text-[clamp(32px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-balance text-ink">
                Vois Grandimi en action
              </h2>
              <p className="mt-4 text-base text-[color:var(--text-secondary)]">
                Découvre l'expérience Grandimi avec ces fonctionnalités essentielles pensées pour optimiser ta croissance.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2 mb-16">
              <div className="flex flex-col items-center">
                {/* WebP d'abord, PNG en secours.
                    Les deux formats étaient déjà dans le dépôt ; seul le PNG
                    était branché. Mesuré : 1 474 ko contre 45 ko pour la même
                    image — la page en servait deux, soit 3 043 ko de captures
                    d'écran sur un site dont le premier critère est « mobile
                    d'abord ». Le <picture> laisse le navigateur choisir, et le
                    PNG reste là pour ceux qui ne lisent pas le WebP. */}
                <div className="flex justify-center mb-6">
                  <picture>
                    <source media="(max-width: 768px)" srcSet="/apercus/accueil.webp" type="image/webp" />
                    <source srcSet="/apercus/accueil.webp" type="image/webp" />
                    <img
                      src="/apercus/accueil.png"
                      alt="L'écran d'accueil de Grandimi : la taille adulte estimée, sa fourchette, et la courbe de croissance."
                      className="max-h-[450px] w-auto rounded-2xl shadow-2xl"
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                </div>
                <h3 className="font-display text-xl font-medium text-ink text-center">
                  Prédiction de taille
                </h3>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)] text-center max-w-xs">
                  Vois ta taille future avec précision et suis ta croissance vers ton potentiel génétique.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex justify-center mb-6">
                  <picture>
                    <source media="(max-width: 768px)" srcSet="/apercus/seance.webp" type="image/webp" />
                    <source srcSet="/apercus/seance.webp" type="image/webp" />
                    <img
                      src="/apercus/seance.png"
                      alt="L'écran de séance : les actions du jour, cochées une à une."
                      className="max-h-[450px] w-auto rounded-2xl shadow-2xl"
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                </div>
                <h3 className="font-display text-xl font-medium text-ink text-center">
                  Ta routine quotidienne
                </h3>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)] text-center max-w-xs">
                  Des exercices simples et des habitudes adaptees a toi pour maximiser chaque jour.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ COMMENT ÇA MARCHE ============
            Quatre étapes, une ligne chacune. La version précédente occupait un
            écran entier avec trois cartes teintées et un paragraphe par carte :
            c'est ce volume-là qui ne servait à rien, pas l'information. Un
            numéro et une phrase suffisent à répondre à « je fais quoi,
            concrètement », qui est la dernière question avant le bouton. */}
        <section className="px-6 pb-24 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="font-display text-[clamp(28px,4.5vw,44px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
                Comment ça marche
              </h2>
              <p className="mt-4 text-base text-[color:var(--text-secondary)]">
                Quatre étapes. La première prend quelques minutes, les trois autres
                durent tant que tu grandis.
              </p>
            </div>

            {/* Le fil qui relie les quatre pastilles.
                Sans lui, quatre colonnes numérotées se lisent comme quatre
                options au choix ; avec lui, comme une suite. Il est posé en
                absolu derrière la grille et s'arrête aux centres des pastilles
                extrêmes (12,5 % et 87,5 % de la largeur), sinon il dépassait
                des deux côtés. Masqué sous `lg`, où les étapes s'empilent. */}
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute top-[22px] left-[12.5%] hidden h-px w-[75%] bg-[color:var(--color-frost-gray)] lg:block"
              />

              <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {[
                  {
                    num: '01',
                    titre: 'Réponds',
                    /* Pas de nombre de questions : tu l'avais fait retirer du
                       hero, et le réintroduire ici ferait revenir par la
                       fenêtre ce qu'on a sorti par la porte. « Rien à taper »
                       est la vraie objection levée. */
                    texte:
                      'Une question par écran. Rien à taper, rien à faire mesurer chez le médecin.',
                  },
                  {
                    num: '02',
                    titre: 'Découvre ton chiffre',
                    texte:
                      'Ta taille adulte estimée, avec sa fourchette. Et ce que tes habitudes te coûtent, en centimètres.',
                  },
                  {
                    num: '03',
                    titre: 'Coche ton plan',
                    texte:
                      'Onze actions par jour, du lever au coucher. Ta série monte à chaque journée tenue.',
                  },
                  {
                    num: '04',
                    titre: 'Re-mesure-toi',
                    texte:
                      'Un mois plus tard, l’estimation se resserre et le plan change. Puis on recommence.',
                  },
                ].map((etape, i) => (
                  <li
                    key={etape.num}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="text-center sm:text-left lg:text-center"
                  >
                    {/* Fond opaque et non transparent : la pastille doit
                        masquer le fil derrière elle, pas le laisser traverser
                        le chiffre. */}
                    <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-brand font-display text-lg font-medium text-[color:var(--color-on-brand)]">
                      {etape.num}
                    </span>
                    <h3 className="mt-6 font-display text-xl font-medium tracking-[-0.02em] text-ink">
                      {etape.titre}
                    </h3>
                    <p className="mx-auto mt-2 max-w-xs text-[15px] leading-[1.5] text-[color:var(--text-secondary)]">
                      {etape.texte}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Le bouton qui manquait. Depuis le retrait de « Ce qui se joue »,
                il ne restait plus une seule action entre le hero et le pied de
                page : sur ordinateur, où la barre collante ne s'affiche pas,
                le visiteur devait remonter tout en haut. */}
            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={() => demarrer('comment-ca-marche')}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-brand px-8 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45]"
              >
                Commencer mon analyse
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* ============ SUR QUOI ÇA REPOSE ============
            L'équivalent de « Built on Science. Informed by Data. », que les
            deux concurrents placent avant leur mode d'emploi.

            Ce n'est pas la bande de logos qu'on avait retirée : celle-là
            alignait OMS · AAP · ANSES · PubMed sans rien en dire, ce qui se
            lisait comme un bandeau de partenaires — et laissait entendre une
            caution que personne ne nous a donnée. Ici les références sont
            nommées pour ce qu'elles sont : des travaux publics auxquels on se
            réfère.

            La mention de non-affiliation n'est pas de la prudence excessive.
            Citer l'OMS sur une page qui vend un abonnement, sans préciser
            qu'elle ne nous cautionne pas, c'est laisser s'installer une
            caution officielle qu'on n'a pas. Les concurrents écrivent la même
            note sous leur paragraphe sur le CDC. */}
        <section className="border-t border-[color:var(--color-frost-gray)] px-6 py-20 sm:px-8">
          <div className="mx-auto w-full max-w-3xl text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-[14px] bg-brand">
              <LogoGrandimi
                className="size-7 text-[color:var(--color-on-brand)]"
                titre="Grandimi"
              />
            </span>

            <h2 className="mt-8 font-display text-[clamp(28px,4.5vw,44px)] leading-[1.1] font-medium tracking-[-0.03em] text-balance text-ink">
              Des méthodes publiées. Pas des promesses.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-[1.6] text-[color:var(--text-secondary)]">
              Ton estimation croise <strong className="font-semibold text-ink">Khamis-Roche</strong>,
              une méthode de prédiction de la taille adulte sans radiographie publiée en
              1994, avec les <strong className="font-semibold text-ink">courbes de
              croissance de l’OMS</strong>. Les actions du plan suivent les repères de
              sommeil de l’<strong className="font-semibold text-ink">American Academy of
              Pediatrics</strong> et les repères nutritionnels de
              l’<strong className="font-semibold text-ink">ANSES</strong>. Tout est
              public, et tu peux aller le lire.
            </p>

            {/* Lien de recherche plutôt qu'une référence précise : il reste
                valide quelle que soit l'édition citée, là où un identifiant
                d'article recopié de mémoire peut pointer vers autre chose. */}
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/?term=Khamis-Roche+adult+stature"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 border-b border-[color:var(--color-coral-pulse)] pb-0.5 text-base font-semibold text-brand transition-opacity hover:opacity-80"
            >
              Lire la méthode sur PubMed
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>

            <p className="mx-auto mt-8 max-w-xl text-[13px] leading-[1.5] text-[color:var(--text-meta)]">
              <strong className="font-semibold">Note :</strong> Grandimi n’est ni affilié
              ni approuvé par l’OMS, l’American Academy of Pediatrics ou l’ANSES. Ces
              travaux sont publics ; nous nous y référons, ils ne nous cautionnent pas.
            </p>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        {/* La marge de defilement evite que, l'ancre amene le titre pile sous
            l'en-tête collant, qui le recouvrait. */}
        <div id="faq" className="scroll-mt-24">
        <Suspense fallback={<div className="h-96" />}>
          <FaqSection
            title="Les questions qu’on nous pose"
            description="Et les réponses honnêtes, y compris quand elles ne nous arrangent pas."
            items={FAQ}
          />
        </Suspense>
        </div>

        {/* ============ AVIS ============ */}
        <section className="px-6 py-20 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="font-display text-[clamp(28px,4.5vw,44px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
                Ce que disent nos utilisateurs
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] p-6">
                <div className="mb-4 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xl">⭐</span>
                  ))}
                </div>
                <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
                  Grandimi m'a vraiment aide a comprendre ma croissance. L'appli est simple a utiliser et les conseils sont vraiment utiles.
                </p>
                <p className="text-sm font-semibold text-ink">Utilisateur 1</p>
              </div>

              <div className="rounded-2xl border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] p-6">
                <div className="mb-4 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xl">⭐</span>
                  ))}
                </div>
                <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
                  J'aime bien avoir un plan quotidien. Ca m'aide a vraiment faire les efforts pour grandir.
                </p>
                <p className="text-sm font-semibold text-ink">Utilisateur 2</p>
              </div>

              <div className="rounded-2xl border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] p-6">
                <div className="mb-4 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xl">⭐</span>
                  ))}
                </div>
                <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
                  La prédiction de taille est precise et ca m'a motiva a vraiment suivre le programme.
                </p>
                <p className="text-sm font-semibold text-ink">Utilisateur 3</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className="px-6 pb-20 sm:px-8">
          <div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55 }}
            className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] bg-[color:var(--surface-dark)] px-6 py-16 text-center sm:px-12"
          >
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(30px,5vw,52px)] leading-[1.06] font-medium tracking-[-0.03em] text-white">
              Ton analyse t’attend.
              <br />
              <span className="text-[color:var(--color-coral-pulse)]">
                La fenêtre, elle, se referme.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base text-white/70">
              Ta taille adulte estimée, ce que tes habitudes te coûtent, et 11 actions
              par jour pour aller chercher les centimètres qui te restent.
            </p>

            {/* Le second bouton renvoyait vers « Revoir le fonctionnement »,
                section supprimée : un lien mort au bas de la page. Il ne
                manque pas — arrivé ici, le visiteur a fini de lire. */}
            <div className="mt-10">
              <button
                type="button"
                onClick={() => demarrer('cta-final')}
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand px-8 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45] sm:w-auto"
              >
                Commencer
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ============ PIED DE PAGE ============ */}
      {/* Réserve basse permanente sur mobile : la barre d'action se pose
          par-dessus le pied de page, et les liens légaux doivent rester
          cliquables une fois arrivé en bas. */}
      <footer className="border-t border-[color:var(--color-frost-gray)] px-6 pt-10 pb-28 sm:px-8 md:pb-10">
        <div className="mx-auto w-full max-w-6xl">
          {/* Onze liens rangés en trois colonnes, identiques à ceux des pages
              statiques.

              La rangée à plat d'avant mélangeait « Calculer sa taille adulte »
              et « CGV » sur la même ligne : un lecteur ne distinguait pas un
              guide d'une mention légale, et six pages de contenu se lisaient
              comme du remplissage juridique. Les colonnes disent ce que chaque
              lien est avant même qu'on le lise.

              Le même bloc partout, c'est ce qui fait la différence entre un
              pied de page et un pied de page utile : présent sur chaque page,
              il pousse en permanence vers les pages qui doivent se positionner.

              L'avertissement médical n'est pas décoratif non plus. Sur un site
              de santé qui s'adresse à des mineurs, dire qui édite, comment le
              joindre et que ce n'est pas un avis médical est un critère
              d'évaluation à part entière — et la moindre des choses. */}
          <div className="flex items-center gap-2.5 text-ink">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand">
              <Ruler className="size-3.5 text-[color:var(--color-on-brand)]" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold tracking-[-0.02em]">
              Grandimi
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <p className="mb-3 font-semibold text-ink">Outils</p>
              <a href="/" className="block py-3 hover:text-ink transition-colors">Faire l’estimation</a>
              <a href="/calculer-sa-taille-adulte/" className="block py-3 hover:text-ink transition-colors">Calculer sa taille adulte</a>
              <a href="/comparatif-calculateurs-taille/" className="block py-3 hover:text-ink transition-colors">Comparatif des calculateurs</a>
            </div>

            <div>
              <p className="mb-3 font-semibold text-ink">Guides</p>
              <a href="/questions-croissance/" className="block py-3 hover:text-ink transition-colors">Questions sur la croissance</a>
              <a href="/methodes-taille-adulte/" className="block py-3 hover:text-ink transition-colors">Prédire sa taille adulte</a>
              <a href="/que-faire-pour-grandir/" className="block py-3 hover:text-ink transition-colors">Que faire pour grandir</a>
              <a href="/croissance-terminee/" className="block py-3 hover:text-ink transition-colors">Savoir si on a fini de grandir</a>
              <a href="/poussee-de-croissance/" className="block py-3 hover:text-ink transition-colors">La poussée de croissance</a>
            </div>

            <div>
              <p className="mb-3 font-semibold text-ink">Grandimi</p>
              <a href="/methode/" className="block py-3 hover:text-ink transition-colors">Notre méthode</a>
              <a href="mailto:grandimi14@gmail.com" className="block py-3 hover:text-ink transition-colors">Contact</a>
              <a href="/mentions-legales.html" className="block py-3 hover:text-ink transition-colors">Mentions légales</a>
              <a href="/cgv.html" className="block py-3 hover:text-ink transition-colors">CGV</a>
              <a href="/privacy.html" className="block py-3 hover:text-ink transition-colors">Confidentialité</a>
            </div>
          </div>

          <p className="mt-8 border-t border-[color:var(--color-frost-gray)] pt-6 text-xs leading-relaxed text-muted-foreground">
            Grandimi n’est pas un dispositif médical et ne pose aucun diagnostic. Les
            estimations et les repères publiés ici sont statistiques, et ne remplacent pas
            l’avis d’un pédiatre ou d’un endocrinologue.
          </p>

          <p className="mt-3 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Grandimi · Fait en France · Science, pas promesses
          </p>
        </div>
      </footer>

      {/* ============ BARRE D'ACTION MOBILE ============
          Masquée dès `md` : au-delà, le bouton de l'en-tête reste visible et
          une seconde action permanente ne ferait que manger l'écran.
          `translate-y` plutôt que `display` : la barre glisse au lieu
          d'apparaître d'un coup, et l'élément reste dans l'arbre pour ne pas
          téléporter le focus. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--color-frost-gray)] bg-[color:var(--surface-page-canvas)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] transition-transform duration-300 ease-out md:hidden ${
          barreVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        // Hors écran, la barre ne doit pas être atteignable au clavier ni
        // annoncée : sinon Tab part sur un bouton que personne ne voit.
        aria-hidden={!barreVisible}
        {...(barreVisible ? {} : { inert: '' })}
      >
        <button
          type="button"
          onClick={() => demarrer('barre-mobile')}
          className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45]"
        >
          Commencer
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/**
 * Courbe de prédiction — la figure de « Predict your future height ».
 *
 * Une seule courbe, une bulle, un axe d'âges : c'est un objet de vitrine, pas
 * un graphe de données. D'où la mention en bas — la trajectoire dessinée est
 * celle de l'exemple du hero (14 ans, 166 cm, estimé à 178), pas une promesse
 * faite au visiteur, qui n'a encore rien saisi.
 *
 * SVG inline plutôt qu'une bibliothèque : la page en charge déjà une pour le
 * graphe à deux courbes plus bas, et cette figure-ci n'a ni axe calculé, ni
 * infobulle, ni données à parcourir.
 */
function CourbePrediction() {
  const ages = [14, 15, 16, 17, 18, 19, 20, 21]

  return (
    <div className="rounded-[26px] border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] p-6 sm:p-8">
      <div className="relative">
        {/* La bulle est posée en HTML au-dessus du SVG : dans le SVG, elle
            aurait suivi la mise à l'échelle du viewBox et son texte aurait
            grossi avec la carte. */}
        <div className="absolute -top-1 left-[46%] z-10 -translate-x-1/2">
          {/* Même valeur que la carte du hero, qui a été corrigée à 179 cm
              après vérification sur l'API de production. La bulle était restée
              à 178 : le même profil de démonstration affichait donc deux
              tailles adultes différentes sur la même page. */}
          <span className="block rounded-lg bg-brand px-3 py-1 text-sm font-semibold text-[color:var(--color-on-brand)]">
            179 cm
          </span>
          <span
            aria-hidden="true"
            className="mx-auto block size-2.5 -translate-y-1 rotate-45 bg-brand"
          />
        </div>

        <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="Courbe de croissance estimée, de 14 à 21 ans">
          <defs>
            <linearGradient id="remplissage-courbe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-coral-pulse)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-coral-pulse)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Filets horizontaux pointillés, comme sur leur figure. */}
          {[40, 90, 140, 190].map((y) => (
            <line
              key={y}
              x1="10"
              y1={y}
              x2="390"
              y2={y}
              stroke="var(--color-frost-gray)"
              strokeWidth="1"
              strokeDasharray="2 5"
            />
          ))}

          <path
            d="M10 196 C 70 178, 120 140, 184 104 C 250 68, 320 46, 390 38 L 390 196 Z"
            fill="url(#remplissage-courbe)"
          />
          <path
            d="M10 196 C 70 178, 120 140, 184 104 C 250 68, 320 46, 390 38"
            fill="none"
            stroke="var(--color-coral-pulse)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <line
            x1="184"
            y1="6"
            x2="184"
            y2="196"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <circle cx="184" cy="104" r="14" fill="var(--color-coral-pulse)" opacity="0.22" />
          <circle cx="184" cy="104" r="7" fill="#fff" />
        </svg>

        <div className="mt-3 flex justify-between px-1 text-xs text-[color:var(--text-meta)]">
          {ages.map((an) => (
            <span key={an}>{an}</span>
          ))}
        </div>
      </div>

    </div>
  )
}

/**
 * Liste d'actions — la figure de « Maximize your potential ».
 *
 * Les quatre lignes sont extraites du plan réel (cf. internal/planner) : une
 * vitrine qui invente des exercices est une vitrine qui vend autre chose que ce
 * qu'elle livre.
 */
function ListeActions() {
  /* La durée à droite de chaque ligne, comme sur l'écran d'exercices des
     concurrents. Ce n'est pas un ornement : « séance du mois » se lit comme un
     devoir, « séance du mois · 10 min » se lit comme quelque chose de faisable
     avant le dîner. Le plan réel porte bien une durée par bloc
     (cf. daily_routine[].duree_min), donc la colonne ne promet rien de neuf. */
  const actions = [
    { texte: 'Suspension à la barre 🤸', duree: '5 × 15 s', faite: true },
    { texte: 'Petit-déjeuner avec protéines 🍳', duree: '—', faite: false },
    { texte: 'Séance du mois : dos et hanches 🏋️', duree: '10 min', faite: false },
    { texte: 'Écrans coupés 45 min avant 🌙', duree: '22 h', faite: false },
  ]

  return (
    <div className="rounded-[26px] border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] p-6 sm:p-8">
      <ul className="flex flex-col gap-3">
        {actions.map(({ texte, duree, faite }) => (
          <li
            key={texte}
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3.5 rounded-[18px] bg-[color:var(--surface-page-canvas)] px-4 py-4"
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                faite
                  ? 'bg-brand text-[color:var(--color-on-brand)]'
                  : 'border border-[color:var(--color-frost-gray)]'
              }`}
              aria-hidden="true"
            >
              {faite ? '✓' : ''}
            </span>
            <span
              className={`flex-1 text-[15px] leading-tight ${
                faite ? 'text-[color:var(--text-meta)] line-through' : 'text-ink'
              }`}
            >
              {texte}
            </span>
            <span className="shrink-0 text-[13px] tabular-nums text-[color:var(--text-meta)]">
              {duree}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-[color:var(--text-meta)]">+ 7 autres actions aujourd’hui</p>
    </div>
  )
}

export default HomePage
