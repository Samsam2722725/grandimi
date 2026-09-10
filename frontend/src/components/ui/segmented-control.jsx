import { cn } from '@/lib/utils'

/**
 * Bascule à deux ou trois positions (métrique/impérial, garçon/fille…).
 *
 * C'est un `radiogroup`, pas une suite de boutons : les options sont
 * mutuellement exclusives, et un lecteur d'écran doit annoncer « 1 sur 2 »
 * plutôt que de lire deux boutons sans lien. Les flèches déplacent la
 * sélection, comme dans un groupe radio natif.
 */
export function SegmentedControl({ options, value, onChange, label, className }) {
  const index = options.findIndex((option) => option.value === value)

  const handleKeyDown = (event) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].value)
  }

  return (
    <div
      className={cn('segmented', className)}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            /* Un seul segment reste dans l'ordre de tabulation : c'est la
               convention d'un groupe radio, la navigation interne se fait aux
               flèches. Sinon Tab traverse chaque option une par une. */
            tabIndex={selected || index === -1 ? 0 : -1}
            className={cn('segmented-option', selected && 'is-selected')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
