import { cn } from '@/lib/utils'

/**
 * Grande cible de choix : un tap, une réponse, pas de bouton « Suivant ».
 *
 * Sur les questions à réponse unique, faire avancer l'écran au tap supprime
 * une action sur deux. Le CTA du bas reste présent mais grisé — il sert de
 * repère visuel constant, pas de passage obligé.
 */
export function ChoiceCard({
  selected,
  onSelect,
  icon,
  title,
  hint,
  /* `radio` quand la carte fait partie d'un groupe exclusif, `checkbox`
     quand elle bascule seule (« Je ne sais pas »). Un radio isolé s'annonce
     « 1 sur 1 » au lecteur d'écran, ce qui ne veut rien dire. */
  role = 'radio',
  className,
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={cn('choice-card', selected && 'is-selected', className)}
    >
      {icon && (
        <span className="choice-card-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="choice-card-text">
        <span className="choice-card-title">{title}</span>
        {hint && <span className="choice-card-hint">{hint}</span>}
      </span>
      <span className="choice-card-radio" aria-hidden="true" />
    </button>
  )
}

export default ChoiceCard
