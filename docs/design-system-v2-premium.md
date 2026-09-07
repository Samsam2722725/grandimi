# 🎨 GRANDIMI — DESIGN SYSTEM V2 (PREMIUM)

**Version :** 2.0 Premium Edition  
**Inspiration :** Vercel, Framer, Stripe, Apple  
**Style :** Modern, luxe, minimaliste, sophistiqué

---

## 🎯 PHILOSOPHIE

- **Less is more** : Chaque pixel doit avoir un but
- **Breathing space** : Spacing généreux, typographie aérée
- **Micro-interactions** : Délicates, non-distractrices
- **Premium feel** : Luxueux mais accessible
- **Dark-first** : Mode sombre par défaut, light en option

---

## 🎨 COULEURS (Palette restreinte)

### Primaire (Teal/Green moderne)
- **Main** : `#0D9488` (teal moderne)
- **Dark** : `#0F766E` (hover)
- **Darker** : `#134E4A` (active)
- **Light** : `#D1FAE5` (backgrounds)
- **Lighter** : `#F0FDF4` (subtle)

### Gris (Premium)
- **BG** : `#0F172A` (dark mode bg - bleu-noir)
- **Card** : `#1E293B` (card bg)
- **Border** : `#334155` (borders)
- **Text 100** : `#F8FAFC` (text principal)
- **Text 60** : `#CBD5E1` (text secondaire)
- **Text 40** : `#94A3B8` (text light)

### Accents
- **Success** : `#10B981`
- **Warning** : `#F59E0B`
- **Error** : `#EF4444`
- **Info** : `#06B6D4`

---

## ✍️ TYPOGRAPHIE (Système modèle Vercel)

### Polices
- **Display** : Inter (sans-serif, modern)
- **Body** : Inter (cohérent, lisible)
- **Mono** : IBM Plex Mono (code)

### Échelle (Généreux, hiérarchique)
```
Display 1 : 48px (hero titles)
Display 2 : 40px (section titles)
H1 : 32px (page titles)
H2 : 24px (section headers)
H3 : 20px (subsections)
Body : 16px (text courant)
Small : 14px (labels, helper)
Tiny : 12px (meta, captions)
```

### Line Height
- **Tight** : 1.2 (titres)
- **Normal** : 1.5 (text)
- **Relaxed** : 1.8 (descriptions)

### Font Weight
- **Regular** : 400
- **Medium** : 500
- **Semibold** : 600
- **Bold** : 700

---

## 📐 SPACING (Système 4px)

```
4px   : xs
8px   : sm
12px  : md
16px  : lg
24px  : xl
32px  : 2xl
48px  : 3xl
64px  : 4xl
```

**Principe** : Double spacing à chaque niveau (4→8→16→32→64)

---

## 🔘 COMPOSANTS (Redesigned)

### Boutons (Minimaliste luxe)

