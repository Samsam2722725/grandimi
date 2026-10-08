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
      'Oui, même à 21 ans. Chez les garçons, la croissance continue souvent jusqu’à 18-21 ans, beaucoup plus longtemps qu’on le croit. Chez les filles, elle s’arrête plus tôt, souvent vers 15-17 ans. Ton analyse te dit où tu en es.',
  },
  {
    question: 'Qu’est-ce que je reçois ?',
    answer:
      'Ton programme pour grandir : ta routine du jour, ta posture, ton heure de coucher, quoi manger, ton suivi chaque semaine. Et en bonus, ta taille adulte estimée.',
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
          <a href="#" className="flex min-w-0 items-center gap-2 text-ink">
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
            <span className="font-['Syne',sans-serif] text-[15px] max-[379px]:hidden sm:text-xl font-extrabold tracking-[-0.04em]">
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
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-gradient-to-r from-[#ff7a2e] to-[#ff4d1a] px-3.5 text-[13px] sm:text-sm font-bold whitespace-nowrap text-white shadow-[0_0_18px_rgba(255,90,31,0.4)] sm:px-6"
            >
              Commencer
            </button>

          </div>
        </div>
      </header>

      <main className="accueil-main bg-[#060608]">
        {/* HAUT — mise en page et style de heightfuel.com, en orange :
            étiquette mono entre deux traits, titre Syne extra-gras, bouton
            pilule lumineux, icône néon, rangée de chiffres. */}
        <section className="relative overflow-hidden px-5 pt-12 pb-14 sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-48 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-[#ff5a1f] opacity-[0.14] blur-[150px]"
          />
          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center">
            <p className="rise mb-2.5 flex items-center justify-center gap-3 whitespace-nowrap font-['Spline_Sans_Mono',monospace] text-[11px] font-medium tracking-[0.2em] text-[#ff7a45] uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-[#ff7a45]/50" />
              Méthode basée sur la science
              <span aria-hidden="true" className="h-px w-8 bg-[#ff7a45]/50" />
            </p>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-[#ff6a2b]/40 bg-[#ff6a2b]/[0.1] px-4 py-2 text-[14px] font-bold text-[#ff7a45]">
              <span aria-hidden="true" className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff6a2b] opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-[#ff6a2b]" />
              </span>
              Même à 21 ans, tu peux encore grandir.
            </p>

            <h1
              className="rise mt-5 font-['Syne',sans-serif] text-[clamp(36px,10vw,84px)] leading-[1] font-extrabold tracking-[-0.04em] text-[#f4efe9]"
              style={{ animationDelay: '60ms' }}
            >
              Plus grand.
              <br />
              <span className="bg-gradient-to-r from-[#ff8a3d] to-[#ff4d1a] bg-clip-text text-transparent [filter:drop-shadow(0_0_24px_rgba(255,90,31,0.35))]">
                Plus confiant.
              </span>
            </h1>

            <p
              className="rise mt-5 max-w-md text-[16px] leading-[1.6] text-[#a39d97]"
              style={{ animationDelay: '120ms' }}
            >
              Ton programme pour grandir au maximum, fait pour toi. Chaque nuit, chaque
              repas, chaque exercice compte.
            </p>

            <button
              type="button"
              onClick={() => demarrer('hero')}
              className="rise mt-8 inline-flex min-h-14 w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a2e] to-[#ff4d1a] px-8 text-[17px] font-bold text-white shadow-[0_0_28px_rgba(255,90,31,0.45)] transition-transform active:scale-[0.97]"
              style={{ animationDelay: '180ms' }}
            >
              Je commence →
            </button>

            {analyseEnCours && !abonne && (
              <button type="button" className="bouton-reprendre mt-5" onClick={onReprendre}>
                Reprendre mon analyse →
              </button>
            )}


            {/* Rangée de chiffres, comme heightfuel — uniquement du vrai. */}
            <div className="rise mt-10 grid w-full max-w-md grid-cols-3 border-y border-white/10" style={{ animationDelay: '280ms' }}>
              {[
                ['200+', 'analyses faites'],
                ['2 min', 'pour commencer'],
                ['100 %', 'fait pour toi'],
              ].map(([chiffre, texte], i) => (
                <div key={texte} className={`py-5 ${i > 0 ? 'border-l border-white/10' : ''}`}>
                  <p className="font-['Syne',sans-serif] text-[20px] leading-none font-extrabold text-[#ff6a2b]">{chiffre}</p>
                  <p className="mt-2 font-['Spline_Sans_Mono',monospace] text-[10px] tracking-[0.12em] text-[#8a847e] uppercase">{texte}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* BÉNÉFICES — copié de tallerapp.xyz (« Unlock your full potential »). */}
        <section id="fonctionnalites" className="px-6 pb-20 sm:px-8">
          <div className="mx-auto w-full max-w-2xl">
            <p className="text-center font-['Spline_Sans_Mono',monospace] text-[11px] tracking-[0.2em] text-[#8a847e] uppercase">Ce que tu reçois</p>
            <h2 className="mt-3 text-center font-['Syne',sans-serif] text-[clamp(32px,8vw,52px)] leading-[1.02] font-extrabold tracking-[-0.035em] text-[#f4efe9]">
              Deviens le plus <span className="text-[#ff6a2b]">grand possible</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center text-[16px] leading-[1.6] text-[#a39d97]">
              Sommeil, sport, alimentation, posture : tout ce qui fait grandir, réuni dans un seul programme.
            </p>

            {/* Grille à la TrendSaaS : ce qu'on reçoit, en chiffres vrais. */}
            <div className="mt-10 grid grid-cols-2 border-t border-white/10">
              {[
                ['Aucun centimètre perdu', 'On trouve ce qui bloque ta croissance. Et on le règle.'],
                ['Ton plan sur mesure', 'Chaque jour, exactement quoi faire pour grandir. Calculé pour toi.'],
                ['Plus grand, tout de suite', 'Ta posture te vole des centimètres. On te les rend.'],
                ['Ta taille future', 'Découvre jusqu’où tu peux monter.'],
              ].map(([chiffre, texte], i) => (
                <div
                  key={texte}
                  className={`border-b border-white/10 py-7 ${i % 2 === 0 ? 'border-r pr-4' : 'pl-5'}`}
                >
                  <p className="font-sans text-[22px] leading-[1.1] font-bold tracking-[-0.02em] text-[#f4efe9]">{chiffre}</p>
                  <p className="mt-3 text-[14px] leading-snug text-[#8a847e]">{texte}</p>
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
