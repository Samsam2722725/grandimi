import { motion } from 'framer-motion'
import { ChevronDown, Mail } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FaqSection = React.forwardRef(
  ({ className, title, description, items, contactInfo, ...props }, ref) => (
    <section ref={ref} className={cn('w-full py-20', className)} {...props}>
      <div className="mx-auto w-full max-w-3xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <h2 className="mb-3 font-display text-[clamp(30px,5vw,44px)] leading-[1.1] font-medium tracking-[-0.02em] text-ink">
            {title}
          </h2>
          {description && <p className="text-base text-muted-foreground">{description}</p>}
        </motion.div>

        <div className="mx-auto max-w-2xl space-y-2">
          {items.map((item, index) => (
            <FaqItem key={item.question} {...item} index={index} />
          ))}
        </div>

        {contactInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mx-auto mt-12 max-w-md rounded-[20px] bg-[color:var(--color-cream)] p-8 text-center"
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-[color:var(--color-peach-wash)] p-2.5">
              <Mail className="size-4 text-ink" aria-hidden="true" />
            </div>
            <p className="mb-1 text-base font-semibold text-ink">{contactInfo.title}</p>
            <p className="mb-5 text-sm text-muted-foreground">{contactInfo.description}</p>
            <Button size="sm" onClick={contactInfo.onContact}>
              {contactInfo.buttonText}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  ),
)
FaqSection.displayName = 'FaqSection'

const FaqItem = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const panelId = React.useId()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className={cn(
        'overflow-hidden rounded-[16px] border transition-colors duration-200',
        isOpen
          ? 'border-[color:var(--color-ash)] bg-[color:var(--surface-card)]'
          : 'border-[color:var(--color-frost-gray)] hover:bg-[color:var(--color-cloud-gray)]',
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <span
          className={cn(
            'text-base font-medium transition-colors duration-200',
            isOpen ? 'text-ink' : 'text-[color:var(--text-secondary)]',
          )}
        >
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'shrink-0 rounded-full p-0.5',
            isOpen ? 'text-brand' : 'text-muted-foreground',
          )}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </motion.span>
      </button>

      {/* La réponse est TOUJOURS rendue, repliée par la hauteur.

          Elle vivait auparavant dans `{isOpen && ...}` : fermée, le <p>
          n'existait pas dans le document. Or ces réponses sont le seul vrai
          contenu rédigé du site — la méthode, la marge d'erreur, l'âge utile —
          et le site n'a qu'une page. Elles n'étaient donc indexables nulle
          part : un moteur qui ne clique pas ne voyait que sept titres de
          questions suivis de rien.

          Le repli se fait en CSS pur, par `grid-template-rows` de `0fr` à
          `1fr`, plutôt que par une hauteur animée en JavaScript. Garder le
          panneau monté en permanence obligeait sinon à animer vers
          `height: 'auto'`, ce qui suppose de mesurer le contenu à chaque
          ouverture ; la piste de grille se dimensionne toute seule. Rien à
          mesurer, rien qui puisse échouer. La durée et la courbe sont celles
          d'avant.

          Le `overflow: hidden` vit sur l'enfant, pas sur la piste de grille :
          c'est lui qui rogne le texte pendant que la rangée se referme.

          `inert` quand c'est fermé — même motif que la barre d'action mobile
          de l'accueil : le texte replié ne doit être ni tabulable ni annoncé
          par un lecteur d'écran, alors qu'il reste lisible par un robot
          d'indexation, qui ignore cet attribut. */}
      <div
        id={panelId}
        inert={!isOpen}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200',
          isOpen ? 'grid-rows-[1fr] opacity-100 ease-out' : 'grid-rows-[0fr] opacity-0 ease-in',
        )}
      >
        <div className="overflow-hidden">
          <p className="px-6 pt-1 pb-5 text-[15px] leading-relaxed text-muted-foreground">
            {answer}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export { FaqSection }
export default FaqSection
