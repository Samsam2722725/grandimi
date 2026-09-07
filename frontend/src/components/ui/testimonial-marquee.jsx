import { Card, CardContent } from '@/components/ui/card'
import { Marquee } from '@/components/ui/marquee'

/* ⚠️ DONNÉES FICTIVES — PLACEHOLDER
   Ces avis sont inventés pour maquetter la page. Ils ne doivent
   PAS partir en production tels quels : publier de faux avis
   clients est trompeur (et illisible côté DGCCRF / avis vérifiés).
   À remplacer par de vrais retours utilisateurs avec accord écrit
   avant la mise en ligne. */
const AVIS_FICTIFS = [
  {
    nom: 'Lucas M.',
    meta: '15 ans',
    corps:
      "J'ai testé par curiosité et l'estimation était super claire. Ce que j'ai préféré c'est qu'on m'explique la marge d'erreur au lieu de me vendre du rêve.",
    teinte: 'peach',
  },
  {
    nom: 'Sarah B.',
    meta: 'maman de Théo, 13 ans',
    corps:
      "Théo était obsédé par sa taille. Voir une fourchette expliquée, avec les sources, l'a beaucoup rassuré. On a surtout retenu la partie sommeil.",
    teinte: 'cream',
  },
  {
    nom: 'Yanis K.',
    meta: '16 ans',
    corps:
      'Le plan sur 12 mois est concret : des trucs faisables, pas des compléments à acheter. Le rappel du soir est devenu une habitude.',
    teinte: 'sand',
  },
  {
    nom: 'Inès D.',
    meta: '14 ans',
    corps:
      "Estimation gratuite avant de payer, c'est ce qui m'a convaincue. J'ai vu le résultat, après j'ai choisi.",
    teinte: 'peach',
  },
  {
    nom: 'Mehdi T.',
    meta: 'papa de Nour, 12 ans',
    corps:
      "Enfin un site qui écrit noir sur blanc que ça reste une estimation. Le ton est honnête, ça change des applis qui promettent +10 cm.",
    teinte: 'cream',
  },
  {
    nom: 'Camille R.',
    meta: '17 ans',
    corps:
      "Je pensais avoir fini ma croissance, le questionnaire m'a expliqué pourquoi ce n'était pas si simple. Les explications sont vraiment lisibles.",
    teinte: 'sand',
  },
  {
    nom: 'Noah P.',
    meta: '13 ans',
    corps:
      "5 minutes de questions et j'avais mon résultat. La partie nutrition est adaptée à ce que je mange vraiment, pas à un régime de sportif pro.",
    teinte: 'peach',
  },
  {
    nom: 'Léa F.',
    meta: 'maman de Jade, 15 ans',
    corps:
      "On a comparé avec la courbe du pédiatre : c'est cohérent. Jade suit son plan sans que j'aie à lui rappeler.",
    teinte: 'cream',
  },
]

const TEINTES = {
  peach: 'bg-[var(--color-peach-wash)]',
  cream: 'bg-[var(--color-cream)]',
  sand: 'bg-[var(--color-sand)]',
}

function initiales(nom) {
  return nom
    .split(' ')
    .map((mot) => mot[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function CarteAvis({ nom, meta, corps, teinte }) {
  return (
    <Card className="h-full w-[300px] shrink-0 border-[color:var(--color-frost-gray)] bg-card p-5 sm:w-[340px]">
      <CardContent className="flex h-full flex-col gap-4 p-0">
        <p className="text-[15px] leading-[1.5] text-[color:var(--text-secondary)]">
          {corps}
        </p>

        <div className="mt-auto flex flex-row items-center gap-3 pt-1">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-ink ${TEINTES[teinte]}`}
            aria-hidden="true"
          >
            {initiales(nom)}
          </span>
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-ink">{nom}</p>
            <p className="text-xs text-muted-foreground">{meta}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TestimonialMarquee() {
  const rangeeHaute = AVIS_FICTIFS.slice(0, AVIS_FICTIFS.length / 2)
  const rangeeBasse = AVIS_FICTIFS.slice(AVIS_FICTIFS.length / 2)

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden">
      <Marquee pauseOnHover className="[--duration:42s] [--gap:1rem]">
        {rangeeHaute.map((avis) => (
          <CarteAvis key={avis.nom} {...avis} />
        ))}
      </Marquee>

      <Marquee reverse pauseOnHover className="[--duration:48s] [--gap:1rem]">
        {rangeeBasse.map((avis) => (
          <CarteAvis key={avis.nom} {...avis} />
        ))}
      </Marquee>

      {/* Fondus latéraux : la piste doit sembler infinie, pas coupée. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--surface-page-canvas)] to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--surface-page-canvas)] to-transparent sm:w-40" />
    </div>
  )
}
