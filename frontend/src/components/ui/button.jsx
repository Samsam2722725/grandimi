import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Aligné sur les boutons pilule du design system :
 * rayon 40px, pas d'ombre, orange réservé à `default`.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary font-semibold text-primary-foreground hover:bg-[#e84a12]',
        outline: 'border border-ink text-ink hover:bg-ink/6',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'text-ink hover:bg-ink/6',
        link: 'text-brand-deep underline-offset-4 hover:underline',
      },
      /* Plancher à 44px partout : c'est la cible tactile minimale
         recommandée. `sm` se distingue par son padding et sa taille de
         texte, pas par une hauteur inférieure — un bouton de 36px est
         difficile à viser au pouce, et on est mobile-first. */
      size: {
        default: 'min-h-11 px-6 py-3',
        sm: 'min-h-11 px-4 py-2 text-sm',
        lg: 'min-h-13 px-8 py-4',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
