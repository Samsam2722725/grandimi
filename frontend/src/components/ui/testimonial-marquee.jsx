/* Icônes Lucide, comme partout ailleurs sur le site.
   Ces quatre entrées portaient des emoji (📊 📈 🔬 📉). Un emoji est rendu
   par la police système : il change de dessin, de graisse et de couleur
   entre iOS, Android et Windows, et ne peut pas prendre la couleur de
   marque. Posé à côté de composants Lucide, il signe le patchwork. */
import { ArrowLeftRight, BookOpenCheck, Ruler, TrendingUp } from 'lucide-react'

/* Sources scientifiques vérifiables : le fondement du positionnement.
   Pas d'avis fictifs, mais la preuve que ça marche.

   Ces libellés doivent décrire le calcul RÉELLEMENT effectué par
   internal/estimator/v2_enhanced.go — c'est-à-dire Khamis-Roche moyenné
   avec le suivi de percentile OMS, puis modulé par les facteurs de mode
   de vie.

   Ce fichier a déjà annoncé deux méthodes que le serveur n'appliquait
   pas : « modèle ML-Enhanced » (il n'y a aucun apprentissage automatique
   nulle part), puis la méthode mi-parentale, restée affichée après son
   remplacement. Sur un produit dont l'argument est l'honnêteté, et
   destiné à des mineurs, annoncer une méthode qu'on n'applique pas est
   le pire endroit où mentir : ces libellés se relisent à chaque fois que
   le moteur change. */
const SOURCES_CREDIBILITE = [
  {
    titre: 'Méthode Khamis-Roche (1994)',
    description: 'Taille adulte prédite sans radiographie, depuis la taille, le poids et celle des parents',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/?term=khamis+roche+adult+height+prediction',
    Icone: Ruler,
  },
  {
    titre: 'Courbes de croissance OMS',
    description: 'Taille pour âge de 5 à 19 ans : le couloir de croissance que suit le calcul',
    lien: 'https://www.who.int/tools/growth-reference-data-for-5to19-years',
    Icone: TrendingUp,
  },
  {
    titre: 'Facteurs de croissance (nutrition, sommeil, exercice)',
    description: 'Revue systématique : Arch Dis Child Fetal Neonatal Ed',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/?term=child+growth+factors+systematic+review',
    Icone: BookOpenCheck,
  },
  {
    titre: 'Marge d\'erreur affichée',
    description: '±4 à 8 cm selon l\'âge : l\'incertitude réelle de la méthode, jamais masquée',
    /* Une flèche à deux têtes dit l'intervalle. L'emoji précédent (📉)
       montrait une courbe qui chute, ce qui décrit une baisse, pas une
       marge d'erreur. */
    lien: 'https://pubmed.ncbi.nlm.nih.gov/?term=adult+height+prediction+accuracy',
    Icone: ArrowLeftRight,
  },
]

/* CarteAvis, TEINTES et initiales() ont été retirés ici : ils
   construisaient la carte d'un témoignage (nom, initiales, pastille de
   couleur), forme abandonnée avec les faux avis. Ils n'étaient plus
   appelés, mais restaient lus comme la preuve qu'un carrousel d'avis
   existe encore quelque part. */

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
        {SOURCES_CREDIBILITE.map(({ titre, description, lien, Icone }) => (
          <a
            key={titre}
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border border-[color:var(--color-frost-gray)] bg-card p-4 hover:border-[color:var(--color-primary)] transition-colors"
          >
            <div className="flex flex-col gap-2">
              <Icone
                className="size-6 text-[color:var(--color-primary)]"
                aria-hidden="true"
              />
              <h3 className="font-semibold text-sm text-ink group-hover:text-[color:var(--color-primary)] transition-colors">
                {titre}
              </h3>
              <p className="text-xs text-muted-foreground leading-snug">
                {description}
              </p>
              {/* Le libellé nomme la destination réelle. Les quatre cartes
                  annonçaient « Lire sur PubMed », or l'une d'elles ouvre
                  l'OMS : sur une section dont l'argument est la
                  vérifiabilité, dire où mène le lien est le minimum. */}
              <span className="text-xs text-[color:var(--color-primary)] font-medium group-hover:underline">
                Lire sur {lien.includes('who.int') ? 'who.int' : 'PubMed'} →
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Note transparence */}
      <div className="mt-4 text-center text-xs text-muted-foreground max-w-2xl">
        {/* Le lien « Voir nos références complètes » pointait sur href="#",
            c'est-à-dire nulle part, dans la phrase même qui promet des
            sources vérifiables. Il n'existe pas de page de références à
            lui donner : la phrase se termine sur les quatre sources
            ci-dessus, qui sont les références complètes. */}
        <p>
          Nous n'avons pas encore d'avis clients vérifiés. Mais chaque affirmation de ce
          site s'appuie sur une étude scientifique, et les voici toutes les quatre.
        </p>
      </div>
    </div>
  )
}
