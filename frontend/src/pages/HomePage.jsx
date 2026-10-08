import { TrendingUp } from 'lucide-react'

import { useEffect, useState, lazy, Suspense } from 'react'

import { LogoGrandimi } from '@/components/ui/logo-grandimi'
import { SonarGrid } from '@/components/ui/sonar-grid'
const FaqSection = lazy(() => import('@/components/ui/faq-section').then(m => ({ default: m.FaqSection })))
import '../styles/theme-night.css'

import { tunnelDemarre } from '../lib/analytics'

/* Trois questions courtes : les seules objections qui bloquent avant de commencer. */
const FAQ = [
  {
    question: 'Est-ce que ça marche vraiment ?',
    answer:
      'Ta génétique fixe ta taille maximale. Mais beaucoup d’ados finissent en dessous de la leur : nuits trop courtes, pas assez de protéines ou de calcium, peu de sport, mauvaise posture, au moment précis où l’os peut encore s’allonger. Ton programme corrige exactement ces points, chaque jour.',
  },
  {
    question: 'Jusqu’à quel âge on peut grandir ?',
    answer:
      'Tant que tes cartilages de croissance sont ouverts : en général jusqu’à 16-18 ans chez les filles et 18-21 ans chez les garçons. Plus tu commences tôt, plus ton programme a d’effet. Et la posture, elle, se travaille à tout âge.',
  },
  {
    question: 'Combien de temps par jour ?',
    answer:
      'Quelques minutes d’exercices, et des habitudes simples à intégrer à ta journée : ton heure de coucher, ce que tu mets dans ton assiette. Ton plan te dit exactement quoi faire.',
  },
  {
    question: 'Combien ça coûte ?',
    answer:
      'L’analyse est gratuite. Ensuite, le programme est en abonnement, résiliable quand tu veux en un clic. Un parent peut aussi payer pour toi.',
  },
  {
    question: 'Est-ce que ça remplace un médecin ?',
    answer:
      'Non. Grandimi t’aide à prendre les bonnes habitudes pour grandir. Si tu t’inquiètes pour ta croissance, parles-en à un médecin.',
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
              Réponds à quelques questions. Reçois ton programme pour grandir : chaque
              exercice, chaque repas, chaque nuit de sommeil, jour après jour.
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
                <TrendingUp className="size-16 text-[color:var(--color-brand-display)]" strokeWidth={2.2} />
              </span>
            </div>
          </div>
        </section>
        {/* FAQ : les questions qui bloquent avant de commencer. */}
        <div id="faq" className="scroll-mt-24">
          <Suspense fallback={<div className="h-96" />}>
            <FaqSection title="Questions fréquentes" description="" items={FAQ} />
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

/* Garçon / Fille : la première question du questionnaire, posée sur l'accueil. */
function ChoixSexe({ demarrer, emplacement }) {
  return (
    <div className="rise w-full max-w-md" style={{ animationDelay: '240ms' }}>
      <p className="mb-3 text-[15px] font-semibold text-ink">Tu es :</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['M', 'Garçon'],
          ['F', 'Fille'],
        ].map(([sexe, label]) => (
          <button
            key={sexe}
            type="button"
            onClick={() => demarrer(emplacement, sexe)}
            className="inline-flex min-h-15 items-center justify-center gap-2 rounded-full bg-brand px-5 text-lg font-semibold text-[color:var(--color-on-brand)] shadow-[0_8px_30px_-8px_var(--color-coral-pulse)] transition-transform hover:bg-[#ff7a45] active:scale-[0.97]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* Cadre de téléphone en CSS : pas d'image à charger. */
function Telephone({ children }) {
  return (
    <div className="mx-auto aspect-[9/17] w-full max-w-[250px] rounded-[38px] border-[6px] border-[#2a2a2e] bg-[#0b0b0d] p-3 shadow-2xl">
      <div className="mx-auto mb-3 h-4 w-20 rounded-full bg-[#1c1c20]" />
      <div className="flex flex-col gap-2.5 text-left">{children}</div>
    </div>
  )
}

function LigneEcran({ coche, texte, detail }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-[#17171b] px-3 py-2.5">
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
          coche ? 'bg-brand text-[color:var(--color-on-brand)]' : 'border border-white/20'
        }`}
        aria-hidden="true"
      >
        {coche ? '✓' : ''}
      </span>
      <span className={`flex-1 text-[12px] leading-tight ${coche ? 'text-white/45 line-through' : 'text-white'}`}>{texte}</span>
      {detail && <span className="text-[11px] text-white/45">{detail}</span>}
    </div>
  )
}

function EnteteEcran({ sur, titre }) {
  return (
    <div className="px-1">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--color-coral-pulse)] uppercase">{sur}</p>
      <p className="font-display text-[19px] font-medium text-white">{titre}</p>
    </div>
  )
}

function Jauge({ nom, valeur, part }) {
  return (
    <div className="rounded-[14px] bg-[#17171b] px-3 py-2.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-white/70">{nom}</span>
        <span className="text-white">{valeur}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand" style={{ width: `${part}%` }} />
      </div>
    </div>
  )
}

/* Les écrans montrés sur l'accueil : contenus tirés du plan réel. */
const ECRANS_PLAN = [
  {
    titre: 'Ta stratégie',
    texte: 'Ce qui freine ta croissance, d’après tes réponses, et comment le corriger.',
    contenu: (
      <>
        <EnteteEcran sur="Ton analyse" titre="Ce qui te freine" />
        <Jauge nom="Sommeil" valeur="7 h / 9 h" part={55} />
        <Jauge nom="Sport" valeur="1 / 3 par semaine" part={33} />
        <Jauge nom="Posture" valeur="à corriger" part={45} />
        <LigneEcran texte="Ton plan cible ces 3 points" />
      </>
    ),
  },
  {
    titre: 'Ton plan du jour',
    texte: 'Exercices et posture : tu sais exactement quoi faire, tu coches, tu avances.',
    contenu: (
      <>
        <EnteteEcran sur="Aujourd’hui · série de 4 jours" titre="Ton plan du jour" />
        <LigneEcran coche texte="Suspension à la barre" detail="5 × 15 s" />
        <LigneEcran coche texte="Étirement du dos au mur" detail="1 min" />
        <LigneEcran texte="Gainage posture" detail="2 min" />
        <LigneEcran texte="Étirements dos et hanches" detail="10 min" />
      </>
    ),
  },
  {
    titre: 'Sommeil et alimentation',
    texte: 'Ton heure de coucher et ce qu’il faut dans ton assiette pour construire l’os.',
    contenu: (
      <>
        <EnteteEcran sur="Ce soir" titre="Sommeil" />
        <div className="rounded-[14px] bg-[#17171b] px-3 py-3 text-center">
          <p className="text-[11px] text-white/60">Heure de coucher</p>
          <p className="font-display text-[30px] leading-none text-white">22:00</p>
        </div>
        <Jauge nom="Calcium" valeur="2 / 3 laitages" part={66} />
        <Jauge nom="Protéines" valeur="2 / 3 repas" part={66} />
      </>
    ),
  },
  {
    titre: 'En bonus : ta taille estimée',
    texte: 'Tu te mesures chaque semaine, ta courbe se dessine, ton estimation se met à jour.',
    contenu: (
      <>
        <EnteteEcran sur="Ma taille" titre="Ta courbe" />
        <div className="rounded-[14px] bg-[#17171b] px-3 py-3">
          <svg viewBox="0 0 200 90" className="w-full" aria-hidden="true">
            <path d="M5 80 C 50 70, 80 50, 120 35 S 180 15, 195 12" fill="none" stroke="var(--color-coral-pulse)" strokeWidth="3" strokeLinecap="round" />
            {[[5, 80], [45, 72], [85, 52], [120, 35]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="4" fill="#fff" />
            ))}
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-[#17171b] px-3 py-2.5">
            <p className="text-[10px] text-white/55">Aujourd’hui</p>
            <p className="font-display text-[18px] text-white">166 cm</p>
          </div>
          <div className="rounded-[14px] bg-[#17171b] px-3 py-2.5">
            <p className="text-[10px] text-white/55">Taille estimée</p>
            <p className="font-display text-[18px] text-[color:var(--color-coral-pulse)]">179 cm</p>
          </div>
        </div>
      </>
    ),
  },
]

export default HomePage
