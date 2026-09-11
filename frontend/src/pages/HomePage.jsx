import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Eye,
  Moon,
  Ruler,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { lazy, Suspense, useEffect, useRef, useState } from 'react'

/* GSAP (~70 kB) ne sert qu'a ce carrousel, situe tres bas dans la page.
   Le charger dans le bundle initial retardait l'affichage du hero sur
   mobile, ou l'ecran reste blanc tant que le JS n'est pas monte. */
const CircularSplitRoll = lazy(() => import('@/components/ui/circular-split-roll'))
import { HandwritingText } from '@/components/ui/handwriting-text'
import { FaqSection } from '@/components/ui/faq-section'
import { FluidParticlesBackground } from '@/components/ui/fluid-particles-background'
import { PotentialComparisonChart } from '@/components/ui/growth-chart'
import '../styles/theme-night.css'
import TestimonialMarquee from '@/components/ui/testimonial-marquee'

/* Piliers du plan de croissance. Les photos passent par Unsplash ;
   si l'une ne charge pas, CircularSplitRoll retombe sur l'aplat
   `tint` — jamais d'image cassée à l'écran. */
const PILIERS = [
  {
    id: 'sommeil',
    title: 'Sommeil',
    alt: 'Chambre calme au petit matin',
    image:
      'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=700&q=80&auto=format&fit=crop',
    tint: 'var(--color-sky-wash)',
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    alt: 'Assiette de légumes frais',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80&auto=format&fit=crop',
    tint: 'var(--color-sage-wash)',
  },
  {
    id: 'sport',
    title: 'Sport',
    alt: 'Ballon de basket sur un terrain extérieur',
    image:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=700&q=80&auto=format&fit=crop',
    tint: 'var(--color-peach-wash)',
  },
  {
    id: 'posture',
    title: 'Posture',
    alt: 'Séance d’étirements au sol',
    image:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=80&auto=format&fit=crop',
    tint: 'var(--color-cream)',
  },
  {
    id: 'hydratation',
    title: 'Hydratation',
    alt: 'Verre d’eau posé sur une table',
    image:
      'https://images.unsplash.com/photo-1502740479091-635887520276?w=700&q=80&auto=format&fit=crop',
    tint: 'var(--color-sky-wash)',
  },
  {
    id: 'suivi',
    title: 'Suivi',
    alt: 'Personne qui court au lever du jour',
    image:
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=700&q=80&auto=format&fit=crop',
    tint: 'var(--color-sage-wash)',
  },
]

/* Le pendant honnête d'un bandeau de logos : les références réellement
   utilisées par le calcul, pas des marques partenaires qui n'existent pas. */
const SOURCES = [
  { nom: 'Khamis-Roche', detail: 'Méthode de prédiction de taille adulte (1994)' },
  { nom: 'PubMed', detail: 'Littérature clinique citée dans les guides' },
  { nom: 'OMS', detail: 'Courbes de croissance de référence' },
  { nom: 'AAP', detail: 'Recommandations de sommeil de l’American Academy of Pediatrics' },
  { nom: 'ANSES', detail: 'Repères nutritionnels français' },
]

/* Quatre chiffres VÉRIFIABLES sur le site même. Pas de compteur d'utilisateurs
   en temps réel, pas de « 21 298 personnes aujourd'hui » : un chiffre qu'on ne
   peut pas prouver coûte plus cher qu'il ne rapporte sur un produit dont
   l'argument est justement l'honnêteté. */
const CHIFFRES = [
  { valeur: '±3–6 cm', label: 'la marge réelle du modèle, affichée avec chaque résultat' },
  { valeur: '0 €', label: 'pour le questionnaire et l’estimation, sans compte' },
  { valeur: '~2 min', label: 'de questions, une réponse par écran' },
  { valeur: '3', label: 'leviers suivis chaque jour : sommeil, nutrition, activité' },
]

