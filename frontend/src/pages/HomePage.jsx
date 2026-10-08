import { lazy, Suspense } from 'react'

import { LogoGrandimi } from '@/components/ui/logo-grandimi'
const FaqSection = lazy(() => import('@/components/ui/faq-section').then(m => ({ default: m.FaqSection })))
import '../styles/theme-night.css'

import { tunnelDemarre } from '../lib/analytics'

/* Les vraies objections d'un ado avant de commencer. */
const FAQ = [
  {
    question: 'Est-ce que je peux encore grandir ?',
    answer:
      'Oui, tant que ton corps grandit : souvent jusqu’à 18-21 ans pour les garçons, 15-17 ans pour les filles. C’est maintenant que ça se joue.',
  },
  {
    question: 'Qu’est-ce que je reçois ?',
    answer:
      'Ton programme pour grandir : ta routine du jour, ta posture, ton heure de coucher, quoi manger, et ton suivi chaque semaine.',
  },
  {
    question: 'Quand je vois des résultats ?',
    answer:
      'La posture, dès les premières semaines : tu parais plus grand. Ta croissance, tu la vois sur ta courbe chaque semaine.',
  },
  {
    question: 'Pourquoi pas juste des vidéos TikTok ?',
    answer:
      'Les vidéos donnent les mêmes conseils à tout le monde. Ton programme part de TES réponses et te dit quoi faire chaque jour.',
  },
  {
    question: 'J’ai pas de carte bancaire',
    answer:
      'Envoie le lien de paiement à un parent : il paie, et ton programme s’ouvre chez toi.',
  },
]

