import { BarChart3, CalendarCheck, Dumbbell, Settings, Share2, User } from 'lucide-react'

/**
 * Les trois téléphones du hero.
 *
 * Pourquoi du HTML et pas des captures d'écran : une capture est une image
 * morte. Elle pèse, elle floute sur les écrans à forte densité, et elle devient
 * un mensonge dès qu'un libellé change dans le produit — personne ne repasse
 * derrière pour refaire la photo. Ici, le jour où le tunnel change, on édite
 * une chaîne de caractères.
 *
 * La MISE EN PAGE reprend délibérément celle de Taller, écran par écran : deux
 * cartes de tête dont une en couleur d'accent, une pilule pleine largeur, un
 * graphe Taille/Âge à bulle, deux tuiles chiffrées à barre de progression, une
 * barre d'onglets. Cette grille-là a été payée en publicité par des gens qui
 * mesurent leurs conversions ; la copier est gratuit et parfaitement légal — ce
 * qui ne l'est pas, c'est de reprendre leurs captures ou leurs chiffres.
 *
 * Ce qui n'est donc PAS repris :
 *  — « Taller than 61% of your age » : notre calcul ne rend pas de percentile
 *    affichable. Remplacé par la fourchette, qu'on a et qu'eux cachent.
 *  — « Dream height odds 42% » : une probabilité qu'aucun modèle ne produit.
 *    Remplacé par l'avancement du plan du jour, qui existe pour de vrai.
 *  — l'onglet « forum » : nous n'avons pas de communauté. Annoncer sur la page
 *    d'accueil un écran que l'abonné ne trouvera jamais, c'est un remboursement
 *    programmé.
 *
 * Les chiffres décrivent un profil cohérent — garçon de 14 ans, 166 cm, parents
 * 176 et 164 — et sont ceux que le calcul rend pour ce profil.
 *
 * Une licence assumée : l'analyse montre la taille adulte EN CLAIR alors que le
 * produit la verrouille jusqu'au paiement. C'est ce que l'abonné obtient, et
 * montrer le cadenas dans le hero reviendrait à vendre la serrure plutôt que la
 * maison.
 */

const PROFIL = {
  age: '14 ans',
  actuelle: 166,
  /* Relevés sur l'API de production le 18/09/2026, pas estimés à l'oeil.
     La fourchette portait 173-183, soit ±5 cm, alors que le modèle rend
     ±7,2 cm sur ce profil. Resserrer la marge sur la page d'accueil est
     le mensonge exact que tout le reste de cette page reproche à la
     concurrence — et il était d'autant plus facile à croire que le
     commentaire au-dessus affirme que ces chiffres sortent du calcul. */
  adulte: 179,
  basse: 172,
  haute: 186,
  gain: '+1,8 cm',
  croissanceFaite: 95,
  actionsFaites: 4,
  actionsTotal: 11,
  serie: 5,
}

/* Coque du téléphone. Les proportions (9/19.5) sont celles d'un écran actuel :
   une coque trop carrée se lit comme une tablette et l'illusion tombe. */
function Coque({ children, className = '', style }) {
  return (
    <div
      className={`relative shrink-0 rounded-[2.4rem] border border-white/10 bg-[#0b0b0c] p-1.5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)] ${className}`}
      style={style}
    >
      {/* Encoche + barre d'accueil : deux détails de trois pixels, et le
          cerveau classe l'image comme « téléphone » avant d'avoir lu un mot. */}
      <div
        aria-hidden="true"
        className="absolute top-3 left-1/2 z-20 h-[16px] w-[82px] -translate-x-1/2 rounded-full bg-black"
      />
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-black px-3 pt-8 pb-2">
        {children}
        <span
          aria-hidden="true"
          className="mx-auto mt-2 block h-[3px] w-[78px] rounded-full bg-white/25"
        />
      </div>
    </div>
  )
}

/* Barre d'onglets. Quatre entrées comme chez eux, mais les nôtres : pas de
   « forum » tant qu'il n'y a pas de forum. */
function Onglets({ actif = 'analyse' }) {
  const onglets = [
    { id: 'analyse', label: 'analyse', Icone: BarChart3 },
    { id: 'plan', label: 'plan', Icone: Dumbbell },
    { id: 'jour', label: 'jour', Icone: CalendarCheck },
    { id: 'compte', label: 'compte', Icone: User },
  ]

  return (
    <div className="mt-2 flex items-center justify-between border-t border-white/8 px-1 pt-1.5">
      {onglets.map(({ id, label, Icone }) => (
        <span
          key={id}
          className={`flex flex-col items-center gap-0.5 ${
            id === actif ? 'text-brand' : 'text-white/35'
          }`}
        >
          <Icone className="size-[13px]" aria-hidden="true" />
          <span className="text-[7px] font-medium">{label}</span>
        </span>
      ))}
    </div>
  )
}

/* ÉCRAN 1 — une question du tunnel.
   Celui-ci plutôt qu'un autre : la roulette montre en une image que rien n'est
   à taper, qui est l'objection numéro un devant un questionnaire de seize
   écrans. */