const ETAPES = [
  {
    num: '01',
    icone: ScanLine,
    titre: 'Questionnaire',
    texte: 'Ta taille, ton âge, celle de tes parents, tes habitudes. 5 minutes, pas plus.',
    teinte: 'var(--color-cream)',
  },
  {
    num: '02',
    icone: Ruler,
    titre: 'Estimation gratuite',
    texte: 'Ta taille adulte estimée, avec sa marge d’erreur affichée. Avant tout paiement.',
    teinte: 'var(--color-peach-wash)',
  },
  {
    num: '03',
    icone: Sparkles,
    titre: 'Un plan chaque mois',
    texte: 'Ce que tu fais aujourd’hui, cette semaine, ce mois-ci. Un nouveau plan à chaque mois d’abonnement.',
    teinte: 'var(--color-sage-wash)',
  },
]

const DIFFERENCES = [
  {
    icone: Eye,
    titre: 'Le résultat avant le paiement',
    texte:
      'Tu vois ton estimation complète, gratuitement. Tu décides ensuite si le plan t’intéresse. Aucun résultat flouté, aucune surprise.',
  },
  {
    icone: ShieldCheck,
    titre: 'La marge d’erreur affichée',
    texte:
      'Une prédiction de taille n’est jamais exacte. On affiche la fourchette (±3 à ±6 cm selon l’âge) et on explique d’où elle vient.',
  },
  {
    icone: BookOpenCheck,
    titre: 'Des sources vérifiables',
    texte:
      'Chaque recommandation renvoie à une étude. Tu peux cliquer et lire d’où vient l’info, plutôt que de nous croire sur parole.',
  },
]

const FAQ = [
  {
    question: 'Est-ce que Grandimi peut me faire grandir plus ?',
    answer:
      'Personne ne peut te faire dépasser ton potentiel génétique — ni nous, ni un complément, ni un programme. Mais beaucoup d’ados finissent en dessous du leur : nuits trop courtes, apports insuffisants, au moment précis où l’os peut encore s’allonger. Ces centimètres-là se jouent vraiment, et c’est exactement ce que le plan cible. Pas un de plus.',
  },
  {
    question: 'À quel point l’estimation est-elle fiable ?',
    answer:
      'La marge est de ±3 à ±6 cm selon ton âge : plus tu es proche de la fin de ta croissance, plus l’estimation se resserre. On affiche systématiquement cette fourchette avec le résultat — un chiffre seul, sans marge, serait trompeur.',
  },
  {
    question: 'Faut-il payer pour voir mon estimation ?',
    answer:
      'Non. Le questionnaire et l’estimation de ta taille adulte sont gratuits et visibles immédiatement. Seul le plan de croissance personnalisé est payant : 4,99 €/mois ou 29,99 €/an (soit près de 50 % d’économie), avec un nouveau plan chaque mois, résiliable quand tu veux.',
  },
  {
    question: 'Mes données sont-elles conservées ?',
    answer:
      'Tes mesures servent à calculer ton estimation et ton plan, rien d’autre. Elles ne sont ni revendues ni transmises à des annonceurs, et tu peux demander leur suppression à tout moment.',
  },
  {
    question: 'À partir de quel âge est-ce utile ?',
    answer:
      'L’outil est pensé pour les 10-18 ans, la période où la croissance est encore active. En dessous de 10 ans l’estimation devient trop imprécise pour être honnête, et après 18 ans la croissance est généralement terminée.',
  },
  {
    question: 'Est-ce que ça remplace un médecin ?',
    answer:
      'Non, et ce n’est pas le but. Grandimi est un outil d’information. Si tu as une inquiétude réelle sur ta croissance, un pédiatre ou un endocrinologue reste le bon interlocuteur — lui seul peut poser un diagnostic.',
  },
]

