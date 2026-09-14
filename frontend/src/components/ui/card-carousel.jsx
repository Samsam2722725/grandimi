import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectCoverflow, Pagination } from 'swiper/modules'

import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'

/**
 * Carrousel de cartes en coverflow : la carte centrale est de face, les
 * voisines reculent en perspective, et le rail avance tout seul.
 *
 * Porté du composant fourni. Ce qui est conservé : Swiper avec les modules
 * EffectCoverflow, Autoplay et Pagination, `centeredSlides`, `loop`,
 * `slidesPerView: 'auto'`, les réglages de coverflow (rotate 0, stretch 0,
 * depth 100, modifier 2.5) et la neutralisation des ombres latérales 3D.
 *
 * CE QUI CHANGE, ET POURQUOI :
 *
 * 1. JSX et non TSX, `<img>` et non `next/image` — ce projet est en Vite, pas
 *    en Next. Les images sont servies depuis `public/`, donc par une balise
 *    ordinaire.
 *
 * 2. Le cadre de démonstration disparaît : badge « Latest component », titre
 *    « Card Carousel », sous-titre « Seamless images carousel animation », et
 *    les deux cartouches blancs qui les entourent. C'est l'habillage de la
 *    page de démo du composant, pas le composant.
 *
 * 3. Les diapositives ne sont PAS dupliquées. L'original rend deux fois la
 *    même liste — un contournement pour que `loop` ait assez de vues quand il
 *    y a peu d'images. Swiper sait le faire seul via `loopAddBlankSlides`, et
 *    la duplication manuelle double le nombre de pastilles de pagination : on
 *    voyait six points pour trois images.
 *
 * 4. La navigation par flèches est retirée. L'original les câble sur
 *    `.swiper-button-next` / `.swiper-button-prev`, deux éléments que sa
 *    propre démo ne rend jamais — la configuration pointait dans le vide.
 *    Restent l'avance automatique, le glissement au doigt et les pastilles.
 *
 * Les trois visuels sont les vrais supports de la marque, convertis en WebP :
 * 6,2 Mo de PNG seraient une page de paiement inutilisable en 4G.
 */

const CSS = `
  .offre-swiper { width: 100%; padding-bottom: 42px; }
  .offre-swiper .swiper-slide { width: 264px; background-position: center; background-size: cover; }
  .offre-swiper .swiper-slide img { display: block; width: 100%; height: auto; border-radius: 16px; }
  /* Les dégradés d'ombre latérale de Swiper sont pensés pour un fond clair ;
     sur le noir du tunnel ils posent un voile gris sur les cartes voisines. */
  .offre-swiper.swiper-3d .swiper-slide-shadow-left,
  .offre-swiper.swiper-3d .swiper-slide-shadow-right { background-image: none; background: none; }
  .offre-swiper .swiper-pagination-bullet { background: var(--funnel-muted, #9a9a9a); opacity: 0.45; }
  .offre-swiper .swiper-pagination-bullet-active { background: var(--funnel-accent, #ff5a1f); opacity: 1; }
`

export function CardCarousel({ images, autoplayDelay = 2600, showPagination = true }) {
  return (
    <section className="offre-carousel-cadre">
      <style>{CSS}</style>
      <Swiper
        className="offre-swiper"
        spaceBetween={40}
        autoplay={{ delay: autoplayDelay, disableOnInteraction: false }}
        effect="coverflow"
        grabCursor
        centeredSlides
        loop
        slidesPerView="auto"
        coverflowEffect={{ rotate: 0, stretch: 0, depth: 100, modifier: 2.5 }}
        pagination={showPagination ? { clickable: true } : false}
        modules={[EffectCoverflow, Autoplay, Pagination]}
      >
        {images.map((image) => (
          <SwiperSlide key={image.src}>
            {/* Chargement EMPRESSÉ, pas différé. Swiper place ses vues par
                `transform`, et une diapositive posée hors du cadre visible
                laisse le navigateur repousser un chargement paresseux —
                l'utilisateur voit alors trois rectangles vides à l'endroit
                précis où on lui montre ce qu'il achète. Trois fichiers de
                25 à 54 ko : il n'y a rien à économiser ici. */}
            <img src={image.src} alt={image.alt} width="760" height="608" />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

export default CardCarousel
