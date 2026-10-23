---
name: site
description: Modifier le site grandimi.com, le tester en taille téléphone et le publier, depuis une session cloud (téléphone) ou depuis l'ordinateur. À utiliser dès que l'utilisateur demande de changer une page, un texte, le paywall ou le parcours, ou de publier.
---

# Modifier, tester, publier le site

Réponds en français, directement. Le site (frontend React/Vite) est dans `frontend/`.
grandimi.com est servi par **GitHub Pages depuis le dossier `docs/` de `main`** :
le site déjà construit. Modifier `frontend/src` ne publie RIEN tant que `docs/` n'est
pas reconstruit (voir « 3. Publier »). `render.yaml` ne sert pas le site.

## 0. Partir de la bonne version

Le travail fait sur l'ordinateur n'existe ici que s'il a été poussé sur GitHub.
Avant de toucher un fichier, compare `main` avec les branches récentes
(`git fetch origin && git log --oneline -5 origin/<branche>`). Si une branche contient
des changements du même fichier qui ne sont pas sur `main`, dis-le à l'utilisateur
avant de modifier : sinon il y aura un conflit au retour sur l'ordinateur.

## 1. Lancer le site

Les dépendances sont installées au démarrage (`scripts/cloud-setup.sh`). Sinon :
`cd frontend && npm install`.

```bash
cd frontend && npx vite --port 5173 --host 127.0.0.1   # en arrière-plan
```

Raccourcis (développement seulement, absents du site en ligne) :
`/?preview=paywall`, `/?preview=results`, `/?preview=plan`, `/?preview=reglage`,
`/?preview=mot-de-passe`.

## 2. Tester en taille téléphone

```bash
node outils/capture-mobile.cjs "/?preview=paywall" "/?preview=results"
```

Écrit deux images par page dans `captures/` : l'écran visible et la page entière.
Regarde-les toi-même, puis envoie à l'utilisateur la ou les captures qui montrent
le changement (avant / après si utile). Vérifie aussi `cd frontend && npm run build`.

Limites connues dans le cloud :
- Pas de serveur backend (`localhost:8080`) : les appels API échouent, l'écran
  s'affiche avec les valeurs par défaut. Ne pas inventer de données.
- Polices (fonts.bunny.net) et formulaire de paiement Whop (js.whop.com) bloqués
  par le réseau de l'environnement, sauf si ces domaines y ont été autorisés.
  Le formulaire Whop se teste donc sur le vrai site après publication.

## 3. Publier

1. Commit des sources sur une branche `claude/…`, push.
2. Montre les captures et demande « je publie ? ».
3. Sur le « oui », dans la même branche :
   ```bash
   cd frontend && npm run build && cd .. && cp -r frontend/dist/. docs/
   git checkout frontend/dist/index.html   # ne pas committer dist
   git add docs && git commit -m "Publication : …"
   ```
   Vérifie que le nouveau `docs/assets/PaywallPage-*.js` (ou la page modifiée)
   contient bien le changement (`grep`).
4. Ouvre la pull request et fusionne-la sur `main` (outils GitHub). GitHub Pages
   met en ligne en 1 à 3 minutes. L'utilisateur vérifie sur grandimi.com
   en navigation privée. Pour le paiement : code promo de test à −100 %
   (l'utilisateur l'a ; ne jamais l'écrire dans le dépôt).