function HomePage({ onStartQuestionnaire, onLogin, onReprendre, analyseEnCours, abonne }) {
  /* Les boutons de la page mènent tous au même questionnaire. Agrégés, ils ne
     disent rien : on sait combien de gens démarrent, pas ce qui les a décidés,
     donc pas quelle section mérite d'exister. Chaque bouton déclare son
     emplacement avant de déléguer. */
  const demarrer = (emplacement, sexe) => {
    tunnelDemarre(emplacement)
    onStartQuestionnaire(sexe)
  }


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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
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
            <span className="font-display text-lg max-[359px]:hidden sm:text-xl font-semibold tracking-[-0.02em]">
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

          {/* Sous 640px, les deux boutons pleins ne tenaient pas : la barre
              débordait de 10px et « Se connecter » passait par-dessus le
              logotype. On dégraisse au lieu de rétrécir la cible tactile —
              les 44px de hauteur sont conservés partout. */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {/* Un abonné qui revient trouve son plan ici, au lieu de devoir
                se reconnecter et refaire le chemin à chaque visite. */}
            <button
              type="button"
              onClick={abonne ? onReprendre : onLogin}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full px-1.5 text-[13px] sm:text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-ink/6 sm:border sm:border-ink sm:px-6"
            >
              {abonne ? 'Mon plan' : 'Se connecter'}
            </button>
            {/* Le bouton qui suit le visiteur : l'en-tête reste collé en haut. */}
            <button
              type="button"
              onClick={() => demarrer('en-tete')}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-brand px-3.5 text-[13px] sm:text-sm font-semibold whitespace-nowrap text-[color:var(--color-on-brand)] transition-colors hover:bg-[#ff7a45] sm:px-6"
            >
              Commencer
            </button>

          </div>
        </div>
      </header>

      <main className="accueil-main">
        {/* HAUT — copié de heightfuel.com : étiquette, titre, phrase, bouton. */}
        <section className="relative overflow-hidden px-6 pt-14 pb-16 sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 size-[620px] -translate-x-1/2 rounded-full bg-[color:var(--color-coral-pulse)] opacity-[0.16] blur-[140px]"
          />
          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center">
            <p className="rise text-[12px] font-semibold tracking-[0.18em] text-[color:var(--color-brand-display)] uppercase">
              Méthode basée sur la science
            </p>

            <h1
              className="rise mt-6 font-display text-[clamp(46px,11vw,88px)] leading-[0.98] font-medium tracking-[-0.045em] text-ink"
              style={{ animationDelay: '60ms' }}
            >
              Débloque tout ton
              <br />
              <span className="text-[color:var(--color-brand-display)]">potentiel de taille</span>
            </h1>

            <p
              className="rise mt-6 max-w-md text-[17px] leading-[1.5] text-[color:var(--text-secondary)]"
              style={{ animationDelay: '120ms' }}
            >
              Ton corps grandit encore. Chaque nuit, chaque repas, chaque exercice compte.
              On te dit exactement quoi faire.
            </p>

            <button
              type="button"
              onClick={() => demarrer('hero')}
              className="rise mt-9 inline-flex min-h-15 w-full max-w-md items-center justify-center gap-2 rounded-full bg-brand px-8 text-lg font-semibold text-[color:var(--color-on-brand)] shadow-[0_10px_40px_-8px_var(--color-coral-pulse)] transition-transform hover:bg-[#ff7a45] active:scale-[0.97]"
              style={{ animationDelay: '180ms' }}
            >
              Je commence →
            </button>

            {analyseEnCours && !abonne && (
              <button type="button" className="bouton-reprendre mt-6" onClick={onReprendre}>
                Reprendre mon analyse →
              </button>
            )}
          </div>
        </section>

        {/* PREUVE — de vraies personnes sont déjà passées par Grandimi. */}
        <section className="px-6 pb-16 sm:px-8">
          <div className="mx-auto w-full max-w-2xl rounded-[28px] border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] px-6 py-8 text-center">
            <p className="text-[15px] text-[color:var(--text-secondary)]">Déjà</p>
            <p className="mt-1 font-display text-[56px] leading-none font-medium text-[color:var(--color-brand-display)]">200+</p>
            <p className="mt-3 text-[17px] font-semibold text-ink">jeunes ont déjà commencé avec Grandimi</p>
            <p className="mx-auto mt-3 max-w-sm text-[12px] leading-[1.5] text-[color:var(--text-meta)]">
              Construit sur les repères de l’Organisation mondiale de la Santé, des pédiatres et de
              l’ANSES pour la nutrition.
            </p>
          </div>
        </section>

        {/* BÉNÉFICES — copié de tallerapp.xyz (« Unlock your full potential »). */}
        <section id="fonctionnalites" className="px-6 pb-20 sm:px-8">
          <div className="mx-auto w-full max-w-2xl">
            <h2 className="text-center font-display text-[clamp(32px,7vw,48px)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
              Plus grand. Plus confiant.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center text-[16px] text-[color:var(--text-secondary)]">
              Tout pour atteindre ta taille maximale, tant que ton corps grandit encore. Ne laisse aucun centimètre de côté.
            </p>

            <div className="mt-10 flex flex-col gap-3">
              {[
                ['Parais plus grand tout de suite', 'Ta posture cache des centimètres. Tiens-toi droit, et ça se voit dès les premières semaines.'],
                ['Ce qui te freine', 'On repère ce qui t’empêche de grandir : sommeil, sport, ce que tu manges, posture.'],
                ['Ta routine du jour', 'Quelques minutes d’exercices et d’étirements. Tu sais quoi faire, tu coches.'],
                ['Dors pour grandir', 'C’est la nuit que ton corps grandit. On te donne ton heure de coucher.'],
                ['Mange pour grandir', 'Ce qu’il faut dans ton assiette pour grandir, sans régime compliqué.'],
                ['Vois-toi grandir', 'Tu te mesures chaque semaine, et ta courbe monte.'],
              ].map(([titre, texte]) => (
                <div
                  key={titre}
                  className="rounded-[22px] border border-[color:var(--color-frost-gray)] bg-[color:var(--surface-card)] px-5 py-5"
                >
                  <h3 className="font-display text-[20px] font-medium text-ink">{titre}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.5] text-[color:var(--text-secondary)]">{texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <div id="faq" className="scroll-mt-24">
          <Suspense fallback={<div className="h-96" />}>
            <FaqSection title="Les questions qu’on nous pose souvent" description="" items={FAQ} />
          </Suspense>
        </div>

      </main>

      {/* Pied de page court, une ligne : nom, phrase, liens légaux. */}
      <footer className="border-t border-[color:var(--color-frost-gray)] px-6 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-[color:var(--text-meta)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            <span className="font-display text-lg font-semibold text-ink">Grandimi</span>
            <span>Ton programme pour grandir.</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/que-faire-pour-grandir/" className="hover:text-ink">Guides</a>
            <a href="/cgv.html" className="hover:text-ink">Conditions de vente</a>
            <a href="/mentions-legales.html" className="hover:text-ink">Mentions légales</a>
            <a href="/privacy.html" className="hover:text-ink">Confidentialité</a>
            <a href="mailto:grandimi14@gmail.com" className="hover:text-ink">Contact</a>
          </nav>
        </div>
      </footer>

    </div>
  )
}

export default HomePage
