# Checklist vidéo « Je prédis vos tailles » — à cocher pour CHAQUE vidéo

Rassemble toutes les demandes de l'utilisateur (30/10 → 04/11). Modèle à copier : `public/episodes/miguel-29`
(recopie exacte de Taller partie 30, `references/taller-ref3`). Ne rien livrer tant qu'une case n'est pas cochée.
En cas de conflit entre deux demandes, la plus récente gagne ; les points « À trancher » attendent sa réponse.

## 1. Texte et voix (avant de monter)
- [ ] Script recopié **mot pour mot** dans `lines` (pris de la voix si le texte n'est pas fourni). Erreurs signalées **une seule fois**.
- [ ] Chaque passage douteux **réécouté isolé** (Parakeet bascule en anglais) : prénom, numéro de partie, chiffres, « grandimi ».
- [ ] Chiffres vérifiés et signalés s'ils sont faux :
  - croissance accomplie = taille actuelle ÷ taille prédite (jamais 75-80 % si l'écart est de quelques cm) ;
  - gain annoncé = optimisée − prédite ;
  - centimètres restants crédibles pour l'âge (≥ 17 ans : quelques cm au plus) ;
  - « plus grand que X % des **<âge> ans** » = bon âge.
- [ ] Numéro de partie : pas déjà utilisé (signaler les doublons).
- [ ] Prononciation : « Grandimi » / « grandimi.com » (pas « grandini ») ; tu/vous cohérent ; le site est cité.
- [ ] L'écran suit **ce que dit la voix** (si elle dit 3 cm, l'écran dit +3 cm).

## 2. Son
- [ ] Blancs ramenés à **0,05 s** (`blancs.py … 0.05`), puis `atempo=1.08` (max 1,12).
- [ ] **Pas de musique** ; bruitages **discrets comme l'original** (04/11 : volumes 0,2-0,3 de cory-19, plus de ×2).
- [ ] Sons de l'original recréés : `bug` (bips numériques) 2 images avant le glitch vers le dashboard 2, `verdict`
      (grésillement + notes qui montent) 5 images avant le verdict, volume 0,6.
- [ ] Bruit de **frappe** (`sfx/frappe.wav`) sur chaque lettre de « PARTIE N ».
- [ ] Whoosh calé : pic sur la coupe / au début du zoom.
- [ ] Mix : rendu `"musique":false` puis `mix_son.py … --musique-db -100 --voix-aigus -3` → −12,6 LUFS, crête −0,3 dB.
- [ ] Pas de voix plus forte que ça (les plateformes normalisent).

## 3. Images
- [ ] Accroche et verdict = photos de l'utilisateur, sans bandes noires, en pleine résolution (signaler si < 1000 px).
- [ ] **Vraie personne identifiable** (ado réel, photo de presse, célébrité) : flouter le visage ou demander une image générée.
- [ ] Ballon de l'âge : celui de l'utilisateur détouré (fond magenta / noir), sinon `ballon.py <âge> … dore`.
- [ ] Carte commentaire : image de l'utilisateur telle quelle (`carteCommentaire.image`), sinon dessinée avec
      l'âge et la taille **de la voix** ; jamais sur la tête ; au même endroit que l'original.

## 4. Montage — identique à l'original (Taller partie 30)
- [ ] Accroche : dézoom lent, sous-titres jaunes, carte commentaire jusqu'au ballon.
- [ ] Papier froissé + « PARTIE N » tapé (une lettre / 2 images), sans curseur ni pop.
- [ ] Transitions de l'original **dans cet ordre** : `jaune-glisse` → dashboard ; `bascule` → routine ; `radial` →
      silhouette ; `glitch` → dashboard 2 ; `glitch` → verdict ; `radial` → appel ; `radial` → fin.
- [ ] Dashboard 1 : ballon qui tombe sur l'âge, pop du rang, **zoom taille actuelle** puis **zoom taille prédite**.
- [ ] Routine sur le prénom de la phrase « pourrait atteindre » : nette, **sans 🤫**, 0/N, sans soleil / oméga 3 /
      zinc / moringa, habitudes floues (« Programme sommeil »…), carte **🔒 +7 habitudes clés** visible.
- [ ] Silhouette violette (ou alien si très grand) + chiffre optimisé tapé sur fond violet, au moment où il est dit.
- [ ] Dashboard 2 sur la fin de la phrase « +N cm » : flèche rouge vers la taille prédite, main-curseur sur le rang
      (sur « des … ans » jusqu'au pourcentage de croissance), **zoom croissance accomplie** ; pas de flash, pas de pop.
- [ ] Verdict sur la phrase « pas foutu » : « PAS FOUTU ✅ » vert au centre (y 900), lisible ≥ 1 s.
- [ ] Appel : fond topo, ANALYSÉ, 👵 sur « âge », règle sur « taille », sous-titres de fin (y +83 px).
- [ ] ~~Fin ~3 s après la voix~~ **remplacé le 05/11 : pas de fin animée, voir « Retours du 05/11 »**. (Ancien : **dans le même plan que l'appel** (pas de coupe) : la scène s'assombrit (élément `finLien`),
      icône blanche qui passe aux couleurs puis revient au blanc, « GRANDIMI.COM » lisible dessous ; la règle reste,
      centrée (x 508, y 1345, h 575 : sous le texte) et atténuée ; 👵 disparaît à la fin (comme l'original).

## 5. Zooms (mesurés sur l'original)
- [ ] Vitesse **constante** (`"courbe": "lineaire"`), départ **après** le chiffre prononcé :
      actuelle +12 images, ×1,85 en 12 ; retour sur le 2ᵉ mot de `norme` en 15 ;
      prédite +8, ×1,87 en 13 ; croissance `fini:<pct>+14`, ×1,81 en 11.
- [ ] Cadrage : la carte zoomée **sous** la barre grandimi.com, entière (cx/cy de la recette).
- [ ] Vérifié par recalage image par image (`reg.py`) : facteur et centre à ±0,03 de l'original.

## 6. Textes et écrans
- [ ] Sous-titres : Montserrat 500, 72 px, `#ebf91f`, contour 9, y 838, apparition **sèche** (pas de pop).
- [ ] « PARTIE N » : Montserrat 500, 168 px, contour 28 arrondi, y 702.
- [ ] **Pas d'heure, de 5G ni de batterie** en haut des écrans.
- [ ] Barre **grandimi.com en haut**, descendue de 60 px (`urlDecale` 60).
- [ ] Onglets / navigation **en bas** (`navTraits`), visibles.
- [ ] Aucun texte qui se chevauche (sous-titres / PAS FOUTU / ANALYSÉ / carte).

## 7. Contrôle avant livraison
- [ ] Planche **côte à côte** original / nous aux mêmes moments du texte : mêmes plans, mêmes positions, mêmes tailles.
- [ ] `statique.py` : aucun passage figé > 2 s qui n'existe pas dans l'original.
- [ ] Aucun à-coup isolé (saut de luminosité, image noire) absent de l'original.
- [ ] Toutes les ancres trouvées (`voix_fichier.py` sans « mot introuvable »), aucun plan < 1 s.
- [ ] Durée totale ≈ celle de la voix + 0,6 s (pas de fin « GRANDIMI.COM » + logo, confirmé le 05/11).

## 8. Livraison
- [ ] Livrer **la vidéo seule** (+ planche de comparaison si demandée).
- [ ] Photos de tiers et rendu hors git (`.git/info/exclude`) ; commit en français ; push.
- [ ] Message : ce qui a été fait, chiffres faux / problèmes de la voix, corrections françaises du message de l'utilisateur.

## À trancher (demandes contradictoires)
- [ ] **Fond animé** : « vraiment lent » (01-02/11, vitesse 0,15) **ou** vitesse de l'original ? (miguel-29 : original sur
      silhouette et appel, lent sur la fin).
- [ ] **Émojis de fin** : « enlève les émojis » (01/11) **ou** 👵 + ordinateur comme l'original (04/11) ? (miguel-29 : comme l'original).
- [ ] **Musique** : aucune (02/11) **ou** comme l'original ? (miguel-29 : aucune).

## Retours du 05/11 (noah-30 = modèle à copier)
- [ ] Accroche : photo entière (cadrage large comme l'original), **zoom avant lent tout au long** (×1 → ×1,08).
- [ ] Routine **comme Taller** : `"taller30": true` (même taille et mise en page, 0/9, statique), **sans carte « +7 »**,
      habitudes Grandimi (routine physique, lait + miel, programme sommeil, alimentation, posture).
- [ ] **Pas de fin animée** (l'icône + @TALLER.APP de l'original est la fin ajoutée par Instagram au téléchargement) :
      la vidéo s'arrête 0,6 s après la voix (`apad=pad_dur=0.6`), pas de `finLien`.
- [ ] Dashboard à la place exacte de Taller (`pageY` 0), barre grandimi.com par-dessus (`urlDecale` −75, fond transparent).
- [ ] Carte commentaire et sous-titres à la position de l'original (sous-titres y 921, taille 76) ; photo de profil non floutée.
- [ ] Accroche **recalée sur l'original** (même cadrage, z 0,909 → 0,918, fond flou derrière, `libre`).
- [ ] Carte commentaire `reponse.modele: "taller30"` (texte noir gras 48 px, en-tête gris 42 px, avatar 156 px).
- [ ] Flèche `pop: true` (apparaît sur place en 6 images, immobile, disparaît d'un coup), x 0,501, pointe 0,2755.
- [ ] Glitch vers le dashboard 2 : `sortie: "onde"` sur la silhouette + `transition: "glitch-blocs"`.

## Retours du 05/11 (adrien-31)
- [ ] Vidéo **finie juste après « … en commentaire »** : pas de `finLien` (« GRANDIMI.COM » + logo façon Instagram pendant 3 s),
      pas d'élément `finLien` dans `appel`, fin des sous-titres au dernier mot (`apad=pad_dur=0.6`).
- [ ] **Pas de sons « bug » ni « verdict »** (jugés forts et bizarres) ; bruitages **graves** : `"sfxDossier": "sfx-grave"`.
- [ ] **Ballon de l'âge plus gros** : `"boite": [0.03, 0.25, 0.94, 0.44]`.
- [ ] **Flèche rouge au moment où la voix dit « +N cm »** (dans le plan où la phrase est dite, dézoom doux avant) ;
      main-curseur sur le rang quand il est prononcé.
- [ ] **Montage fluide** : zooms du dashboard `"courbe": "doux"`, `d` 18, départ +4 images après le chiffre ;
      routine avec coches + `"avanceZ": 1.1` (pas d'écran figé > 2,5 s).
      ⚠ À trancher : noah-30 (même jour) a une routine statique `taller30` et un zoom d'accroche ×1,08.
- [ ] Accroche : zoom avant lent sur la personne (adrien-31 : ×1 → ×1,4 centré sur le visage, visage au-dessus de la carte).