**Primary**
- BG : gradient teal (#0D9488 → #06B6D4)
- Text : blanc
- Padding : 12px 24px
- Border-radius : 6px
- Font : 600, 16px
- Box-shadow : `0 4px 6px rgba(0,0,0,0.1)`
- Hover : scale 1.02, shadow augmentée
- Transition : 200ms ease-out

**Secondary**
- BG : transparent
- Border : 1px solid #334155
- Text : #F8FAFC
- Hover : bg #1E293B
- No scale effect (subtle)

**Ghost**
- BG : transparent
- Border : none
- Text : #CBD5E1
- Hover : text #F8FAFC, bg #1E293B (très subtil)

### Cards (Glassmorphism subtil)
- BG : `rgba(30, 41, 59, 0.8)` (semi-transparent)
- Border : 1px solid `rgba(51, 65, 85, 0.5)`
- Backdrop-filter : `blur(10px)`
- Padding : 24px (généreux)
- Border-radius : 12px
- Shadow : `0 4px 6px rgba(0, 0, 0, 0.2)` (doux)
- Hover : border-color → #0D9488 (subtle highlight)

### Inputs (Modernes)
- BG : #1E293B
- Border : 1px solid #334155
- Padding : 12px 16px
- Border-radius : 6px
- Font : 16px (mobile-safe)
- Focus : border #0D9488, glow subtle
- Placeholder : #94A3B8
- Transition : 150ms ease-out

### Badges (Minimalistes)
- Padding : 4px 8px
- Border-radius : 4px
- Font : 12px, 500
- BG : rgba(13, 148, 136, 0.1)
- Text : #10B981
- Border : 1px solid rgba(13, 148, 136, 0.3)

---

### Chargement (une seule icône dans toute l'app)

Règle non négociable : **un seul type d'indicateur de chargement**, porté par
`src/components/Spinner.jsx`. Aucune autre animation d'attente ne doit être créée.

| Contexte | Usage | Rendu |
|---|---|---|
| Bouton | `<Spinner />` | cercle 16px, 2px, `currentColor` (hérite de la couleur du bouton) |
| Page entière | `<Spinner size="page" label="..." />` | cercle 36px, 3px, teal + libellé |

- Rotation : `700ms linear infinite`, identique partout
- Le bouton reste `disabled` pendant l'attente et son libellé décrit l'action en cours
  (« Calcul en cours… », « Paiement en cours… »), jamais un générique « Chargement… »
- Un `.sr-only` annonce l'état aux lecteurs d'écran

---

## ✨ EFFETS & ANIMATIONS

### Transitions
- **Standard** : 200ms cubic-bezier(0.4, 0, 0.2, 1)
- **Slow** : 400ms (pour entrées majeures)
- **Fast** : 150ms (interactions rapides)

### Hover States
- Boutons : scale 1.02 + shadow
- Cards : shadow augmentée, border-color change
- Links : underline smooth
- Icons : rotate subtle (5deg)

### Scroll Animations
- Fade-in + translateY(-20px) → 0
- Duration : 600ms staggered

### Micro-interactions
- Checkmarks : squish → expand (feedback)
- Success message : slide-in + fade
- Error shake : translateX ±8px × 3

---

## 🌗 MODE SOMBRE (Par défaut)

```css
:root {
  --bg: #0F172A;
  --bg-alt: #1E293B;
  --text: #F8FAFC;
  --text-60: #CBD5E1;
  --border: #334155;
  --primary: #0D9488;
  --gradient: linear-gradient(135deg, #0D9488 0%, #06B6D4 100%);
}
```

---

## 💡 MODE CLAIR (Optionnel)

```css
@media (prefers-color-scheme: light) {
  --bg: #FFFFFF;
  --bg-alt: #F8FAFC;
  --text: #0F172A;
  --text-60: #475569;
  --border: #E2E8F0;
  --primary: #0D9488;
}
```

---

## 📐 SHADOWS (Sophistiquées)

```
Subtle : 0 1px 2px rgba(0, 0, 0, 0.05)
Small  : 0 4px 6px rgba(0, 0, 0, 0.1)
Medium : 0 10px 15px rgba(0, 0, 0, 0.15)
Large  : 0 20px 25px rgba(0, 0, 0, 0.2)
Glow   : 0 0 20px rgba(13, 148, 136, 0.3)
```

---

## 🎯 SPACING LAYOUT

### Container
- Desktop : max-width 1200px, padding 64px horizontal
- Tablet : max-width 768px, padding 40px horizontal
- Mobile : padding 20px horizontal

### Sections
- Vertical spacing : 64px (desktop) → 40px (mobile)
- Horizontal padding : généreux (respire)

### Cards Grid
- Desktop : 3 colonnes, gap 24px
- Tablet : 2 colonnes, gap 20px
- Mobile : 1 colonne, gap 16px

---

## ♿ ACCESSIBILITÉ

- Contraste minimum 4.5:1 (WCAG AA++)
- Focus visible : 2px solid #0D9488, offset 2px
- Hover states = kbd accessible
- Alt text sur toutes images
- Hiérarchie headings correcte
- Links underlined ou suffisamment distinct

---

## 🎬 ANIMATIONS (Exemples)

### Fade In (Subtle)
```css
animation: fadeIn 600ms ease-out forwards;
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Slide In (Entrée)
```css
animation: slideIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
@keyframes slideIn {
  from { transform: translateX(-100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

### Scale Hover (Boutons)
```css
transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms;
&:hover { transform: scale(1.02); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15); }
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
Mobile   : < 640px
Tablet   : 640px - 1024px
Desktop  : > 1024px
```

---

## 🎨 DESIGN PRINCIPLES RÉSUMÉ

1. **Minimalisme** : Chaque élément doit avoir un but
2. **Générosité** : Spacing large, respire
3. **Hiérarchie** : Taille + poids + couleur clairs
4. **Cohérence** : Palette restreinte, répétée
5. **Micro-interactions** : Subtiles, non-distractrices
6. **Performance** : Animations fluides (60fps)
7. **Accessibilité** : WCAG AA++, inclusive
8. **Élégance** : Luxe sans ostentation

---

**STATUS** : ✅ Design System V2 Premium  
**Inspiration** : Vercel, Framer, Stripe, Apple  
**Feeling** : Modern, luxe, accessible, fast

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
