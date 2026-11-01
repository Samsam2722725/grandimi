import { lazy, Suspense } from 'react'
import { SilhouetteRedresse } from '@/components/ui/silhouette-redresse'

import { LogoGrandimi } from '@/components/ui/logo-grandimi'
const FaqSection = lazy(() => import('@/components/ui/faq-section').then(m => ({ default: m.FaqSection })))
import '../styles/theme-night.css'

import { tunnelDemarre } from '../lib/analytics'
import { AVIS } from '../lib/avis-clients'

/* Les questions que les ados tapent dans Google, avec des réponses vraies
   qui donnent envie de commencer (01/11/2026). Retirées : « J'ai pas de
   carte bancaire » (promettait le paiement par un parent, éteint) et la
   taille estimée « en bonus » (seulement dans 3 mois et À vie).
   COPIE dans frontend/index.html (données FAQPage pour Google) : tout
   changement ici doit y être reporté. */
const FAQ = [
  {
    question: 'Est-ce que je peux encore grandir ?',
    answer:
      'Oui, tant que tes cartilages de croissance ne sont pas fermés. Chez les garçons, la croissance continue souvent jusqu’à 18-21 ans, bien plus longtemps qu’on le croit. Chez les filles, la grosse poussée arrive plus tôt. Ton analyse estime où tu en es, en 2 minutes.',
  },
  {
    question: 'Comment grandir au maximum ?',
    answer:
      'Ta génétique fixe la plus grosse part, mais le reste dépend de toi : bien dormir, manger assez de protéines et de calcium, bouger chaque jour et te tenir droit. Grandimi te dit chaque jour quoi faire, adapté à ton âge et à ton profil.',
  },
  {
    question: 'Qu’est-ce que je reçois ?',
    answer:
      'Un programme fait pour toi, jour après jour sur 16 niveaux : ta routine, tes exercices (posture, étirements, sport), quoi manger et à quelle heure te coucher. Avec les offres 3 mois et À vie, tu as aussi ta taille adulte estimée.',
  },
  {
    question: 'Pourquoi pas juste des vidéos TikTok ?',
    answer:
      'Les vidéos donnent les mêmes conseils à tout le monde. Ton programme part de TES réponses et te dit quoi faire chaque jour, dans le bon ordre.',
  },
  {
    question: 'Je peux arrêter quand je veux ?',
    answer:
      'Oui, sans engagement : tu résilies depuis ton compte quand tu veux. Et si ça ne te plaît pas, tu as 14 jours pour être remboursé.',
  },
]

/* Un bloc de tallerapp.xyz : titre à gauche, texte gris, puis un visuel
   dans une carte sombre arrondie. */
function BlocTaller({ titre, texte, children }) {
  return (
    <div className="mt-14 text-left">
      <h3 className="font-sans text-[28px] leading-[1.15] font-bold tracking-[-0.02em] text-[#f4efe9]">{titre}</h3>
      <p className="mt-4 text-[16px] leading-[1.6] text-[#8a847e]">{texte}</p>
      <div className="mt-7 rounded-[28px] border border-white/[0.06] bg-white/[0.03] px-5 py-8">{children}</div>
    </div>
  )
}

/* Le chemin du programme, comme l'écran « Ton plan » de l'app
   (parcours.jsx) : un niveau de 7 jours en serpentin, le jour 1 fait, le
   jour 2 « aujourd'hui », le trophée au bout ; 16 niveaux en tout. */
const JOURS_DU_CHEMIN = [
  { jour: 1, x: 40, y: 50 },
  { jour: 2, x: 113, y: 50 },
  { jour: 3, x: 186, y: 50 },
  { jour: 4, x: 260, y: 50 },
  { jour: 5, x: 260, y: 140 },
  { jour: 6, x: 186, y: 140 },
  { jour: 7, x: 113, y: 140 },
]