function EcranQuestion() {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] text-white/70">
          ←
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
          <span className="block h-full w-[18%] rounded-full bg-brand" />
        </span>
      </div>

      <p className="mt-6 font-display text-[20px] leading-tight font-medium text-white">
        Quel âge as-tu ?
      </p>
      <p className="mt-2 text-[11px] leading-snug text-white/45">
        Plus tu es proche de la fin de ta croissance, plus l’estimation se resserre.
      </p>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2">
        <span className="text-[13px] text-white/15">15 ans</span>
        <span className="text-[15px] text-white/35">14,5 ans</span>
        <span className="rounded-2xl bg-white/8 px-7 py-2.5 font-display text-[23px] leading-none font-medium text-white">
          {PROFIL.age}
        </span>
        <span className="text-[15px] text-white/35">13,5 ans</span>
        <span className="text-[13px] text-white/15">13 ans</span>
      </div>

      <span className="mt-4 block rounded-full bg-brand py-3 text-center text-[13px] font-semibold text-[color:var(--color-on-brand)]">
        Suivant
      </span>
    </>
  )
}

/* ÉCRAN 2 — l'analyse. C'est le téléphone de devant : c'est le chiffre que le
   visiteur vient chercher, et la seule raison pour laquelle il répondra à
   seize questions. Grille reprise de « Last report ». */
function EcranAnalyse() {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-display text-[19px] leading-none font-medium text-white">
          Ton rapport
        </p>
        <span className="flex gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-white/8">
            <Share2 className="size-3 text-white/70" aria-hidden="true" />
          </span>
          <span className="flex size-6 items-center justify-center rounded-full bg-white/8">
            <Settings className="size-3 text-white/70" aria-hidden="true" />
          </span>
        </span>
      </div>

      {/* Les deux cartes de tête. Celle de droite en aplat de marque : c'est le
          chiffre vendu, et il doit être le seul objet coloré de l'écran. */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] bg-white/6 px-3 py-2">
          <p className="text-[9px] leading-tight text-white/45">Taille actuelle</p>
          <p className="mt-1 font-display text-[21px] leading-none font-medium whitespace-nowrap text-white">
            {PROFIL.actuelle} cm
          </p>
        </div>
        <div className="rounded-[16px] bg-brand px-3 py-2">
          <p className="text-[9px] leading-tight text-[color:var(--color-on-brand)]/80">
            Taille adulte estimée
          </p>
          <p className="mt-1 font-display text-[21px] leading-none font-medium whitespace-nowrap text-[color:var(--color-on-brand)]">
            {PROFIL.adulte} cm
          </p>
        </div>
      </div>

      {/* Leur pilule « Optimize up to 1.4 inch », au centimètre. Formulation
          positive : le produit calcule l'écart entre habitudes subies et
          habitudes tenues — on l'affichait en négatif (« te coûtent −1,8 cm »),
          c'est le même nombre, mais on vendait la perte au lieu du gain. */}
      <div className="mt-1.5 rounded-[16px] bg-white/6 py-2 text-center text-[11px] font-semibold text-white">
        Optimise jusqu’à {PROFIL.gain} 📈
      </div>

      {/* Graphe Taille/Âge à bulle. */}
      <div className="mt-1.5 rounded-[16px] bg-white/6 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/45">Taille / Âge</span>
          <span className="rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--color-on-brand)]">
            174 cm
          </span>
        </div>

        <svg viewBox="0 0 200 62" className="mt-1.5 w-full" aria-hidden="true">
          <line
            x1="100"
            y1="6"
            x2="100"
            y2="57"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <path
            d="M6 55 C 40 50, 70 36, 100 26 C 130 16, 165 10, 194 8"
            fill="none"
            stroke="var(--color-coral-pulse)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="100" cy="26" r="9" fill="var(--color-coral-pulse)" opacity="0.25" />
          <circle cx="100" cy="26" r="5" fill="#fff" />
        </svg>

        <div className="flex justify-between px-0.5 text-[7px] text-white/30">
          {[14, 15, 16, 17, 18, 19, 20, 21].map((an) => (
            <span key={an}>{an}</span>
          ))}
        </div>
      </div>

      {/* À la place de leur « Taller than 61% of your age » : la fourchette.
          Eux affichent un chiffre sec ; c'est précisément ce qu'on leur
          reproche, donc c'est la tuile qu'on ne peut pas copier. */}
      <div className="mt-1.5 rounded-[16px] bg-white/6 py-2 text-center text-[11px] font-semibold text-white">
        Fourchette : {PROFIL.basse} – {PROFIL.haute} cm 🎯
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <Tuile
          label="Croissance faite"
          valeur={`${PROFIL.croissanceFaite} %`}
          pourcent={PROFIL.croissanceFaite}
        />
        <Tuile
          label="Plan du jour"
          valeur={`${PROFIL.actionsFaites} / ${PROFIL.actionsTotal}`}
          pourcent={(PROFIL.actionsFaites / PROFIL.actionsTotal) * 100}
        />
      </div>

      <div className="mt-auto">
        <Onglets actif="analyse" />
      </div>
    </>
  )
}

