import { lazy, Suspense } from 'react'

import { LogoGrandimi } from '@/components/ui/logo-grandimi'
const FaqSection = lazy(() => import('@/components/ui/faq-section').then(m => ({ default: m.FaqSection })))
import '../styles/theme-night.css'

import { tunnelDemarre } from '../lib/analytics'

/* Les vraies objections d'un ado avant de commencer. */
const FAQ = [
  {
    question: 'Ça marche vraiment, ou c’est encore un truc bidon ?',
    answer:
      'Personne ne peut dépasser ses gènes. Mais beaucoup d’ados finissent en dessous de leur taille maximale : trop peu de sommeil, pas assez de protéines ou de calcium, peu de sport, mauvaise posture. Ton programme corrige ces points-là, chaque jour. Rien de magique, juste ce qui compte vraiment.',
  },
  {
    question: 'J’ai 17 ans, c’est trop tard ?',
    answer:
      'Pas forcément. Chez les garçons, les cartilages de croissance restent souvent ouverts jusqu’à 18-21 ans. Et la posture, elle, se travaille à tout âge : bien droit, tu paraîtras tout de suite plus grand.',
  },
  {
    question: 'Pourquoi autant de questions ? C’est long.',
    answer:
      'Deux minutes. Chaque réponse sert à construire ton programme : ton sommeil, ton sport, la taille de tes parents. Sans elles, on te donnerait le même plan qu’à tout le monde.',
  },
  {
    question: 'Pourquoi me demander mon e-mail ?',
    answer:
      'Pour enregistrer ton analyse et te retrouver si tu changes de téléphone. Pas de spam, et on ne le transmet à personne.',
  },
  {
    question: 'Je n’ai pas de carte bancaire, je fais comment ?',
    answer:
      'Tu peux envoyer le lien de paiement à un parent : il paie de son côté, et ton programme s’ouvre chez toi.',
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

          {/* Sous 640px, les deux boutons pleins ne tenaient pas : la barre
              débordait de 10px et « Se connecter » passait par-dessus le
              logotype. On dégraisse au lieu de rétrécir la cible tactile —
              les 44px de hauteur sont conservés partout. */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Un abonné qui revient trouve son plan ici, au lieu de devoir
                se reconnecter et refaire le chemin à chaque visite. */}
            <button
              type="button"
              onClick={abonne ? onReprendre : onLogin}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-ink/6 sm:border sm:border-ink sm:px-6"
            >
              {abonne ? 'Mon plan' : 'Se connecter'}
            </button>

          </div>
        </div>
      </header>

      <main className="accueil-main">
        {/* Un seul écran, sur le modèle de heightfuel.com : étiquette, titre,
            une phrase, un bouton, trois repères, un visuel. */}
        <section className="relative overflow-hidden px-6 pt-14 pb-20 sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 size-[620px] -translate-x-1/2 rounded-full bg-[color:var(--color-coral-pulse)] opacity-[0.16] blur-[140px]"
          />
          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center">
            <p className="rise text-[12px] font-semibold tracking-[0.18em] text-[color:var(--color-brand-display)] uppercase">
              — Basé sur la science —
            </p>

            <h1
              className="rise mt-6 font-display text-[clamp(48px,11vw,92px)] leading-[0.95] font-medium tracking-[-0.045em] text-ink"
              style={{ animationDelay: '60ms' }}
            >
              Atteins ta
              <br />
              <span className="text-[color:var(--color-brand-display)]">taille maximale</span>
            </h1>

            <p
              className="rise mt-6 max-w-md text-[17px] leading-[1.5] text-[color:var(--text-secondary)]"
              style={{ animationDelay: '120ms' }}
            >
              Réponds à quelques questions. Reçois ton programme pour grandir : tes
              exercices, ton sommeil, ton alimentation, jour après jour.
            </p>

            <button
              type="button"
              onClick={() => demarrer('hero')}
              className="rise mt-9 inline-flex min-h-15 w-full max-w-md items-center justify-center gap-2 rounded-full bg-brand px-8 text-lg font-semibold text-[color:var(--color-on-brand)] shadow-[0_10px_40px_-8px_var(--color-coral-pulse)] transition-transform hover:bg-[#ff7a45] active:scale-[0.97]"
              style={{ animationDelay: '180ms' }}
            >
              Commencer mon analyse →
            </button>

            <p
              className="rise mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-[color:var(--text-meta)]"
              style={{ animationDelay: '220ms' }}
            >
              <span>• 250+ analyses déjà faites</span>
              <span>• 2 minutes</span>
              <span>• Analyse gratuite</span>
              <span>• Résiliable à tout moment</span>
            </p>

            {analyseEnCours && !abonne && (
              <button type="button" className="bouton-reprendre mt-6" onClick={onReprendre}>
                Reprendre mon analyse →
              </button>
            )}

            <div className="rise mt-14 flex justify-center" style={{ animationDelay: '260ms' }} aria-hidden="true">
              <span className="flex size-32 items-center justify-center rounded-[32px] bg-[color:var(--color-coral-pulse)]/10 shadow-[0_0_80px_-10px_var(--color-coral-pulse)]">
                <svg viewBox="0 0 64 64" className="size-20 text-[color:var(--color-brand-display)]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 58V8M14 8l-6 7M14 8l6 7" />
                  <circle cx="40" cy="14" r="6" />
                  <path d="M40 22v18M40 28l-9 6M40 28l9 6M40 40l-6 18M40 40l6 18" />
                  <path d="M24 20h4M24 32h4M24 44h4" strokeWidth="2" />
                </svg>
              </span>
            </div>
          </div>
        </section>
        {/* Repères : uniquement des faits vrais sur le produit. */}
        <section className="px-6 pb-16 sm:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-center font-mono text-[12px] tracking-[0.2em] text-[color:var(--text-meta)] uppercase">
              Les références sur lesquelles on s’appuie
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['OMS', 'Organisation mondiale de la Santé'],
                ['AAP', 'Académie américaine de pédiatrie'],
                ['ANSES', 'Agence française de nutrition'],
                ['Khamis-Roche', 'Méthode de calcul de la taille'],
              ].map(([sigle, nom]) => (
                <div
                  key={sigle}
                  className="flex flex-col items-center justify-center rounded-[18px] border border-[color:var(--color-frost-gray)] px-3 py-4 text-center"
                >
                  <span className="font-display text-[22px] leading-none font-semibold text-ink">{sigle}</span>
                  <span className="mt-1.5 text-[12px] leading-snug text-[color:var(--text-meta)]">{nom}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-2 border-t border-[color:var(--color-frost-gray)]">
              {[
                ['20+', 'questions sur ta situation réelle'],
                ['2 min', 'pour faire ton analyse'],
                ['4', 'piliers : sommeil, sport, alimentation, posture'],
                ['1', 'nouveau plan chaque mois'],
              ].map(([chiffre, texte], i) => (
                <div
                  key={texte}
                  className={`border-b border-[color:var(--color-frost-gray)] py-7 ${i % 2 === 0 ? 'border-r pr-4' : 'pl-5'}`}
                >
                  <p className="font-display text-[34px] leading-none font-medium text-ink">{chiffre}</p>
                  <p className="mt-2 text-[14px] leading-snug text-[color:var(--text-meta)]">{texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ : les questions qui bloquent avant de commencer. */}
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
