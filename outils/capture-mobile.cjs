// Capture d'écran du site en taille iPhone, sans ordinateur.
// Usage : node outils/capture-mobile.cjs [chemin…]   (défaut : /?preview=paywall)
// Le site doit tourner : cd frontend && npx vite --port 5173
// Images écrites dans captures/ (ignoré par git).
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

let playwright
try { playwright = require('playwright') } catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))
}
const { chromium, devices } = playwright

const base = process.env.SITE_URL || 'http://127.0.0.1:5173'
const chemins = process.argv.slice(2).length ? process.argv.slice(2) : ['/?preview=paywall']
const dossier = path.join(__dirname, '..', 'captures')
fs.mkdirSync(dossier, { recursive: true })

;(async () => {
  const navigateur = await chromium.launch()
  const page = await navigateur.newPage({ ...devices['iPhone 13'] })
  page.on('pageerror', e => console.log('ERREUR JS :', e.message))
  for (const chemin of chemins) {
    await page.goto(base + chemin, { waitUntil: 'load' })
    await page.waitForTimeout(4000)
    const nom = chemin.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'accueil'
    for (const [suffixe, pleinePage] of [['', false], ['-entier', true]]) {
      const fichier = path.join(dossier, nom + suffixe + '.png')
      await page.screenshot({ path: fichier, fullPage: pleinePage })
      console.log(fichier)
    }
  }
  await navigateur.close()
})()
