/* Inline la feuille de style d'entrée dans le HTML livré.

   POURQUOI. Le rapport PageSpeed du 19/09/2026 place l'élément LCP sur
   le bloc de texte du hero, avec 1 450 ms de « délai d'affichage ». Ce
   délai n'est pas dû au JavaScript : la feuille de style BLOQUE le
   rendu. Le navigateur reçoit le HTML, y trouve un <link rel=stylesheet>,
   ouvre une seconde requête, et n'affiche rien jusqu'à sa réponse. Sur
   4G lente c'est un aller-retour complet avant le premier pixel.

   C'est aussi ce qui a fait échouer le pré-rendu du hero, essayé puis
   annulé plus tôt : le contenu était dans le HTML, mais il attendait le
   même feu vert. Les deux changements ne valent que faits ensemble.

   LE COMPROMIS. La feuille fait 51 ko bruts, 10 ko une fois compressée.
   Inlinée, elle voyage dans chaque réponse HTML au lieu d'être mise en
   cache séparément — mais GitHub Pages ne met en cache que dix minutes
   (c'est le poste « 157 Kio » du même rapport), donc ce cache-là ne
   valait pas grand-chose. Un aller-retour économisé sur une connexion
   lente vaut plus que dix minutes de cache.

   POURQUOI UN SCRIPT ET PAS UN PLUGIN. Le dépôt n'a pas d'outillage de
   pré-rendu et ce script fait vingt lignes. Il tourne après `vite build`
   et ne dépend de rien.

   LIMITE ASSUMÉE : si la feuille grossit beaucoup — disons au-delà de
   100 ko bruts — l'inlining devient contre-productif et il faudra
   revenir à un vrai CSS critique. Le script prévient au-delà du seuil. */

const fs = require('node:fs')
const path = require('node:path')

const SEUIL_KO = 100

const racineDist = process.argv[2] || 'frontend/dist'
const cheminHtml = path.join(racineDist, 'index.html')

let html = fs.readFileSync(cheminHtml, 'utf8')

const lien = html.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/)
if (!lien) {
  console.log('inliner-css : aucune feuille a inliner, rien a faire')
  process.exit(0)
}

const cheminCss = path.join(racineDist, lien[1])
const css = fs.readFileSync(cheminCss, 'utf8')
const ko = css.length / 1024

if (ko > SEUIL_KO) {
  console.error(
    `inliner-css : la feuille fait ${ko.toFixed(0)} ko, au-dela du seuil de ${SEUIL_KO} ko.\n` +
      "  L'inlining n'est plus rentable a cette taille : extraire un vrai CSS critique.",
  )
  process.exit(1)
}

/* La balise <style> remplace le <link> EXACTEMENT a sa place : l'ordre
   des regles CSS decide des priorites, le deplacer changerait le rendu. */
html = html.replace(lien[0], `<style>${css}</style>`)

fs.writeFileSync(cheminHtml, html)

/* Le fichier .css reste sur le disque : un visiteur qui a l'ancienne
   page en cache peut encore le demander, et le supprimer lui servirait
   une page sans style. */
console.log(`inliner-css : ${ko.toFixed(1)} ko inlines depuis ${path.basename(cheminCss)}`)
