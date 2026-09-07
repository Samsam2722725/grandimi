import { AnimatePresence, motion } from 'framer-motion'
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

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
          >
            <p className="px-6 pt-1 pb-5 text-[15px] leading-relaxed text-muted-foreground">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export { FaqSection }
export default FaqSection