function CheminProgramme() {
  return (
    <div>
      <div className="flex items-center justify-between text-[14px] font-bold text-[#f4efe9]">
        <span>Niveau 1 🌶️</span>
        <span className="text-[#8a847e]">1/7</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full w-[14%] rounded-full bg-[#ff6a2b]" />
      </div>
      <svg viewBox="0 0 300 180" className="mt-4 w-full" role="img" aria-label="Le chemin du niveau 1 : 7 jours, le premier fait">
        <path d="M40,50 H260 C305,50 305,140 260,140 H113" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
        <path d="M40,50 H113" stroke="#ff6a2b" strokeWidth="4" strokeLinecap="round" />
        <rect x="70" y="2" width="86" height="22" rx="7" fill="#ff6a2b" />
        <text x="113" y="17.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">Aujourd’hui</text>
        {JOURS_DU_CHEMIN.map(({ jour, x, y }) => {
          const fait = jour === 1
          const actuel = jour === 2
          const trophee = jour === 7
          return (
            <g key={jour}>
              {actuel && <circle cx={x} cy={y} r="27" fill="#ff6a2b" opacity="0.22" />}
              <circle
                cx={x}
                cy={y}
                r="21"
                fill={fait ? '#ff6a2b' : '#1f1f1f'}
                stroke={actuel ? '#ff6a2b' : fait ? 'none' : 'rgba(255,255,255,0.12)'}
                strokeWidth={actuel ? 3 : 1.5}
              />
              <text x={x} y={y + 5.5} textAnchor="middle" fontSize={trophee ? 18 : 15} fontWeight="700" fill={fait ? '#fff' : actuel ? '#f4efe9' : '#8a847e'}>
                {fait ? '✓' : trophee ? '🏆' : jour}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[13px] font-semibold text-[#8a847e]">
        <span>Niveau 2 🌶️🌶️</span>
        <span>16 niveaux · 112 jours</span>
      </div>
    </div>
  )
}

/* La courbe de Taller (« Predict your future height ») : la taille qui
   monte de 15 à 21 ans et se tasse, un point à 18 ans. Une illustration,
   pas la taille de quelqu'un : le chiffre est un exemple. */
function CourbeTaille() {
  const ages = [15, 16, 17, 18, 19, 20, 21]
  const x = (age) => 20 + ((age - 15) / 6) * 280
  const courbe = 'M20,150 C90,104 150,72 180,63 S260,40 300,36'
  return (
    <div>
      <svg viewBox="0 0 320 170" className="w-full" role="img" aria-label="Exemple de courbe de taille de 15 à 21 ans">
        <defs>
          <linearGradient id="courbe-aire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ff6a2b" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {[36, 74, 112, 150].map((y) => (
          <line key={y} x1="20" x2="300" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
        ))}
        <path d={`${courbe} L300,150 L20,150 Z`} fill="url(#courbe-aire)" />
        <path d={courbe} fill="none" stroke="#ff6a2b" strokeWidth="3" strokeLinecap="round" />
        <line x1={x(18)} x2={x(18)} y1="30" y2="150" stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
        <circle cx={x(18)} cy="63" r="9" fill="#ff6a2b" stroke="#f4efe9" strokeWidth="4" />
        <rect x={x(18) - 32} y="2" width="64" height="24" rx="7" fill="#ff6a2b" />
        <text x={x(18)} y="18.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">178 cm</text>
      </svg>
      <div className="mt-2 flex justify-between px-[4%] text-[13px] text-[#8a847e]">
        {ages.map((age) => <span key={age}>{age}</span>)}
      </div>
    </div>
  )
}

function HomePage({ onStartQuestionnaire, onLogin, onReprendre, analyseEnCours, abonne }) {
  /* Les boutons de la page mènent tous au même questionnaire. Agrégés, ils ne
     disent rien : on sait combien de gens démarrent, pas ce qui les a décidés,
     donc pas quelle section mérite d'exister. Chaque bouton déclare son
     emplacement avant de déléguer. */
  /* Le bouton enfoncé se peint d'abord, le questionnaire se construit
     ensuite : sinon le toucher attendait tout l'écran suivant (INP Google,
     01/11/2026). */
  const demarrer = (emplacement, sexe, evenement) => {
    // Le bouton s'enfonce tout de suite : c'est ce que le téléphone peint
    // en réponse au toucher.
    evenement?.currentTarget?.style.setProperty('transform', 'scale(0.97)')
    requestAnimationFrame(() => {
      setTimeout(() => {
        tunnelDemarre(emplacement)
        onStartQuestionnaire(sexe)
      }, 0)
    })
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
            <span className="font-['Syne',sans-serif] text-[15px] max-[379px]:hidden sm:text-xl font-bold tracking-[-0.04em]">
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
              onClick={(e) => demarrer('en-tete', undefined, e)}
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
            <p className="mb-2.5 flex items-center justify-center gap-3 whitespace-nowrap font-['Spline_Sans_Mono',monospace] text-[11px] font-medium tracking-[0.2em] text-[#ff7a45] uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-[#ff7a45]/50" />
              Méthode basée sur la science
              <span aria-hidden="true" className="h-px w-8 bg-[#ff7a45]/50" />
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#ff6a2b]/40 bg-[#ff6a2b]/[0.1] px-4 py-2 text-[14px] font-bold text-[#ff7a45]">
              <span aria-hidden="true" className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff6a2b] opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-[#ff6a2b]" />
              </span>
              Même à 21 ans, tu peux encore grandir.
            </p>

            <h1
              className="mt-5 font-['Syne',sans-serif] text-[clamp(36px,10vw,84px)] leading-[1] font-bold tracking-[-0.04em] text-[#f4efe9]"
            >
              {/* Titre et phrase sans fondu : Google compte leur apparition
                  comme le chargement de la page (LCP, 01/11/2026).
                  COPIE FIGÉE dans frontend/index.html (« coquille du hero ») :
                  tout changement du titre ou de la phrase doit y être
                  reporté, sinon l'ancienne version s'affiche d'abord. */}
              {/* Les mots du paywall (01/11/2026) : la même promesse du
                  premier écran jusqu'au prix. */}
              Atteins ta
              <br />
              <span className="bg-gradient-to-r from-[#ff8a3d] to-[#ff4d1a] bg-clip-text text-transparent [filter:drop-shadow(0_0_24px_rgba(255,90,31,0.35))]">
                taille maximale
              </span>
            </h1>

            <p
              className="mt-5 max-w-md text-[16px] leading-[1.6] text-[#a39d97]"
            >
              {/* Mélange de la ligne de Taller (« You can't control genetics,
                  but you can optimize growth ») et de la phrase du paywall
                  (01/11/2026). */}
              Tu ne choisis pas ta génétique, mais tu peux optimiser ta croissance : un
              programme optimal <em className="font-bold text-[#ff6a2b] not-italic">adapté à toi</em>.
            </p>

            <button
              type="button"
              onClick={(e) => demarrer('hero', undefined, e)}
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


            {/* Image animée : la silhouette se redresse et grandit. */}
            <div className="rise mt-10" style={{ animationDelay: '240ms' }}>
              <SilhouetteRedresse />
            </div>

            {/* Un seul chiffre, et du vrai : 6 140 prédictions en base au
                01/11/2026. « 2 min » et « 100 % fait pour toi » retirés à la
                demande de Samuel (01/11/2026). */}
            <div className="rise mt-10 w-full max-w-md border-y border-white/10 py-5" style={{ animationDelay: '280ms' }}>
              <p className="font-['Syne',sans-serif] text-[20px] leading-none font-bold text-[#ff6a2b]">6 000+</p>
              <p className="mt-2 font-['Spline_Sans_Mono',monospace] text-[11px] tracking-[0.08em] text-[#8a847e] uppercase">analyses faites</p>
            </div>

          </div>
        </section>

        {/* BÉNÉFICES — copié de tallerapp.xyz (« Unlock your full potential »). */}
        <section id="fonctionnalites" className="px-5 pb-6 sm:px-8 sm:pb-20">
          <div className="mx-auto w-full max-w-2xl">
            <p className="text-center font-['Spline_Sans_Mono',monospace] text-[11px] tracking-[0.2em] text-[#8a847e] uppercase">Ce que tu reçois</p>
            <h2 className="mt-3 text-center font-['Syne',sans-serif] text-[clamp(32px,8vw,52px)] leading-[1.02] font-bold tracking-[-0.035em] text-[#f4efe9]">
              Deviens le plus <span className="text-[#ff6a2b]">grand possible</span>
            </h2>

            {/* Comme tallerapp.xyz (01/11/2026) : leur phrase sous le titre
                (« We analyze your growth potential and give you a custom plan
                to make sure you reach it »), sans le « make sure » : on ne
                garantit rien. Puis leurs blocs dans leur ordre, la prédiction
                en dernier. Remplace les 4 cases (dont « On te les rend », qui
                promettait des centimètres). */}
            <p className="mx-auto mt-4 max-w-md text-center text-[16px] leading-[1.6] text-[#a39d97]">
              On analyse ton potentiel de croissance et on te donne un plan sur mesure pour l’atteindre.
            </p>

            <BlocTaller
              titre="Programme optimal"
              texte="Des exercices de posture à l’alimentation, chaque habitude est adaptée à toi. Reste régulier, prends de meilleures habitudes et donne-toi toutes les chances d’atteindre ton plein potentiel."
            >
              <CheminProgramme />
            </BlocTaller>

            <BlocTaller
              titre="Prédis ta taille adulte"
              texte="Ton estimation de taille adulte, calculée avec ta taille, ton âge, la taille de tes parents et tes signes de puberté, sur les courbes de croissance de référence."
            >
              <CourbeTaille />
            </BlocTaller>
          </div>
        </section>

        {/* AVIS — le même vrai avis que sur le paywall (lib/avis-clients),
            vers la fin de la page, avant les questions (01/11/2026). */}
        {AVIS.length > 0 && (
          <section className="px-5 pt-10 pb-4 sm:px-8" aria-label="Avis de clients">
            <div className="mx-auto w-full max-w-2xl">
              <p className="text-center font-['Spline_Sans_Mono',monospace] text-[11px] tracking-[0.2em] text-[#8a847e] uppercase">Ce qu’ils en disent</p>
              {AVIS.map(({ prenom, age, texte }) => (
                <figure
                  key={prenom + texte.slice(0, 12)}
                  className="mt-5 flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ff6a2b]/15 font-bold text-[#ff6a2b]"
                  >
                    {prenom[0]}
                  </span>
                  <div>
                    <blockquote className="text-[15px] leading-[1.55] text-[#f4efe9]">{/* Espaces insécables du français : « ! » et « » » ne partent pas seuls à la ligne. */}
                      {`« ${texte.replace(/ ([!?:;])/g, ' $1')} »`}</blockquote>
                    <figcaption className="mt-3 flex items-center gap-2.5 text-[14px] font-semibold text-[#f4efe9]">
                      <span>{prenom}, {age} ans</span>
                      <span className="tracking-[1px] text-[#fbbf24]" aria-label="5 étoiles sur 5">★★★★★</span>
                    </figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <div id="faq" className="scroll-mt-24">
          <Suspense fallback={<div className="h-96" />}>
            <FaqSection title="Les questions qu’on nous pose souvent" description="" items={FAQ} />
          </Suspense>
        </div>

        {/* Le bouton du bas (« CTA pot de colle » : haut, barre collée, bas),
            pour celui qui a tout lu (01/11/2026). Mesuré à part : 'bas-de-page'. */}
        <section className="px-5 pt-2 pb-14 sm:px-8">
          <div className="mx-auto flex w-full max-w-md justify-center">
            <button
              type="button"
              onClick={(e) => demarrer('bas-de-page', undefined, e)}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a2e] to-[#ff4d1a] px-8 text-[17px] font-bold text-white shadow-[0_0_28px_rgba(255,90,31,0.45)] transition-transform active:scale-[0.97]"
            >
              Je commence →
            </button>
          </div>
        </section>

      </main>

      {/* Pied de page court, une ligne : nom, phrase, liens légaux. */}
      <footer className="border-t border-[color:var(--color-frost-gray)] px-6 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-[color:var(--text-meta)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            <span className="font-['Syne',sans-serif] text-lg font-bold tracking-[-0.04em] text-ink">Grandimi</span>
            <span>Ton programme pour grandir.</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
            <a href="/que-faire-pour-grandir/" className="hover:text-ink">Guides</a>
            <a href="/cgv.html" className="hover:text-ink">Conditions de vente</a>
            <a href="/mentions-legales.html" className="hover:text-ink">Mentions légales</a>
            <a href="/privacy.html" className="hover:text-ink">Confidentialité</a>
            <a href="mailto:bonjour@grandimi.com" className="hover:text-ink">Contact</a>
          </nav>
        </div>
      </footer>

    </div>
  )
}

export default HomePage
