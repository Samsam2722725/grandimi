import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Cadre commun à tous les écrans du questionnaire.
 *
 * Trois éléments ne bougent jamais d'un écran à l'autre : le retour, la barre
 * de progression, et le bouton d'action collé en bas. Cette stabilité est ce
 * qui rend un tunnel de 11 écrans plus court à parcourir qu'un formulaire de
 * 5 pages : l'œil n'a plus rien à chercher, le pouce reste au même endroit.
 *
 * La zone de contenu défile seule. Le CTA reste visible même clavier ouvert,
 * ce qui évite le classique « je ne trouve pas le bouton » sur petit écran.
 */
export function FunnelShell({
  onBack,
  progress = 0,
  title,
  subtitle,
  children,
  footer,
  className,
  /* Identité de l'écran courant, utilisée uniquement comme `key` pour
     rejouer l'animation d'entrée à chaque changement de question. Le
     header (retour, barre de progression) reste hors de ce `key` : lui
     seul ne doit jamais se démonter, sinon la barre de progression saute
     au lieu de glisser d'une largeur à l'autre. */
  stepKey,
  /* Quand il est fourni, « Ignorer » remplace la reserve de droite.

     Ce n'est pas un ornement sur un tunnel de trente-deux ecrans : une
     question facultative dont on ne voit pas qu'elle l'est se lit comme
     un mur. Le libelle le dit donc a l'endroit ou l'oeil cherche une
     sortie — en haut a droite, comme chez Flo — plutot que dans une
     note sous le bouton, que personne ne lit avant d'avoir deja
     hesite. */
  onSkip,
}) {
  return (
    <div className={cn('funnel', className)}>
      <header className="funnel-header">
        <button
          type="button"
          className="funnel-back"
          onClick={onBack}
          aria-label="Revenir à l’écran précédent"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>

        <div
          className="funnel-progress"
          role="progressbar"
          aria-label="Progression du questionnaire"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="funnel-progress-fill"
            style={{ width: `${Math.max(4, Math.min(100, progress * 100))}%` }}
          />
        </div>

        {onSkip ? (
          <button type="button" className="funnel-skip" onClick={onSkip}>
            Ignorer
          </button>
        ) : (
          /* Place réservée au futur sélecteur de langue, pour que le titre
             reste optiquement centré entre deux masses égales. */
          <span className="funnel-header-spacer" aria-hidden="true" />
        )}
      </header>

      <main className="funnel-body">
        <div className="funnel-step" key={stepKey}>
          {title && <h1 className="funnel-title">{title}</h1>}
          {subtitle && <p className="funnel-subtitle">{subtitle}</p>}
          <div className="funnel-content">{children}</div>
        </div>
      </main>

      {footer && <footer className="funnel-footer">{footer}</footer>}
    </div>
  )
}

/**
 * Bouton d'action unique du tunnel. Toujours au même endroit, toujours pleine
 * largeur : il n'y a jamais deux actions concurrentes en bas d'écran.
 */
export function FunnelButton({ children, disabled, onClick, type = 'button' }) {
  return (
    <button type={type} className="funnel-cta" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

export default FunnelShell
