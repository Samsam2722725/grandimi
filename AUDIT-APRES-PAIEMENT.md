# Audit téléphone de l’espace après paiement (08/10/2026)

Écran testé : 375 × 812 px. Lecture du code, chaque constat vérifié une deuxième fois. Rien n’a encore été corrigé.
Ordre de travail : voir BACKLOG.md, section « Après paiement ».

## Page du plan (onglets)

- **[gênant] Tous les onglets (barre d'onglets) : constat connu, précisé**
  - Problème : Les 8 pilules sont dans une barre flex en overflow-x: auto. Il n'y a aucun scrollIntoView dans src/ (seul wheel-picker.jsx touche au défilement), donc la pilule active peut rester hors écran. La barre est collée en haut (sticky top:0, environ 4 + 44 + 12 = 60 px), dans la zone la plus loin du pouce.
  - Correction : Au changement d'onglet, appeler scrollIntoView({inline:'center', block:'nearest'}) sur la pilule active, puis à terme passer à une barre en bas à 4 ou 5 entrées.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:208-257 ; frontend/src/styles/growth-plan.css:45-48 (sticky top:0) et 528-540

- **[gênant] Tous les onglets (changement d'onglet)**
  - Problème : Changer d'onglet garde la position de défilement. Exemple : on descend loin dans Aujourd'hui, puis on touche « Nutrition » dans la barre collée en haut. Ce nouvel onglet est court, le navigateur se cale en bas de page, et l'ado voit « Nutriments clés » et le contact au lieu du début de Nutrition.
  - Correction : Dans le onClick des onglets, faire window.scrollTo jusqu'à la position de .plan-tabs, pour que le nouvel onglet s'ouvre sur son début, juste sous la barre.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:209-256 (onClick = setActiveTab seul, aucun scrollTo dans src/)

- **[gênant] Tous les onglets (en-tête) : constat connu, précisé**
  - Problème : L'en-tête empile ces hauteurs : 20 px de marge, une ligne de boutons de 44 px + 12, un h1 en clamp(26px, 7.5vw, 34px), soit environ 28 px sur 2 lignes, puis un sous-titre à 18 px (--text-body-lg, que la règle ≤ 700 px ne réduit pas) sur 2 lignes, et 24 px en bas. Avec les onglets, cela fait environ 280 px, soit plus d'un tiers des 812 px.
  - Correction : Sur mobile, ramener le titre à une ligne de 20-22 px, passer le sous-titre à 14 px ou le supprimer, et n'afficher l'en-tête que sur l'onglet Aujourd'hui.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:190-205 ; frontend/src/styles/growth-plan.css:37-41 et 508-526

- **[gênant] Aperçu et Ce mois-ci (paragraphes de motivation)**
  - Problème : .motivation-text affiche des paragraphes entiers à 24 px (--text-heading-sm, pas réduit sur mobile). La motivation fait environ 330 caractères (lib/plan-apercu.js:15). Dans la carte de 295 px utiles (343 − 2 × 24), cela donne environ 14 lignes, soit environ 430 px, et les 4 statistiques passent sous la ligne de flottaison. Sur Ce mois-ci, why_this_month fait 6 à 7 lignes à 24 px.
  - Correction : Sur mobile, mettre .motivation-text à 17-18 px, et réserver le 24 px à une seule phrase d'accroche.
  - Où : frontend/src/styles/growth-plan.css:107-112 ; frontend/src/pages/GrowthPlanPage.jsx:388 et 435

- **[gênant] Aujourd'hui (longueur)**
  - Problème : Les 4 moments et leurs environ 11 tâches (dans l'aperçu) s'affichent tous dépliés avant la courbe « Ta trajectoire de croissance ». La courbe n'arrive qu'après 2 écrans de défilement ou plus, puis viennent l'encadré de taille et le bloc « Nutriments clés ».
  - Correction : Ne déplier que le moment en cours, avec les autres en accordéon, et déplacer la courbe dans l'onglet « Ma taille ».
  - Où : frontend/src/pages/GrowthPlanPage.jsx:292-333 puis 342-352

- **[gênant] Tous les onglets (bloc « Nutriments clés »)**
  - Problème : La section des nutriments est rendue hors de .plan-content, donc sous chaque onglet, y compris Leçons, Ma taille et Sommeil : un h2 (24 px sur mobile) et 3 cartes empilées, soit environ 600 px. Sur Nutrition, elle est plus longue que l'onglet lui-même. Sa gouttière est de 20 px (ligne 369, non surchargée à 700 px), alors que celle de .plan-content est de 16 px (ligne 455) : les bords gauches ne s'alignent pas.
  - Correction : Déplacer ce bloc dans l'onglet Nutrition et lui donner la même gouttière de 16 px.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:600-614 ; frontend/src/styles/growth-plan.css:366-376

- **[gênant] Aujourd'hui (courbe de trajectoire)**
  - Problème : Le SVG a un viewBox de 360 de large mais s'affiche dans une .card de 295 px utiles (343 − 2 × 24 de --card-padding), soit une échelle de 0,82. Les graduations en cm, « aujourd'hui » et les âges sortent à environ 8,2 px, « optimisé » et « sans changer » à environ 7,8 px, et les deux tailles finales à environ 10,7 px : c'est illisible.
  - Correction : Fixer les <text> à 12 px minimum en CSS, ou réduire le viewBox à environ 300 de large sur mobile pour que 10 unités valent au moins 12 px.
  - Où : frontend/src/components/ui/growth-projection-chart.jsx:45 (W=360) ; 148, 271, 291, 301, 312, 322 (fontSize 10 et 9.5) ; 262, 282 (13)

- **[gênant] Sommeil (carte « Conseils pour meilleur sommeil »)**
  - Problème : Le skin sombre donne à .sleep-tips un fond de carte arrondi, mais aucune règle ne lui donne de marge intérieure. Le titre et les coches ✓ (left: 0) collent donc au bord gauche de la carte, dans l'arrondi de 20 px.
  - Correction : Ajouter .sleep-tips { padding: 20px; }.
  - Où : frontend/src/styles/growth-plan.css:578 (fond + border-radius 20px) ; 358-362 ; 256-262 ; frontend/src/pages/GrowthPlanPage.jsx:586-595

- **[gênant] Ce mois-ci (frise « Ta journée type »)**
  - Problème : Le nom du moment est écrit à 12 px dans un rond de 40 × 40 px. « Journée » (environ 46 px) et « Coucher » (environ 48 px) sont plus larges que le rond. Le texte, centré en flex, déborde des deux côtés, et comme il est #17120e sur un fond #0a0a0a hors du rond, les bords disparaissent : le mot paraît rogné.
  - Correction : Remplacer le rond par une pastille à largeur auto (height 28px, padding 0 10px) ou par un simple point, et mettre le nom du moment dans la carte.
  - Où : frontend/src/styles/growth-plan.css:217-229 et 610-614 ; frontend/src/pages/GrowthPlanPage.jsx:448

- **[gênant] Ma taille (saisie de la mesure)**
  - Problème : Le champ est en type="number", alors que le code attend une virgule : il fait replace(',', '.') et l'erreur donne l'exemple « 165,5 ». Un input number n'expose qu'une valeur à point, et avec le pavé décimal français (virgule), « 165,5 » peut remonter vide et afficher l'erreur alors que l'ado a tapé exactement l'exemple. Le champ est aussi pré-rempli avec l'ancienne taille (ligne 32), qu'il faut effacer au doigt.
  - Correction : Passer en type="text" inputMode="decimal" (en gardant le replace), laisser le champ vide avec un placeholder « 165,5 » et ajouter enterKeyHint="done".
  - Où : frontend/src/components/ui/ma-taille.jsx:121-130, 50-52 et 32

- **[gênant] Aujourd'hui (cocher une tâche)**
  - Problème : Seule la case de 28 px (44 px de zone tactile grâce au ::before) coche la tâche. Le libellé est un simple <p> : le toucher ne fait rien, alors que c'est le geste naturel sur téléphone.
  - Correction : Rendre toute la ligne .todo-item cliquable pour cocher, le bouton « Pourquoi ? » arrêtant la propagation.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:302-313 ; frontend/src/styles/growth-plan.css:741-754 et 1103-1111

- **[gênant] Global (rebond iOS, barre du navigateur)**
  - Problème : Seul le div .growth-plan-page est noir : body et .app restent crème #fbf7f2. Au rebond en haut ou en bas sur iOS, une bande crème apparaît, et le theme-color crème teinte la barre du navigateur au-dessus d'une page noire. C'est le flash clair que le commentaire des lignes 467-470 voulait éviter.
  - Correction : Pendant l'affichage du plan, passer html/body en #0a0a0a avec color-scheme: dark et la meta theme-color en #0a0a0a (via useEffect, ou html:has(.night.growth-plan-page)).
  - Où : frontend/index.html:35 (theme-color #fbf7f2) ; frontend/src/styles/design-system-v2.css:172 et 85/72 (body crème) ; frontend/src/App.css:3-4 ; frontend/src/index.css:175 (color-scheme: light) ; frontend/src/styles/growth-plan.css:477-482

- **[détail] Tous les onglets (titres et espacements)**
  - Problème : Les titres de section font 24 px, pas 32 comme rapporté, avec 32 px de marge basse. « Exercices clés pour la croissance » et « 0 / 11 tâches faites aujourd'hui » passent quand même sur 2 lignes (environ 90 px avant le contenu). Les marges de 48 px des blocs et des étapes de la frise ne sont pas réduites par la règle mobile.
  - Correction : Dans @media (max-width:700px), passer .section-title à 20-22 px avec 16 px de marge basse, et les marges de 48 px à 24 px.
  - Où : frontend/src/styles/growth-plan.css:90-96 (.section-title, --text-heading = 24 px sous 700 px d'après design-system-v2.css:640, marge 32) ; 104, 117, 134, 200, 282, 353 (marges de 48 px) ; 453-462

- **[détail] Nutrition (unités)**
  - Problème : En plus de « Vitamin D » (déjà connu, ligne 548), l'unité « mcg » est l'abréviation anglaise (en français : « µg »). Les unités sont collées au nombre (« 83g », « 1300mg »).
  - Correction : Écrire « Vitamine D », « {n} µg », « {n} g » et « {n} mg », avec une espace insécable.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:541, 545, 549

- **[détail] Aperçu et Aujourd'hui (nombres décimaux)**
  - Problème : Les décimales gardent le point anglais : « +1.5 cm », « Il te reste environ 13.0 cm », « tu dors 8.0 h ». La taille estimée est affichée brute à la ligne 376, alors que Ma taille l'arrondit avec une virgule (ma-taille.jsx:17 et 109).
  - Correction : Passer ces nombres par le même helper fr() que Ma taille, et côté Go remplacer le point par une virgule (ou utiliser %.0f quand la décimale est nulle).
  - Où : frontend/src/pages/GrowthPlanPage.jsx:376 et 399 ; internal/planner/growth_plan.go:506 et 529

- **[détail] Aujourd'hui (libellés des tâches)**
  - Problème : .todo-label (spécificité 0,1,0) veut du blanc, mais .night.growth-plan-page :is(p, li) (0,2,1) la repeint en gris #9a9a9a. La tâche a donc la même couleur que le bouton « Pourquoi ? », et il n'y a plus de hiérarchie visuelle.
  - Correction : Ajouter .night.growth-plan-page .todo-label { color: var(--funnel-text); }.
  - Où : frontend/src/styles/growth-plan.css:766-770 contre 489-491

- **[détail] Aujourd'hui (« Pourquoi ? » et son texte)**
  - Problème : Le bouton « Pourquoi ? » est à 0,82 rem (13,1 px) avec une zone tactile de 40 px de haut, sous les 44. L'explication dépliée est à 0,85 rem (13,6 px) et la source à 0,78 rem (12,5 px), en gris sur gris foncé.
  - Correction : Monter le bouton à min-height 44px et 14 px, et le texte d'explication à 15 px.
  - Où : frontend/src/styles/growth-plan.css:776-783, 1095-1101, 791-800

- **[détail] Aujourd'hui et Exercices (flèches de dépliage)**
  - Problème : Les boutons alternent les caractères ▶ (U+25B6, qui a une variante emoji et peut s'afficher comme l'emoji « lecture » sur iPhone) et ▼ (U+25BC, texte seul) : la flèche peut changer de style à chaque tap.
  - Correction : Utiliser l'icône ChevronDown de lucide qui pivote, comme dans lecons-plan.jsx:72.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:319 et 510

- **[détail] Aujourd'hui (série de 7 jours)**
  - Problème : Le jour de chaque pastille n'est donné que par title={jour}, une infobulle au survol qui n'existe pas au toucher, en format ISO (« 2026-10-08 »). Sur téléphone, rien n'indique quel rond correspond à quel jour.
  - Correction : Afficher sous chaque pastille l'initiale du jour (L, M, M, J, V, S, D) à 12 px.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:271-275 (date au format de dateDuJour, lignes 21-27)

- **[détail] Ma taille (après « Enregistrer »)**
  - Problème : Après l'enregistrement, rien ne ferme le clavier (pas de blur). Il reste ouvert et cache le message de vitesse et l'historique « Tes mesures », qui viennent d'être mis à jour sous le formulaire.
  - Correction : Appeler document.activeElement.blur() une fois l'enregistrement réussi.
  - Où : frontend/src/components/ui/ma-taille.jsx:48-98 et 149-172

- **[détail] Ma taille, Leçons, Aujourd'hui (petits textes courants)**
  - Problème : Trois textes de lecture sont sous 14 px : la consigne de mesure, le sujet de chaque leçon (plus petit que l'étiquette « Leçon 1 », donc hiérarchie inversée) et la légende de la courbe.
  - Correction : Passer ces textes à 14-15 px et, dans Leçons, mettre le sujet en gras à 16 px avec « Leçon N » en étiquette de 12 px.
  - Où : frontend/src/styles/growth-plan.css:923-928 (.ma-taille-aide 13px) ; 1044-1051 (Leçon N à 16 px, sujet à 13.5px) ; frontend/src/components/ui/growth-projection-chart.jsx:329-336 (figcaption 13px)

- **[détail] Pied de page (contact)**
  - Problème : .plan-contact est placé directement dans .growth-plan-page, qui n'a qu'un padding-bottom. La phrase d'environ 68 caractères à 14 px passe sur 2 lignes qui touchent les bords de l'écran.
  - Correction : Ajouter padding: 0 16px à .plan-contact.
  - Où : frontend/src/pages/GrowthPlanPage.jsx:624-627 ; frontend/src/styles/growth-plan.css:1090 et 5-9

- **[détail] Chargement du plan**
  - Problème : Le spinner plein écran est en 100vh, ce qui correspond au grand viewport d'iOS : il est centré trop bas. Il est en plus posé dans .growth-plan-page, qui ajoute 48 px de padding-bottom, donc l'écran de chargement défile légèrement.
  - Correction : Utiliser min-height: 100svh (avec 100vh en repli) et retirer le padding-bottom de .growth-plan-page pendant le chargement.
  - Où : frontend/src/styles/design-system-v2.css:586 (.loading-container min-height: 100vh, via components/Spinner.jsx:20) ; frontend/src/styles/growth-plan.css:5-9 ; frontend/src/pages/GrowthPlanPage.jsx:136-140

## Paiement confirmé, connexion, Mon compte, réglage du plan

- **[gênant] Retour de paiement (currentPage 'paiement') + chargement Mon compte + repli Suspense**
  - Problème : `.loading-container p` force `color: var(--text-secondary)` = #4a4038 sur le fond #0a0a0a du conteneur, soit un contraste d'environ 2:1. « Paiement confirmé — on prépare ton accès... » est presque illisible. C'est pourtant le seul texte affiché pendant la réclamation (6 × 2,5 s) puis pendant checkPremium (10 × 3 s). Les deux s'enchaînent quand le jeton est déjà valide (App.jsx:613-615), ce qui fait jusqu'à ~45 s.
  - Correction : Mettre `color: inherit` sur `.loading-container p`, qui reprend le rgba(255,255,255,0.7) déjà posé sur le conteneur.
  - Où : src/styles/design-system-v2.css:593-597 (via src/components/Spinner.jsx:20-23 ; src/App.jsx:738 et 739-743 ; src/pages/AccountPage.jsx:86-91)

- **[gênant] Mon compte — modale « Confirmer la résiliation ? »**
  - Problème : À 375 px, la modale fait 335 px (overlay à 20 px de marge). Son padding de 32 px n'est pas réduit dans la media query ≤700 px, ce qui laisse 271 px utiles. Les deux boutons en `flex: 1` ne peuvent pas rétrécir sous leur texte, qui est en nowrap. « Annuler » fait environ 80 px (14 px + 2 × 16 px de padding), plus 12 px d'écart, plus « Confirmer la résiliation » (16 px semi-gras + 2 × 24 px), environ 245 px. Le total d'environ 340 px fait sortir le bouton orange du cadre blanc à droite, et il frôle ou dépasse le bord de l'écran.
  - Correction : Sous 700 px, mettre `.account-modal { padding: 24px }` et `.account-modal-actions { flex-direction: column-reverse }` avec des boutons pleine largeur.
  - Où : src/styles/account-page.css:95-101, 114-123 et 125-128 ; src/styles/design-system-v2.css:270-279 (white-space: nowrap) ; src/pages/AccountPage.jsx:228-252

- **[gênant] Mon compte — « Offre actuelle », « Prochain paiement » et modale**
  - Problème : Le suffixe est '/an' seulement si plan_key === 'annual', sinon '/mois'. Or les offres vendues sont m1, m3 et vie. L'écran affiche donc « 3 mois — 29,99 €/mois » et « À vie — 59,99 €/mois ». Pour l'offre à vie, quand Whop n'envoie pas renewal_period_end, la date de fin est placée à +100 ans. L'écran annonce alors « Prochain paiement 59,99 € le … 2126 » et propose « Résilier mon abonnement » pour un achat unique.
  - Correction : Choisir le libellé selon plan_key (m1 : /mois ; m3 : pour 3 mois ; vie : paiement unique), et masquer la ligne « Prochain paiement » et le bouton de résiliation pour les clés vie et vie_normal.
  - Où : src/pages/AccountPage.jsx:122-123, 127-137, 149-155 et 219-221 ; internal/billing/plans.go:25-27 et 62-64 ; internal/api/whop_handlers.go:115-117

- **[gênant] Mon compte (navigation)**
  - Problème : Le seul bouton de l'en-tête est « ← Accueil », câblé sur handleBackHome (setCurrentPage('home')). Le geste retour du téléphone depuis 'account' mène aussi à 'home' (branche else, ligne 513). L'abonné qui ouvre Mon compte depuis son plan (GrowthPlanPage.jsx:194-197) n'a aucun moyen direct d'y revenir et doit repasser par l'accueil.
  - Correction : Passer à AccountPage un onRetour qui appelle handleReprendre quand isPaid (libellé « ← Mon plan »), et faire de même pour le geste retour depuis 'account'.
  - Où : src/pages/AccountPage.jsx:96-99 ; src/App.jsx:469-471, 821 et 510-514

- **[gênant] Mon compte / Confirmation cadeau (liens de secours)**
  - Problème : Le préflight met `a { color: inherit; text-decoration: inherit }`, et aucune règle ne cible `.alert a` ni `.paywall-subtitle a`. « Résilier depuis mon compte Whop » dans l'alerte d'erreur et « grandimi14@gmail.com » dans le sous-titre de la page cadeau non confirmée ont donc la couleur du texte autour, sans soulignement. Sur téléphone, rien n'indique qu'on peut appuyer dessus, alors que ce sont les deux sorties de secours.
  - Correction : Donner à ces liens un soulignement permanent et une couleur d'accent : #ff7a45 sur fond sombre, et une couleur foncée soulignée dans l'alerte claire.
  - Où : src/pages/AccountPage.jsx:180-186 ; src/pages/GiftConfirmedPage.jsx:64-66 (aucune règle `a` ne surcharge le préflight Tailwind v4 importé par src/index.css:1)

- **[gênant] Connexion (AuthPage, pied de carte) + écran mot de passe**
  - Problème : `.auth-footer .btn-tertiary { padding: 0; min-height: 0 }` annule le min-height de 44 px. « Choisir mon mot de passe », « Mot de passe oublié ? », « Se connecter » et « ← Retour à la connexion » n'ont plus qu'une zone tactile d'environ 19 px (14 px × 1,38). Le soulignement n'apparaît qu'au :hover, qui n'existe pas au doigt. « Choisir mon mot de passe » est pourtant l'étape 2 donnée à l'enfant dont le parent a payé (GiftConfirmedPage.jsx:93).
  - Correction : Retirer `padding: 0; min-height: 0` (ou mettre `padding: 10px 4px; min-height: 44px`) et souligner ces liens en permanence.
  - Où : src/styles/auth-page.css:73-83 ; src/pages/AuthPage.jsx:114, 115, 163 et 185

- **[gênant] Connexion + Paiement confirmé (champs mot de passe)**
  - Problème : Aucun champ d'AuthPage (e-mail comme mot de passe) n'a d'autoComplete, ni les deux champs mot de passe de SetPasswordPage. iOS et Android ne reçoivent aucune indication current-password / new-password. Ils ne proposent alors de façon fiable ni le mot de passe enregistré à la reconnexion, ni la génération d'un mot de passe fort à la création. Sur SetPasswordPage, l'e-mail connu est `disabled` en plus de `readOnly` : il n'est pas soumis avec le formulaire, et le gestionnaire de mots de passe ne peut pas l'associer au mot de passe créé.
  - Correction : Ajouter autoComplete="email" sur les e-mails d'AuthPage, "current-password" à la connexion et "new-password" à la création (AuthPage signup et SetPasswordPage), et ne garder que readOnly sur l'e-mail connu.
  - Où : src/pages/AuthPage.jsx:86-93, 98-105, 135-142 et 147-154 ; src/pages/SetPasswordPage.jsx:151-152, 167-174 et 179-186

- **[gênant] Retour de paiement → repli vers Mon compte**
  - Problème : Si checkPremium ne voit toujours rien après 10 essais, le client qui vient de payer est envoyé sur Mon compte. Sans ligne d'abonnement en base (webhook pas encore traité), l'écran affiche seulement « Tu n'as pas d'abonnement actif. ». Il n'y a ni explication, ni bouton pour réessayer, ni lien Whop (manage_url n'existe qu'avec un abonnement), seulement « ← Accueil ».
  - Correction : Passer un indicateur « paiement en cours d'activation » à AccountPage et afficher dans ce cas un message rassurant avec un bouton « Réessayer » qui relance checkPremium.
  - Où : src/App.jsx:432-436 ; src/pages/AccountPage.jsx:113-115

- **[gênant] Réglage du plan (PlanSetupPage) — retour**
  - Problème : Le bouton rond de 48 px avec la flèche retour est toujours rendu. À l'étape 1, onBack vaut undefined : on appuie et rien ne se passe. 'plan-setup' est dans SANS_RETOUR, donc le geste retour du téléphone est sans effet sur les cinq étapes, y compris quand la flèche à l'écran fonctionne.
  - Correction : Ne pas rendre `.funnel-back` quand onBack est absent (en gardant la colonne vide pour la grille), et faire reculer d'une étape au geste retour en écoutant 'grandimi:retour' dans PlanSetupPage.
  - Où : src/components/ui/funnel-shell.jsx:46-53 ; src/pages/PlanSetupPage.jsx:242 ; src/App.jsx:490 et 507

- **[détail] Mon compte (thème clair dans l'espace payé)**
  - Problème : Mon compte est le seul écran crème et blanc après paiement. En venant du plan noir, on a un flash clair, celui que auth-page.css:92-95 dit vouloir éviter. Le lien de contact #ff7a1a sur #fbf7f2 n'atteint qu'environ 2,4:1 de contraste.
  - Correction : Ajouter une variante sombre à .account-page, .account-header, .account-card et .account-modal, sur le modèle de `.auth-night`.
  - Où : src/styles/account-page.css:5-9, 11-17, 41-45, 95-101 et 149 ; plan en `.night` : src/pages/GrowthPlanPage.jsx:188

- **[détail] Retour de paiement + Mon compte + Connexion (hauteur)**
  - Problème : Le loader est enveloppé dans `.account-page` (min-height 100vh + padding-bottom de 80 px, pas 48) et `.loading-container` est lui-même en min-height 100vh. La page devient défilable et une bande crème de 80 px apparaît sous le loader noir. Sur iOS, 100vh correspond à la grande hauteur, sans la barre d'adresse : le spinner et les cartes de connexion (align-items: center) sont centrés plus bas que l'écran visible.
  - Correction : Rendre le Spinner d'attente sans l'enveloppe .account-page et passer ces min-height à 100svh, avec 100vh en repli (comme .funnel, funnel.css:145).
  - Où : src/App.jsx:740-742 et src/pages/AccountPage.jsx:88-90 ; src/styles/account-page.css:6-8 ; src/styles/design-system-v2.css:586 ; src/styles/auth-page.css:6-10

- **[détail] Paiement confirmé (SetPasswordPage) — longueur**
  - Problème : Avant la carte : 48 px de marge haute, logo de 40 px et 32 px de marge. Le formulaire contient trois champs, dont un e-mail non modifiable, puis un pied « ✓ Paiement confirmé ✓ Ton plan personnalisé est prêt » qui répète le titre. Le bouton tombe vers 670 px depuis le haut, donc sous le pli quand la barre Safari est affichée. Le pied est en couleur inline #666 sur #141414 (environ 3,2:1), à 14,4 px, et l'inline écrase le #9a9a9a de `.auth-night`.
  - Correction : Sous 700 px, réduire `.auth-page` à 24px 16px, réduire ou retirer le logo, et supprimer ce pied redondant.
  - Où : src/styles/auth-page.css:10, 28 et 62-69 ; src/pages/SetPasswordPage.jsx:112-118 et 194-199

- **[détail] Paiement confirmé — bouton principal**
  - Problème : La carte a 287 px utiles (335 − 2 × 24). Le bouton `.btn-full` laisse donc 239 px au texte. « Créer mon compte et accéder au plan » (16 px semi-gras, environ 280 px) est en `white-space: nowrap` : il déborde d'environ 20 px de chaque côté dans le padding et touche les arrondis de la pilule.
  - Correction : Raccourcir le libellé (par exemple « Accéder à mon plan ») ou mettre `white-space: normal` sur `.btn-full`.
  - Où : src/pages/SetPasswordPage.jsx:189-191 ; src/styles/design-system-v2.css:270-279 et 288-290

- **[détail] Paiement confirmé + Connexion (création) — saisie du mot de passe**
  - Problème : La règle « Min 8 caractères » n'existe que dans le placeholder, en #5f5f5f sur #1c1c1c (environ 2,7:1), et elle disparaît à la première lettre. SetPasswordPage demande ensuite de retaper le mot de passe à l'aveugle au clavier tactile, sans bouton pour l'afficher.
  - Correction : Mettre « 8 caractères minimum » dans un .form-helper visible, ajouter un bouton pour afficher le mot de passe et supprimer le champ de confirmation.
  - Où : src/styles/auth-page.css:148-150 ; src/pages/SetPasswordPage.jsx:165-187 ; src/pages/AuthPage.jsx:152

- **[détail] Réglage du plan — jours de sport**
  - Problème : Sept pastilles carrées en grille, avec 8 px d'écart, sur environ 327 px : chacune fait environ 40 × 40 px, sous 44 px. Mardi et mercredi s'affichent tous deux « M » ; seul aria-label les distingue.
  - Correction : Réduire l'écart à 4 px avec un `min-height: 44px`, et afficher « Lu Ma Me Je Ve Sa Di ».
  - Où : src/styles/funnel.css:1016-1038 ; src/pages/PlanSetupPage.jsx:51-59 et 201-214

- **[détail] Réglage du plan — petits textes et lien secondaire**
  - Problème : « Aucun jour ? Passe simplement à la suite. » est en 13 px et placé SOUS le bouton. Les indices des cartes de choix passent à 12,5 px dès que la hauteur est ≤ 820 px, ce qui couvre tous les iPhone compacts en usage réel. « Voir mon plan quand même → » (15 px, padding 8 px) n'offre qu'environ 37 px de zone tactile.
  - Correction : Placer la note au-dessus du bouton en 14 px, garder les indices à 14 px et donner `min-height: 44px` à `.funnel-link`.
  - Où : src/styles/funnel.css:1053-1058, 3624 et 442-453 ; src/pages/PlanSetupPage.jsx:254-256 et 275-277

- **[détail] Confirmation cadeau (GiftConfirmedPage)**
  - Problème : Titre, sous-titre, six paragraphes et une liste de 3 étapes, en 15 px avec un interlignage de 1,65 : environ deux écrans à faire défiler. Les deux mises en garde (adresse qui ne correspond pas, reçu et résiliation) sont en 13,5 px gris (`.parent-texte--discret`). Le seul bouton, « Retour à l'accueil », renvoie le parent sur l'accueil destiné aux ados.
  - Correction : Passer `.parent-texte--discret` à 14 px et remplacer le bouton par « Envoyer ces étapes à mon enfant » (navigator.share).
  - Où : src/pages/GiftConfirmedPage.jsx:72-115 et 118-122 ; src/styles/paywall-night.css:481-484

- **[détail] Mon compte — lignes d'abonnement**
  - Problème : La carte laisse 303 px utiles (343 − 2 × 20). Le libellé (14 px) et la valeur (16 px semi-gras, alignée à droite) sont côte à côte en space-between. « Prochain paiement » et « 29,99 € le 8 novembre 2026 » (environ 350 px à eux deux) passent tous deux sur deux lignes, en colonnes décalées.
  - Correction : Sous 700 px, empiler le libellé au-dessus de la valeur (`flex-direction: column; align-items: flex-start; text-align: left`).
  - Où : src/styles/account-page.css:47-69 et 125-128

- **[détail] Mon compte — lien Whop**
  - Problème : « Gérer ou résilier directement chez Whop » est un lien texte de 14 px, sans padding ni display bloc. Sa zone tactile fait environ 19 px de haut, pour la sortie de secours de la résiliation.
  - Correction : Donner au lien `display: inline-block; padding: 12px 0; min-height: 44px`.
  - Où : src/styles/account-page.css:133-146 ; src/pages/AccountPage.jsx:161-171

- **[détail] Écrans sombres d'après paiement (barre du navigateur, rebond)**
  - Problème : theme-color vaut #fbf7f2 et le body est crème, alors que l'attente, le mot de passe, la connexion, le réglage, le plan et la page cadeau sont sur #0a0a0a. Dans Android Chrome, la barre d'adresse reste crème au-dessus d'une page noire. Sur iOS, le rebond de défilement de `.auth-page` et de `.paywall` (non fixes) fait apparaître le crème du body.
  - Correction : Passer theme-color et le fond du body à #0a0a0a, une fois Mon compte passé en sombre.
  - Où : index.html:35 ; src/styles/design-system-v2.css:172 (body sur --surface-page-canvas #fbf7f2)

## Navigation et habillage global

- **[gênant] Ouverture du site par un abonné (chaque visite, ou quand Safari recharge l'onglet)**
  - Problème : L'écran de départ est toujours « home » (la page de vente), sauf au retour de paiement. Le seul accès au plan est le bouton texte « Mon plan », en 13 px, dans l'en-tête. Il affiche « Se connecter » tant que checkPremium n'a pas répondu, ce qui peut prendre jusqu'à une minute si le serveur dort. Le gros « Je commence → » relance le questionnaire pour l'abonné aussi, et « Reprendre » lui est masqué (ligne 166, !abonne). Après avoir touché « Mon plan », getPreferences tourne sans aucun retour visuel : on reste sur la page de vente. Ensuite, checkPremium puis getGrowthPlan s'enchaînent derrière un chargement plein écran, soit trois requêtes l'une après l'autre.
  - Correction : Quand un jeton et une prédiction sont en mémoire, ouvrir directement le plan sur « Aujourd'hui » et afficher le dernier plan mis en cache pendant que les requêtes se refont.
  - Où : src/App.jsx:122-130 et 219-228 ; src/pages/HomePage.jsx:95-101 et 159-167 ; src/App.jsx:328-335 et 473-479 ; src/pages/GrowthPlanPage.jsx:57-77

- **[gênant] Navigation dans l'espace payant (geste retour, « ← Accueil »)**
  - Problème : Sur le plan comme sur « Mon compte », le geste retour mène toujours à « home », la page de vente (branche else, ligne 513). Il ne revient jamais à l'onglet précédent. Les deux boutons « ← Accueil » appellent handleBackHome et mènent aussi à la page de vente. Depuis « Mon compte », aucun bouton ne ramène au plan.
  - Correction : Faire revenir le geste retour au plan, ou à l'onglet précédent, depuis « plan » et « account », et remplacer « ← Accueil » par « ← Mon plan » dans le compte.
  - Où : src/App.jsx:506-514 ; src/pages/GrowthPlanPage.jsx:191-193 ; src/pages/AccountPage.jsx:97-99 ; src/App.jsx:808 et 821

- **[gênant] Changement d'onglet du plan**
  - Problème : Aucun scrollTo ni scrollIntoView dans src. Après avoir fait défiler « Aujourd'hui », toucher un autre onglet dans la barre collée en haut garde la position. Sur un onglet long (Exercices, Ce mois-ci), on arrive au milieu du contenu. Sur un onglet court (Nutrition), la page est ramenée en bas, sur « Nutriments clés » et le contact.
  - Correction : À chaque setActiveTab, remonter juste sous l'en-tête avec window.scrollTo({ top: …, behavior: 'instant' }), « instant » parce que html est en défilement doux.
  - Où : src/pages/GrowthPlanPage.jsx:209-256 (setActiveTab seul) ; src/styles/growth-plan.css:45-48 ; src/index.css:166 et src/styles/design-system-v2.css:164 (scroll-behavior: smooth)

- **[gênant] Plan : en-tête et onglets (déjà vu, précisé)**
  - Problème : À 375 px, l'en-tête fait environ 224 px : 20 px de marge, bouton de 44 px, 12 px, h1 de 28 px sur 2 lignes (64 px), 10 px, sous-titre de 18 px sur 2 lignes (environ 50 px), 24 px. Les onglets ajoutent 60 px, soit environ 35 % de l'écran. « ← Accueil » et « Mon compte » ne sont pas collés en haut : on ne les atteint qu'en remontant tout en haut. La barre d'onglets n'a pas de scrollIntoView et sa barre de défilement est masquée.
  - Correction : Réduire l'en-tête à une ligne compacte, d'environ 52 px, collée en haut, et faire défiler la pilule active au centre avec scrollIntoView({ inline: 'center' }) en attendant une barre en bas.
  - Où : src/pages/GrowthPlanPage.jsx:190-205 et 208-257 ; src/styles/growth-plan.css:37-41, 508-526 et 528-544

- **[gênant] « Paiement confirmé — on prépare ton accès... », chargement de « Mon compte », chargement d'un écran**
  - Problème : .loading-container a un fond #0a0a0a, mais son texte est en var(--text-secondary), soit #4a4038 : un contraste d'environ 2:1, presque illisible. Juste après le paiement, l'élève attend jusqu'à 30 s devant une roue avec un message qu'il ne peut pas lire. Seul le chargement du plan y échappe, car .night.growth-plan-page :is(p) repeint le texte.
  - Correction : Mettre color: inherit (ou rgba(255,255,255,0.7)) sur .loading-container p.
  - Où : src/styles/design-system-v2.css:579-597 ; src/App.jsx:738 et 740-741 ; src/pages/AccountPage.jsx:88-89

- **[gênant] Mon compte : fenêtre « Confirmer la résiliation ? »**
  - Problème : La fenêtre fait 335 px (375 moins 2 × 20 px) avec 32 px de marge intérieure, qu'aucune media query ne réduit : il reste 271 px. Les deux boutons sont en flex: 1 et en white-space: nowrap, donc ils ne rétrécissent pas sous la largeur de leur texte. « Annuler » fait environ 85 px et « Confirmer la résiliation » plus de 230 px (16 px, 24 px de marge de chaque côté). Le total dépasse d'environ 60 px : le bouton orange sort de la carte blanche et touche ou dépasse le bord de l'écran.
  - Correction : Sous 480 px, empiler les boutons (flex-direction: column-reverse, largeur 100 %) et passer la marge intérieure de .account-modal à 20 px.
  - Où : src/styles/account-page.css:84-101 et 114-123 ; src/styles/design-system-v2.css:269-279 ; src/pages/AccountPage.jsx:228-252

- **[gênant] Mon compte**
  - Problème : Seul écran payant sans .night : fond crème #fbf7f2 et en-tête et carte blancs. Passer du plan noir à « Mon compte » fait un éclair clair. Le lien e-mail #ff7a1a sur crème a un contraste d'environ 2,4:1.
  - Correction : Ajouter la classe night à .account-page et lui donner l'habillage sombre du plan (surface #141414, texte blanc ; l'orange vif devient lisible sur noir).
  - Où : src/styles/account-page.css:5-8, 11-17, 41-45 et 149 ; src/pages/AccountPage.jsx:88 et 95

- **[gênant] Mon compte : offre et prochain paiement**
  - Problème : Le suffixe ne distingue que plan_key === 'annual' (« /an ») et met « /mois » partout ailleurs. Les offres m3, vie, m3_normal et vie_normal s'affichent donc « 3 mois — 29,99 €/mois » et « À vie — 59,99 €/mois ». L'offre à vie (Interval « lifetime ») affiche aussi « Prochain paiement … le … » et « Résilier mon abonnement ».
  - Correction : Choisir le libellé selon l'offre (« /mois », « pour 3 mois », « paiement unique ») et masquer la ligne de prochain paiement et la résiliation pour vie et vie_normal.
  - Où : src/pages/AccountPage.jsx:121-138, 149-155 et 219-221 ; internal/billing/plans.go:61-66

- **[gênant] Messages d'erreur (plan, réglage, compte, Ma taille)**
  - Problème : err.message est affiché tel quel. L'élève peut donc lire en anglais les messages du serveur (« failed to load subscription », « failed to reach payment provider », « payment provider refused cancellation », « failed to save preferences »), les messages de secours de api.js (« API Error: 500 », « Unknown error ») ou l'erreur réseau du navigateur : « Load failed » sur iOS, « Failed to fetch » sur Chrome, car fetch n'est jamais encadré.
  - Correction : Dans api.request, transformer les TypeError réseau et les codes HTTP en messages français, et n'afficher le texte du serveur que s'il est déjà rédigé pour l'élève.
  - Où : src/lib/api.js:31-36 ; src/pages/GrowthPlanPage.jsx:83 et 149 ; src/pages/AccountPage.jsx:47 et 78 ; src/pages/PlanSetupPage.jsx:138-141 ; src/components/ui/ma-taille.jsx:94

- **[gênant] Plan : écran d'erreur**
  - Problème : Si le plan ne charge pas (4G, serveur endormi), le seul bouton est « ← Retour » (onBackHome), qui ramène à la page de vente. Il n'y a pas de « Réessayer ».
  - Correction : Ajouter un grand bouton « Réessayer » qui relance fetchPlan, et garder l'élève dans l'espace payant.
  - Où : src/pages/GrowthPlanPage.jsx:143-157

- **[gênant] Plan : onglet Aujourd'hui (et bas de tous les onglets)**
  - Problème : Aujourd'hui enchaîne la série de jours, 11 tâches avec leur « Pourquoi ? » (données d'aperçu), la courbe, deux encadrés, puis « Nutriments clés » et le contact : plusieurs hauteurs d'écran. « Nutriments clés » est placé hors de .plan-content et se répète donc sous chaque onglet, y compris Leçons et Ma taille.
  - Correction : Garder dans Aujourd'hui la série et les tâches, mettre « Nutriments clés » dans Nutrition et la courbe dans Ma taille.
  - Où : src/pages/GrowthPlanPage.jsx:261-381 et 600-614

- **[gênant] Plan : Aperçu et Ce mois-ci**
  - Problème : .motivation-text est en taille de titre (24 px, interligne 1,3). La motivation (environ 330 caractères dans l'aperçu), dans une boîte de 295 px utiles, fait une douzaine de lignes, soit environ 450 px. « Pourquoi ce mois-ci » reprend le même style.
  - Correction : Passer ces paragraphes en 17 px et réserver le 24 px à une phrase d'accroche courte.
  - Où : src/styles/growth-plan.css:107-112 et 604-606 ; src/pages/GrowthPlanPage.jsx:388 et 435

- **[gênant] Plan : courbe « Ta trajectoire de croissance »**
  - Problème : Le viewBox fait 360 unités de large et s'affiche sur 295 px (343 moins 2 × 24 px de .card), soit un rapport de 0,82. Les graduations, « aujourd'hui » et les âges (10) s'affichent donc à environ 8,2 px, « optimisé » et « sans changer » (9,5) à environ 7,8 px, et les tailles finales (13) à environ 10,7 px. La légende sous la courbe est en 13 px.
  - Correction : Porter les textes du SVG à au moins 17 unités pour les valeurs et 15 pour les étiquettes (environ 14 et 12 px une fois affichés), et la légende à 14 px.
  - Où : src/components/ui/growth-projection-chart.jsx:45-47, 148, 262, 271, 282, 291, 301, 312, 322 et 331

- **[gênant] Plan : Aujourd'hui, « Pourquoi ? »**
  - Problème : Le bouton « ▶ Pourquoi ? » est en 0,82rem (13,1 px), avec une zone tactile de 40 px de haut sur la seule largeur du texte. L'explication dépliée est en 0,85rem (13,6 px), la source en 0,78rem (12,5 px) italique.
  - Correction : Passer l'explication à 15 px et le bouton à 14 px avec une hauteur minimale de 44 px.
  - Où : src/styles/growth-plan.css:776-800 et 1095-1101

- **[gênant] Plan : Aujourd'hui, ligne de tâche**
  - Problème : Seule la case de 28 px (44 px de zone tactile grâce au ::before) coche la tâche ; toucher le libellé ne fait rien. Ce libellé s'affiche aussi en gris #9a9a9a, car .night.growth-plan-page :is(p, li) (spécificité 0,2,1) l'emporte sur .todo-label (0,1,0) : la tâche a le même poids que le texte secondaire.
  - Correction : Rendre le libellé cliquable, par exemple avec un label ou un bouton qui couvre la case et le texte, et ajouter .night.growth-plan-page .todo-label { color: var(--funnel-text) }.
  - Où : src/pages/GrowthPlanPage.jsx:302-313 ; src/styles/growth-plan.css:489-491 et 766-770

- **[gênant] Choix du mot de passe après paiement, et connexion**
  - Problème : Seul l'e-mail de SetPassword a autoComplete. Les mots de passe n'ont ni new-password ni current-password, et les e-mails de la connexion n'ont pas autoComplete. Le trousseau iOS et Chrome doivent donc deviner, ce qui rend moins fiables la suggestion d'un mot de passe fort et le remplissage au retour. Le pied de SetPassword impose color: #666 en ligne, sur #141414 (environ 3,2:1), ce qui écrase le #9a9a9a de .auth-night.
  - Correction : Ajouter autoComplete="email" sur les adresses, "new-password" à la création et "current-password" à la connexion, et retirer le color: #666 imposé dans la balise.
  - Où : src/pages/SetPasswordPage.jsx:167-186 et 195 ; src/pages/AuthPage.jsx:86-104 et 135-154

- **[gênant] Connexion (retour de l'abonné)**
  - Problème : .auth-footer .btn-tertiary met padding: 0 et min-height: 0 : « Choisir mon mot de passe » et « Mot de passe oublié ? » sont des cibles d'environ 20 px de haut, en 14 px.
  - Correction : Rendre à ces boutons une hauteur minimale de 44 px, avec une marge intérieure verticale.
  - Où : src/styles/auth-page.css:73-78 ; src/pages/AuthPage.jsx:114-115

- **[détail] Habillage global, structure d'appli et installation**
  - Problème : La balise viewport n'a pas viewport-fit=cover : les env(safe-area-inset-bottom) déjà écrits (funnel.css:342, etc.) valent 0, ce qu'il faudra corriger avant d'ajouter une barre en bas. Pas de manifeste ni d'icône PNG : « Ajouter à l'écran d'accueil » donne un raccourci Safari sans vraie icône et sans mode plein écran. Aucune règle -webkit-tap-highlight-color : le voile gris par défaut apparaît à chaque toucher.
  - Correction : Ajouter viewport-fit=cover, un manifest.webmanifest (display: standalone, couleurs sombres), une apple-touch-icon PNG de 180 px et -webkit-tap-highlight-color: transparent.
  - Où : index.html:33-35 ; public/ (aucun manifeste ni apple-touch-icon) ; aucune règle -webkit-tap-highlight-color dans src

- **[détail] Habillage global : couleur de la barre, rebond, hauteur d'écran**
  - Problème : theme-color vaut #fbf7f2 (crème) alors que le plan est noir. body et .app ont un fond crème : le rebond haut ou bas du plan fait apparaître une bande crème. color-scheme: light force des contrôles natifs clairs. Les min-height en 100vh décalent les roues de chargement sous la barre d'iOS. L'écran « paiement » (une .account-page avec 48 px de marge basse, plus un chargeur de 100vh) défile sur une bande crème.
  - Correction : Passer theme-color et le fond de html et body en #0a0a0a avec color-scheme: dark dans l'espace payant, et remplacer 100vh par 100svh.
  - Où : index.html:35 ; src/styles/design-system-v2.css:172 et 586 ; src/App.css:3-4 ; src/index.css:175 et 179 ; src/styles/growth-plan.css:6 et 481 ; src/styles/account-page.css:6-8 ; src/App.jsx:740-741

- **[détail] Réglage du plan (5 questions après paiement)**
  - Problème : « plan-setup » est dans SANS_RETOUR : le geste retour ne fait rien, même à la question 4. À la première question, la flèche ← reste affichée avec onClick undefined. Les 7 pastilles des jours font environ 40 px ((327 − 48) / 7), moins de 44, et mardi et mercredi affichent tous deux « M ».
  - Correction : Faire reculer d'une question au geste retour, masquer la flèche quand onBack est absent, et écrire « Lu Ma Me Je Ve Sa Di ».
  - Où : src/App.jsx:490 et 507 ; src/pages/PlanSetupPage.jsx:51-59 et 242 ; src/components/ui/funnel-shell.jsx:46-53 ; src/styles/funnel.css:1016-1038

- **[détail] Plan : Nutrition (« Vitamin D » déjà vu, précisé)**
  - Problème : En plus de « Vitamin D » (ligne 548), l'unité « mcg » (ligne 549) est en anglais. Les unités sont collées aux nombres (« 83g », « 1300mg », « 15mcg ») et il n'y a pas d'espace des milliers (« 2400 kcal »). Dans la grille à 2 colonnes (environ 111 px utiles par carte), l'étiquette « CALORIES QUOTIDIENNES » en 12 px majuscules passe sur deux lignes.
  - Correction : Afficher « Vitamine D », « 15 µg », « 83 g », « 1 300 mg » et « 2 400 kcal » avec toLocaleString('fr-FR').
  - Où : src/pages/GrowthPlanPage.jsx:537-549 ; src/styles/growth-plan.css:310-347

- **[détail] Plan : Ce mois-ci, frise de la journée**
  - Problème : Le moment (« Journée », « Coucher ») est écrit en 12 px demi-gras dans une pastille de 40 px. « Coucher » (environ 45 px) et, de justesse, « Journée » débordent. Le texte est foncé (#17120e) et le débordement se fait sur le fond noir : les lettres des bords disparaissent.
  - Correction : Sortir le mot de la pastille (point seul, libellé à côté) ou élargir la pastille à 56 px.
  - Où : src/styles/growth-plan.css:217-229 et 610-614 ; src/pages/GrowthPlanPage.jsx:448

- **[détail] Plan : Aujourd'hui, série de 7 jours**
  - Problème : Les 7 pastilles n'ont aucun repère de jour. La date n'existe que dans title (au format AAAA-MM-JJ), qui ne s'affiche jamais au toucher.
  - Correction : Afficher l'initiale du jour sous chaque pastille et retirer le title.
  - Où : src/pages/GrowthPlanPage.jsx:265-277 ; src/styles/growth-plan.css:682-704

- **[détail] Plan : Sommeil contre Aujourd'hui et Leçons**
  - Problème : L'onglet Sommeil dit « Pas d'écrans 30 min avant le coucher », alors que la tâche du jour et la leçon 3 disent « 45 min ».
  - Correction : Remplacer « 30 min » par « 45 min » à la ligne 592.
  - Où : src/pages/GrowthPlanPage.jsx:592 ; src/components/ui/lecons-plan.jsx:44 ; internal/planner/monthly_plan.go:313

- **[détail] Plan : Leçons**
  - Problème : « Leçon 1/2/3 » est en 16 px gras blanc, alors que le vrai sujet (« Mythes courants sur la croissance ») est en 13,5 px gris #b3a79c : l'ordre d'importance est inversé et le sujet est sous 14 px.
  - Correction : Mettre le sujet en 16 px gras et « Leçon N » en petite étiquette de 12 px au-dessus.
  - Où : src/components/ui/lecons-plan.jsx:12-13 et 68-71 ; src/styles/growth-plan.css:1044-1051

- **[détail] Plan : Ma taille, saisie de la mesure**
  - Problème : Le message d'erreur invite à taper « 165,5 », mais le champ est type="number". Une saisie à virgule peut y donner une valeur vide, selon le navigateur (Safari notamment), et le replace(',', '.') ne sert alors à rien : on voit l'erreur en ayant suivi l'exemple. Le texte d'aide .ma-taille-aide est en 13 px.
  - Correction : Passer le champ en type="text" avec inputMode="decimal" (déjà présent), et l'aide en 14 px.
  - Où : src/components/ui/ma-taille.jsx:50-52 et 121-130 ; src/styles/growth-plan.css:923-928