function HomePage({ onStartQuestionnaire, onLogin }) {
  /* Barre d'action collante sur mobile.
     Passé le hero, il n'existait plus aucun moyen de lancer le questionnaire
     sans remonter : le bouton de l'en-tête est réduit sur petit écran et le
     reste de la page est long. Une barre basse remet l'action sous le pouce
     pendant toute la lecture — c'est le motif qui fait la différence sur les
     tunnels mobiles.

     IntersectionObserver plutôt qu'un écouteur de scroll : pas de calcul à
     chaque frame, et le seuil suit le bouton même si la hauteur du hero
     change. */
  const sentinelleRef = useRef(null)
  const [barreVisible, setBarreVisible] = useState(false)

  useEffect(() => {
    const cible = sentinelleRef.current
    if (!cible || typeof IntersectionObserver === 'undefined') return undefined

    const observateur = new IntersectionObserver(
      ([entree]) => setBarreVisible(!entree.isIntersecting && entree.boundingClientRect.top < 0),
      { threshold: 0 },
    )
    observateur.observe(cible)
    return () => observateur.disconnect()
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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#" className="flex min-w-0 items-center gap-2.5 text-ink">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand">
              <Ruler
                className="size-4 text-[color:var(--color-on-brand)]"
                aria-hidden="true"
              />
            </span>
            <span className="truncate font-display text-xl font-semibold tracking-[-0.02em]">
              Grandimi
            </span>
          </a>

          {/* Sous 640px, les deux boutons pleins ne tenaient pas : la barre
              débordait de 10px et « Se connecter » passait par-dessus le
              logotype. On dégraisse au lieu de rétrécir la cible tactile —
              les 44px de hauteur sont conservés partout. */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-ink/6 sm:border sm:border-ink sm:px-5"
            >
              Se connecter
            </button>

            <button
              type="button"
              onClick={onStartQuestionnaire}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold whitespace-nowrap text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45] sm:px-5"
            >
              <span className="sm:hidden">Estimer</span>
              <span className="hidden sm:inline">Estimer ma taille</span>
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
        <FluidParticlesBackground
          className="border-b border-[color:var(--color-frost-gray)]"
          /* Réglages resserrés par rapport aux valeurs par défaut du
             composant : une densité plus faible et une trace qui s'efface
             deux fois plus vite. Au réglage d'origine, les points laissaient
             de longs filaments et le fond se lisait comme une texture de
             cheveux plutôt que comme une poussière. */
          density={1 / 2600}
          maxParticles={900}
          trail="rgba(10, 10, 10, 0.30)"
          particleSize={{ min: 0.4, max: 1.5 }}
        >
        <section className="relative px-5 pt-12 pb-16 sm:px-8 lg:pt-20">
          {/* Halo orange derrière le titre. Sur noir il remplace l'ombre
              portée : c'est lui qui détache le hero du reste de la page. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-24 -z-10 size-[560px] rounded-full bg-[color:var(--color-coral-pulse)] opacity-[0.13] blur-[120px]"
          />

          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* --- Colonne texte --- */}
            <div className="lg:col-span-7">
              <span className="rise inline-flex items-center gap-2 rounded-full border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] px-4 py-1.5 text-xs font-semibold tracking-[0.06em] text-[color:var(--text-secondary)] uppercase">
                <Sparkles
                  className="size-3.5 text-[color:var(--color-indigo-bloom)]"
                  aria-hidden="true"
                />
                Estimation gratuite · sans compte
              </span>

              <h1
                className="rise night-title-gradient mt-6 font-display text-[clamp(40px,6.2vw,72px)] leading-[1.02] font-medium tracking-[-0.035em] text-balance"
                style={{ animationDelay: '80ms' }}
              >
                Quelle taille vas-tu vraiment{' '}
                {/* Le mot est tracé au stylo plutôt que posé en couleur : c'est
                    la promesse du site — une estimation écrite à la main pour
                    toi — et ça donne au titre un point de fixation que le
                    surlignage orange n'obtenait pas. Si la police distante ne
                    répond pas, le composant retombe sur du texte simple. */}
                <HandwritingText
                  text="atteindre"
                  height="0.92em"
                  strokeWidth={1.4}
                  className="align-baseline text-[color:var(--color-brand-display)]"
                />{' '}
                ?
              </h1>

              <p
                className="rise mt-6 max-w-xl text-[clamp(16px,2.2vw,19px)] leading-[1.55] text-pretty text-[color:var(--text-secondary)]"
                style={{ animationDelay: '160ms' }}
              >
                Ta taille adulte est déjà en grande partie écrite. Ce qui ne l’est pas :
                est-ce que tu vas l’atteindre. Réponds à quelques questions, vois ton
                estimation et les centimètres qu’il te reste — gratuitement, marge d’erreur
                affichée.
              </p>

              <div
                className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ animationDelay: '240ms' }}
              >
                <button
                  type="button"
                  onClick={onStartQuestionnaire}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-brand px-8 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45]"
                >
                  Estimer ma taille adulte — gratuit
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>

                {/* Jumeau systématique du bouton orange. */}
                <a
                  href="#comment-ca-marche"
                  className="inline-flex min-h-13 items-center justify-center rounded-full border border-ink px-8 text-base font-medium text-ink transition-colors hover:bg-ink/6"
                >
                  Voir comment ça marche
                </a>
              </div>

              <p
                className="rise mt-5 text-sm text-muted-foreground"
                style={{ animationDelay: '320ms' }}
              >
                Gratuit · résultat immédiat · aucune carte bancaire
              </p>

              {/* Sentinelle : tant qu'elle est à l'écran, le bouton du hero
                  est visible et la barre du bas reste masquée. */}
              <div ref={sentinelleRef} aria-hidden="true" className="h-px w-full" />
            </div>

            {/* --- Colonne visuelle : le moment magique, au-dessus du fold --- */}
            <div
              className="rise lg:col-span-5"
              style={{ animationDelay: '200ms', perspective: '1400px' }}
            >
              <div className="origin-center transition-transform duration-500 ease-out lg:[transform:rotateY(-7deg)_rotateX(3deg)] lg:hover:[transform:rotateY(0deg)_rotateX(0deg)]">
                <ApercuResultat />
              </div>
            </div>
          </div>
        </section>
        </FluidParticlesBackground>

        {/* ============ SUR QUOI ON S'APPUIE ============
            L'équivalent honnête du bandeau de logos partenaires : ici ce ne
            sont pas des clients ni des outils, mais les sources du calcul.
            Sur ce marché, c'est le seul « ils nous font confiance » qu'on
            puisse écrire sans mentir. */}
        <section className="border-b border-[color:var(--color-frost-gray)] px-5 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-center text-[11px] font-semibold tracking-[0.18em] text-[color:var(--text-meta)] uppercase">
              Ce sur quoi le calcul s’appuie
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
              {SOURCES.map((source) => (
                <li
                  key={source.nom}
                  className="text-lg font-semibold tracking-[-0.01em] text-[color:var(--text-secondary)]"
                  title={source.detail}
                >
                  {source.nom}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============ CHIFFRES ============ */}
        <section className="px-5 py-14 sm:px-8">
          <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-10 border-b border-[color:var(--color-frost-gray)] pb-14 lg:grid-cols-4 lg:gap-y-0">
            {CHIFFRES.map((chiffre, i) => (
              <div
                key={chiffre.label}
                className={`px-2 sm:px-6 ${
                  /* Filets verticaux entre colonnes, jamais avant la première
                     ni sur la première de chaque rangée en mobile. */
                  i % 2 === 1 ? 'border-l border-[color:var(--color-frost-gray)]' : ''
                } ${i > 0 ? 'lg:border-l lg:border-[color:var(--color-frost-gray)]' : 'lg:border-l-0'}`}
              >
                <dd className="font-display text-[clamp(30px,5vw,44px)] leading-none font-medium tracking-[-0.03em] text-ink">
                  {chiffre.valeur}
                </dd>
                <dt className="mt-3 text-sm leading-[1.45] text-[color:var(--text-secondary)]">
                  {chiffre.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>

        {/* ============ CE QUI SE JOUE (figure) ============ */}
        <section className="px-5 pb-20 sm:px-8">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--color-indigo-bloom)] uppercase">
                Ce qui se joue vraiment
              </span>
              <h2 className="mt-5 font-display text-[clamp(30px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-balance text-ink">
                Ta génétique fixe le plafond. Tes habitudes décident si tu le touches.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-[1.55] text-[color:var(--text-secondary)]">
                Environ 80 % de ta taille adulte est écrite dans tes gènes. Le reste —
                sommeil, apports, activité — ne s’ajoute pas au plafond : il détermine si
                tu l’atteins ou si tu t’arrêtes en dessous. C’est tout l’écart entre les
                deux courbes, et c’est le seul terrain où un plan sert à quelque chose.
              </p>
              <button
                type="button"
                onClick={onStartQuestionnaire}
                className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full border border-ink px-7 text-base font-medium text-ink transition-colors hover:bg-ink/10"
              >
                Voir où j’en suis
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-[26px] border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] p-6 sm:p-8">
              <PotentialComparisonChart />
            </div>
          </div>
        </section>

        {/* ============ COMMENT ÇA MARCHE ============ */}
        <section id="comment-ca-marche" className="px-5 py-20 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {/* Aligné à gauche : le hero est asymétrique, cette section
                enchaîne sur le même axe plutôt que de recentrer. */}
            <div className="mb-12 max-w-2xl">
              <h2 className="font-display text-[clamp(30px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-balance text-ink">
                Trois étapes, cinq minutes
              </h2>
              <p className="mt-4 text-base text-[color:var(--text-secondary)]">
                Aucune mesure compliquée à prendre. Ce que tu sais déjà suffit.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {ETAPES.map((etape, i) => {
                const Icone = etape.icone
                return (
                  <motion.article
                    key={etape.num}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="rounded-[24px] p-8"
                    style={{ backgroundColor: etape.teinte }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-full bg-[color:var(--surface-card)]">
                        <Icone className="size-5 text-ink" aria-hidden="true" />
                      </span>
                      <span className="font-display text-2xl text-ink/25">{etape.num}</span>
                    </div>

                    <h3 className="mt-6 font-display text-2xl font-medium tracking-[-0.02em] text-ink">
                      {etape.titre}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[color:var(--text-secondary)]">
                      {etape.texte}
                    </p>
                  </motion.article>
                )
              })}
            </div>
          </div>
        </section>

        {/* ============ LES PILIERS (carrousel circulaire GSAP) ============ */}
        <section className="px-5 pt-8 sm:px-8">
          <div className="mx-auto mb-4 max-w-2xl text-center">
            <h2 className="font-display text-[clamp(30px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-ink">
              Ce sur quoi tu peux <span className="text-brand">agir</span>
            </h2>
            <p className="mt-4 text-base text-[color:var(--text-secondary)]">
              La génétique fixe le plafond. Ces six leviers décident si tu l’atteins.
            </p>
          </div>
        </section>

        <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
          <CircularSplitRoll items={PILIERS} radius={480} cardSize={210} sectionHeight={90} />
        </Suspense>

        {/* ============ NOTRE DIFFÉRENCE ============
            Deux colonnes, titre collant à gauche. Volontairement
            différent de la grille de « Trois étapes » : trois blocs de
            cartes identiques d'affilée, c'est la signature d'un
            template. Ici la page change de rythme. */}
        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <h2 className="font-display text-[clamp(30px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-balance text-ink">
                  Pourquoi nous croire
                </h2>
                <p className="mt-4 max-w-sm text-base text-[color:var(--text-secondary)]">
                  Trois engagements, vérifiables sur le site avant même de payer.
                </p>
              </div>
            </div>

            {/* Liste éditoriale : un filet 1px plutôt qu'une carte.
                La profondeur vient du papier, pas d'une boîte. */}
            <ul className="lg:col-span-7">
              {DIFFERENCES.map((item, i) => {
                const Icone = item.icone
                return (
                  <motion.li
                    key={item.titre}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="flex gap-5 border-t border-[color:var(--color-frost-gray)] py-8 first:border-t-0 first:pt-0"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-peach-wash)]">
                      <Icone className="size-5 text-ink" aria-hidden="true" />
                    </span>

                    <div>
                      <h3 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
                        {item.titre}
                      </h3>
                      <p className="mt-2 text-[15px] leading-[1.55] text-[color:var(--text-secondary)]">
                        {item.texte}
                      </p>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ============ AVIS ============ */}
        <section className="overflow-hidden py-20">
          <div className="mx-auto mb-12 max-w-2xl px-5 text-center sm:px-8">
            <h2 className="font-display text-[clamp(30px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-ink">
              Ils ont testé
            </h2>
            <p className="mt-4 text-base text-[color:var(--text-secondary)]">
              Des ados, et les parents qui regardaient par-dessus leur épaule.
            </p>
          </div>

          <TestimonialMarquee />
        </section>

        {/* ============ PRIX ============
            Le prix n'apparaissait nulle part sur la landing : il fallait aller
            le chercher dans une réponse de FAQ. Un tarif qu'on ne trouve pas se
            lit comme un tarif qu'on cache, et ça se paie au moment de la
            paywall — c'est là que le visiteur découvrait le chiffre. */}
        <section id="prix" className="px-5 py-20 sm:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-[clamp(30px,5vw,48px)] leading-[1.08] font-medium tracking-[-0.03em] text-balance text-ink">
                Un prix, écrit en entier
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-secondary)]">
                Pas de période d’essai qui se transforme en abonnement, pas de palier
                surprise. Deux choses, deux statuts.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Gratuit — volontairement à gauche et sans accent : c'est
                  l'offre qu'on assume de laisser gagner si elle suffit. */}
              <div className="flex flex-col rounded-[26px] border border-[color:var(--color-frost-gray)] p-8">
                <h3 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
                  L’estimation
                </h3>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-[44px] leading-none font-medium tracking-[-0.03em] text-ink">
                    0 €
                  </span>
                  <span className="text-sm text-[color:var(--text-meta)]">pour toujours</span>
                </p>
                <ul className="mt-7 flex flex-col gap-3">
                  {[
                    'Ta taille adulte estimée, tout de suite',
                    'La fourchette et la marge, affichées',
                    'Ta courbe de croissance',
                    'Sans compte, sans carte bancaire',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] leading-[1.5] text-[color:var(--text-secondary)]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--text-meta)]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                {/* `mt-auto` sur l'enveloppe, pas sur le bouton : les deux
                    cartes n'ont pas le même nombre de lignes, et sans ça le
                    bouton de gauche flottait à mi-hauteur avec du vide dessous
                    pendant que celui de droite touchait le bas. */}
                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    onClick={onStartQuestionnaire}
                    className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-ink px-6 text-base font-medium text-ink transition-colors hover:bg-ink/10"
                  >
                    Commencer
                  </button>
                </div>
              </div>

              {/* Payant — bordure orange, comme la carte retenue de la paywall.
                  Le visiteur retrouve exactement le même objet plus tard. */}
              <div className="relative flex flex-col rounded-[26px] border border-[color:var(--color-coral-pulse)] bg-[color:var(--color-peach-wash)] p-8">
                <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-[color:var(--color-on-brand)]">
                  Le plan
                </span>
                <h3 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
                  Le plan de croissance
                </h3>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-[44px] leading-none font-medium tracking-[-0.03em] text-ink">
                    4,99 €
                  </span>
                  <span className="text-sm text-[color:var(--text-secondary)]">
                    /mois, ou 29,99 €/an
                  </span>
                </p>
                <ul className="mt-7 flex flex-col gap-3">
                  {[
                    'Quoi faire chaque jour, sur 30 jours',
                    'Sommeil, nutrition, exercices — détaillés',
                    'Un plan différent à chaque mois d’abonnement',
                    'Re-mesure mensuelle et suivi',
                    'Résiliable en ligne, à tout moment',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] leading-[1.5] text-[color:var(--text-secondary)]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--color-indigo-bloom)]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    onClick={onStartQuestionnaire}
                    className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45]"
                  >
                    Voir mon estimation d’abord
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                  <p className="mt-4 text-center text-[13px] text-[color:var(--text-meta)]">
                    Le plan n’est proposé qu’après ton résultat gratuit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <FaqSection
          title="Les questions qu’on nous pose"
          description="Et les réponses honnêtes, y compris quand elles ne nous arrangent pas."
          items={FAQ}
          contactInfo={{
            title: 'Une autre question ?',
            description: 'On répond sous 48 h, par un humain.',
            buttonText: 'Nous écrire',
            onContact: () => {
              window.location.href = 'mailto:grandimi14@gmail.com'
            },
          }}
        />

        {/* ============ CTA FINAL ============ */}
        <section className="px-5 pb-20 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55 }}
            className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] bg-[color:var(--surface-dark)] px-6 py-16 text-center sm:px-12"
          >
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(30px,5vw,52px)] leading-[1.06] font-medium tracking-[-0.03em] text-white">
              Ton estimation t’attend.
              <br />
              <span className="text-[color:var(--color-coral-pulse)]">
                Elle est gratuite.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-base text-white/70">
              Cinq minutes de questions, un résultat immédiat, et la marge d’erreur
              affichée noir sur blanc.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStartQuestionnaire}
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand px-8 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45] sm:w-auto"
              >
                Commencer maintenant
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>

              <a
                href="#comment-ca-marche"
                className="inline-flex min-h-13 w-full items-center justify-center rounded-full border border-white/60 px-8 text-base font-medium text-white transition-colors hover:bg-white/12 sm:w-auto"
              >
                Revoir le fonctionnement
              </a>
            </div>
          </motion.div>
        </section>

        {/* ============ AVERTISSEMENT ============ */}
        <section className="px-5 pb-16 sm:px-8">
          <div className="mx-auto flex w-full max-w-3xl items-start gap-4 rounded-[20px] bg-[color:var(--color-peach-wash)] p-6">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-[color:var(--color-indigo-bloom)]"
              aria-hidden="true"
            />
            <p className="text-[15px] leading-[1.5] text-ink">
              <strong className="font-semibold">Grandimi n’est pas un dispositif médical.</strong>{' '}
              Les estimations et recommandations sont fournies à titre informatif et ne
              remplacent pas l’avis d’un professionnel de santé. En cas d’inquiétude sur ta
              croissance, parles-en à un médecin.
            </p>
          </div>
        </section>
      </main>

      {/* ============ PIED DE PAGE ============ */}
      {/* Réserve basse permanente sur mobile : la barre d'action se pose
          par-dessus le pied de page, et les liens légaux doivent rester
          cliquables une fois arrivé en bas. */}
      <footer className="border-t border-[color:var(--color-frost-gray)] px-5 pt-10 pb-28 sm:px-8 md:pb-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5 text-ink">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand">
                <Ruler
                  className="size-3.5 text-[color:var(--color-on-brand)]"
                  aria-hidden="true"
                />
              </span>
              <span className="font-display text-lg font-semibold tracking-[-0.02em]">
                Grandimi
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <a href="/mentions-legales.html" className="hover:text-ink transition-colors">Mentions légales</a>
              <a href="/cgv.html" className="hover:text-ink transition-colors">CGV</a>
              <a href="/privacy.html" className="hover:text-ink transition-colors">Confidentialité</a>
              <a href="mailto:grandimi14@gmail.com" className="hover:text-ink transition-colors">Contact</a>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
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
          onClick={onStartQuestionnaire}
          className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-base font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45]"
        >
          Estimer ma taille — gratuit
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/* Échelle de la barre de fourchette.
   La géométrie est DÉRIVÉE de ces nombres, jamais écrite en dur : une
   version précédente affichait une bande à 22–68 % pour une fourchette
   173–183 cm, soit une barre qui contredisait son propre texte. Sur un
   produit dont l'argument est « on montre la marge d'erreur », c'est
   la dernière chose qu'on peut se permettre de faire fausse. */
