import { cn } from '@/lib/utils'

/**
 * Défilement infini. Le contenu est dupliqué `repeat` fois pour
 * que la boucle ne laisse jamais de trou en bout de piste.
 *
 * Réglages via classes utilitaires sur le parent :
 *   [--duration:20s]  vitesse
 *   [--gap:2rem]      espace entre les cartes
 */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}) {
  return (
    <div
      {...props}
      className={cn(
        'group flex overflow-hidden p-2 [--duration:34s] [--gap:1rem] [gap:var(--gap)]',
        vertical ? 'flex-col' : 'flex-row',
        className,
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn('flex shrink-0 justify-around [gap:var(--gap)]', {
            'animate-marquee flex-row': !vertical,
            'animate-marquee-vertical flex-col': vertical,
            'group-hover:[animation-play-state:paused]': pauseOnHover,
            '[animation-direction:reverse]': reverse,
          })}
          /* Les copies au-delà de la première ne sont là que pour
             remplir la piste : on les cache aux lecteurs d'écran. */
          aria-hidden={i > 0 ? 'true' : undefined}
        >
          {children}
        </div>
      ))}
    </div>
  )
}

export default Marquee
