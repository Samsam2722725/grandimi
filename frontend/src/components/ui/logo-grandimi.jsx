/**
 * Marque Grandimi.
 *
 * Deux silhouettes, et tout l'argument du produit tient dedans : la petite est
 * DESSINÉE AU TRAIT — un contour, quelque chose qui n'est pas encore rempli —
 * la grande est pleine. C'est exactement ce que vend le site : où tu en es,
 * où tu peux aller. Le point blanc dans la petite tête est la seule respiration
 * du dessin, et il fait lire la forme comme une personne plutôt que comme un
 * pictogramme de signalétique.
 *
 * La grande silhouette est aussi le « i » de Grandimi, point compris.
 *
 * Redessinée en géométrie pure plutôt qu'importée en PNG : le logo sert de
 * favicon, d'en-tête et de vignette de partage, donc à toutes les tailles de
 * 16 px à 512 px. Un tracé reste net partout et pèse moins qu'une image.
 *
 * `couleur` par défaut sur currentColor : la marque s'encre dans la couleur de
 * son contexte (encre sombre sur l'orange, blanc sur fond noir) sans qu'on ait
 * à maintenir une variante par surface.
 */
export function LogoGrandimi({ className, couleur = 'currentColor', titre }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={titre ? 'img' : 'presentation'}
      aria-label={titre || undefined}
      aria-hidden={titre ? undefined : 'true'}
      fill="none"
    >
      {/* --- Petite silhouette, au trait --- */}
      {/* La tête est un anneau : un cercle plein au trait de 6, dont le vide
          central laisse voir le fond. Le « point blanc » du logo n'est donc
          pas une pièce en plus, c'est le trou de l'anneau — il prend la
          couleur de ce qu'il y a derrière, orange comme noir. */}
      <circle cx="30.5" cy="46" r="11.5" stroke={couleur} strokeWidth="6" />
      <rect
        x="19"
        y="61"
        width="23"
        height="34"
        rx="11.5"
        stroke={couleur}
        strokeWidth="6"
      />

      {/* --- Grande silhouette, pleine --- */}
      <circle cx="69.5" cy="22" r="13.5" fill={couleur} />
      <rect x="56" y="40" width="27" height="55" rx="13.5" fill={couleur} />
    </svg>
  )
}

export default LogoGrandimi
