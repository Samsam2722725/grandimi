# Backlog Grandimi

## Avant paiement

- Accueil : carte animée « Analyse de ton profil » sous le bouton (âge, sommeil, sport ✓, programme qui se remplit) — demandé le 08/10/2026.
- Vrais avis clients sur l'accueil et le paywall (quand on en aura).

## Après paiement — à faire (noté le 08/10/2026)

Le paiement marche pour les 3 offres (testé le 08/10 : 1 mois, 3 mois, À vie).
Mais ce que le client voit après avoir payé est encore l'ancienne app, faite
pour ordinateur. Modèle à copier : GoTall (captures dans
captures-concurrents/gotall-appli/, notes dans ONBOARDING-CONCURRENTS.md).
Détail écran par écran, avec fichiers et lignes : AUDIT-APRES-PAIEMENT.md.

### 1. Vraie app sur téléphone (la structure)
- Barre en bas, comme GoTall : **Accueil · Grandir · Guide · Coach** (+ Moi / Mon compte).
- Supprimer les 8 onglets en haut et le grand titre répété sur chaque onglet.
- Un abonné qui revient sur grandimi.com arrive **directement sur son plan**, pas sur la page de vente.
- Le geste retour du téléphone revient à l'écran précédent de l'app, jamais à la page de vente.
- Changer d'onglet remonte en haut de l'écran.
- Fond noir partout (y compris la barre du navigateur et le rebond iOS).

### 2. Accueil de l'app
- En haut : **« Ton diagnostic : ce qui te freine »** — ses 3 points faibles du questionnaire (sommeil, coucher, posture, protéines, sport, téléphone, calcium), chacun avec « comment le corriger ». C'est promis dans toutes les offres.
- Série de jours 🔥 avec l'initiale du jour sous chaque pastille.
- 3 cartes Sommeil / Nutrition / Sport, chacune avec un score du jour et une action.

### 3. Grandir (3 pilules Exercices / Nutrition / Sommeil)
- **Exercices** : niveau, % de la semaine, bande de 7 jours, exercices du jour avec durée, bouton « Commencer l'entraînement ».
- **Nutrition** : score du jour, jauges Protéines / Calcium / Vitamine D, repas à cocher, meilleurs aliments. Le bloc « Nutriments clés » va ici seulement (aujourd'hui il est sous tous les onglets).
- **Sommeil** : score, heures sur 7 jours, « Ajouter mes heures », heure de coucher conseillée. Harmoniser « 30 min » / « 45 min » sans écran.
- Toute la ligne d'une tâche se coche (pas seulement la petite case).

### 4. Guide et Ma taille (ce qui est vendu par offre)
- « Leçons » devient **Ton guide pour grandir** (offre 1 mois et plus).
- **Ta taille adulte estimée** réservée aux offres **3 mois et À vie**. En 1 mois : écran verrouillé + bouton « Passer à 3 mois ».
- La courbe de croissance va dans Ma taille (aujourd'hui elle est dans Aujourd'hui, avec des chiffres de 8 px illisibles).
- Champ de taille qui accepte la virgule (165,5).

### 5. Coach IA (offre À vie)
- Chat comme « Andy » de GoTall, avec 4 questions toutes prêtes ; il connaît le profil (âge, taille, points faibles).
- Il faut une **clé API Claude** (console.anthropic.com), environ 0,5 à 2 centimes par message, avec une limite de messages par jour.
- Quand il marche : **remettre « Ton coach perso 24 h/24 » dans l'offre À vie** (src/lib/offres.js et « Ce que tu obtiens » dans PaywallPage.jsx). Retiré le 08/10 car il n'existait pas.

### 6. Écrans autour du paiement et du compte
- **Paiement confirmé** (mot de passe) : même style que le reste (logo, police, orange), bouton court « Accéder à mon plan » (aujourd'hui coupé sur les côtés), un seul champ mot de passe avec « afficher », le téléphone propose d'enregistrer le mot de passe.
- Texte d'attente « on prépare ton accès » lisible (gris foncé sur noir aujourd'hui).
- Si l'activation tarde : message rassurant + bouton « Réessayer », au lieu d'envoyer sur Mon compte.
- **Mon compte** : en noir comme le reste ; afficher la bonne offre (« /mois », « pour 3 mois », « paiement unique ») ; pas de « Prochain paiement » ni de résiliation pour À vie ; bouton « ← Mon plan ».
- Connexion : liens « Mot de passe oublié ? » assez grands pour le doigt.
- Messages d'erreur en français (aujourd'hui ceux du serveur peuvent sortir en anglais) ; bouton « Réessayer » si le plan ne charge pas.
- Tout en français : « Vitamine D », « 15 µg », « 1,5 cm » (virgule, pas point).

### 7. Visite guidée
- À la première ouverture, bulles « 1 sur 5 · Suivant » qui expliquent chaque zone (comme GoTall).

### À ne pas oublier
- Annuler dans Whop les abonnements de test (dont les 2 tests du 08/10 en « essai » qui seraient prélevés le 7/11 et le 6/01). Liste dans la conversation du 08/10.
- Vérifier dans Supabase que les comptes test ont la bonne durée (1 mois / 3 mois / à vie).
- Composants d'animation en attente (NumberTicker, ShinyButton, AI Loader) : seulement si demandé.
