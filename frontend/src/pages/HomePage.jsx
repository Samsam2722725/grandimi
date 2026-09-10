import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  Moon,
  Ruler,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { lazy, Suspense } from 'react'

/* GSAP (~70 kB) ne sert qu'a ce carrousel, situe tres bas dans la page.
   Le charger dans le bundle initial retardait l'affichage du hero sur
   mobile, ou l'ecran reste blanc tant que le JS n'est pas monte. */
const CircularSplitRoll = lazy(() => import('@/components/ui/circular-split-roll'))
import { FaqSection } from '@/components/ui/faq-section'
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
    titre: 'Plan sur 12 mois',
    texte: 'Sommeil, nutrition, sport : des actions concrètes adaptées à ton quotidien.',
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
      'Non, et personne ne le peut. Ta taille adulte est déterminée à environ 80 % par la génétique. Ce qui se joue, c’est le reste : un sommeil suffisant, une alimentation correcte et une activité physique régulière permettent d’atteindre ton potentiel plutôt que de rester en dessous. C’est exactement ce que le plan cible.',
  },
  {
    question: 'À quel point l’estimation est-elle fiable ?',
    answer:
      'La marge est de ±3 à ±6 cm selon ton âge : plus tu es proche de la fin de ta croissance, plus l’estimation se resserre. On affiche systématiquement cette fourchette avec le résultat — un chiffre seul, sans marge, serait trompeur.',
  },
  {
    question: 'Faut-il payer pour voir mon estimation ?',
    answer:
      'Non. Le questionnaire et l’estimation de ta taille adulte sont gratuits et visibles immédiatement. Seul le plan de croissance personnalisé sur 12 mois est payant.',
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
  return (
    <div className="min-h-screen bg-[color:var(--surface-page-canvas)] font-sans">
      {/* ============ EN-TÊTE ============ */}
      {/* Fond opaque, sans backdrop-blur.
          Un header sticky semi-transparent avec backdrop-filter cree des
          artefacts de compositing sur certains GPU : au changement de
          sens de scroll, le header et le haut du hero restaient figes en
          semi-transparence par-dessus le contenu suivant. Le fond plein
          supprime la cause. */}
      <header className="sticky top-0 z-50 border-b border-[color:var(--color-frost-gray)] bg-[color:var(--surface-page-canvas)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#" className="flex items-center gap-2.5 text-ink">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand">
              <Ruler
                className="size-4 text-[color:var(--color-on-brand)]"
                aria-hidden="true"
              />
            </span>
            <span className="font-display text-xl font-semibold tracking-[-0.02em]">
              Grandimi
            </span>
          </a>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink/6"
            >
              Se connecter
            </button>

            <button
              type="button"
              onClick={onStartQuestionnaire}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45]"
            >
              Estimer ma taille
              <ArrowRight className="size-4" aria-hidden="true" />
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
        <section className="relative overflow-hidden px-5 pt-12 pb-16 sm:px-8 lg:pt-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-32 -z-10 size-[520px] rounded-full bg-[color:var(--color-peach-wash)] opacity-60 blur-3xl"
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
                className="rise mt-6 font-display text-[clamp(40px,6.2vw,72px)] leading-[1.02] font-medium tracking-[-0.035em] text-balance text-ink"
                style={{ animationDelay: '80ms' }}
              >
                Quelle taille vas-tu vraiment{' '}
                <span className="text-[color:var(--color-brand-display)]">atteindre</span> ?
              </h1>

              <p
                className="rise mt-6 max-w-xl text-[clamp(16px,2.2vw,19px)] leading-[1.55] text-pretty text-[color:var(--text-secondary)]"
                style={{ animationDelay: '160ms' }}
              >
                Réponds à quelques questions et découvre ton estimation de taille adulte —
                avec sa marge d’erreur, expliquée. Puis un plan sur 12 mois pour atteindre
                ton potentiel.
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
                  Estimer ma taille adulte — 9,99€/mois
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
            className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] bg-[color:var(--color-canopy-green)] px-6 py-16 text-center sm:px-12"
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
      <footer className="border-t border-[color:var(--color-frost-gray)] px-5 py-10 sm:px-8">
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
