import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Fusionne des classes Tailwind en résolvant les conflits.
 * `cn('p-2', 'p-4')` → `'p-4'` (le dernier gagne), ce que
 * `clsx` seul ne fait pas.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
