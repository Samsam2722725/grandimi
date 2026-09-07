# Charte visuelle Grandimi

> « forest-green clinic with pastel rooms » — système repris de la référence Turn.io.

Source de vérité : `frontend/src/styles/design-system-v2.css`. Si ce document et le CSS
divergent, le CSS a raison — corrigez ce fichier.

**Principe** : la profondeur ne vient jamais d'une ombre, mais d'un changement de surface.
Les sections s'enchaînent comme des pièces colorées : vert canopée → blanc → lavande →
pastel → vert canopée.

---

## Les trois règles dures

1. **Une seule police.** DM Sans, du caption 12px au display 116px. Jamais de seconde famille.
   Un mot mis en avant se colore (`.hl`), il ne change pas de police.
2. **Aucune ombre d'élévation.** `box-shadow` n'est autorisé que sur les champs de
   formulaire (`--shadow-subtle`). La hiérarchie passe par la couleur de surface.
3. **Le corail est réservé aux actions principales.** `#ff643b` n'est jamais décoratif,
   et il est toujours accompagné d'un bouton ghost à côté (`.btn-group`).

---

## Couleurs

**Marque**

| Rôle | Token | Valeur |
|---|---|---|
| Surface de marque, bandes sombres, titres | `--color-canopy-green` | `#0a3922` |
| Action principale (uniquement) | `--color-coral-pulse` | `#ff643b` |
| Sections violettes, focus | `--color-indigo-bloom` | `#460095` |
| Mot surligné dans un titre | `--color-leaf-bright` | `#1dbf73` |
| Accent bleu (jamais promu en CTA) | `--color-deep-teal` | `#003642` |

**Canvas et pastels** — rotation des cartes, dans cet ordre :

`--color-lavender-mist #eee2ff` (fond de page) · `--color-mint-wash #d2f2e3` ·
`--color-sage-wash #e4f7ee` · `--color-sky-wash #ccf0f8` · `--color-cream #faf7e8` ·
`--color-lilac-wash #fdf0ff` · `--color-peach-wash #ffede8`

Une carte de fonctionnalité n'est jamais blanche ni grise.

**Neutres** : `#000000` texte, `#3d3d3d` secondaire, `#7a7a7a` méta, `#e0e0e0` filets,
`#a6a6a6` bordures moyennes, `#ffffff` cartes produit.

**Interdits** : `#000000` en aplat sur vert canopée ou lavande. Deux accents vifs dans
le même écran. Texte courant sous 14px.

---

## Typographie — DM Sans, `font-feature-settings: "ss03"`

| Rôle | Taille | Interligne | Approche |
|---|---|---|---|
| `--text-display-xl` | 116px | 0.89 | -0.028em |
| `--text-display` | 72px | 1.05 | -0.028em |
| `--text-heading-lg` | 48px | 1.14 | -0.019em |
| `--text-heading` | 32px | 1.20 | -0.019em |
| `--text-heading-sm` | 24px | 1.30 | — |
| `--text-subheading` | 20px | 1.33 | — |
| `--text-body-lg` | 18px | 1.40 | — |
| `--text-body` | 16px | 1.38 | — |
| `--text-body-sm` | 14px | 1.38 | — |
| `--text-caption` | 12px | 1.20 | — |

Poids 400 / 500 / 600 / 700. Les display descendent à 40px sous 700px de large.

---

## Formes et espacements

Base **4px** : 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 120.

| Élément | Rayon |
|---|---|
| Boutons | 40px (`--radius-buttons`) |
| Cartes | 24px (`--radius-cards`) |
| Cartes produit, alertes | 16px (`--radius-cards-sm`) |
| Puces, badges | 9999px (`--radius-tags`) |
| Icônes | 8px (`--radius-icons`) |

Jamais d'angle vif (0–2px) sur une carte ou un bouton.

Mise en page : largeur max **1280px**, écart de section **64–80px**, padding de carte **24–32px**.

---

## Composants

| Classe | Rôle |
|---|---|
| `.btn-primary` | Corail plein, blanc 16px/600, pilule. Action principale uniquement. |
| `.btn-secondary` | Ghost, bordure 1px. Jumeau systématique du corail. Passe en blanc sur bande sombre. |
| `.btn-nav` | Version réduite pour la barre de navigation blanche. |
| `.btn-group` | Conteneur du couple corail + ghost. |
| `.band-dark` / `.cta-band` | Bande vert canopée pleine largeur. |
| `.card-pastel` + `.pastel-*` | Carte de fonctionnalité teintée. |
| `.hl` / `.hl-indigo` | Mot surligné dans un titre. |
| `.badge`, `.tag-chip` | Puce arrondie. |

**Zones tactiles** : 44 × 44 px minimum partout.

**Chargement** : une seule icône, `components/Spinner.jsx`. `<Spinner />` en ligne dans un
bouton, `<Spinner size="page" label="…" />` en plein écran. Ne pas en créer d'autre.

---

## Accessibilité

- Focus visible : `2px solid var(--color-indigo-bloom)`, offset 2px. Jamais supprimé.
- Les alertes portent toujours une icône **et** un mot repère (« Important : ») en plus
  de la couleur.
- `prefers-reduced-motion: reduce` neutralise animations, transitions et défilement fluide.
- Un seul `h1` par page, hiérarchie respectée.

**Limite connue** : blanc sur corail `#ff643b` donne un contraste de **2,94:1**, sous le
seuil WCAG AA de 4,5:1 pour le texte courant. C'est le comportement de la référence.
Pour être conforme, il faudrait descendre le corail à `#c43a15` (4,8:1), ce qui change
la tonalité de la marque. Décision produit à prendre.