const ECHELLE_MIN = 160
const ECHELLE_MAX = 200
const ESTIMATION = 178
const MARGE = 5

const pct = (valeur) =>
  ((valeur - ECHELLE_MIN) / (ECHELLE_MAX - ECHELLE_MIN)) * 100

/**
 * Maquette de l'écran de résultat, affichée dans le hero.
 * Montrer le produit vaut mieux qu'une photo d'illustration : c'est le
 * moment « magique » qu'on vend.
 */
function ApercuResultat() {
  const bas = ESTIMATION - MARGE
  const haut = ESTIMATION + MARGE

  return (
    <div className="flex w-full flex-col gap-4 rounded-[26px] border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] p-5 text-left shadow-[0_24px_60px_-24px_rgba(23,18,14,0.22)] sm:p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-sage-wash)] px-3 py-1 text-xs font-semibold text-ink">
          <Sparkles className="size-3" aria-hidden="true" />
          Ton estimation
        </span>
        <span className="text-xs text-muted-foreground">Théo, 14 ans</span>
      </div>

      <div className="rounded-[20px] bg-[color:var(--color-cream)] p-5">
        <p className="text-sm text-[color:var(--text-secondary)]">Taille adulte estimée</p>
        {/* « cm » sur la ligne de base : en exposant, 178 cm se lisait
            comme une puissance mathématique. */}
        <p className="mt-1 flex items-baseline gap-1 font-display text-[clamp(44px,7vw,68px)] leading-none font-medium tracking-[-0.04em] text-ink">
          {ESTIMATION}
          <span className="text-[0.3em] font-sans font-semibold tracking-normal text-[color:var(--text-secondary)]">
            cm
          </span>
        </p>
        <p className="mt-2 text-sm font-medium text-[color:var(--color-indigo-bloom)]">
          Fourchette : {bas} – {haut} cm (±{MARGE} cm)
        </p>
      </div>

      {/* Barre de fourchette : la marge d'erreur est montrée, pas cachée. */}
      <div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--color-cloud-gray)]">
          <div
            className="absolute inset-y-0 rounded-full bg-[color:var(--color-peach-wash)]"
            style={{ left: `${pct(bas)}%`, width: `${pct(haut) - pct(bas)}%` }}
          />
          <div
            className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-brand"
            style={{ left: `${pct(ESTIMATION)}%` }}
          />
        </div>
        <div className="relative mt-2 text-[11px] text-muted-foreground">
          <span>{ECHELLE_MIN} cm</span>
          {/* Aligné sur le repère, pas au centre : la légende doit
              désigner le point qu'elle nomme. */}
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(ESTIMATION)}%` }}
          >
            Estimation
          </span>
          <span className="float-right">{ECHELLE_MAX} cm</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          /* sauge / abricot / bleu — trois teintes DISTINCTES.
             `lilac` est désormais un alias de `sky` : l'utiliser ici
             donnait deux cartes bleues identiques sur trois. */
          { icone: Moon, label: 'Sommeil', valeur: '8 h 40', teinte: 'var(--color-sage-wash)' },
          { icone: Sparkles, label: 'Marge', valeur: '+4 cm', teinte: 'var(--color-peach-wash)' },
          { icone: Ruler, label: 'Percentile', valeur: '68e', teinte: 'var(--color-sky-wash)' },
        ].map(({ icone: Icone, label, valeur, teinte }) => (
          <div key={label} className="rounded-[16px] p-3" style={{ backgroundColor: teinte }}>
            <Icone className="size-4 text-ink" aria-hidden="true" />
            <p className="mt-2 text-[11px] text-[color:var(--text-secondary)]">{label}</p>
            <p className="font-display text-lg font-medium text-ink">{valeur}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