function Tuile({ label, valeur, pourcent }) {
  return (
    <div className="rounded-[16px] bg-white/6 px-3 py-2">
      <p className="text-[9px] leading-tight text-white/45">{label}</p>
      <p className="mt-1 font-display text-[19px] leading-none font-medium text-white">
        {valeur}
      </p>
      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-brand" style={{ width: `${pourcent}%` }} />
      </span>
    </div>
  )
}

/* ÉCRAN 3 — ce qui est réellement facturé tous les mois. L'estimation se lit en
   trois secondes ; c'est cette liste que l'abonné rouvre chaque matin. Grille
   reprise de leur écran de série : bandeau de dates, série, progression, puis
   les actions. */
function EcranJour() {
  const jours = [3, 4, 5, 6, 7, 8]
  const actions = [
    { texte: 'Suspension à la barre 🤸', faite: true },
    { texte: 'Petit-déj protéiné 🍳', faite: true },
    { texte: 'Séance dos et hanches 🏋️', faite: false },
    { texte: 'Écrans coupés 45 min avant 🌙', faite: false },
    { texte: '2 min de marche par heure 🚶', faite: false },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-display text-[19px] leading-none font-medium text-white">
          Ton plan
        </p>
        <span className="flex size-6 items-center justify-center rounded-full bg-white/8">
          <Settings className="size-3 text-white/70" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3 flex justify-between">
        {jours.map((j) => (
          <span
            key={j}
            className={`flex w-[13%] flex-col items-center rounded-xl py-1.5 text-[9px] leading-tight ${
              j === 5
                ? 'bg-brand font-semibold text-[color:var(--color-on-brand)]'
                : 'bg-white/6 text-white/50'
            }`}
          >
            <span className="text-[11px] font-semibold">{j}</span>
            jan
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[16px] bg-white/6 px-3 py-2">
        <span className="text-[11px] font-semibold text-white">Série 🔥</span>
        <span className="rounded-lg bg-brand px-3 py-0.5 font-display text-[15px] font-medium text-[color:var(--color-on-brand)]">
          {PROFIL.serie}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] text-white/45">Progression</span>
          <span className="text-[10px] font-semibold text-white">
            {PROFIL.actionsFaites} / {PROFIL.actionsTotal}
          </span>
        </div>
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${(PROFIL.actionsFaites / PROFIL.actionsTotal) * 100}%` }}
          />
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {actions.map(({ texte, faite }) => (
          <li
            key={texte}
            className="flex items-center gap-2 rounded-[14px] bg-white/6 px-3 py-2.5 text-[10px] leading-tight"
          >
            <span
              className={`flex size-3.5 shrink-0 items-center justify-center rounded-[4px] text-[8px] font-bold ${
                faite
                  ? 'bg-brand text-[color:var(--color-on-brand)]'
                  : 'border border-white/20'
              }`}
              aria-hidden="true"
            >
              {faite ? '✓' : ''}
            </span>
            <span className={faite ? 'text-white/40 line-through' : 'text-white'}>{texte}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Onglets actif="jour" />
      </div>
    </>
  )
}

/**
 * Composition : trois téléphones qui se chevauchent, celui du milieu devant.
 *
 * Sous `lg`, un seul est rendu. Trois coques sur 375 px de large donneraient
 * des écrans de 110 px : illisibles, donc décoratifs, donc inutiles — et c'est
 * sur mobile que la page est lue.
 */
export function HeroPhones() {
  return (
    /* Centré, jamais aligné à droite : la colonne du hero fait cinq douzièmes
       et le téléphone de droite débordait du gabarit, coupé net par le bord de
       l'écran sur les portables autour de 1100 px. */
    <div className="flex items-center justify-center">
      {/* Les coques latérales sont RÉDUITES, pas rétrécies : même largeur que
          celle du milieu, puis `scale`. Dessinées plus étroites, leurs titres
          passaient à la ligne et les compteurs se coupaient — un écran de
          téléphone n'a pas une typographie différente parce qu'il est au second
          plan. Les marges négatives rattrapent la place que la boîte de mise en
          page occupe encore après la réduction. */}
      <div
        className="hidden origin-right -rotate-[7deg] scale-[0.78] xl:block"
        style={{ marginLeft: '-50px', marginRight: '-34px' }}
      >
        <Coque className="aspect-[9/20] w-[232px]">
          <EcranQuestion />
        </Coque>
      </div>

      <Coque className="relative z-10 aspect-[9/20] w-[232px] sm:w-[258px]">
        <EcranAnalyse />
      </Coque>

      <div
        className="hidden origin-left rotate-[7deg] scale-[0.78] lg:block"
        style={{ marginLeft: '-34px', marginRight: '-50px' }}
      >
        <Coque className="aspect-[9/20] w-[232px]">
          <EcranJour />
        </Coque>
      </div>
    </div>
  )
}

export default HeroPhones
