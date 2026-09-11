import { Card, CardContent } from '@/components/ui/card'
import { Marquee } from '@/components/ui/marquee'

/* Sources scientifiques vérifiables : le fondement du positionnement.
   Pas d'avis fictifs, mais la preuve que ça marche.

   Ces libellés doivent décrire le calcul RÉELLEMENT effectué par
   internal/estimator/v2_enhanced.go — c'est-à-dire la méthode
   mi-parentale de Tanner, modulée par les facteurs de mode de vie.
   Les versions précédentes annonçaient « Algorithme Khamis-Roche V2 »
   et « modèle ML-Enhanced » : le serveur ne fait ni l'un ni l'autre
   (aucun apprentissage automatique nulle part, et la sortie
   Khamis-Roche est calculée puis jetée). Sur un produit dont l'argument
   est l'honnêteté, et destiné à des mineurs, annoncer une méthode qu'on
   n'applique pas est le pire endroit où mentir. */
const SOURCES_CREDIBILITE = [
  {
    titre: 'Méthode mi-parentale (Tanner)',
    description: 'Taille cible calculée depuis celle des deux parents — référence en pédiatrie',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/?term=mid-parental+height+target',
    icone: '📊',
  },
  {
    titre: 'Données Tanner et Whitehouse',
    description: 'Études longitudinales de croissance publiées par l\'Endocrine Society',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/?term=tanner+whitehouse+height',
    icone: '📈',
  },
  {
    titre: 'Facteurs de croissance (nutrition, sommeil, exercice)',
    description: 'Revue systématique : Arch Dis Child Fetal Neonatal Ed',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/?term=child+growth+factors+systematic+review',
    icone: '🔬',
  },
  {
    titre: 'Marge d\'erreur affichée',
    description: '±3 à 6 cm selon l\'âge : l\'incertitude réelle de la méthode, jamais masquée',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/?term=adult+height+prediction+accuracy',
    icone: '📉',
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
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6">
      {/* Titre de section */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-semibold text-ink mb-2">Nos sources</h2>
        <p className="text-muted-foreground">
          Pas d'avis fictifs. Juste la science qui marche.
        </p>
      </div>

      {/* Grille de sources */}
      <div className="grid grid-cols-1 gap-4 w-full max-w-2xl sm:grid-cols-2">
        {SOURCES_CREDIBILITE.map((source) => (
          <a
            key={source.titre}
            href={source.lien}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border border-[color:var(--color-frost-gray)] bg-card p-4 hover:border-[color:var(--color-primary)] transition-colors"
          >
            <div className="flex flex-col gap-2">
              <div className="text-3xl">{source.icone}</div>
              <h3 className="font-semibold text-sm text-ink group-hover:text-[color:var(--color-primary)] transition-colors">
                {source.titre}
              </h3>
              <p className="text-xs text-muted-foreground leading-snug">
                {source.description}
              </p>
              <span className="text-xs text-[color:var(--color-primary)] font-medium group-hover:underline">
                Lire sur PubMed →
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Note transparence */}
      <div className="mt-4 text-center text-xs text-muted-foreground max-w-2xl">
        <p>
          Nous n'avons pas encore d'avis clients vérifiés. Mais chaque affirmation de ce site s'appuie sur
          une étude scientifique. <a href="#" className="underline text-[color:var(--color-primary)]">Voir nos références complètes</a>.
        </p>
      </div>
    </div>
  )
}
